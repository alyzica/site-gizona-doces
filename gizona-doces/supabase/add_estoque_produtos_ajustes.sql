-- ============================================================
-- ESTOQUE DE PRODUTOS (doces finais/sabores), AJUSTE DE FRETE/DESCONTO
-- NOS PEDIDOS, E CANCELAMENTO REMOVE A RECEITA DO FINANCEIRO
-- Rode no SQL Editor do Supabase, depois dos scripts anteriores.
-- ============================================================

-- ---------- PRODUTOS FINAIS (ex: "Geladinho" sabor "Ninho com Nutella") ----------
create table if not exists public.finished_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- ex: Geladinho, Bolo de Pote, Brigadeiro
  flavor text,                  -- ex: Ninho com Nutella
  unit text not null default 'uni',
  current_stock numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finished_products enable row level security;
drop policy if exists "admin acesso total finished_products" on public.finished_products;
create policy "admin acesso total finished_products"
  on public.finished_products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- ENTRADAS DE PRODUÇÃO (levas que você fez) ----------
create table if not exists public.finished_product_entries (
  id uuid primary key default gen_random_uuid(),
  finished_product_id uuid not null references public.finished_products(id) on delete cascade,
  entry_date date not null default current_date,
  description text,
  quantity numeric(10,2) not null check (quantity > 0),
  value numeric(10,2),          -- valor/custo dessa leva, opcional
  created_at timestamptz not null default now()
);

alter table public.finished_product_entries enable row level security;
drop policy if exists "admin acesso total finished_product_entries" on public.finished_product_entries;
create policy "admin acesso total finished_product_entries"
  on public.finished_product_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- VENDAS (baixa do estoque de produtos + faturamento por produto) ----------
create table if not exists public.finished_product_sales (
  id uuid primary key default gen_random_uuid(),
  finished_product_id uuid not null references public.finished_products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  sale_date date not null default current_date,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finished_product_sales enable row level security;
drop policy if exists "admin acesso total finished_product_sales" on public.finished_product_sales;
create policy "admin acesso total finished_product_sales"
  on public.finished_product_sales for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_finished_product_entries_product on public.finished_product_entries(finished_product_id);
create index if not exists idx_finished_product_sales_product on public.finished_product_sales(finished_product_id);
create index if not exists idx_finished_product_sales_order on public.finished_product_sales(order_id);

-- ---------- PEDIDOS: ajuste de frete/desconto (registro, além do total já editável) ----------
alter table public.orders
  add column if not exists adjustment_amount numeric(10,2) not null default 0,
  add column if not exists adjustment_note text;

-- ---------- CANCELAMENTO: remove a receita automática do Financeiro ----------
-- (mesma função do gatilho de "Entregue", agora cobrindo os dois casos)
create or replace function public.fn_order_completed_to_revenue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    begin
      if not exists (select 1 from public.revenue_entries where order_id = new.id) then
        insert into public.revenue_entries (entry_date, description, amount, source, order_id)
        values (current_date, 'Pedido ' || new.order_number, new.total, 'site', new.id);
      end if;
    exception when others then
      raise warning 'Receita automática do pedido % falhou: %', new.order_number, sqlerrm;
    end;
  elsif new.status = 'cancelled' and (old.status is distinct from 'cancelled') then
    delete from public.revenue_entries where order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_completed_to_revenue on public.orders;
create trigger trg_order_completed_to_revenue
  after update of status on public.orders
  for each row execute function public.fn_order_completed_to_revenue();
