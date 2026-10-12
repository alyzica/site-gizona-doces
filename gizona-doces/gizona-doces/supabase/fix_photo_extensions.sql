-- ============================================================
-- Corrige as fotos dos produtos no banco (troca .jpg por .png,
-- já que os arquivos reais enviados são PNG).
-- Rode isso no SQL Editor do Supabase depois de subir as fotos
-- renomeadas pro GitHub.
-- ============================================================

update public.products set image_url = replace(image_url, '.jpg', '.png')
where image_url like '%.jpg';

-- Confere o resultado
select name, category, image_url from public.products order by category, sort_order;
