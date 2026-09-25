-- ============================================================
-- RECEITAS (unidade de rendimento) + PRECIFICAÇÃO (ingrediente
-- e/ou receita) + CALENDÁRIO DE PRODUÇÃO (manual)
-- Rode no SQL Editor do Supabase, depois dos scripts anteriores.
-- ============================================================

-- ---------- PEDIDOS: tipo (encomenda / delivery) — prepara pro filtro no admin ----------
alter table public.orders
  add column if not exists order_type text not null default 'encomenda' check (order_type in ('encomenda', 'delivery'));

update public.recipes set yield_unit = 'unidade' where yield_unit in ('unidades', 'un', 'uni', 'Unidade', 'Unidades');
update public.recipes set yield_unit = 'g' where yield_unit in ('gramas', 'G', 'Gramas');
update public.recipes set yield_unit = 'kg' where yield_unit in ('quilos', 'KG', 'Kg');
update public.recipes set yield_unit = 'ml' where yield_unit in ('ML', 'Ml');
update public.recipes set yield_unit = 'l' where yield_unit in ('litros', 'L', 'Litros');
-- qualquer outro valor fora do padrão vira 'unidade' (evita travar a migração; pode ajustar depois no admin)
update public.recipes set yield_unit = 'unidade' where yield_unit not in ('g', 'kg', 'ml', 'l', 'unidade');

alter table public.recipes drop constraint if exists recipes_yield_unit_check;
alter table public.recipes add constraint recipes_yield_unit_check
  check (yield_unit in ('g', 'kg', 'ml', 'l', 'unidade'));

-- ---------- PRECIFICAÇÃO: configurações salvas ----------
create table if not exists public.pricings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variable_pct numeric(6,2) not null default 0,   -- custos variáveis (%)
  markup_pct numeric(6,2) not null default 0,      -- markup sobre o custo (%)
  produced_qty numeric(10,2) not null default 1,   -- quantidade produzida
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricings
  add column if not exists manual_sale_price numeric(10,2);

drop policy if exists "admin acesso total pricings" on public.pricings;
create policy "admin acesso total pricings"
  on public.pricings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- PRECIFICAÇÃO: itens (pode ser ingrediente OU receita) ----------
create table if not exists public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  pricing_id uuid not null references public.pricings(id) on delete cascade,
  item_type text not null check (item_type in ('ingredient', 'recipe')),
  ingredient_id uuid references public.ingredients(id) on delete restrict,
  recipe_id uuid references public.recipes(id) on delete restrict,
  quantity numeric(10,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint pricing_items_item_ref_check check (
    (item_type = 'ingredient' and ingredient_id is not null and recipe_id is null)
    or
    (item_type = 'recipe' and recipe_id is not null and ingredient_id is null)
  )
);

alter table public.pricing_items enable row level security;
drop policy if exists "admin acesso total pricing_items" on public.pricing_items;
create policy "admin acesso total pricing_items"
  on public.pricing_items for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_pricing_items_pricing on public.pricing_items(pricing_id);

-- ---------- CALENDÁRIO DE PRODUÇÃO (100% manual, sem automação) ----------
create table if not exists public.production_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  event_time time,
  title text not null,
  description text,
  note text,
  category text not null default 'producao' check (category in ('encomenda', 'producao', 'outro')),
  created_at timestamptz not null default now()
);

alter table public.production_events
  add column if not exists category text not null default 'producao';
alter table public.production_events drop constraint if exists production_events_category_check;
alter table public.production_events add constraint production_events_category_check
  check (category in ('encomenda', 'producao', 'outro'));

alter table public.production_events enable row level security;
drop policy if exists "admin acesso total production_events" on public.production_events;
create policy "admin acesso total production_events"
  on public.production_events for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_production_events_date on public.production_events(event_date);
