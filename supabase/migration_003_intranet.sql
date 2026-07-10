-- Intranet interna da Aruanã Digital: clientes, projetos, financeiro,
-- reuniões e documentos. Vive no mesmo projeto Supabase compartilhado com
-- Dente Vivo / PortLibras / Patas Nobres — tabelas prefixadas `intranet_`
-- para não colidir.
--
-- IMPORTANTE: este projeto tem cadastro público de alunos (PortLibras), então
-- `auth.users` tem gente fora da equipe da Aruanã. Por isso o acesso aqui NÃO
-- é liberado para "qualquer autenticado" — depende de uma allowlist própria
-- (`intranet_admins`) checada via `is_intranet_admin()`.

-- ─── Allowlist de quem pode acessar a intranet ──────────────────────────────
create table if not exists public.intranet_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.intranet_admins enable row level security;
-- Sem policies: só service_role lê/escreve aqui (inserção do primeiro admin
-- é feita via script/SQL editor, nunca pelo client).

create or replace function public.is_intranet_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.intranet_admins where user_id = auth.uid()
  );
$$;

-- ─── Clientes ────────────────────────────────────────────────────────────
create table if not exists public.intranet_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  company text,
  email text,
  phone text,
  status text not null default 'lead'
    check (status in ('lead', 'prospect', 'active', 'paused', 'past')),
  source text,
  notes text
);

alter table public.intranet_clients enable row level security;

create policy "intranet admins manage clients"
  on public.intranet_clients for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

-- ─── Projetos ────────────────────────────────────────────────────────────
create table if not exists public.intranet_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid not null references public.intranet_clients(id) on delete cascade,
  name text not null,
  package_tier text
    check (package_tier in ('essencial', 'profissional', 'avancado', 'sob_medida')),
  status text not null default 'proposta'
    check (status in ('proposta', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
  setup_value numeric(12, 2),
  monthly_value numeric(12, 2),
  start_date date,
  notes text
);

alter table public.intranet_projects enable row level security;

create policy "intranet admins manage projects"
  on public.intranet_projects for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

-- ─── Financeiro ──────────────────────────────────────────────────────────
create table if not exists public.intranet_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid references public.intranet_clients(id) on delete set null,
  project_id uuid references public.intranet_projects(id) on delete set null,
  type text not null check (type in ('receita', 'despesa')),
  description text not null,
  amount numeric(12, 2) not null,
  due_date date,
  paid_date date,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'atrasado', 'cancelado'))
);

alter table public.intranet_transactions enable row level security;

create policy "intranet admins manage transactions"
  on public.intranet_transactions for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

-- ─── Reuniões ────────────────────────────────────────────────────────────
create table if not exists public.intranet_meetings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid references public.intranet_clients(id) on delete set null,
  title text not null,
  meeting_type text not null default 'outro'
    check (meeting_type in ('prospeccao', 'andamento', 'outro')),
  scheduled_at timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'realizado', 'cancelado')),
  notes text
);

alter table public.intranet_meetings enable row level security;

create policy "intranet admins manage meetings"
  on public.intranet_meetings for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

-- ─── Documentos ──────────────────────────────────────────────────────────
create table if not exists public.intranet_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  client_id uuid references public.intranet_clients(id) on delete set null,
  project_id uuid references public.intranet_projects(id) on delete set null,
  name text not null,
  category text not null default 'outro'
    check (category in ('contrato', 'proposta', 'outro')),
  storage_path text not null
);

alter table public.intranet_documents enable row level security;

create policy "intranet admins manage documents"
  on public.intranet_documents for all
  using (public.is_intranet_admin())
  with check (public.is_intranet_admin());

-- ─── Storage: bucket privado para os arquivos dos documentos ───────────────
insert into storage.buckets (id, name, public)
values ('intranet-documents', 'intranet-documents', false)
on conflict (id) do nothing;

create policy "intranet admins read documents bucket"
  on storage.objects for select
  using (bucket_id = 'intranet-documents' and public.is_intranet_admin());

create policy "intranet admins upload documents bucket"
  on storage.objects for insert
  with check (bucket_id = 'intranet-documents' and public.is_intranet_admin());

create policy "intranet admins update documents bucket"
  on storage.objects for update
  using (bucket_id = 'intranet-documents' and public.is_intranet_admin())
  with check (bucket_id = 'intranet-documents' and public.is_intranet_admin());

create policy "intranet admins delete documents bucket"
  on storage.objects for delete
  using (bucket_id = 'intranet-documents' and public.is_intranet_admin());

-- ─── updated_at automático ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger intranet_clients_set_updated_at
  before update on public.intranet_clients
  for each row execute function public.set_updated_at();

create trigger intranet_projects_set_updated_at
  before update on public.intranet_projects
  for each row execute function public.set_updated_at();

create trigger intranet_transactions_set_updated_at
  before update on public.intranet_transactions
  for each row execute function public.set_updated_at();

create trigger intranet_meetings_set_updated_at
  before update on public.intranet_meetings
  for each row execute function public.set_updated_at();
