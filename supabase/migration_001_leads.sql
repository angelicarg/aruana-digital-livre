-- Tabela de leads capturados pelo simulador de orçamento / banner promocional
-- do site principal da Aruanã Digital.
--
-- Só é acessível via service_role (server function submitLead, ver
-- src/lib/api/leads.functions.ts) — RLS fica habilitado sem nenhuma policy,
-- então a chave anon/publishable não enxerga nem grava nada aqui.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  nome text not null,
  whatsapp text not null,

  tipo_negocio text not null,
  precisa_agendamento boolean not null,
  interesse_avancado text not null
    check (interesse_avancado in ('nenhum', 'loja', 'loja_ia', 'sob_medida')),
  tem_site boolean,

  pacote_sugerido text not null
    check (pacote_sugerido in ('essencial', 'profissional', 'avancado', 'sob_medida')),
  origem text not null default 'simulador'
    check (origem in ('banner', 'simulador')),
  status text not null default 'novo'
    check (status in ('novo', 'contatado', 'convertido', 'descartado'))
);

alter table public.leads enable row level security;

comment on table public.leads is
  'Leads capturados pelo simulador de orçamento do site institucional. Acesso apenas via service_role.';
