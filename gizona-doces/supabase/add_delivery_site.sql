-- =====================================================================
-- DELIVERY NO SITE — catálogo público com estoque disponível
-- Rode DEPOIS de add_delivery_estoque.sql e add_pedidos_mensal_delivery.sql.
-- Idempotente.
-- =====================================================================
create or replace function public.delivery_catalog()
returns table (
  id uuid, name text, price numeric, description text, image_url text,
  image_scale numeric, image_position_x numeric, image_position_y numeric, stock integer
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.price, p.description, p.image_url,
         p.image_scale, p.image_position_x, p.image_position_y,
         greatest(public.delivery_stock_of(p.id), 0)::integer
  from public.products p
  where p.category = 'delivery' and p.active = true
  order by p.sort_order, p.name;
$$;

grant execute on function public.delivery_catalog() to anon, authenticated;
notify pgrst, 'reload schema';
