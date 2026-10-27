-- =====================================================================
-- Gizona Doces — Produção e Congelados (reestruturação)
-- Idempotente e não destrutivo. Rode DEPOIS de add_baixa_congelados_planejamento.sql.
-- Não altera Precificação, Receitas, Estoque de insumos nem Estoque de produtos
-- (só lê as composições e grava as movimentações pelas regras já existentes).
-- =====================================================================

-- 1) Prazos e vínculo por produto (um registro por produto da Precificação)
create table if not exists public.production_settings (
  pricing_id   uuid primary key references public.pricings(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,   -- produto do Estoque de produtos
  freezer_days integer check (freezer_days is null or freezer_days > 0),  -- validade no freezer (dias) — você define
  thaw_days    integer check (thaw_days    is null or thaw_days    > 0),  -- validade após descongelar (dias) — você define
  updated_at   timestamptz not null default now()
);
create table if not exists public.production_config (
  id int primary key default 1 check (id = 1),
  alert_days integer not null default 7 check (alert_days >= 0)           -- aviso de vencimento do freezer
);
insert into public.production_config (id) values (1) on conflict (id) do nothing;
alter table public.production_settings enable row level security;
alter table public.production_config  enable row level security;
drop policy if exists "admin acesso total production_settings" on public.production_settings;
create policy "admin acesso total production_settings" on public.production_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total production_config" on public.production_config;
create policy "admin acesso total production_config" on public.production_config for all using (public.is_admin()) with check (public.is_admin());

-- 2) Produções confirmadas (histórico + proteção contra confirmar duas vezes)
create table if not exists public.production_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.production_plans(id) on delete set null,
  pricing_id uuid references public.pricings(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  recipe_batches numeric(10,2) not null,
  expected_qty numeric(12,2),
  produced_qty integer not null check (produced_qty > 0),
  frozen_qty integer not null check (frozen_qty >= 0),
  stock_qty integer not null check (stock_qty >= 0),
  produced_at date not null,
  frozen_at date,
  freezer_expires_at date,
  fresh_expires_at date,
  consumption jsonb not null default '[]'::jsonb,       -- insumos descontados nesta produção
  note text,
  created_at timestamptz not null default now(),
  constraint production_runs_split_chk check (frozen_qty <= produced_qty and stock_qty = produced_qty - frozen_qty)
);
create unique index if not exists uq_production_runs_plan on public.production_runs(plan_id) where plan_id is not null;
alter table public.production_runs enable row level security;
drop policy if exists "admin acesso total production_runs" on public.production_runs;
create policy "admin acesso total production_runs" on public.production_runs for all using (public.is_admin()) with check (public.is_admin());

-- 3) Colunas novas (todas opcionais: lotes e planos antigos continuam válidos)
alter table public.frozen_batches   add column if not exists expires_at date;
alter table public.frozen_batches   add column if not exists produced_at date;
alter table public.frozen_batches   add column if not exists lot_code text;
alter table public.frozen_batches   add column if not exists production_run_id uuid references public.production_runs(id) on delete set null;
alter table public.production_plans add column if not exists pricing_id uuid references public.pricings(id) on delete set null;
alter table public.production_plans add column if not exists production_run_id uuid references public.production_runs(id) on delete set null;

-- código de lote automático (ex.: L261027-01) para qualquer lote novo
create or replace function public.fn_frozen_lot_code() returns trigger language plpgsql as $$
begin
  if new.lot_code is null or new.lot_code = '' then
    new.lot_code := 'L' || to_char(coalesce(new.frozen_at, current_date), 'YYMMDD') || '-' ||
      lpad(((select count(*) from public.frozen_batches f
              where f.product_id = new.product_id and f.frozen_at = coalesce(new.frozen_at, current_date)) + 1)::text, 2, '0');
  end if;
  return new;
end $$;
drop trigger if exists trg_frozen_lot_code on public.frozen_batches;
create trigger trg_frozen_lot_code before insert on public.frozen_batches
  for each row execute function public.fn_frozen_lot_code();

-- 4) Cálculo dos insumos a partir da composição da Precificação.
--    Insumo direto: quantidade × nº de receitas de produção.
--    Receita: (quantidade usada ÷ rendimento da receita) × quantidade de cada insumo da receita × nº de receitas.
--    Soma insumos repetidos. NÃO multiplica pelo rendimento em unidades do produto final.
create or replace function public.production_requirements(p_pricing uuid, p_batches numeric)
returns table (ingredient_id uuid, ingredient_name text, unit text, needed numeric, in_stock numeric, missing numeric)
language plpgsql stable security definer set search_path to 'public' as $$
declare bad text;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_batches is null or p_batches <= 0 then raise exception 'Informe a quantidade de receitas de produção'; end if;
  select string_agg(distinct r.name, ', ') into bad
    from public.pricing_items pi join public.recipes r on r.id = pi.recipe_id
   where pi.pricing_id = p_pricing and pi.item_type = 'recipe' and coalesce(r.yield_qty, 0) <= 0;
  if bad is not null then raise exception 'Receita sem rendimento cadastrado: %', bad; end if;
  return query
  with parts as (
    select pi.ingredient_id as ing, pi.quantity::numeric * p_batches as qty
      from public.pricing_items pi
     where pi.pricing_id = p_pricing and pi.item_type = 'ingredient'
    union all
    select ri.ingredient_id, (pi.quantity::numeric / r.yield_qty) * ri.quantity::numeric * p_batches
      from public.pricing_items pi
      join public.recipes r on r.id = pi.recipe_id
      join public.recipe_ingredients ri on ri.recipe_id = r.id
     where pi.pricing_id = p_pricing and pi.item_type = 'recipe'
  )
  select i.id, i.name, i.unit, round(sum(parts.qty), 3),
         coalesce(i.current_stock, 0)::numeric,
         greatest(0, round(sum(parts.qty), 3) - coalesce(i.current_stock, 0))
    from parts join public.ingredients i on i.id = parts.ing
   group by i.id, i.name, i.unit, i.current_stock
   order by i.name;
end $$;

-- 5) Confirmar produção: desconta insumos (uma vez), cria lote congelado e envia o resto ao estoque de produtos
create or replace function public.confirm_production(
  p_plan uuid, p_produced integer, p_frozen integer,
  p_produced_at date, p_frozen_at date, p_freezer_expires date, p_fresh_expires date, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare pl record; st record; run uuid; fb uuid; r record; prod uuid; v_price numeric; stock_n integer; cons jsonb := '[]'::jsonb; q numeric; expected numeric; pr_qty numeric; lbl text;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into pl from public.production_plans where id = p_plan for update;
  if not found then raise exception 'Plano não encontrado'; end if;
  if pl.status = 'produzido' or pl.production_run_id is not null then raise exception 'Esta produção já foi confirmada'; end if;
  if pl.pricing_id is null then raise exception 'Escolha o produto (Precificação) neste plano'; end if;
  if p_produced is null or p_produced <= 0 then raise exception 'Informe a quantidade produzida'; end if;
  if p_frozen is null or p_frozen < 0 or p_frozen > p_produced then raise exception 'A quantidade congelada não pode passar da produzida'; end if;
  stock_n := p_produced - p_frozen;
  select * into st from public.production_settings where pricing_id = pl.pricing_id;
  prod := coalesce(st.product_id, pl.product_id);
  if prod is null then raise exception 'Vincule o produto do Estoque de produtos a este item (Prazos e vínculo)'; end if;
  if p_produced_at is null then raise exception 'Informe a data de produção'; end if;
  if p_frozen > 0 and (p_frozen_at is null or p_freezer_expires is null) then raise exception 'Informe a data de congelamento e a validade no freezer'; end if;
  if p_frozen > 0 and p_freezer_expires < p_frozen_at then raise exception 'A validade do freezer não pode ser antes do congelamento'; end if;
  if stock_n > 0 and p_fresh_expires is null then raise exception 'Informe a validade das unidades que ficam no estoque de produtos'; end if;
  select name into lbl from public.pricings where id = pl.pricing_id;
  select produced_qty into pr_qty from public.pricings where id = pl.pricing_id;
  expected := coalesce(pr_qty, 0) * pl.recipe_batches;

  -- insumos: mesma regra do estoque de insumos (movimentação de saída + saldo, sem ficar negativo)
  for r in select * from public.production_requirements(pl.pricing_id, pl.recipe_batches) loop
    q := round(r.needed, 2);
    cons := cons || jsonb_build_object('ingredient_id', r.ingredient_id, 'name', r.ingredient_name, 'unit', r.unit, 'qty', r.needed);
    if q > 0 then
      insert into public.stock_movements (ingredient_id, movement_date, type, quantity, note)
      values (r.ingredient_id, p_produced_at, 'saida', q, 'Produção: ' || coalesce(lbl, pl.title) || ' (' || pl.recipe_batches || ' receita(s))');
      update public.ingredients set current_stock = greatest(0, coalesce(current_stock, 0) - q) where id = r.ingredient_id;
    end if;
  end loop;

  insert into public.production_runs (plan_id, pricing_id, product_id, recipe_batches, expected_qty, produced_qty, frozen_qty, stock_qty,
        produced_at, frozen_at, freezer_expires_at, fresh_expires_at, consumption, note)
  values (p_plan, pl.pricing_id, prod, pl.recipe_batches, expected, p_produced, p_frozen, stock_n,
        p_produced_at, case when p_frozen > 0 then p_frozen_at end, case when p_frozen > 0 then p_freezer_expires end,
        case when stock_n > 0 then p_fresh_expires end, cons, p_note)
  returning id into run;

  if p_frozen > 0 then
    insert into public.frozen_batches (product_id, quantity, frozen_at, produced_at, expires_at, note, production_run_id)
    values (prod, p_frozen, p_frozen_at, p_produced_at, p_freezer_expires, coalesce(p_note, 'Produção confirmada'), run)
    returning id into fb;
  end if;
  if stock_n > 0 then
    select coalesce(price, 0) into v_price from public.products where id = prod;
    insert into public.delivery_stock_batches (product_id, quantity, unit_price, note, produced_at, expires_at, origin)
    values (prod, stock_n, v_price, 'Produção sem congelar', p_produced_at, p_fresh_expires, 'producao');
  end if;

  update public.production_plans set status = 'produzido', production_run_id = run where id = p_plan;
  return run;
end $$;

-- 6) Descongelar: agora recusa lote vencido
create or replace function public.thaw_frozen_batch(p_frozen uuid, p_qty integer, p_expires date, p_thawed date default current_date)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare fb record; left_qty integer; v_price numeric; sb uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantidade inválida'; end if;
  if p_expires is null then raise exception 'Informe a validade'; end if;
  select * into fb from public.frozen_batches where id = p_frozen for update;
  if not found then raise exception 'Leva congelada não encontrada'; end if;
  if fb.expires_at is not null and fb.expires_at < coalesce(p_thawed, current_date) then
    raise exception 'Lote vencido em %: não pode ser transferido para venda', to_char(fb.expires_at, 'DD/MM/YYYY');
  end if;
  left_qty := fb.quantity - coalesce((select sum(quantity) from public.frozen_thaws where frozen_batch_id = p_frozen), 0);
  if p_qty > left_qty then raise exception 'Só restam % no freezer', left_qty; end if;
  select coalesce(pr.price, 0) into v_price from public.products pr where pr.id = fb.product_id;
  insert into public.delivery_stock_batches (product_id, quantity, unit_price, note, produced_at, expires_at, origin, frozen_batch_id)
  values (fb.product_id, p_qty, v_price, 'Descongelado (lote ' || coalesce(fb.lot_code, to_char(fb.frozen_at, 'DD/MM/YYYY')) || ')', p_thawed, p_expires, 'descongelado', fb.id)
  returning id into sb;
  insert into public.frozen_thaws (frozen_batch_id, quantity, thawed_at, expires_at, stock_batch_id)
  values (p_frozen, p_qty, p_thawed, p_expires, sb);
  return sb;
end $$;

notify pgrst, 'reload schema';
