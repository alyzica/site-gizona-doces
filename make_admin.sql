-- ============================================================
-- Rode isso DEPOIS que você e a Giovana já tiverem se cadastrado
-- no site (usando esses e-mails). Ele transforma as duas contas
-- em administradoras, com acesso ao painel.
-- ============================================================
update public.customers
set is_admin = true
where email in ('alysson.murari10@gmail.com', 'giovanaalveslins@gmail.com');

-- Confere se funcionou (deve mostrar as duas linhas com is_admin = true)
select full_name, email, is_admin from public.customers
where email in ('alysson.murari10@gmail.com', 'giovanaalveslins@gmail.com');
