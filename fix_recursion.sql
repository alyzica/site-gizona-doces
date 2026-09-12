-- ============================================================
-- CORREÇÃO: recursão infinita nas políticas de admin
-- Rode esse script inteiro no SQL Editor do Supabase.
-- ============================================================

-- Função que verifica se o usuário logado é admin, sem
-- disparar a política de novo (quebra o loop infinito).
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

-- Apaga as políticas antigas (que causavam a recursão)
drop policy if exists "admin acesso total customers" on public.customers;
drop policy if exists "admin acesso total loyalty" on public.loyalty_cards;
drop policy if exists "admin acesso total rewards" on public.rewards;
drop policy if exists "admin acesso total products" on public.products;
drop policy if exists "admin acesso total orders" on public.orders;
drop policy if exists "admin acesso total images" on public.site_images;
drop policy if exists "admin acesso total settings" on public.site_settings;

-- Recria usando a função (sem recursão)
create policy "admin acesso total customers" on public.customers for all using (public.is_admin());
create policy "admin acesso total loyalty" on public.loyalty_cards for all using (public.is_admin());
create policy "admin acesso total rewards" on public.rewards for all using (public.is_admin());
create policy "admin acesso total products" on public.products for all using (public.is_admin());
create policy "admin acesso total orders" on public.orders for all using (public.is_admin());
create policy "admin acesso total images" on public.site_images for all using (public.is_admin());
create policy "admin acesso total settings" on public.site_settings for all using (public.is_admin());
