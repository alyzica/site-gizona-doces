-- =====================================================================
-- CARTOES DE CREDITO: compras, parcelas por fatura e pagamento da fatura.
-- Idempotente e aditivo: nao apaga nem altera lancamentos existentes.
-- =====================================================================
create table if not exists public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  purchase_date date not null,
  card_name text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  installments integer not null default 1 check (installments between 1 and 60),
  statement_closed boolean not null default false,
  category text,
  created_at timestamptz not null default now()
);

-- Uma linha por parcela; excluir a compra remove todas as parcelas (cascade).
create table if not exists public.card_installments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.card_purchases(id) on delete cascade,
  card_name text not null,
  number integer not null,
  total_installments integer not null,
  amount numeric(12,2) not null,
  ref_month date not null,          -- 1o dia do mes da fatura (competencia)
  created_at timestamptz not null default now(),
  unique (purchase_id, number)
);
create index if not exists idx_card_inst_month on public.card_installments(card_name, ref_month);

-- Controle de pagamento da fatura (so marca como paga; NAO cria despesa nova)
create table if not exists public.card_statement_payments (
  card_name text not null,
  ref_month date not null,
  paid boolean not null default true,
  paid_at date,
  primary key (card_name, ref_month)
);

alter table public.card_purchases enable row level security;
alter table public.card_installments enable row level security;
alter table public.card_statement_payments enable row level security;
drop policy if exists "admin acesso total card_purchases" on public.card_purchases;
create policy "admin acesso total card_purchases" on public.card_purchases for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total card_installments" on public.card_installments;
create policy "admin acesso total card_installments" on public.card_installments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin acesso total card_statement_payments" on public.card_statement_payments;
create policy "admin acesso total card_statement_payments" on public.card_statement_payments for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
