-- ============================================================
-- CORREÇÃO DEFINITIVA: remove QUALQUER duplicata em revenue_entries
-- (mesmo com o mesmo horário) e recria o índice/gatilho com segurança.
-- Rode no SQL Editor do Supabase.
-- ============================================================

-- 1) Remove duplicatas de forma garantida, usando o id como desempate
--    (mantém sempre a linha "menor" id de cada order_id repetido)
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

-- 2) Recria o índice único (agora sem duplicata nenhuma, não deve falhar)
drop index if exists idx_revenue_entries_order_id;
create unique index idx_revenue_entries_order_id
  on public.revenue_entries(order_id) where order_id is not null;

-- 3) Garante que o status "completed" antigo virou "delivered"
update public.orders set status = 'delivered' where status = 'completed';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'production', 'delivered', 'cancelled'));

-- 4) Recria o gatilho (dispara em "delivered", nunca duplica graças ao índice do passo 2)
create or replace function public.fn_order_completed_to_revenue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    insert into public.revenue_entries (entry_date, description, amount, source, order_id)
    values (current_date, 'Pedido ' || new.order_number, new.total, 'site', new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_completed_to_revenue on public.orders;
create trigger trg_order_completed_to_revenue
  after update of status on public.orders
  for each row execute function public.fn_order_completed_to_revenue();

-- 5) Confirma no final: essa consulta deve retornar ZERO linhas.
--    Se retornar alguma coisa, me manda o resultado.
select order_id, count(*) from public.revenue_entries
where order_id is not null
group by order_id having count(*) > 1;
