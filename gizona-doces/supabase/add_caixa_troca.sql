-- =====================================================================
-- Gizona Doces — Caixa: operação TROCA (transferência Pix <-> dinheiro)
-- Idempotente e não destrutivo. Tabela própria: NÃO usa cash_entries,
-- então a troca nunca vira entrada/saída e não mexe em faturamento,
-- despesas, resultado ou lucro.
-- =====================================================================
create table if not exists public.cash_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_date date not null default current_date,
  from_method text not null check (from_method in ('pix','dinheiro')),
  to_method   text not null check (to_method   in ('pix','dinheiro')),
  amount numeric(10,2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now(),
  constraint cash_transfers_diff_chk check (from_method <> to_method)
);
create index if not exists idx_cash_transfers_date on public.cash_transfers(transfer_date);

alter table public.cash_transfers enable row level security;
drop policy if exists "admin acesso total cash_transfers" on public.cash_transfers;
create policy "admin acesso total cash_transfers"
  on public.cash_transfers for all
  using (public.is_admin())
  with check (public.is_admin());
