-- =====================================================================
-- CORRIGE: "produto indisponivel / sem estoque" ao lancar venda de delivery.
-- O banco tinha um sistema de estoque ANTIGO de delivery (gatilhos
-- delivery_order_stock* + tabelas batch_items) que brigava com o atual
-- (delivery_stock_batches). Esta correcao remove so os 2 gatilhos antigos e
-- libera as colunas antigas de delivery_sales. Nenhum dado e apagado.
-- =====================================================================
drop trigger if exists delivery_order_stock on public.orders;
drop trigger if exists delivery_order_stock_delete on public.orders;

alter table public.delivery_sales alter column request_id drop not null;
alter table public.delivery_sales alter column batch_item_id drop not null;
alter table public.delivery_sales alter column reversed set default false;

notify pgrst, 'reload schema';
