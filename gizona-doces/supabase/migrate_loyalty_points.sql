-- GIZONA DOCES — migração Clube Fidelidade por pontos
-- Regra: R$ 1,00 gasto = 1 ponto.
-- Pontos são concedidos quando o pedido entra em concluído/entregue.
-- Esta migração não apaga dados.

alter table public.loyalty_cards
  add column if not exists points integer not null default 0;

alter table public.orders
  add column if not exists loyalty_points_awarded integer not null default 0;

update public.loyalty_cards lc
set points = coalesce((
  select sum(floor(greatest(o.total, 0)))::integer
  from public.orders o
  where o.customer_id = lc.customer_id
    and o.status in ('completed', 'delivered')
), 0)
where lc.points = 0;

update public.orders
set loyalty_points_awarded = floor(greatest(total, 0))::integer
where status in ('completed', 'delivered')
  and loyalty_points_awarded = 0;

drop trigger if exists on_order_created on public.orders;
drop trigger if exists on_order_loyalty_points on public.orders;
drop function if exists public.handle_new_order();
drop function if exists public.handle_order_loyalty_points();

create or replace function public.handle_order_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earned integer;
begin
  if new.customer_id is not null
     and new.status in ('completed', 'delivered')
     and coalesce(new.loyalty_points_awarded, 0) = 0 then
    earned := floor(greatest(coalesce(new.total, 0), 0))::integer;
    if earned > 0 then
      insert into public.loyalty_cards (customer_id, completed_orders, rewards_claimed, points)
      values (new.customer_id, 1, 0, earned)
      on conflict (customer_id)
      do update set
        completed_orders = public.loyalty_cards.completed_orders + 1,
        points = public.loyalty_cards.points + earned;
      new.loyalty_points_awarded := earned;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_order_loyalty_points
before insert or update of status, customer_id, total on public.orders
for each row execute function public.handle_order_loyalty_points();

drop policy if exists "cliente ve e edita propria fidelidade" on public.loyalty_cards;
drop policy if exists "cliente ve propria fidelidade" on public.loyalty_cards;
create policy "cliente ve propria fidelidade" on public.loyalty_cards
for select using (customer_id = auth.uid());

create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reward_row public.rewards%rowtype;
  card_row public.loyalty_cards%rowtype;
  new_points integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into reward_row
  from public.rewards
  where id = p_reward_id and active = true;
  if not found then
    raise exception 'Mimo não encontrado ou inativo';
  end if;

  select * into card_row
  from public.loyalty_cards
  where customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'Cliente ainda não possui cartão fidelidade';
  end if;

  if card_row.points < reward_row.points_required then
    raise exception 'Pontos insuficientes';
  end if;

  new_points := card_row.points - reward_row.points_required;
  update public.loyalty_cards
  set points = new_points,
      rewards_claimed = rewards_claimed + 1
  where customer_id = auth.uid();

  return jsonb_build_object(
    'success', true,
    'reward_id', reward_row.id,
    'reward_name', reward_row.name,
    'points_spent', reward_row.points_required,
    'remaining_points', new_points
  );
end;
$$;

revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
