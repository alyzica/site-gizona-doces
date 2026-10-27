-- =====================================================================
-- Gizona Doces — Clube Fidelidade: pontos SOMENTE para DELIVERY
-- Idempotente e não destrutivo (pode rodar mais de uma vez).
--
-- Regra: 1 ponto a cada R$ 1,00 do pedido (total de produtos − desconto,
-- sem frete) quando orders.order_type = 'delivery'. Encomenda = 0 pontos.
-- Continua valendo: só com cadastro vinculado e pedido entregue/concluído,
-- e estorno ao cancelar/editar/excluir.
--
-- Pontos JÁ creditados no passado por encomendas NÃO são mexidos por este
-- script (seus saldos ficam como estão). Eles só deixam de crescer.
-- Para remover esses pontos antigos, use o script opcional
-- "opcional_remover_pontos_de_encomendas.sql".
-- =====================================================================

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
    if coalesce(new.order_type, 'encomenda') = 'delivery' then
      target := floor(greatest(coalesce(new.total, 0), 0))::integer;
    elsif tg_op = 'UPDATE' and old.order_type is not distinct from new.order_type
          and old.customer_id is not distinct from new.customer_id then
      target := cur;   -- encomenda antiga: mantém o que já foi creditado antes desta regra (não gera pontos novos)
    else
      target := 0;     -- encomenda nova, ou pedido que virou encomenda: sem pontos
    end if;
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

-- passa a recalcular também quando o TIPO do pedido muda
drop trigger if exists on_order_award_loyalty_points on public.orders;
create trigger on_order_award_loyalty_points
  before insert or update of status, customer_id, total, loyalty_link, order_type on public.orders
  for each row execute function public.award_loyalty_points();
