-- ============================================================
-- ESTOQUE DE PRODUTOS — POR LEVA DE PRODUÇÃO (igual à planilha:
-- "Geladinhos 18/07", "Geladinhos 27/08" etc, cada leva com seus sabores)
-- Substitui o modelo anterior (finished_products), que fica no banco
-- sem uso — nada é apagado.
-- Rode no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- ex: "Geladinhos 18/07"
  batch_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.production_batches enable row level security;
drop policy if exists "admin acesso total production_batches" on public.production_batches;
create policy "admin acesso total production_batches"
  on public.production_batches for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches(id) on delete cascade,
  product_name text not null,      -- sabor, ex: "Ninho com Nutella"
  quantity_produced numeric(10,2) not null default 0,
  quantity_sold numeric(10,2) not null default 0,
  unit_price numeric(10,2),        -- preço de venda desse sabor nessa leva (opcional)
  created_at timestamptz not null default now()
);

alter table public.batch_items enable row level security;
drop policy if exists "admin acesso total batch_items" on public.batch_items;
create policy "admin acesso total batch_items"
  on public.batch_items for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_batch_items_batch on public.batch_items(batch_id);
