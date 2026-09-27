-- ============================================================
-- CORREÇÃO: gatilho de receita automática + 5 status de pedido
-- Rode no SQL Editor do Supabase.
-- ============================================================

-- 1) Remove duplicatas em revenue_entries que possam ter travado o índice único
--    (mantém a receita mais antiga de cada pedido, apaga as repetidas)
delete from public.revenue_entries a
using public.revenue_entries b
where a.order_id is not null
  and a.order_id = b.order_id
  and a.created_at > b.created_at;

-- 2) Garante o índice único (necessário pro "on conflict" do gatilho funcionar)
drop index if exists idx_revenue_entries_order_id;
create unique index idx_revenue_entries_order_id
  on public.revenue_entries(order_id) where order_id is not null;

-- 3) Simplifica os status possíveis do pedido (tira "completed", "delivered" já é o status final)
update public.orders set status = 'delivered' where status = 'completed';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'production', 'delivered', 'cancelled'));

-- 4) Gatilho: agora dispara quando o pedido vira "delivered" (Entregue), não mais "completed"
create or replace function public.fn_order_completed_to_revenue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    insert into public.revenue_entries (entry_date, description, amount, source, order_id)
    values (current_date, 'Pedido ' || new.order_number, new.total, 'site', new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_completed_to_revenue on public.orders;
create trigger trg_order_completed_to_revenue
  after update of status on public.orders
  for each row execute function public.fn_order_completed_to_revenue();
