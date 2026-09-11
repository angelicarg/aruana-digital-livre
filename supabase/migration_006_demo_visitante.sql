-- Acesso de visitante aos demos publicado em /cases (Dente Vivo, Patas Nobres).
-- Roda no projeto Supabase compartilhado. Pré-requisito: a conta
-- visitante@demo.aruanadigital.com criada em Authentication → Users, já
-- confirmada. Re-rodar é seguro.
--
-- A senha é pública de propósito, então o pg_cron desfaz o que um visitante
-- fizer: a cada 10 min senha e e-mail voltam ao original, e toda madrugada os
-- dados dos demos voltam à fotografia tirada na primeira execução.
--
-- Os dados da Aruanã não entram nisso: intranet_* e leads só abrem para quem
-- está em intranet_admins, e o visitante não está.

create extension if not exists pg_cron;

-- ─── PortLibras: o papel deixa de vir do cadastro ──────────────────────────
-- handle_new_user() lia base_role de raw_user_meta_data, que quem se cadastra
-- escreve à vontade no signUp — dava para nascer admin. Professor continua
-- autodeclarado (é o fluxo do produto); admin só se concede por SQL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role role_enum := case
    when new.raw_user_meta_data->>'base_role' = 'professor' then 'professor'::role_enum
    else 'jogador'::role_enum
  end;
begin
  insert into public.profiles (id, display_name, base_role, active_role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email), v_role, v_role);
  return new;
end;
$$;

-- ─── Fotografia dos demos ──────────────────────────────────────────────────
-- Schema fora da API (o PostgREST só expõe public), e sem grant para anon nem
-- authenticated.
create schema if not exists demo_snapshot;
revoke all on schema demo_snapshot from public, anon, authenticated;

-- Ordem de pai para filho: é a ordem em que a restauração insere.
create or replace function demo_snapshot.tabelas() returns text[]
language sql immutable
as $$
  select array[
    'dentists', 'time_slots', 'appointments',
    'pn_clients', 'pn_pets', 'pn_professionals', 'pn_services', 'pn_time_slots',
    'pn_appointments', 'pn_products', 'pn_orders', 'pn_order_items', 'pn_reminders'
  ]
$$;

-- Rodar de novo depois de alterar uma dessas tabelas ou de caprichar nos dados
-- de exemplo: `select demo_snapshot.fotografar();`
create or replace function demo_snapshot.fotografar() returns void
language plpgsql security definer set search_path = public
as $$
declare t text;
begin
  foreach t in array demo_snapshot.tabelas() loop
    execute format('drop table if exists demo_snapshot.%I', t);
    execute format('create table demo_snapshot.%I as table public.%I', t, t);
  end loop;
end;
$$;

create or replace function demo_snapshot.restaurar_demos() returns void
language plpgsql security definer set search_path = public
as $$
declare t text;
begin
  execute 'truncate ' || (
    select string_agg(format('public.%I', x), ', ') from unnest(demo_snapshot.tabelas()) x
  );
  foreach t in array demo_snapshot.tabelas() loop
    execute format(
      'insert into public.%I overriding system value select * from demo_snapshot.%I', t, t
    );
  end loop;
  -- A fotografia envelhece; os geradores repõem a janela de horários futuros.
  perform public.generate_upcoming_slots();
  perform public.pn_generate_upcoming_grooming_slots();
end;
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'demo_snapshot' and table_name = 'dentists'
  ) then
    perform demo_snapshot.fotografar();
  end if;
end;
$$;

-- ─── Conta do visitante ────────────────────────────────────────────────────
-- Guardada pelo id: se alguém trocar o e-mail, a busca por e-mail não acharia.
create table if not exists demo_snapshot.visitante (user_id uuid primary key);
insert into demo_snapshot.visitante
  select id from auth.users where email = 'visitante@demo.aruanadigital.com'
  on conflict do nothing;

create or replace function demo_snapshot.restaurar_visitante() returns void
language sql security definer set search_path = public, extensions
as $$
  update auth.users u
     set encrypted_password = extensions.crypt('visitante2026', extensions.gen_salt('bf')),
         email = 'visitante@demo.aruanadigital.com',
         email_change = '',
         banned_until = null
    from demo_snapshot.visitante v
   where u.id = v.user_id
     and (u.email <> 'visitante@demo.aruanadigital.com'
          or u.encrypted_password <> extensions.crypt('visitante2026', u.encrypted_password)
          or coalesce(u.email_change, '') <> '');
$$;

revoke execute on all functions in schema demo_snapshot from public, anon, authenticated;

-- ─── Agendamentos ──────────────────────────────────────────────────────────
do $$
begin
  perform cron.unschedule(jobname) from cron.job
   where jobname in ('demo-visitante-senha', 'demo-restaurar-madrugada');
end;
$$;

select cron.schedule('demo-visitante-senha', '*/10 * * * *',
  $$select demo_snapshot.restaurar_visitante()$$);

-- 06:00 UTC = 03:00 em Brasília.
select cron.schedule('demo-restaurar-madrugada', '0 6 * * *',
  $$select demo_snapshot.restaurar_demos()$$);

-- ─── Conferência (é o resultado que o SQL Editor mostra) ────────────────────
-- visitante_encontrado = 0 → a conta ainda não foi criada; crie e rode de novo.
-- admins_portlibras > 0 → conferir se cada um foi concedido de propósito.
select
  (select count(*) from demo_snapshot.visitante) as visitante_encontrado,
  (select count(*) from cron.job where jobname like 'demo-%') as tarefas_agendadas,
  (select count(*) from demo_snapshot.dentists) as fotografia_dentistas,
  (select count(*) from demo_snapshot.pn_products) as fotografia_produtos_pet,
  (select count(*) from public.profiles where base_role = 'admin') as admins_portlibras;
