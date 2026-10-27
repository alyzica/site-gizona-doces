-- =====================================================================
-- OPCIONAL — remove os pontos que encomendas JÁ deram no passado.
-- Rode só se quiser aplicar a nova regra também ao histórico.
-- Passo 1 é só consulta (não altera nada). O passo 2 altera saldos.
-- =====================================================================

-- PASSO 1 — veja quanto cada cliente perderia:
select c.full_name as cliente, sum(o.loyalty_points_awarded) as pontos_de_encomendas, lc.points as saldo_atual
from public.orders o
join public.customers c on c.id = o.customer_id
left join public.loyalty_cards lc on lc.customer_id = o.customer_id
where coalesce(o.order_type,'encomenda') <> 'delivery' and coalesce(o.loyalty_points_awarded,0) > 0
group by c.full_name, lc.points
order by 2 desc;

-- PASSO 2 — aplicar (descomente o bloco inteiro e rode):
-- do $$
-- declare r record;
-- begin
--   for r in
--     select customer_id, sum(loyalty_points_awarded)::int as pts
--     from public.orders
--     where coalesce(order_type,'encomenda') <> 'delivery' and coalesce(loyalty_points_awarded,0) > 0 and customer_id is not null
--     group by customer_id
--   loop
--     perform set_config('gizona.loy_reason', 'Ajuste: encomendas não pontuam (nova regra)', true);
--     update public.loyalty_cards set points = greatest(0, points - r.pts) where customer_id = r.customer_id;
--     perform set_config('gizona.loy_reason', '', true);
--   end loop;
--   update public.orders set loyalty_points_awarded = 0
--    where coalesce(order_type,'encomenda') <> 'delivery' and coalesce(loyalty_points_awarded,0) > 0;
-- end $$;
