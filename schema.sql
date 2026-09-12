-- ============================================================
-- GIZONA DOCES — Schema do banco de dados (Supabase / Postgres)
-- Rode esse script inteiro no SQL Editor do Supabase, de uma vez.
-- ============================================================

-- ---------- LIMPEZA (apaga qualquer tentativa anterior, se existir) ----------
drop trigger if exists on_order_created on public.orders;
drop function if exists public.handle_new_order();
drop table if exists public.orders cascade;
drop table if exists public.carts cascade;
drop table if exists public.loyalty_cards cascade;
drop table if exists public.rewards cascade;
drop table if exists public.products cascade;
drop table if exists public.site_images cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.customers cascade;
drop sequence if exists public.order_number_seq;

-- Extensão pra gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------- CLIENTES (perfil, ligado ao login do Supabase Auth) ----------
create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cpf text not null unique,
  phone text not null,
  email text not null,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  birthdate date,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- FIDELIDADE ----------
create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade unique,
  completed_orders int not null default 0,
  rewards_claimed int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- MIMOS (recompensas) ----------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  points_required int not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PRODUTOS (sabores) ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('brigadeiro','geladinho')),
  price numeric(10,2) not null,
  description text,
  image_url text,
  image_url_2 text,
  image_scale numeric(4,2) not null default 1,
  image_position_x numeric(5,2) not null default 50,
  image_position_y numeric(5,2) not null default 50,
  image2_scale numeric(4,2) not null default 1,
  image2_position_x numeric(5,2) not null default 50,
  image2_position_y numeric(5,2) not null default 50,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- SEQUÊNCIA PRA NÚMERO DE PEDIDO (PED-0001, PED-0002...) ----------
create sequence public.order_number_seq start 1;

-- ---------- PEDIDOS ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PED-' || lpad(nextval('public.order_number_seq')::text, 4, '0')),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  event_date date,
  items jsonb not null default '[]',
  personalization jsonb default '{}',
  payment_method text check (payment_method in ('pix','credito') or payment_method is null),
  total numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','production','completed','delivered','cancelled')),
  observations text,
  created_at timestamptz not null default now()
);

-- ---------- CARRINHO PERSISTENTE ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade unique,
  category text,
  box jsonb,
  flavors jsonb default '{}',
  geladinho jsonb default '{}',
  personalization jsonb default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- IMAGENS INFORMATIVAS (caixa de isopor, tamanho, etc.) ----------
create table public.site_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('geladinho_info','brigadeiro_info','geral')),
  image_url text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- CONFIGURAÇÕES GERAIS (limite de produção por data, etc.) ----------
create table public.site_settings (
  key text primary key,
  value text not null
);

-- ============================================================
-- SEGURANÇA (Row Level Security)
-- ============================================================
alter table public.customers enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.rewards enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.carts enable row level security;
alter table public.site_images enable row level security;
alter table public.site_settings enable row level security;

-- Qualquer pessoa pode ver produtos ativos, mimos ativos e imagens ativas (é o cardápio público)
create policy "produtos visiveis a todos" on public.products for select using (active = true);
create policy "mimos visiveis a todos" on public.rewards for select using (active = true);
create policy "imagens visiveis a todos" on public.site_images for select using (active = true);

-- Cliente só vê e edita o próprio perfil
create policy "cliente ve proprio perfil" on public.customers for select using (auth.uid() = id);
create policy "cliente edita proprio perfil" on public.customers for update using (auth.uid() = id);
create policy "cliente cria proprio perfil" on public.customers for insert with check (auth.uid() = id);

-- Cliente só vê e edita o próprio cartão fidelidade
create policy "cliente ve propria fidelidade" on public.loyalty_cards for select using (
  customer_id = auth.uid()
);

-- Cliente só vê e edita o próprio carrinho
create policy "cliente ve proprio carrinho" on public.carts for select using (customer_id = auth.uid());
create policy "cliente edita proprio carrinho" on public.carts for all using (customer_id = auth.uid());

-- Cliente só vê os próprios pedidos, mas qualquer pessoa logada pode criar um pedido
create policy "cliente ve proprios pedidos" on public.orders for select using (customer_id = auth.uid());
create policy "cliente cria pedido" on public.orders for insert with check (true);

-- Função que verifica se o usuário logado é admin, sem
-- consultar a tabela via RLS de novo (evita recursão infinita).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.customers where id = auth.uid()),
    false
  );
$$;

-- Admin (is_admin = true na tabela customers) tem acesso total a tudo
create policy "admin acesso total customers" on public.customers for all using (public.is_admin());
create policy "admin acesso total loyalty" on public.loyalty_cards for all using (public.is_admin());
create policy "admin acesso total rewards" on public.rewards for all using (public.is_admin());
create policy "admin acesso total products" on public.products for all using (public.is_admin());
create policy "admin acesso total orders" on public.orders for all using (public.is_admin());
create policy "admin acesso total images" on public.site_images for all using (public.is_admin());
create policy "admin acesso total settings" on public.site_settings for all using (public.is_admin());

-- ============================================================
-- GATILHO: quando um pedido é criado, cria/atualiza o cartão fidelidade automaticamente
-- ============================================================
create or replace function public.handle_new_order()
returns trigger as $$
begin
  if new.customer_id is not null then
    insert into public.loyalty_cards (customer_id, completed_orders)
    values (new.customer_id, 1)
    on conflict (customer_id)
    do update set completed_orders = public.loyalty_cards.completed_orders + 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_created
  after insert on public.orders
  for each row execute function public.handle_new_order();
