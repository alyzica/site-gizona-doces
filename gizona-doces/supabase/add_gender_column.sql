-- Adiciona a coluna "gender" na tabela customers, usada para exibir
-- "Bem-vindo" ou "Bem-vinda" no dashboard do cliente.
-- Rode este script no SQL Editor do Supabase.

alter table customers
  add column if not exists gender text check (gender in ('masculino', 'feminino') or gender is null);
