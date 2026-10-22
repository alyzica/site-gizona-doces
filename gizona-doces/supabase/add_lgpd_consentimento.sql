-- =====================================================================
-- Gizona Doces — LGPD: registro do aceite da Política de Privacidade
-- Idempotente e não destrutivo. Rode no SQL Editor do Supabase.
-- (O site continua cadastrando clientes mesmo antes deste script,
--  mas só passa a gravar o aceite depois que ele for rodado.)
-- =====================================================================
alter table public.customers add column if not exists privacy_accepted_at timestamptz;
alter table public.customers add column if not exists privacy_version text;

comment on column public.customers.privacy_accepted_at is 'Quando o cliente aceitou a Política de Privacidade e os Termos (cadastro pelo site).';
comment on column public.customers.privacy_version is 'Versão dos textos legais aceita (js/legal-config.js → versao).';
