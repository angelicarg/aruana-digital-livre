-- Assinatura eletrônica do contrato via Autentique, encaixada como um
-- terceiro sub-fluxo de `intranet_deals` — mesmo padrão de implantacao_*/
-- mensalidade_* já existente (ver migration_004_deals.sql). O arquivo do
-- contrato em si continua vivendo em `intranet_documents`/Storage (categoria
-- "contrato"); aqui só guardamos qual documento foi enviado e o status da
-- assinatura na Autentique.

alter table public.intranet_deals
  add column if not exists contrato_status text not null default 'pendente'
    check (contrato_status in ('pendente', 'enviado', 'assinado', 'rejeitado')),
  add column if not exists contrato_document_id uuid
    references public.intranet_documents(id) on delete set null,
  add column if not exists contrato_autentique_id text,
  add column if not exists contrato_signer_email text,
  add column if not exists contrato_enviado_at timestamptz,
  add column if not exists contrato_signed_at timestamptz;
