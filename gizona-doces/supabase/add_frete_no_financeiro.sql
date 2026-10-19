-- =====================================================================
-- FRETE NO FINANCEIRO (rode depois do add_correcoes_v4.sql; seguro para repetir)
-- A entrada financeira passa a ser o valor total cobrado do cliente:
--   produtos - desconto + frete   (ex.: 34,00 + 6,00 = 40,00)
-- Nao apaga lancamentos: apenas corrige o valor dos que ja estao ligados a pedidos.
-- =====================================================================

create or replace function public.fn_order_completed_to_revenue() returns trigger
language plpgsql set search_path to 'public' as $$
declare v numeric;
begin
  if tg_op = 'DELETE' then
    delete from public.revenue_entries where order_id = old.id; return old;
  end if;
  v := coalesce(new.total, 0) + coalesce(new.delivery_fee, 0);
  if new.status in ('cancelled', 'pending') or coalesce(new.revenue_suppressed, false) then
    delete from public.revenue_entries where order_id = new.id;
  elsif new.status in ('confirmed', 'production', 'delivered') then
    if not exists (select 1 from public.revenue_entries where order_id = new.id) then
      insert into public.revenue_entries (entry_date, description, amount, source, order_id)
      values (current_date, 'Pedido ' || new.order_number, v, 'site', new.id);
    else
      update public.revenue_entries set amount = v where order_id = new.id;
    end if;
  end if;
  return new;
end $$;

-- o gatilho tambem precisa disparar quando o frete muda
drop trigger if exists trg_order_completed_to_revenue on public.orders;
create trigger trg_order_completed_to_revenue
  after insert or update of status, total, delivery_fee, revenue_suppressed on public.orders
  for each row execute function public.fn_order_completed_to_revenue();

-- corrige as entradas ja lancadas (so as ligadas a pedidos e com valor diferente)
update public.revenue_entries re
   set amount = coalesce(o.total, 0) + coalesce(o.delivery_fee, 0)
  from public.orders o
 where re.order_id = o.id
   and re.amount is distinct from (coalesce(o.total, 0) + coalesce(o.delivery_fee, 0));

notify pgrst, 'reload schema';
