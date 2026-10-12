-- =====================================================================
-- CUPONS DE DESCONTO + ESTIMATIVA DE ENTREGA + SACOLA ÚNICA
-- Rode DEPOIS dos scripts anteriores. Idempotente, não apaga dados.
-- =====================================================================

-- 1) Novas colunas nos pedidos
alter table public.orders add column if not exists subtotal numeric(10,2);
alter table public.orders add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table public.orders add column if not exists delivery_km numeric(6,2);
alter table public.orders add column if not exists coupon_code text;

-- 2) Configuração da entrega (uma única linha)
create table if not exists public.delivery_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  origin_address text not null default 'Rua das Oliveiras, 74 - Vale das Nogueiras, Americana/SP',
  origin_lat double precision,
  origin_lng double precision,
  base_fee numeric(10,2) not null default 6,
  per_km numeric(10,2) not null default 1.8,
  min_fee numeric(10,2) not null default 8,
  max_km numeric(6,2) not null default 25,
  circuity numeric(4,2) not null default 1.3,
  free_above numeric(10,2),
  note text not null default 'Valor estimado — pode haver reajuste conforme o valor cobrado pelo 99 no momento da entrega.',
  updated_at timestamptz not null default now()
);
insert into public.delivery_settings (id) values (1) on conflict (id) do nothing;
alter table public.delivery_settings enable row level security;
drop policy if exists "admin acesso total delivery_settings" on public.delivery_settings;
create policy "admin acesso total delivery_settings" on public.delivery_settings for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.shipping_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(s) - 'updated_at' from public.delivery_settings s where id = 1;
$$;
grant execute on function public.shipping_config() to anon, authenticated;

-- 3) Cupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  type text not null check (type in ('percent','fixed','free_shipping')),
  value numeric(10,2) not null default 0,
  min_order numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  applies_to text not null default 'all' check (applies_to in ('all','encomenda','delivery')),
  starts_at date,
  expires_at date,
  max_uses integer,
  max_uses_per_customer integer not null default 1,
  first_order_only boolean not null default false,
  active boolean not null default true,
  uses_count integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists coupons_code_unique on public.coupons (upper(code));

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid,
  phone text,
  discount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_redemptions_coupon on public.coupon_redemptions(coupon_id);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
drop policy if exists "admin acesso total coupons" on public.coupons;
create policy "admin acesso total coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total coupon_redemptions" on public.coupon_redemptions;
create policy "admin acesso total coupon_redemptions" on public.coupon_redemptions for all using (public.is_admin()) with check (public.is_admin());

-- 4) Validação (usada pela sacola e novamente antes de enviar)
create or replace function public.validate_coupon(
  p_code text, p_sub_enc numeric, p_sub_del numeric, p_customer uuid, p_phone text
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons%rowtype; base numeric; disc numeric := 0; phone_digits text;
        used_by int; prior int;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) limit 1;
  if not found or not c.active then
    return jsonb_build_object('valid', false, 'message', 'Cupom inválido.');
  end if;
  if c.starts_at is not null and current_date < c.starts_at then
    return jsonb_build_object('valid', false, 'message', 'Este cupom ainda não está disponível.');
  end if;
  if c.expires_at is not null and current_date > c.expires_at then
    return jsonb_build_object('valid', false, 'message', 'Este cupom expirou.');
  end if;
  if c.max_uses is not null and c.uses_count >= c.max_uses then
    return jsonb_build_object('valid', false, 'message', 'Este cupom esgotou.');
  end if;

  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  select count(*) into used_by from public.coupon_redemptions r
   where r.coupon_id = c.id
     and ((p_customer is not null and r.customer_id = p_customer)
       or (phone_digits <> '' and regexp_replace(coalesce(r.phone,''), '\D', '', 'g') = phone_digits));
  if c.max_uses_per_customer is not null and used_by >= c.max_uses_per_customer then
    return jsonb_build_object('valid', false, 'message', 'Você já utilizou este cupom.');
  end if;

  if c.first_order_only then
    select count(*) into prior from public.orders o
     where o.status <> 'cancelled'
       and ((p_customer is not null and o.customer_id = p_customer)
         or (phone_digits <> '' and regexp_replace(coalesce(o.customer_phone,''), '\D', '', 'g') = phone_digits));
    if prior > 0 then
      return jsonb_build_object('valid', false, 'message', 'Cupom válido apenas para o primeiro pedido.');
    end if;
  end if;

  base := case c.applies_to when 'encomenda' then coalesce(p_sub_enc,0)
                            when 'delivery'  then coalesce(p_sub_del,0)
                            else coalesce(p_sub_enc,0) + coalesce(p_sub_del,0) end;
  if base <= 0 then
    return jsonb_build_object('valid', false, 'message',
      case c.applies_to when 'encomenda' then 'Este cupom vale apenas para encomendas.'
                        when 'delivery' then 'Este cupom vale apenas para delivery.'
                        else 'Adicione itens à sacola para usar o cupom.' end);
  end if;
  if base < c.min_order then
    return jsonb_build_object('valid', false, 'message', 'Pedido mínimo de R$ ' || to_char(c.min_order, 'FM999990D00') || ' para este cupom.');
  end if;

  if c.type = 'percent' then
    disc := round(base * c.value / 100, 2);
    if c.max_discount is not null then disc := least(disc, c.max_discount); end if;
  elsif c.type = 'fixed' then
    disc := least(c.value, base);
  end if;

  return jsonb_build_object('valid', true, 'message', 'Cupom aplicado!', 'code', upper(c.code),
    'type', c.type, 'description', c.description, 'applies_to', c.applies_to,
    'discount', disc, 'free_shipping', c.type = 'free_shipping');
end; $$;
grant execute on function public.validate_coupon(text, numeric, numeric, uuid, text) to anon, authenticated;

-- 5) Ao criar o pedido com cupom: confere de novo e registra o uso
create or replace function public.fn_order_coupon() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype; phone_digits text; used_by int;
begin
  if new.coupon_code is null or trim(new.coupon_code) = '' then return new; end if;
  select * into c from public.coupons where upper(code) = upper(trim(new.coupon_code)) for update;
  if not found or not c.active
     or (c.starts_at is not null and current_date < c.starts_at)
     or (c.expires_at is not null and current_date > c.expires_at)
     or (c.max_uses is not null and c.uses_count >= c.max_uses) then
    raise exception 'Cupom inválido ou esgotado';
  end if;
  phone_digits := regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g');
  select count(*) into used_by from public.coupon_redemptions r
   where r.coupon_id = c.id
     and ((new.customer_id is not null and r.customer_id = new.customer_id)
       or (phone_digits <> '' and regexp_replace(coalesce(r.phone,''), '\D', '', 'g') = phone_digits));
  if c.max_uses_per_customer is not null and used_by >= c.max_uses_per_customer then
    raise exception 'Cupom inválido ou esgotado';
  end if;
  insert into public.coupon_redemptions (coupon_id, order_id, customer_id, phone, discount)
  values (c.id, new.id, new.customer_id, new.customer_phone, coalesce(new.discount_amount, 0));
  update public.coupons set uses_count = uses_count + 1 where id = c.id;
  return new;
end; $$;
drop trigger if exists trg_order_coupon on public.orders;
create trigger trg_order_coupon after insert on public.orders
  for each row execute function public.fn_order_coupon();

-- 6) Pedido cancelado devolve o uso do cupom
create or replace function public.fn_order_cancel_coupon() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.coupon_redemptions%rowtype;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    for r in select * from public.coupon_redemptions where order_id = new.id loop
      update public.coupons set uses_count = greatest(uses_count - 1, 0) where id = r.coupon_id;
      delete from public.coupon_redemptions where id = r.id;
    end loop;
  end if;
  return new;
end; $$;
drop trigger if exists trg_order_cancel_coupon on public.orders;
create trigger trg_order_cancel_coupon after update of status on public.orders
  for each row execute function public.fn_order_cancel_coupon();

notify pgrst, 'reload schema';

-- 7) Excluir pedido também devolve o uso do cupom
create or replace function public.fn_order_delete_coupon() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.coupon_redemptions%rowtype;
begin
  for r in select * from public.coupon_redemptions where order_id = old.id loop
    update public.coupons set uses_count = greatest(uses_count - 1, 0) where id = r.coupon_id;
    delete from public.coupon_redemptions where id = r.id;
  end loop;
  return old;
end; $$;
drop trigger if exists trg_order_delete_coupon on public.orders;
create trigger trg_order_delete_coupon before delete on public.orders
  for each row execute function public.fn_order_delete_coupon();
