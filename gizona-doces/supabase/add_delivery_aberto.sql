-- =====================================================================
-- DELIVERY ABERTO/FECHADO + RETIRADA OU ENTREGA
-- Rode DEPOIS do add_cupons_entrega.sql. Idempotente.
-- =====================================================================

-- 1) Interruptor do delivery (a Giovanna abre quando faz uma fornada)
alter table public.delivery_settings add column if not exists delivery_open boolean not null default false;
alter table public.delivery_settings add column if not exists delivery_opened_at timestamptz;
alter table public.delivery_settings add column if not exists closed_message text not null default 'O delivery está fechado no momento. Assim que abrirmos uma nova fornada você será avisado!';

-- 2) Retirada ou entrega no pedido
alter table public.orders add column if not exists fulfillment text;

-- 3) Status público do delivery
create or replace function public.delivery_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('open', coalesce(delivery_open, false), 'message', closed_message)
  from public.delivery_settings where id = 1;
$$;
grant execute on function public.delivery_status() to anon, authenticated;

-- 4) Catálogo só aparece com o delivery aberto
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
    and exists (select 1 from public.delivery_settings s where s.id = 1 and s.delivery_open)
  order by p.sort_order, p.name;
$$;
grant execute on function public.delivery_catalog() to anon, authenticated;

-- 5) Pedido de delivery feito pelo site: só com o delivery aberto + baixa de estoque
create or replace function public.fn_order_delivery_stock() returns trigger
language plpgsql security definer as $$
declare it jsonb; pid uuid; q integer; pr numeric; is_open boolean;
begin
  if coalesce(new.order_type, 'encomenda') <> 'delivery' or new.status = 'cancelled' then
    return new;
  end if;
  if TG_OP = 'UPDATE' and not (old.status = 'cancelled') then return new; end if;
  if exists (select 1 from public.delivery_sales where order_id = new.id) then return new; end if;

  if TG_OP = 'INSERT' and coalesce(new.origin, 'site') = 'site' then
    select delivery_open into is_open from public.delivery_settings where id = 1;
    if not coalesce(is_open, false) then
      raise exception 'Delivery fechado';
    end if;
  end if;

  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    begin
      pid := (it->>'id')::uuid;
      q := coalesce((it->>'quantity')::integer, (it->>'qty')::integer, 0);
    exception when others then continue; end;
    if q <= 0 then continue; end if;
    if not exists (select 1 from public.products where id = pid and category = 'delivery') then continue; end if;
    if public.delivery_stock_of(pid) < q then
      raise exception 'Estoque insuficiente para este produto de delivery';
    end if;
    select price into pr from public.products where id = pid;
    insert into public.delivery_sales (product_id, quantity, unit_price, source, order_id, sold_at)
    values (pid, q, coalesce((it->>'unit_price')::numeric, pr, 0),
            case when new.origin = 'manual' then 'manual' else 'site' end, new.id, coalesce(new.order_date, current_date));
  end loop;
  return new;
end; $$;

drop trigger if exists trg_order_delivery_stock on public.orders;
create trigger trg_order_delivery_stock after insert on public.orders
  for each row execute function public.fn_order_delivery_stock();
drop trigger if exists trg_order_delivery_stock_reopen on public.orders;
create trigger trg_order_delivery_stock_reopen after update of status on public.orders
  for each row execute function public.fn_order_delivery_stock();

notify pgrst, 'reload schema';
