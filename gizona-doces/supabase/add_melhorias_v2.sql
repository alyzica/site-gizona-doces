-- =====================================================================
-- MELHORIAS V2: delivery "mais vendido", galeria de inspirações,
-- datas comemorativas. Rode DEPOIS dos scripts anteriores. Idempotente,
-- não apaga dados.
-- =====================================================================

-- 1) Catálogo do delivery com total vendido e selo "mais vendido"
--    (os 3 produtos com mais unidades vendidas, desconsiderando pedidos cancelados)
drop function if exists public.delivery_catalog();
create or replace function public.delivery_catalog()
returns table (
  id uuid, name text, price numeric, description text, image_url text,
  image_scale numeric, image_position_x numeric, image_position_y numeric,
  stock integer, sold_total integer, best_seller boolean
)
language sql stable security definer set search_path = public as $$
  with sold as (
    select ds.product_id, sum(ds.quantity)::integer as q
    from public.delivery_sales ds
    left join public.orders o on o.id = ds.order_id
    where o.id is null or o.status <> 'cancelled'
    group by ds.product_id
  ), ranked as (
    select product_id, q, row_number() over (order by q desc) as rk from sold where q > 0
  )
  select p.id, p.name, p.price, p.description, p.image_url,
         p.image_scale, p.image_position_x, p.image_position_y,
         greatest(public.delivery_stock_of(p.id), 0)::integer,
         coalesce(r.q, 0)::integer,
         (r.rk is not null and r.rk <= 3)
  from public.products p
  left join ranked r on r.product_id = p.id
  where p.category = 'delivery' and p.active = true
    and exists (select 1 from public.delivery_settings s where s.id = 1 and s.delivery_open)
  order by p.sort_order, p.name;
$$;
grant execute on function public.delivery_catalog() to anon, authenticated;

-- 2) Galeria de inspirações (aba Encomendas)
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gallery_photos enable row level security;
drop policy if exists "gallery leitura publica" on public.gallery_photos;
create policy "gallery leitura publica" on public.gallery_photos for select using (visible = true or public.is_admin());
drop policy if exists "admin acesso total gallery_photos" on public.gallery_photos;
create policy "admin acesso total gallery_photos" on public.gallery_photos for all using (public.is_admin()) with check (public.is_admin());
grant select on public.gallery_photos to anon, authenticated;

-- 3) Lembretes de datas comemorativas: o que foi concluído / dispensado, por ano
create table if not exists public.holiday_plans (
  holiday_key text not null,
  year integer not null,
  done boolean not null default false,
  dismissed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (holiday_key, year)
);
alter table public.holiday_plans enable row level security;
drop policy if exists "admin acesso total holiday_plans" on public.holiday_plans;
create policy "admin acesso total holiday_plans" on public.holiday_plans for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';


-- =====================================================================
-- 4) CLIENTES + FIDELIDADE UNIFICADOS
-- =====================================================================
-- 4.1) Permite cadastrar cliente manualmente pelo admin (sem login no site).
--      Remove só a amarração obrigatória com o login; nenhum dado é apagado.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.customers'::regclass and contype = 'f'
             and confrelid = 'auth.users'::regclass loop
    execute format('alter table public.customers drop constraint %I', c);
  end loop;
end $$;
alter table public.customers alter column id set default gen_random_uuid();
alter table public.customers alter column cpf drop not null;
alter table public.customers alter column phone drop not null;
alter table public.customers alter column email drop not null;
alter table public.customers add column if not exists manual boolean not null default false;

-- Se uma pessoa cadastrada à mão depois criar conta com o mesmo CPF, une os dois
-- (pedidos, pontos e histórico passam para a conta nova).
create or replace function public.customers_before_merge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cpf is not null then
    update public.customers set cpf = cpf || '#m' where manual and cpf = new.cpf and id <> new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_customers_before_merge on public.customers;
create trigger trg_customers_before_merge before insert on public.customers
  for each row execute function public.customers_before_merge();

create or replace function public.customers_after_merge() returns trigger
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if new.cpf is null then return new; end if;
  for o in select id from public.customers where manual and cpf = new.cpf || '#m' loop
    update public.orders set customer_id = new.id where customer_id = o.id;
    update public.loyalty_movements set customer_id = new.id where customer_id = o.id;
    if not exists (select 1 from public.loyalty_cards where customer_id = new.id) then
      update public.loyalty_cards set customer_id = new.id where customer_id = o.id;
    end if;
    delete from public.customers where id = o.id;
  end loop;
  return new;
end $$;

-- 4.2) Histórico de movimentação de pontos
create table if not exists public.loyalty_movements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  delta integer not null,
  balance integer not null,
  kind text not null default 'credito',   -- credito | manual | resgate
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_loyalty_movements_customer on public.loyalty_movements(customer_id, created_at desc);
alter table public.loyalty_movements enable row level security;
drop policy if exists "admin acesso total loyalty_movements" on public.loyalty_movements;
create policy "admin acesso total loyalty_movements" on public.loyalty_movements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cliente ve proprios movimentos" on public.loyalty_movements;
create policy "cliente ve proprios movimentos" on public.loyalty_movements for select using (customer_id = auth.uid());

drop trigger if exists trg_customers_after_merge on public.customers;
create trigger trg_customers_after_merge after insert on public.customers
  for each row execute function public.customers_after_merge();

create or replace function public.log_loyalty_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare d integer; r text; k text;
begin
  d := coalesce(new.points, 0) - case when TG_OP = 'INSERT' then 0 else coalesce(old.points, 0) end;
  if d = 0 then return new; end if;
  r := nullif(current_setting('gizona.loy_reason', true), '');
  k := case when TG_OP = 'UPDATE' and new.rewards_claimed > old.rewards_claimed then 'resgate'
            when r is not null then 'manual' else 'credito' end;
  insert into public.loyalty_movements (customer_id, delta, balance, kind, reason)
  values (new.customer_id, d, new.points, k,
          coalesce(r, case when k = 'credito' then 'Pontos por pedido concluído' else 'Ajuste' end));
  return new;
end $$;
drop trigger if exists trg_log_loyalty_movement on public.loyalty_cards;
create trigger trg_log_loyalty_movement after insert or update of points, rewards_claimed on public.loyalty_cards
  for each row execute function public.log_loyalty_movement();

-- 4.3) Resgate feito pelo cliente no site passa a registrar o nome do mimo no histórico
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  reward_row public.rewards%rowtype;
  card_row public.loyalty_cards%rowtype;
  new_points integer;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  select * into reward_row from public.rewards where id = p_reward_id and active = true;
  if not found then raise exception 'Mimo não encontrado ou inativo'; end if;
  select * into card_row from public.loyalty_cards where customer_id = auth.uid() for update;
  if not found then raise exception 'Cliente ainda não possui cartão fidelidade'; end if;
  if card_row.points < reward_row.points_required then raise exception 'Pontos insuficientes'; end if;
  new_points := card_row.points - reward_row.points_required;
  perform set_config('gizona.loy_reason', 'Resgate: ' || reward_row.name, true);
  update public.loyalty_cards set points = new_points, rewards_claimed = rewards_claimed + 1 where customer_id = auth.uid();
  return jsonb_build_object('success', true, 'reward_id', reward_row.id, 'reward_name', reward_row.name,
    'points_spent', reward_row.points_required, 'remaining_points', new_points);
end $$;
revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- 4.4) Ajuste manual de pontos pelo admin (com motivo no histórico)
create or replace function public.admin_adjust_points(p_customer uuid, p_delta integer, p_reason text default '')
returns integer language plpgsql security definer set search_path = public as $$
declare cur integer; nxt integer;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  insert into public.loyalty_cards (customer_id, points, completed_orders, rewards_claimed)
  values (p_customer, 0, 0, 0) on conflict (customer_id) do nothing;
  select points into cur from public.loyalty_cards where customer_id = p_customer for update;
  nxt := greatest(0, coalesce(cur, 0) + p_delta);
  perform set_config('gizona.loy_reason', coalesce(nullif(trim(p_reason), ''), case when p_delta >= 0 then 'Pontos adicionados manualmente' else 'Pontos removidos manualmente' end), true);
  update public.loyalty_cards set points = nxt where customer_id = p_customer;
  return nxt;
end $$;
revoke all on function public.admin_adjust_points(uuid, integer, text) from public;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated;

-- 4.5) Resgate registrado pelo admin (balcão / WhatsApp)
create or replace function public.admin_redeem_reward(p_customer uuid, p_reward uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare rw public.rewards%rowtype; cur integer; nxt integer;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into rw from public.rewards where id = p_reward;
  if not found then raise exception 'Mimo não encontrado'; end if;
  select points into cur from public.loyalty_cards where customer_id = p_customer for update;
  if cur is null or cur < rw.points_required then raise exception 'Pontos insuficientes'; end if;
  nxt := cur - rw.points_required;
  perform set_config('gizona.loy_reason', 'Resgate: ' || rw.name || ' (registrado pelo admin)', true);
  update public.loyalty_cards set points = nxt, rewards_claimed = rewards_claimed + 1 where customer_id = p_customer;
  return nxt;
end $$;
revoke all on function public.admin_redeem_reward(uuid, uuid) from public;
grant execute on function public.admin_redeem_reward(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
