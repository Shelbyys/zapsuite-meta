-- ZapSuite Meta · estrutura inicial
-- ============================================================
-- Adiciona ao schema Easy4u suporte ao produto ZapSuite Meta.
-- Roda 1 vez. Idempotente onde possível.
-- ============================================================

-- 1. Estende a tabela 'licencas' (criada por outro produto Easy4u)
--    Se a tabela ainda não existe, cria mínima.
create table if not exists public.licencas (
  id              uuid primary key default gen_random_uuid(),
  chave           text unique not null,
  email           text,
  status          text default 'ativa',  -- ativa, pausada, cancelada
  created_at      timestamptz default now()
);

alter table public.licencas
  add column if not exists zapsuite_meta_ativo  boolean default false,
  add column if not exists zapsuite_meta_plano  text default 'beta',  -- beta, pro, enterprise
  add column if not exists zapsuite_meta_max_contas int default 1;

-- 2. Instalações (1 por máquina/operador)
create table if not exists public.zapsuite_meta_instalacoes (
  id               uuid primary key default gen_random_uuid(),
  licenca_id       uuid references public.licencas(id) on delete cascade,
  operador_nome    text,
  produtos_ativos  text[],            -- IDs dos playbooks (hay-hair, ton, etc)
  cli_version      text,
  os               text,
  installed_at     timestamptz default now(),
  last_active_at   timestamptz,
  unique (licenca_id, operador_nome)
);

create index if not exists zsm_instalacoes_licenca on public.zapsuite_meta_instalacoes(licenca_id);

-- 3. Eventos (telemetria opt-in)
create table if not exists public.zapsuite_meta_eventos (
  id              bigserial primary key,
  instalacao_id   uuid references public.zapsuite_meta_instalacoes(id) on delete cascade,
  tipo            text not null,       -- 'init', 'campanha_criada', 'campanha_pausada', 'otimizacao_aplicada', 'erro'
  payload         jsonb,
  created_at      timestamptz default now()
);

create index if not exists zsm_eventos_instalacao_at on public.zapsuite_meta_eventos(instalacao_id, created_at desc);
create index if not exists zsm_eventos_tipo_at       on public.zapsuite_meta_eventos(tipo, created_at desc);

-- 4. Campanhas (espelho leve do que tá na Meta — pra dashboard admin)
create table if not exists public.zapsuite_meta_campanhas (
  id                 uuid primary key default gen_random_uuid(),
  instalacao_id      uuid references public.zapsuite_meta_instalacoes(id) on delete cascade,
  meta_campaign_id   text,
  meta_ad_account_id text,
  playbook           text,
  nome               text,
  status             text,     -- ACTIVE, PAUSED, ARCHIVED
  estrutura          text,     -- '1-5-1' etc
  num_conjuntos      int,
  orcamento_diario_total numeric,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists zsm_campanhas_instalacao on public.zapsuite_meta_campanhas(instalacao_id);

-- 5. RLS — por enquanto, apenas service_role acessa.
--    Cliente final fala com Edge Functions, não com a tabela direto.
alter table public.licencas                     enable row level security;
alter table public.zapsuite_meta_instalacoes    enable row level security;
alter table public.zapsuite_meta_eventos        enable row level security;
alter table public.zapsuite_meta_campanhas      enable row level security;
