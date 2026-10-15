-- =====================================================================
-- FOTOS DO MENU DE ENCOMENDAS (brigadeiro, geladinho, bolo)
-- Rode no SQL Editor do Supabase. Idempotente, não apaga dados.
-- =====================================================================
create table if not exists public.site_media (
  key text primary key,
  image_url text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_media enable row level security;
drop policy if exists "site_media leitura publica" on public.site_media;
create policy "site_media leitura publica" on public.site_media for select using (true);
drop policy if exists "admin acesso total site_media" on public.site_media;
create policy "admin acesso total site_media" on public.site_media for all using (public.is_admin()) with check (public.is_admin());
grant select on public.site_media to anon, authenticated;
notify pgrst, 'reload schema';
