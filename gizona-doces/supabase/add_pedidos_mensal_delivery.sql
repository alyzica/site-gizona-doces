-- =====================================================================
-- PEDIDOS POR MÊS + DELIVERY NOS PEDIDOS + CALENDÁRIO "CONCLUÍDO"
-- Rode DEPOIS do add_delivery_estoque.sql. Idempotente, não apaga dados.
-- =====================================================================

-- 1) Data do pedido (usada para separar por mês)
alter table public.orders add column if not exists order_date date;
update public.orders set order_date = (created_at at time zone 'America/Sao_Paulo')::date where order_date is null;
alter table public.orders alter column order_date set default current_date;

-- 2) Calendário: evento concluído
alter table public.production_events add column if not exists done boolean not null default false;

-- 3) Estoque movido pelos PEDIDOS (site e manual)
create or replace function public.fn_order_delivery_stock() returns trigger
language plpgsql security definer as $$
declare it jsonb; pid uuid; q integer; pr numeric;
begin
  if coalesce(new.order_type, 'encomenda') <> 'delivery' or new.status = 'cancelled' then
    return new;
  end if;
  -- no UPDATE só age ao reabrir um pedido cancelado
  if TG_OP = 'UPDATE' and not (old.status = 'cancelled') then return new; end if;
  if exists (select 1 from public.delivery_sales where order_id = new.id) then return new; end if;

  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    begin
      pid := (it->>'id')::uuid;
      q := coalesce((it->>'quantity')::integer, (it->>'qty')::integer, 0);
    exception when others then continue; end;
    if q <= 0 then continue; end if;
    if not exists (select 1 from public.products where id = pid and category = 'delivery') then continue; end if;
    if public.delivery_stock_of(pid) < q then
      raise exception 'Estoque insuficiente para este produto de delivery';
    end if;
    select price into pr from public.products where id = pid;
    insert into public.delivery_sales (product_id, quantity, unit_price, source, order_id, sold_at)
    values (pid, q, coalesce((it->>'unit_price')::numeric, pr, 0),
            case when new.origin = 'manual' then 'manual' else 'site' end, new.id, coalesce(new.order_date, current_date));
  end loop;
  return new;
end; $$;

drop trigger if exists trg_order_delivery_stock on public.orders;
create trigger trg_order_delivery_stock
  after insert on public.orders
  for each row execute function public.fn_order_delivery_stock();

drop trigger if exists trg_order_delivery_stock_reopen on public.orders;
create trigger trg_order_delivery_stock_reopen
  after update of status on public.orders
  for each row execute function public.fn_order_delivery_stock();

notify pgrst, 'reload schema';
