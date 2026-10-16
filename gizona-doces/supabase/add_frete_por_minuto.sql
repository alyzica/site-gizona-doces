-- Frete no mesmo formato do 99 (base + km + minuto). Idempotente, nao apaga dados.
alter table public.delivery_settings add column if not exists per_minute numeric(10,2) not null default 0;
alter table public.delivery_settings add column if not exists avg_speed_kmh numeric(5,1) not null default 30;
-- Valores copiados do print "Detalhes da tarifa" do 99 (Entrega Moto). Editaveis em Admin > Entrega.
update public.delivery_settings
   set base_fee = 1.41, per_km = 1.18, per_minute = 0.18, min_fee = 5.18, avg_speed_kmh = 30
 where id = 1;
notify pgrst, 'reload schema';
