-- Lembretes próprios nos eventos do calendário (aviso no Dashboard). Idempotente, não apaga dados.
alter table public.production_events add column if not exists remind_days integer;
notify pgrst, 'reload schema';
