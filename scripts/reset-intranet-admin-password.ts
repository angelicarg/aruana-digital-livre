// Script único para resetar a senha de um admin existente da intranet.
// Uso: bun run scripts/reset-intranet-admin-password.ts <email> <nova-senha>
// Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (já configurados).
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Uso: bun run scripts/reset-intranet-admin-password.ts <email> <nova-senha>");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Erro ao buscar usuário:", listError.message);
    process.exit(1);
  }

  const user = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail: ${email}`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });

  if (updateError) {
    console.error("Erro ao resetar senha:", updateError.message);
    process.exit(1);
  }

  console.log(`Senha atualizada com sucesso para: ${email}`);
}

main();
