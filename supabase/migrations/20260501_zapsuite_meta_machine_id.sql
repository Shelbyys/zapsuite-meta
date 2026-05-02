-- ZapSuite Meta · machine_id pra autenticação por email
-- ============================================================
-- Adiciona machine_id à tabela de instalações pra rastrear por dispositivo
-- e limitar N instalações por licença (zapsuite_meta_max_contas).
-- ============================================================

alter table public.zapsuite_meta_instalacoes
  add column if not exists machine_id text;

-- Tira o unique antigo (licenca_id, operador_nome) — operador agora pode
-- ser repetido em máquinas diferentes (mesmo nome, máquinas distintas).
alter table public.zapsuite_meta_instalacoes
  drop constraint if exists zapsuite_meta_instalacoes_licenca_id_operador_nome_key;

-- Novo unique: 1 instalação por (licença, máquina). Reinstalar na mesma máquina
-- atualiza a row, não cria nova.
alter table public.zapsuite_meta_instalacoes
  drop constraint if exists zsm_instalacoes_unique_licenca_machine;

alter table public.zapsuite_meta_instalacoes
  add constraint zsm_instalacoes_unique_licenca_machine unique (licenca_id, machine_id);

create index if not exists zsm_instalacoes_machine on public.zapsuite_meta_instalacoes(machine_id);
