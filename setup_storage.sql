-- ============================================================
-- Cria o espaço de armazenamento de fotos (Storage) no Supabase
-- e as permissões: qualquer pessoa pode VER as fotos (é o cardápio
-- público), só administradores podem ENVIAR/trocar/excluir.
-- Rode esse script inteiro no SQL Editor.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Qualquer pessoa pode ver as fotos (bucket público)
create policy "fotos visiveis a todos"
on storage.objects for select
using (bucket_id = 'photos');

-- Só admin pode enviar fotos novas
create policy "admin envia fotos"
on storage.objects for insert
with check (bucket_id = 'photos' and public.is_admin());

-- Só admin pode substituir fotos
create policy "admin atualiza fotos"
on storage.objects for update
using (bucket_id = 'photos' and public.is_admin());

-- Só admin pode excluir fotos
create policy "admin exclui fotos"
on storage.objects for delete
using (bucket_id = 'photos' and public.is_admin());
