-- ============================================================
-- CORREÇÃO DEFINITIVA (v3) — receita automática ao marcar "Entregue"
--
-- Causa real do erro "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification": o índice único era PARCIAL
-- (com "where order_id is not null") e o Postgres não usa índice parcial
-- num "on conflict (order_id)" sem repetir a condição.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ============================================================

-- 1) Remove duplicatas de receita por pedido (mantém a mais antiga)
delete from public.revenue_entries
where id in (
  select id from (
    select id,
           row_number() over (partition by order_id order by created_at asc, id asc) as rn
    from public.revenue_entries
    where order_id is not null
  ) ranked
  where ranked.rn > 1
);

-- 2) Índice único COMUM (não parcial). Várias linhas com order_id NULL
--    (receitas manuais) continuam permitidas — NULL não conflita com NULL.
drop index if exists public.idx_revenue_entries_order_id;
create unique index idx_revenue_entries_order_id
  on public.revenue_entries(order_id);

-- 3) Status do pedido: 5 opções (Entregue é o status final)
update public.orders set status = 'delivered' where status = 'completed';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'production', 'delivered', 'cancelled'));

-- 4) Gatilho blindado:
--    - confere se já existe receita do pedido (sem depender de ON CONFLICT)
--    - se algo der errado ao lançar a receita, NÃO bloqueia a troca de status
--      (o próprio admin ainda confere e lança a receita como reforço)
create or replace function public.fn_order_completed_to_revenue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    begin
      if not exists (select 1 from public.revenue_entries where order_id = new.id) then
        insert into public.revenue_entries (entry_date, description, amount, source, order_id)
        values (current_date, 'Pedido ' || new.order_number, new.total, 'site', new.id);
      end if;
    exception when others then
      raise warning 'Receita automática do pedido % falhou: %', new.order_number, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_completed_to_revenue on public.orders;
create trigger trg_order_completed_to_revenue
  after update of status on public.orders
  for each row execute function public.fn_order_completed_to_revenue();

-- 5) Pedidos já marcados como "Entregue" que ficaram SEM receita no Financeiro
--    (por causa do erro) ganham a receita agora, sem duplicar:
insert into public.revenue_entries (entry_date, description, amount, source, order_id)
select coalesce(o.event_date, current_date), 'Pedido ' || o.order_number, o.total, 'site', o.id
from public.orders o
where o.status = 'delivered'
  and not exists (select 1 from public.revenue_entries r where r.order_id = o.id);

-- 6) Conferência: deve retornar ZERO linhas
select order_id, count(*) from public.revenue_entries
where order_id is not null
group by order_id having count(*) > 1;
