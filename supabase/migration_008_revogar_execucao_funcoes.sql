-- 14/10/2026: reduzir quem pode chamar funções SECURITY DEFINER pela API pública (/rest/v1/rpc).
-- Banco compartilhado com Dente Vivo, PortLibras e Patas Nobres: nada aqui remove função nem dado.
-- Cada função abaixo foi lida antes; os motivos estão nos comentários.

-- 1) Geradores de horários: rodam só pelo pg_cron (dono postgres), que não depende desse privilégio.
--    Hoje qualquer visitante anônimo pode disparar a inserção de horários.
revoke execute on function public.generate_upcoming_slots() from public, anon, authenticated;
revoke execute on function public.pn_generate_upcoming_grooming_slots() from public, anon, authenticated;

-- 2) Função de gatilho (cria o perfil quando nasce um usuário): não precisa ser chamável por RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3) Dependem de auth.uid(): para anônimo só retornam erro. Quem está logado continua podendo.
revoke execute on function public.switch_active_role(role_enum) from public, anon;
revoke execute on function public.submit_answer(uuid, jsonb) from public, anon;
grant  execute on function public.switch_active_role(role_enum) to authenticated;
grant  execute on function public.submit_answer(uuid, jsonb) to authenticated;

-- 4) Funções com search_path mutável (aviso do linter): fixar o caminho.
alter function public.set_updated_at() set search_path = public;
-- demo_snapshot.tabelas(): conferir a assinatura antes de fixar.

-- NÃO MEXER (intencional):
--  * book_appointment, pn_book_appointment, pn_create_order: reservas feitas por visitante anônimo nas demos.
--  * has_role, is_admin, is_intranet_admin: usadas dentro de políticas RLS; só respondem pelo próprio auth.uid().
--  * public.questions_public: visão pública das questões aprovadas, sem a coluna `answer`, de propósito.
--  * pg_net no schema public: mover exige recriar a extensão e pode quebrar o envio dos lembretes da Toca.

-- DESFAZER (se algo reclamar de permissão):
--   grant execute on function public.generate_upcoming_slots() to public, anon, authenticated;
--   grant execute on function public.pn_generate_upcoming_grooming_slots() to public, anon, authenticated;
--   grant execute on function public.handle_new_user() to public, anon, authenticated;
--   grant execute on function public.switch_active_role(role_enum) to public, anon, authenticated;
--   grant execute on function public.submit_answer(uuid, jsonb) to public, anon, authenticated;
