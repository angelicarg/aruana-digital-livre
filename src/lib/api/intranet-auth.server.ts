// Helper compartilhado para server functions que expõem ações privilegiadas
// da intranet (ex: disparar e-mail, marcar cobrança como resolvida) via
// createServerFn. Uma createServerFn é um endpoint HTTP público independente
// de qual UI a chama — a sessão do Supabase Auth vive no localStorage do
// navegador e não é enviada automaticamente como cookie pro servidor, então
// o client precisa mandar o access token explicitamente, e o handler precisa
// validar aqui: usuário autenticado E presente em `intranet_admins` (mesma
// allowlist checada pelas RLS policies via `is_intranet_admin()`).
//
// Uso: dentro do handler de uma createServerFn privilegiada,
//   const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
//   await requireIntranetAdmin(supabaseAdmin, accessToken);

import type { supabaseAdmin as SupabaseAdminType } from "@/integrations/supabase/client.server";

export class NotIntranetAdminError extends Error {
  constructor() {
    super("not an intranet admin");
    this.name = "NotIntranetAdminError";
  }
}

export async function requireIntranetAdmin(
  admin: typeof SupabaseAdminType,
  accessToken: string,
): Promise<string> {
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new NotIntranetAdminError();
  }

  const { data: adminRow, error: adminError } = await admin
    .from("intranet_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    throw new NotIntranetAdminError();
  }

  return userData.user.id;
}
