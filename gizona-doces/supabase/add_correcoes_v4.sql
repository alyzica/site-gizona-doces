-- =====================================================================
-- CORRECOES V4 (rode DEPOIS do add_melhorias_v3.sql; seguro para repetir)
--  1) Corrige "UPDATE requires a WHERE clause" ao excluir pedido
--     (o Supabase bloqueia UPDATE sem WHERE; a renumeracao precisa de WHERE).
--  2) Numeracao com 5 digitos: 00001, 00002 ... (ordem de criacao;
--     cancelados mantem a posicao; so exclusao definitiva renumera).
--  3) Galeria: coluna caption passa a ter valor padrao (upload falhava por NOT NULL).
--  Nao apaga nem altera valores, produtos, status ou financeiro dos pedidos.
-- =====================================================================

alter table public.gallery_photos alter column caption set default '';

create or replace function public.renumber_orders() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7419002);
  update public.orders set order_number = 'TMP-' || id::text where id is not null;   -- evita conflito da regra de numero unico
  with ranked as (select id, row_number() over (order by created_at, id) as rn from public.orders)
  update public.orders o set order_number = lpad(r.rn::text, 5, '0')
    from ranked r where r.id = o.id;
  -- descricoes de receita ligadas ao pedido acompanham o novo numero
  update public.revenue_entries re set description = 'Pedido ' || o.order_number
    from public.orders o where re.order_id = o.id and re.description like 'Pedido %';
end $$;

create or replace function public.fn_orders_set_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(7419002);
  select coalesce(max(nullif(regexp_replace(order_number, '\D', '', 'g'), '')::integer), 0) + 1 into n from public.orders;
  new.order_number := lpad(n::text, 5, '0');
  return new;
end $$;

create or replace function public.fn_orders_renumber_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.renumber_orders();
  return null;
end $$;

select public.renumber_orders();
notify pgrst, 'reload schema';
