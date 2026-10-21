-- =====================================================================
-- Gizona Doces — Clube Fidelidade: vínculo explícito e pontos corretos
-- Idempotente e não destrutivo (pode rodar mais de uma vez).
--
-- Regras:
--  * Pontos SÓ para pedido vinculado a um cadastro (customer_id):
--      - pedido do site com cliente logado  -> vínculo 'auth'
--      - pedido manual com cadastro SELECIONADO pelo admin -> 'admin_selected'
--  * Pedido do site sem login, ou manual digitado livremente => 0 pontos
--    (NUNCA se vincula por nome/telefone).
--  * 1 ponto por R$ 1 (parte inteira do total de produtos − desconto, sem frete).
--  * Pontos só com pedido entregue/concluído (regra que já existia).
--  * Sem duplicar: o pedido guarda quantos pontos já creditou
--    (loyalty_points_awarded) e o gatilho só aplica a DIFERENÇA.
--  * Cancelou / voltou de status / editou valor / trocou ou removeu o
--    cliente / excluiu o pedido => pontos ajustados ou estornados.
-- =====================================================================

alter table public.orders add column if not exists loyalty_link text;
do $$ begin
  alter table public.orders add constraint orders_loyalty_link_chk
    check (loyalty_link is null or loyalty_link in ('auth','admin_selected'));
exception when duplicate_object then null; end $$;

-- Pedidos antigos que já tinham cadastro ligado
update public.orders set loyalty_link = case when origin = 'site' then 'auth' else 'admin_selected' end
 where customer_id is not null and loyalty_link is null;

-- 1) Define/valida o vínculo ANTES de calcular pontos
create or replace function public.fn_order_loyalty_link()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := auth.uid(); adm boolean := false;
begin
  begin adm := coalesce(public.is_admin(), false); exception when others then adm := false; end;
  if new.customer_id is null then
    new.loyalty_link := null;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.customer_id is not distinct from old.customer_id then
    new.loyalty_link := old.loyalty_link;      -- mantém o vínculo já registrado
    return new;
  end if;
  if uid is not null and uid = new.customer_id then
    new.loyalty_link := 'auth';
  elsif adm or uid is null then
    new.loyalty_link := 'admin_selected';      -- admin escolheu o cadastro (ou rotina do servidor)
  else
    new.customer_id := null;                   -- usuário logado tentando ligar a outro cadastro: ignora
    new.loyalty_link := null;
  end if;
  return new;
end $$;

drop trigger if exists a_order_loyalty_link on public.orders;
create trigger a_order_loyalty_link before insert or update of customer_id on public.orders
  for each row execute function public.fn_order_loyalty_link();

-- 2) Pontos: aplica só a diferença entre o que deveria ter e o que já foi creditado
create or replace function public.award_loyalty_points()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare target integer := 0; cur integer := coalesce(new.loyalty_points_awarded, 0); delta integer;
begin
  -- trocou/removeu o cliente: devolve os pontos ao cadastro antigo
  if tg_op = 'UPDATE' and old.customer_id is not null
     and old.customer_id is distinct from new.customer_id and coalesce(old.loyalty_points_awarded,0) > 0 then
    perform set_config('gizona.loy_reason', 'Estorno: cliente do pedido ' || coalesce(old.order_number,'') || ' alterado', true);
    update public.loyalty_cards set points = greatest(0, points - old.loyalty_points_awarded)
     where customer_id = old.customer_id;
    perform set_config('gizona.loy_reason', '', true);
    cur := 0;
  end if;

  if new.customer_id is not null and new.loyalty_link is not null
     and new.status in ('completed','delivered') then
    target := floor(greatest(coalesce(new.total, 0), 0))::integer;
  end if;

  delta := target - cur;
  if delta <> 0 and new.customer_id is not null then
    if delta > 0 then
      insert into public.loyalty_cards (customer_id, completed_orders, rewards_claimed, points)
      values (new.customer_id, 0, 0, delta)
      on conflict (customer_id) do update set points = public.loyalty_cards.points + delta;
    else
      perform set_config('gizona.loy_reason', 'Estorno: pedido ' || coalesce(new.order_number,'') ||
        case when new.status in ('completed','delivered') then ' editado' else ' cancelado/reaberto' end, true);
      update public.loyalty_cards set points = greatest(0, points + delta) where customer_id = new.customer_id;
      perform set_config('gizona.loy_reason', '', true);
    end if;
  end if;
  new.loyalty_points_awarded := target;
  return new;
end $$;

drop trigger if exists on_order_award_loyalty_points on public.orders;
create trigger on_order_award_loyalty_points
  before insert or update of status, customer_id, total, loyalty_link on public.orders
  for each row execute function public.award_loyalty_points();

-- 3) Excluir pedido estorna os pontos que ele tinha dado
create or replace function public.fn_order_delete_loyalty()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if old.customer_id is not null and coalesce(old.loyalty_points_awarded,0) > 0 then
    perform set_config('gizona.loy_reason', 'Estorno: pedido ' || coalesce(old.order_number,'') || ' excluído', true);
    update public.loyalty_cards set points = greatest(0, points - old.loyalty_points_awarded)
     where customer_id = old.customer_id;
    perform set_config('gizona.loy_reason', '', true);
  end if;
  return old;
end $$;

drop trigger if exists trg_order_delete_loyalty on public.orders;
create trigger trg_order_delete_loyalty before delete on public.orders
  for each row execute function public.fn_order_delete_loyalty();

-- Observação: pedidos antigos sem cadastro vinculado (customer_id vazio) NÃO são
-- vinculados automaticamente. Para creditar um deles, abra o pedido no admin,
-- escolha o cliente do Clube no campo "Cliente" e salve.
