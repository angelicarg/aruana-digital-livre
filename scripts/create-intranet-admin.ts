// Script único para criar o primeiro usuário admin da intranet.
// Uso: bun run scripts/create-intranet-admin.ts <email> <senha>
// Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (já configurados).
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Uso: bun run scripts/create-intranet-admin.ts <email> <senha>");
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
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error("Erro ao criar usuário:", createError.message);
    process.exit(1);
  }

  const userId = userData.user.id;

  const { error: adminError } = await supabase
    .from("intranet_admins")
    .insert({ user_id: userId });

  if (adminError) {
    console.error("Usuário criado, mas falhou ao inserir na allowlist:", adminError.message);
    process.exit(1);
  }

  console.log(`Admin criado com sucesso: ${email} (user_id: ${userId})`);
}

main();
