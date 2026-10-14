-- =====================================================================
-- AJUSTES DO ADMIN: categorias do calendário, observações das receitas
-- e fichas técnicas. Idempotente — pode rodar mais de uma vez.
-- =====================================================================

-- 1) Categorias do calendário (nome + cor), criadas pela Giovanna
create table if not exists public.calendar_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  color text not null default '#F06292',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
insert into public.calendar_categories (key, name, color, sort_order) values
  ('encomenda', 'Encomenda', '#F06292', 1),
  ('producao',  'Produção',  '#6A9BD8', 2),
  ('outro',     'Outro',     '#8C6B76', 3)
on conflict (key) do nothing;
alter table public.calendar_categories enable row level security;
drop policy if exists "admin acesso total calendar_categories" on public.calendar_categories;
create policy "admin acesso total calendar_categories" on public.calendar_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- eventos passam a aceitar qualquer categoria criada
alter table public.production_events drop constraint if exists production_events_category_check;

-- 2) Observações nas receitas
alter table public.recipes add column if not exists notes text;

-- 3) Fichas técnicas (título + tabela livre: ingrediente | quantidade | descrição)
create table if not exists public.tech_sheets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.tech_sheet_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.tech_sheets(id) on delete cascade,
  ingredient text not null default '',
  quantity text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tech_sheet_rows_sheet on public.tech_sheet_rows(sheet_id);
alter table public.tech_sheets enable row level security;
alter table public.tech_sheet_rows enable row level security;
drop policy if exists "admin acesso total tech_sheets" on public.tech_sheets;
create policy "admin acesso total tech_sheets" on public.tech_sheets
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total tech_sheet_rows" on public.tech_sheet_rows;
create policy "admin acesso total tech_sheet_rows" on public.tech_sheet_rows
  for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
