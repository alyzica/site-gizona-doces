-- =====================================================================
-- Gizona Doces — Baixa de estoque (perda/vencimento), validade de levas,
-- congelados/descongelamento e planejamento de produção.
-- Idempotente e não destrutivo (pode rodar mais de uma vez).
-- Rode DEPOIS dos scripts anteriores (v3, v4 etc.).
-- =====================================================================

-- 1) Validade nas levas do estoque de produtos -------------------------
alter table public.delivery_stock_batches add column if not exists expires_at date;
alter table public.delivery_stock_batches add column if not exists origin text not null default 'producao';
alter table public.delivery_stock_batches add column if not exists frozen_batch_id uuid;

-- 2) Baixas por perda / vencimento (saída que NÃO é venda) --------------
create table if not exists public.delivery_stock_writeoffs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_id uuid references public.delivery_stock_batches(id) on delete set null,
  quantity integer not null check (quantity > 0),
  reason text not null default 'vencido' check (reason in ('vencido','avaria','erro_producao','outro')),
  note text,
  unit_value numeric(10,2) not null default 0,       -- preço de venda do produto no dia da baixa (p/ valorizar a perda)
  written_off_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_writeoffs_product on public.delivery_stock_writeoffs(product_id);
create index if not exists idx_writeoffs_date on public.delivery_stock_writeoffs(written_off_at);
alter table public.delivery_stock_writeoffs enable row level security;
drop policy if exists "admin acesso total delivery_stock_writeoffs" on public.delivery_stock_writeoffs;
create policy "admin acesso total delivery_stock_writeoffs" on public.delivery_stock_writeoffs
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Estoque disponível passa a descontar as baixas ----------------------
create or replace function public.delivery_stock_of(p_product uuid) returns integer
language sql stable security definer as $$
  select coalesce((select sum(quantity) from public.delivery_stock_batches where product_id = p_product), 0)
       - coalesce((select sum(quantity) from public.delivery_sales where product_id = p_product and not reversed), 0)
       - coalesce((select sum(quantity) from public.delivery_stock_writeoffs where product_id = p_product), 0);
$$;

-- não deixa dar baixa de mais do que existe em estoque
create or replace function public.fn_writeoff_check() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if public.delivery_stock_of(new.product_id) < new.quantity then
    raise exception 'Estoque insuficiente para dar baixa';
  end if;
  return new;
end $$;
drop trigger if exists trg_writeoff_check on public.delivery_stock_writeoffs;
create trigger trg_writeoff_check before insert on public.delivery_stock_writeoffs
  for each row execute function public.fn_writeoff_check();

-- 4) Virada de mês: o saldo transferido também desconta as baixas -------
create or replace function public.rollover_delivery_stock() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  cur date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  first_m date; m date; p record; bal integer; n integer := 0;
begin
  select min(d) into first_m from (
    select date_trunc('month', produced_at)::date as d from public.delivery_stock_batches
    union all
    select date_trunc('month', sold_at)::date from public.delivery_sales
    union all
    select date_trunc('month', written_off_at)::date from public.delivery_stock_writeoffs
  ) x;
  if first_m is null or first_m >= cur then return 0; end if;

  perform pg_advisory_xact_lock(7419001);
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
        - coalesce((select sum(w.quantity) from public.delivery_stock_writeoffs w
                     where w.product_id = p.id and date_trunc('month', w.written_off_at)::date = m), 0)
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

-- 5) Congelados: produção guardada no freezer (ainda NÃO é estoque de venda)
create table if not exists public.frozen_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  frozen_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.frozen_thaws (
  id uuid primary key default gen_random_uuid(),
  frozen_batch_id uuid not null references public.frozen_batches(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  thawed_at date not null default current_date,
  expires_at date not null,                       -- validade definida por você na hora de descongelar
  stock_batch_id uuid references public.delivery_stock_batches(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_frozen_thaws_batch on public.frozen_thaws(frozen_batch_id);
alter table public.frozen_batches enable row level security;
alter table public.frozen_thaws enable row level security;
drop policy if exists "admin acesso total frozen_batches" on public.frozen_batches;
create policy "admin acesso total frozen_batches" on public.frozen_batches for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total frozen_thaws" on public.frozen_thaws;
create policy "admin acesso total frozen_thaws" on public.frozen_thaws for all using (public.is_admin()) with check (public.is_admin());

-- Descongelar: tira do freezer e entra no estoque de produtos com a validade informada
create or replace function public.thaw_frozen_batch(p_frozen uuid, p_qty integer, p_expires date, p_thawed date default current_date)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare fb record; left_qty integer; v_price numeric; sb uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantidade inválida'; end if;
  if p_expires is null then raise exception 'Informe a validade'; end if;
  select * into fb from public.frozen_batches where id = p_frozen for update;
  if not found then raise exception 'Leva congelada não encontrada'; end if;
  left_qty := fb.quantity - coalesce((select sum(quantity) from public.frozen_thaws where frozen_batch_id = p_frozen), 0);
  if p_qty > left_qty then raise exception 'Só restam % no freezer', left_qty; end if;
  select coalesce(pr.price, 0) into v_price from public.products pr where pr.id = fb.product_id;
  insert into public.delivery_stock_batches (product_id, quantity, unit_price, note, produced_at, expires_at, origin, frozen_batch_id)
  values (fb.product_id, p_qty, v_price, 'Descongelado (congelado em ' || to_char(fb.frozen_at, 'DD/MM/YYYY') || ')', p_thawed, p_expires, 'descongelado', fb.id)
  returning id into sb;
  insert into public.frozen_thaws (frozen_batch_id, quantity, thawed_at, expires_at, stock_batch_id)
  values (p_frozen, p_qty, p_thawed, p_expires, sb);
  return sb;
end $$;

-- Desfazer um descongelamento (só se o estoque ainda comportar)
create or replace function public.undo_thaw(p_thaw uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare t record; pid uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into t from public.frozen_thaws where id = p_thaw for update;
  if not found then return; end if;
  select product_id into pid from public.delivery_stock_batches where id = t.stock_batch_id;
  if pid is not null and public.delivery_stock_of(pid) < t.quantity then
    raise exception 'Parte desse lote já foi vendida ou baixada; não dá para desfazer';
  end if;
  delete from public.frozen_thaws where id = p_thaw;
  if t.stock_batch_id is not null then delete from public.delivery_stock_batches where id = t.stock_batch_id; end if;
end $$;

-- 6) Planejamento de produção (alimenta o calendário e a lista de compras) -
create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,                                    -- como você chama (ex.: "Bolo de pote Ninho com Nutella")
  product_id uuid references public.products(id) on delete set null,   -- produto do estoque, se houver
  recipe_id uuid references public.recipes(id) on delete set null,     -- receita usada p/ a lista de compras
  recipe_batches numeric(10,2) not null default 1,        -- quantas vezes a receita será feita
  target_qty integer,                                     -- quantas unidades devem sair (opcional)
  kind text not null default 'congelado' check (kind in ('congelado','fresco')),
  planned_date date,
  status text not null default 'planejado' check (status in ('planejado','comprado','produzido')),
  note text,
  event_ids jsonb not null default '[]'::jsonb,           -- eventos criados no calendário
  created_at timestamptz not null default now()
);
alter table public.production_plans enable row level security;
drop policy if exists "admin acesso total production_plans" on public.production_plans;
create policy "admin acesso total production_plans" on public.production_plans for all using (public.is_admin()) with check (public.is_admin());

-- Itens iniciais do plano (a sua lista). Só entram se ainda não existirem.
insert into public.production_plans (title, product_id, kind, note)
select v.title,
       (select p.id from public.products p where p.category = 'delivery' and p.name = v.pname limit 1),
       v.kind, v.note
from (values
  ('Bolo de pote Choconinho',                null,                                 'congelado', 'Produto ainda não cadastrado em Produtos → Delivery'),
  ('Bolo de pote Ninho com Nutella',         'Bolo de pote Ninho com Nutella',     'congelado', null),
  ('Bolo gelado Maracujá com Brigadeiro',    null,                                 'congelado', 'No cadastro existe "Bolo gelado de Maracujá com Chocolate" — vincule se for o mesmo'),
  ('Bolo gelado de Prestígio',               'Bolo gelado de Prestígio',           'congelado', null),
  ('Bolo gelado de Cocada Cremosa',          'Bolo gelado de Cocada Cremosa',      'congelado', null),
  ('Geladinhos de morango (geral)',          null,                                 'fresco',    'Produzir geladinhos de morango em geral')
) as v(title, pname, kind, note)
where not exists (select 1 from public.production_plans pp where pp.title = v.title);

notify pgrst, 'reload schema';
