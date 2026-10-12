-- =====================================================================
-- SACOLA ÚNICA + CUPONS + ENTREGA ESTIMADA
-- Rode DEPOIS dos scripts anteriores (delivery). Idempotente.
-- =====================================================================

-- 1) Novas colunas nos pedidos ----------------------------------------
alter table public.orders add column if not exists subtotal_amount numeric(10,2);
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table public.orders add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists fulfillment text not null default 'pickup';
alter table public.orders add column if not exists cart_group uuid;
alter table public.orders drop constraint if exists orders_fulfillment_check;
alter table public.orders add constraint orders_fulfillment_check check (fulfillment in ('pickup','delivery'));
create index if not exists idx_orders_cart_group on public.orders(cart_group);

-- 2) Configuração da entrega (linha única) ------------------------------
create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  store_address text,
  store_lat numeric(10,6),
  store_lng numeric(10,6),
  road_factor numeric(4,2) not null default 1.30,   -- distância em linha reta x fator = km de rua
  max_delivery_km numeric(6,2) not null default 15,
  free_delivery_over numeric(10,2),                  -- frete grátis acima deste valor (opcional)
  estimate_note text not null default 'Valor estimado. Pode haver reajuste conforme o trajeto e a demanda do momento.'
);
insert into public.store_settings (id, store_address)
values (1, 'Rua das Oliveiras, 74 - Vale das Nogueiras, Americana - SP')
on conflict (id) do nothing;

create table if not exists public.delivery_fee_tiers (
  id uuid primary key default gen_random_uuid(),
  up_to_km numeric(6,2) not null,
  fee numeric(10,2) not null
);
-- faixas iniciais (ajuste no admin conforme o que o 99 cobra)
insert into public.delivery_fee_tiers (up_to_km, fee)
select * from (values (3::numeric, 9::numeric), (6, 13), (10, 18), (15, 25)) v(a, b)
where not exists (select 1 from public.delivery_fee_tiers);

-- 3) Cupons -------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  type text not null check (type in ('percent','fixed','free_delivery')),
  value numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  min_order numeric(10,2) not null default 0,
  applies_to text not null default 'all' check (applies_to in ('all','encomenda','delivery')),
  starts_at date,
  expires_at date,
  usage_limit integer,
  per_customer_limit integer default 1,
  first_order_only boolean not null default false,
  public_listed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_coupons_code on public.coupons (upper(code));

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  cart_group uuid,
  customer_id uuid,
  customer_phone text,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_redemptions_coupon on public.coupon_redemptions(coupon_id);
create index if not exists idx_redemptions_group on public.coupon_redemptions(cart_group);

-- 4) Segurança ----------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.delivery_fee_tiers enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
drop policy if exists "admin total store_settings" on public.store_settings;
create policy "admin total store_settings" on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin total delivery_fee_tiers" on public.delivery_fee_tiers;
create policy "admin total delivery_fee_tiers" on public.delivery_fee_tiers for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin total coupons" on public.coupons;
create policy "admin total coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin total coupon_redemptions" on public.coupon_redemptions;
create policy "admin total coupon_redemptions" on public.coupon_redemptions for all using (public.is_admin()) with check (public.is_admin());

-- 5) Entrega: dados públicos para o site calcular a estimativa -------------
create or replace function public.delivery_settings_public() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'store_address', s.store_address, 'lat', s.store_lat, 'lng', s.store_lng,
    'road_factor', s.road_factor, 'max_km', s.max_delivery_km,
    'free_over', s.free_delivery_over, 'note', s.estimate_note,
    'tiers', coalesce((select jsonb_agg(jsonb_build_object('up_to_km', t.up_to_km, 'fee', t.fee) order by t.up_to_km) from public.delivery_fee_tiers t), '[]'::jsonb)
  ) from public.store_settings s where s.id = 1;
$$;
grant execute on function public.delivery_settings_public() to anon, authenticated;

-- 6) Cupons: validação (mostra o desconto) e resgate (consome o uso) ----------
create or replace function public.validate_coupon(
  p_code text, p_enc numeric, p_del numeric, p_fee numeric, p_customer uuid, p_phone text
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons%rowtype; elig numeric; disc numeric := 0; phone text; used_total int; used_cust int; has_orders boolean;
begin
  phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  select * into c from public.coupons where upper(code) = upper(trim(coalesce(p_code, ''))) limit 1;
  if not found or not c.active then return jsonb_build_object('valid', false, 'message', 'Cupom inválido ou inexistente.'); end if;
  if c.starts_at is not null and current_date < c.starts_at then return jsonb_build_object('valid', false, 'message', 'Este cupom ainda não começou.'); end if;
  if c.expires_at is not null and current_date > c.expires_at then return jsonb_build_object('valid', false, 'message', 'Este cupom expirou.'); end if;

  elig := case c.applies_to when 'encomenda' then coalesce(p_enc,0) when 'delivery' then coalesce(p_del,0) else coalesce(p_enc,0) + coalesce(p_del,0) end;
  if elig <= 0 then
    return jsonb_build_object('valid', false, 'message', case c.applies_to when 'encomenda' then 'Este cupom vale só para encomendas.' when 'delivery' then 'Este cupom vale só para delivery.' else 'Sua sacola está vazia.' end);
  end if;
  if elig < c.min_order then
    return jsonb_build_object('valid', false, 'message', 'Pedido mínimo de R$ ' || to_char(c.min_order, 'FM999990D00') || ' para usar este cupom.');
  end if;

  if c.usage_limit is not null then
    select count(*) into used_total from public.coupon_redemptions where coupon_id = c.id;
    if used_total >= c.usage_limit then return jsonb_build_object('valid', false, 'message', 'Este cupom esgotou.'); end if;
  end if;
  if c.per_customer_limit is not null and (p_customer is not null or phone <> '') then
    select count(*) into used_cust from public.coupon_redemptions
      where coupon_id = c.id and ((p_customer is not null and customer_id = p_customer) or (phone <> '' and customer_phone = phone));
    if used_cust >= c.per_customer_limit then return jsonb_build_object('valid', false, 'message', 'Você já utilizou este cupom.'); end if;
  end if;
  if c.first_order_only and (p_customer is not null or phone <> '') then
    select exists (select 1 from public.orders o where o.status <> 'cancelled'
      and ((p_customer is not null and o.customer_id = p_customer) or (phone <> '' and regexp_replace(o.customer_phone, '\D', '', 'g') = phone))) into has_orders;
    if has_orders then return jsonb_build_object('valid', false, 'message', 'Cupom válido apenas para o primeiro pedido.'); end if;
  end if;

  if c.type = 'percent' then
    disc := round(elig * c.value / 100, 2);
    if c.max_discount is not null then disc := least(disc, c.max_discount); end if;
  elsif c.type = 'fixed' then
    disc := least(c.value, elig);
  end if;

  return jsonb_build_object('valid', true, 'message', 'Cupom aplicado!', 'code', upper(c.code), 'description', c.description,
    'type', c.type, 'discount', disc, 'free_delivery', (c.type = 'free_delivery'), 'applies_to', c.applies_to);
end; $$;

create or replace function public.redeem_coupon(
  p_code text, p_group uuid, p_enc numeric, p_del numeric, p_fee numeric, p_customer uuid, p_phone text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; cid uuid;
begin
  -- trava o cupom para evitar dois resgates simultâneos do último uso
  select id into cid from public.coupons where upper(code) = upper(trim(coalesce(p_code,''))) for update;
  r := public.validate_coupon(p_code, p_enc, p_del, p_fee, p_customer, p_phone);
  if (r->>'valid')::boolean then
    insert into public.coupon_redemptions (coupon_id, cart_group, customer_id, customer_phone, amount)
    values (cid, p_group, p_customer, nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), ''),
            coalesce((r->>'discount')::numeric, 0));
  end if;
  return r;
end; $$;

create or replace function public.release_coupon(p_group uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.coupon_redemptions where cart_group = p_group;
$$;

create or replace function public.list_public_coupons() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', upper(code), 'description', description, 'type', type, 'value', value,
         'min_order', min_order, 'applies_to', applies_to, 'expires_at', expires_at) order by created_at desc), '[]'::jsonb)
  from public.coupons
  where active and public_listed
    and (starts_at is null or current_date >= starts_at)
    and (expires_at is null or current_date <= expires_at)
    and (usage_limit is null or (select count(*) from public.coupon_redemptions r where r.coupon_id = coupons.id) < usage_limit);
$$;

grant execute on function public.validate_coupon(text, numeric, numeric, numeric, uuid, text) to anon, authenticated;
grant execute on function public.redeem_coupon(text, uuid, numeric, numeric, numeric, uuid, text) to anon, authenticated;
grant execute on function public.release_coupon(uuid) to anon, authenticated;
grant execute on function public.list_public_coupons() to anon, authenticated;

-- 7) Pedido cancelado/excluído libera o uso do cupom (se TODOS os pedidos da sacola saíram)
create or replace function public.fn_free_coupon_if_group_dead() returns trigger
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  g := case when TG_OP = 'DELETE' then old.cart_group else new.cart_group end;
  if g is not null and not exists (select 1 from public.orders where cart_group = g and status <> 'cancelled') then
    delete from public.coupon_redemptions where cart_group = g;
  end if;
  return null;
end; $$;
drop trigger if exists trg_free_coupon_cancel on public.orders;
create trigger trg_free_coupon_cancel after update of status on public.orders
  for each row when (new.status = 'cancelled') execute function public.fn_free_coupon_if_group_dead();
drop trigger if exists trg_free_coupon_delete on public.orders;
create trigger trg_free_coupon_delete after delete on public.orders
  for each row execute function public.fn_free_coupon_if_group_dead();

notify pgrst, 'reload schema';
