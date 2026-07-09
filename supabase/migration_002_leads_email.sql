-- Adiciona o campo de e-mail (opcional) capturado pelo simulador de
-- orçamento, pra facilitar o acompanhamento do lead além do WhatsApp.

alter table public.leads add column if not exists email text;
