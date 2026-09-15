-- ============================================================
-- FASE 3: Precificação (custo de receitas)
-- Rode este script no SQL Editor do Supabase, DEPOIS de já ter
-- rodado o add_financeiro_estoque.sql (usa a tabela ingredients).
-- ============================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  yield_qty numeric(10,2) not null default 1, -- quantas unidades a receita rende
  yield_unit text not null default 'unidades',
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
create policy "admin acesso total recipes"
  on public.recipes for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(10,3) not null check (quantity > 0), -- quantidade usada, na mesma unidade do ingrediente
  created_at timestamptz not null default now()
);

alter table public.recipe_ingredients enable row level security;
create policy "admin acesso total recipe_ingredients"
  on public.recipe_ingredients for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_recipe_ingredients_recipe on public.recipe_ingredients(recipe_id);
