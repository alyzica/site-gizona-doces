-- ============================================================
-- PEDIDOS + PAGAMENTOS, CAIXA (manual) e FINANCEIRO (faturamento/despesas)
-- Rode este script no SQL Editor do Supabase.
-- Não faz DROP de nada existente — só adiciona.
-- ============================================================

-- ---------- PEDIDOS: origem + até 2 formas de pagamento ----------
alter table public.orders
  add column if not exists origin text not null default 'site' check (origin in ('site', 'manual')),
  add column if not exists payment_method_1 text,
  add column if not exists payment_amount_1 numeric(10,2),
  add column if not exists payment_method_2 text,
  add column if not exists payment_amount_2 numeric(10,2);

-- ---------- CAIXA (public.cash_entries já existe — só habilita "retirada") ----------
alter table public.cash_entries drop constraint if exists cash_entries_type_check;
alter table public.cash_entries add constraint cash_entries_type_check
  check (type in ('entrada', 'saida', 'retirada'));

-- ---------- FINANCEIRO: FATURAMENTO (automático do site + manual) ----------
create table if not exists public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  source text not null check (source in ('site', 'manual')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

-- garante que um mesmo pedido nunca gera 2 receitas automáticas
create unique index if not exists idx_revenue_entries_order_id
  on public.revenue_entries(order_id) where order_id is not null;

alter table public.revenue_entries enable row level security;
create policy "admin acesso total revenue_entries"
  on public.revenue_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- FINANCEIRO: DESPESAS (manual) ----------
create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  category text,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.expense_entries enable row level security;
create policy "admin acesso total expense_entries"
  on public.expense_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- AUTOMAÇÃO: pedido concluído → lança receita automática (sem duplicar) ----------
create or replace function public.fn_order_completed_to_revenue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
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
