-- =====================================================================
-- DELIVERY + ESTOQUE DE PRODUTOS POR VENDAS + FINANCEIRO AUTOMÁTICO
-- Pode rodar mais de uma vez (idempotente). Não apaga dados.
-- =====================================================================

-- 1) Produtos de delivery (categoria 'delivery' = só uso interno por enquanto)
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('brigadeiro','geladinho','delivery'));

-- 2) Entradas de estoque (cada "nova leva")
create table if not exists public.delivery_stock_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  note text,
  produced_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- 3) Vendas (site = automática, manual = fora do site)
create table if not exists public.delivery_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  source text not null default 'manual' check (source in ('site','manual')),
  order_id uuid references public.orders(id) on delete cascade,
  revenue_entry_id uuid references public.revenue_entries(id) on delete set null,
  sold_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_delivery_sales_product on public.delivery_sales(product_id);
create index if not exists idx_delivery_sales_order on public.delivery_sales(order_id);


-- 2b) Se as tabelas já existiam (versão antiga), garante todas as colunas
alter table public.delivery_stock_batches add column if not exists unit_price numeric(10,2) not null default 0;
alter table public.delivery_stock_batches add column if not exists note text;
alter table public.delivery_stock_batches add column if not exists produced_at date not null default current_date;
alter table public.delivery_sales add column if not exists unit_price numeric(10,2) not null default 0;
alter table public.delivery_sales add column if not exists source text not null default 'manual';
alter table public.delivery_sales add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.delivery_sales add column if not exists revenue_entry_id uuid references public.revenue_entries(id) on delete set null;
alter table public.delivery_sales add column if not exists sold_at date not null default current_date;
notify pgrst, 'reload schema';

alter table public.delivery_stock_batches enable row level security;
alter table public.delivery_sales enable row level security;
drop policy if exists "admin acesso total delivery_stock_batches" on public.delivery_stock_batches;
create policy "admin acesso total delivery_stock_batches" on public.delivery_stock_batches for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total delivery_sales" on public.delivery_sales;
create policy "admin acesso total delivery_sales" on public.delivery_sales for all using (public.is_admin()) with check (public.is_admin());

-- 4) Estoque disponível de um produto
create or replace function public.delivery_stock_of(p_product uuid) returns integer
language sql stable security definer as $$
  select coalesce((select sum(quantity) from public.delivery_stock_batches where product_id = p_product), 0)
       - coalesce((select sum(quantity) from public.delivery_sales where product_id = p_product), 0);
$$;

-- 5) Pedido de delivery do site: confere estoque e dá baixa automática
--    Espera items = [{ "id": "<id do produto>", "quantity": N }, ...]
create or replace function public.fn_order_delivery_stock() returns trigger
language plpgsql security definer as $$
declare it jsonb; pid uuid; q integer; price numeric;
begin
  if coalesce(new.order_type, 'encomenda') <> 'delivery' or coalesce(new.origin, 'site') <> 'site' then
    return new;
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
    select price into price from public.products where id = pid;
    insert into public.delivery_sales (product_id, quantity, unit_price, source, order_id)
    values (pid, q, coalesce(price, 0), 'site', new.id);
  end loop;
  return new;
end; $$;

drop trigger if exists trg_order_delivery_stock on public.orders;
create trigger trg_order_delivery_stock
  after insert on public.orders
  for each row execute function public.fn_order_delivery_stock();

-- 6) Pedido cancelado devolve o estoque (a venda sai da tabela)
create or replace function public.fn_order_cancel_restock() returns trigger
language plpgsql security definer as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    delete from public.delivery_sales where order_id = new.id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_order_cancel_restock on public.orders;
create trigger trg_order_cancel_restock
  after update of status on public.orders
  for each row execute function public.fn_order_cancel_restock();

-- 7) Excluir pedido remove a receita dele do Financeiro (antes ficava órfã)
create or replace function public.fn_order_delete_revenue() returns trigger
language plpgsql security definer as $$
begin
  delete from public.revenue_entries where order_id = old.id;
  return old;
end; $$;
drop trigger if exists trg_order_delete_revenue on public.orders;
create trigger trg_order_delete_revenue
  before delete on public.orders
  for each row execute function public.fn_order_delete_revenue();

-- 8) Limpa receitas órfãs que já ficaram de pedidos excluídos antes
--    (receitas automáticas do site cujo pedido não existe mais)
delete from public.revenue_entries
where source = 'site' and order_id is null and description like 'Pedido %';
