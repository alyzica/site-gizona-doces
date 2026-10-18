-- =====================================================================
-- 1) Cancelar venda de delivery: o produto volta ao estoque e a venda fica
--    registrada como ESTORNO (cancelada) nas "Ultimas movimentacoes".
-- 2) Receita no Financeiro passa a entrar quando o pedido e CONFIRMADO
--    (e segue valendo em Em producao / Entregue). Cancelado ou Pendente = sem receita.
-- Idempotente. Nao apaga vendas nem receitas existentes.
-- Rode DEPOIS do fix_delivery_venda_manual.sql.
-- =====================================================================

-- colunas de apoio (ja existem em alguns bancos)
alter table public.delivery_sales add column if not exists reversed boolean not null default false;
alter table public.delivery_sales add column if not exists reversed_at timestamptz;
alter table public.delivery_sales alter column request_id drop not null;
alter table public.delivery_sales alter column batch_item_id drop not null;

-- estoque = produzido - vendido (vendas estornadas nao contam)
create or replace function public.delivery_stock_of(p_product uuid) returns integer
language sql stable security definer as $$
  select coalesce((select sum(quantity) from public.delivery_stock_batches where product_id = p_product), 0)
       - coalesce((select sum(quantity) from public.delivery_sales where product_id = p_product and not reversed), 0);
$$;

-- cancelar: marca como estornada (mantem o historico) em vez de apagar
create or replace function public.fn_order_cancel_restock() returns trigger
language plpgsql security definer as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.delivery_sales set reversed = true, reversed_at = now()
     where order_id = new.id and not reversed;
  end if;
  return new;
end; $$;

-- baixa de estoque do pedido (insert) e reabertura de pedido cancelado (update)
create or replace function public.fn_order_delivery_stock() returns trigger
language plpgsql security definer as $$
declare it jsonb; pid uuid; q integer; pr numeric; is_open boolean; s record;
begin
  if coalesce(new.order_type, 'encomenda') <> 'delivery' or new.status = 'cancelled' then
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if old.status is distinct from 'cancelled' then return new; end if;
    -- reabrindo um pedido cancelado: refaz a baixa se ainda houver estoque
    if exists (select 1 from public.delivery_sales where order_id = new.id and reversed) then
      for s in select product_id, sum(quantity)::integer as q from public.delivery_sales
               where order_id = new.id and reversed group by product_id loop
        if public.delivery_stock_of(s.product_id) < s.q then
          raise exception 'Estoque insuficiente para reabrir este pedido';
        end if;
      end loop;
      update public.delivery_sales set reversed = false, reversed_at = null where order_id = new.id and reversed;
      return new;
    end if;
  end if;
  if exists (select 1 from public.delivery_sales where order_id = new.id) then return new; end if;

  if TG_OP = 'INSERT' and coalesce(new.origin, 'site') = 'site' then
    select delivery_open into is_open from public.delivery_settings where id = 1;
    if not coalesce(is_open, false) then
      raise exception 'Delivery fechado';
    end if;
  end if;

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

-- receita: entra ao CONFIRMAR (e permanece em producao/entregue); sai ao cancelar/voltar a pendente
create or replace function public.fn_order_completed_to_revenue() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.revenue_entries where order_id = old.id; return old;
  end if;
  if new.status in ('cancelled', 'pending') or coalesce(new.revenue_suppressed, false) then
    delete from public.revenue_entries where order_id = new.id;
  elsif new.status in ('confirmed', 'production', 'delivered') then
    if not exists (select 1 from public.revenue_entries where order_id = new.id) then
      insert into public.revenue_entries (entry_date, description, amount, source, order_id)
      values (current_date, 'Pedido ' || new.order_number, new.total, 'site', new.id);
    else
      update public.revenue_entries set amount = new.total where order_id = new.id;
    end if;
  end if;
  return new;
end $$;

-- pedidos ja Confirmados / Em producao que ainda nao tinham receita ganham agora (sem duplicar)
insert into public.revenue_entries (entry_date, description, amount, source, order_id)
select coalesce(o.order_date, o.created_at::date, current_date), 'Pedido ' || o.order_number, o.total, 'site', o.id
from public.orders o
where o.status in ('confirmed', 'production')
  and not coalesce(o.revenue_suppressed, false)
  and not exists (select 1 from public.revenue_entries r where r.order_id = o.id);

notify pgrst, 'reload schema';
