-- ============================================================
-- FASE 1: Financeiro (Caixa) + Estoque de ingredientes
-- Rode este script no SQL Editor do Supabase.
-- Reaproveita a função public.is_admin() que já existe no projeto.
-- ============================================================

-- ---------- FINANCEIRO (equivalente à aba "Caixa") ----------
create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  type text not null check (type in ('entrada', 'saida')),
  description text not null,
  payment_method text, -- 'pix' | 'dinheiro' | 'cartao' | 'outro'
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.cash_entries enable row level security;

create policy "admin acesso total cash_entries"
  on public.cash_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- CADASTRO DE INGREDIENTES (equivalente ao bloco "Cadastro dos ingredientes") ----------
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null, -- 'g' | 'ml' | 'uni'
  package_qty numeric(10,2), -- tamanho do pacote comprado (ex: 1000g)
  package_cost numeric(10,2), -- custo do pacote comprado (ex: R$ 18,70)
  cost_per_unit numeric(12,6), -- calculado: package_cost / package_qty
  min_stock numeric(10,2) not null default 0, -- estoque mínimo antes do alerta
  current_stock numeric(10,2) not null default 0, -- saldo em tempo real
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "admin acesso total ingredients"
  on public.ingredients for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- MOVIMENTAÇÕES DE ESTOQUE (equivalente ao bloco "Lançamentos para controle de estoque") ----------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  movement_date date not null,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(10,2) not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;

create policy "admin acesso total stock_movements"
  on public.stock_movements for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_stock_movements_ingredient on public.stock_movements(ingredient_id);
create index if not exists idx_cash_entries_date on public.cash_entries(entry_date);
