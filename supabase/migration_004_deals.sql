-- "Fechar Negócio": link único por cliente (`/fechar/$id`) gerado depois da
-- negociação por WhatsApp, com dois sub-fluxos independentes:
--   - implantação (taxa única): captura só a preferência de pagamento do
--     cliente (PIX ou cartão parcelado) — a emissão real do link de cobrança
--     é manual, via Cobre PJ (Contabilizei), porque a Contabilizei não
--     oferece API pública para isso.
--   - mensalidade (recorrente): totalmente automática via assinatura do
--     Mercado Pago (preapproval), para reduzir risco de inadimplência.
--
-- Tabela própria (não um bolt-on em `intranet_projects`) pelo mesmo motivo
-- de `leads` ser separada de `intranet_clients`: é um artefato de
-- negociação pontual, com campos (token público implícito no id, IDs de
-- provedor externo) que não fazem sentido em todo projeto.

create table if not exists public.intranet_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid not null references public.intranet_clients(id) on delete cascade,
  project_id uuid references public.intranet_projects(id) on delete set null,

  package_tier text not null
    check (package_tier in ('essencial', 'profissional', 'avancado', 'sob_medida')),
  setup_value numeric(12, 2) not null,
  monthly_value numeric(12, 2) not null,

  -- Implantação (manual, Cobre PJ)
  implantacao_status text not null default 'pendente'
    check (implantacao_status in ('pendente', 'preferencia_registrada', 'link_enviado')),
  implantacao_metodo text
    check (implantacao_metodo in ('pix', 'cartao')),
  implantacao_parcelas integer,
  implantacao_cobre_pj_link text,
  implantacao_link_enviado_at timestamptz,

  -- Mensalidade (automática, Mercado Pago)
  mensalidade_status text not null default 'pendente'
    check (mensalidade_status in ('pendente', 'assinatura_criada', 'ativa', 'cancelada', 'falhou')),
  mensalidade_mp_preapproval_id text,
  mensalidade_mp_status text,

  notes text
);

alter table public.intranet_deals enable row level security;

-- Mesma postura de todas as intranet_*: só admin autenticado via RLS.
-- A página pública /fechar/$id NUNCA usa esse caminho — ela só acessa via
-- server functions rodando com service role (mesmo padrão de `leads`), então
-- na prática o anon key não tem acesso nenhum a esta tabela.
create policy "intranet admins manage deals"
  on public.intranet_deals for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

create trigger intranet_deals_set_updated_at
  before update on public.intranet_deals
  for each row execute function public.set_updated_at();
