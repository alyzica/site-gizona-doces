-- =====================================================================
-- MELHORIAS V3 — Gizona Doces. Idempotente; NAO apaga vendas, levas nem pedidos.
-- Ordem: 1) fix_delivery_venda_manual.sql  2) add_estorno_e_receita_confirmado.sql  3) este.
--
--  A) Estoque de produtos por mes, com transferencia automatica das sobras
--  B) Excluir pedido devolve o produto ao estoque (a FK antiga so "soltava" a venda)
--  C) Numeracao sequencial dos pedidos (PED-0001, PED-0002...) com renumeracao ao excluir
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) ESTOQUE MENSAL
-- ---------------------------------------------------------------------
create table if not exists public.delivery_stock_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  from_month date not null,              -- 1o dia do mes de origem
  to_month date not null,                -- 1o dia do mes de destino
  transferred_at timestamptz not null default now(),
  unique (product_id, from_month)        -- garante UMA transferencia por produto e por mes
);
alter table public.delivery_stock_transfers enable row level security;
drop policy if exists "admin acesso total delivery_stock_transfers" on public.delivery_stock_transfers;
create policy "admin acesso total delivery_stock_transfers" on public.delivery_stock_transfers
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.delivery_sales add column if not exists reversed boolean not null default false;
alter table public.delivery_sales add column if not exists reversed_at timestamptz;

-- Saldo de cada mes = transferido de entrada + produzido - vendido + estornos - transferido de saida.
-- Roda so para meses ja encerrados e so cria a transferencia se ainda nao existir (idempotente).
create or replace function public.rollover_delivery_stock() returns integer
language plpgsql security definer set search_path = public as $$
declare
  cur date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  first_m date; m date; p record; bal integer; n integer := 0;
begin
  select min(d) into first_m from (
    select date_trunc('month', produced_at)::date as d from public.delivery_stock_batches
    union all
    select date_trunc('month', sold_at)::date from public.delivery_sales
  ) x;
  if first_m is null or first_m >= cur then return 0; end if;

  perform pg_advisory_xact_lock(7419001);   -- evita duas execucoes ao mesmo tempo
  m := first_m;
  while m < cur loop
    for p in select id from public.products where category = 'delivery' loop
      if exists (select 1 from public.delivery_stock_transfers t where t.product_id = p.id and t.from_month = m) then
        continue;
      end if;
      select
          coalesce((select sum(t.quantity) from public.delivery_stock_transfers t
                     where t.product_id = p.id and t.to_month = m), 0)
        + coalesce((select sum(b.quantity) from public.delivery_stock_batches b
                     where b.product_id = p.id and date_trunc('month', b.produced_at)::date = m), 0)
        - coalesce((select sum(s.quantity) from public.delivery_sales s
                     where s.product_id = p.id and date_trunc('month', s.sold_at)::date = m), 0)
        + coalesce((select sum(s.quantity) from public.delivery_sales s
                     where s.product_id = p.id and s.reversed
                       and date_trunc('month', coalesce((s.reversed_at at time zone 'America/Sao_Paulo')::date, s.sold_at))::date = m), 0)
      into bal;
      if bal > 0 then
        insert into public.delivery_stock_transfers (product_id, quantity, from_month, to_month)
        values (p.id, bal, m, (m + interval '1 month')::date)
        on conflict (product_id, from_month) do nothing;
        n := n + 1;
      end if;
    end loop;
    m := (m + interval '1 month')::date;
  end loop;
  return n;
end $$;
grant execute on function public.rollover_delivery_stock() to authenticated;

-- ---------------------------------------------------------------------
-- B) Excluir pedido de delivery devolve o produto ao estoque
-- ---------------------------------------------------------------------
create or replace function public.fn_order_delete_restock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.delivery_sales where order_id = old.id;
  return old;
end $$;
drop trigger if exists trg_order_delete_restock on public.orders;
create trigger trg_order_delete_restock before delete on public.orders
  for each row execute function public.fn_order_delete_restock();

-- ---------------------------------------------------------------------
-- C) NUMERACAO SEQUENCIAL DOS PEDIDOS
--    O identificador interno continua sendo o "id" (uuid); o numero e so de exibicao.
-- ---------------------------------------------------------------------
create or replace function public.renumber_orders() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7419002);
  update public.orders set order_number = 'TMP-' || id::text;     -- evita conflito da regra de numero unico
  with ranked as (select id, row_number() over (order by created_at, id) as rn from public.orders)
  update public.orders o set order_number = 'PED-' || lpad(r.rn::text, 4, '0')
    from ranked r where r.id = o.id;
  -- descricoes de receita ligadas ao pedido acompanham o novo numero
  update public.revenue_entries re set description = 'Pedido ' || o.order_number
    from public.orders o where re.order_id = o.id and re.description like 'Pedido %';
end $$;

create or replace function public.fn_orders_set_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(7419002);
  select coalesce(max(nullif(regexp_replace(order_number, '\D', '', 'g'), '')::integer), 0) + 1 into n from public.orders;
  new.order_number := 'PED-' || lpad(n::text, 4, '0');
  return new;
end $$;
drop trigger if exists trg_orders_set_number on public.orders;
create trigger trg_orders_set_number before insert on public.orders
  for each row execute function public.fn_orders_set_number();

create or replace function public.fn_orders_renumber_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.renumber_orders();
  return null;
end $$;
drop trigger if exists trg_orders_renumber_after_delete on public.orders;
create trigger trg_orders_renumber_after_delete after delete on public.orders
  for each statement execute function public.fn_orders_renumber_after_delete();

-- numeracao atual (ignora os numeros de teste): o primeiro pedido existente vira PED-0001
select public.renumber_orders();

notify pgrst, 'reload schema';
