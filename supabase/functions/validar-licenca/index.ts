// Edge Function: validar-licenca · ZapSuite Meta
// ============================================================
// Body (JSON):
//   {
//     "email":     "alissonmariaisis@gmail.com",
//     "machineId": "abc123...",        // hex 32 chars
//     "operador":  "Sr. Alisson",      // opcional, label
//     "cliVersion":"0.1.0",            // opcional
//     "os":        "darwin"            // opcional
//   }
//
// Resposta sucesso:
//   { "valid": true, "plan":"beta", "maxAccounts":5, "produtosLiberados":null }
//
// Resposta falha:
//   { "valid": false, "reason": "..." }
//   - "email não cadastrado"
//   - "licença está pausada/cancelada"
//   - "ZapSuite Meta não está ativo nesta licença"
//   - "limite de N dispositivos atingido — desativa um antes"
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ valid: false, reason: "use POST" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ valid: false, reason: "JSON inválido" }, 400); }

  const { email, machineId, operador, cliVersion, os } = body || {};

  // Modo dev — email começando com "dev+" libera tudo, sem tocar banco
  if (typeof email === "string" && email.toLowerCase().startsWith("dev+")) {
    return json({ valid: true, plan: "dev", maxAccounts: 99, produtosLiberados: null, dev: true });
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ valid: false, reason: "email inválido" }, 400);
  }
  if (!machineId || typeof machineId !== "string" || machineId.length < 8) {
    return json({ valid: false, reason: "machineId ausente" }, 400);
  }

  // Procura licença ativa pra esse email
  const { data: lic, error } = await supa
    .from("licencas")
    .select("id, status, zapsuite_meta_ativo, zapsuite_meta_plano, zapsuite_meta_max_contas")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error)             return json({ valid: false, reason: `db error: ${error.message}` }, 500);
  if (!lic)              return json({ valid: false, reason: "email não cadastrado — fala com o suporte Easy4u" }, 404);
  if (lic.status !== "ativa")
                         return json({ valid: false, reason: `licença está ${lic.status}` }, 403);
  if (!lic.zapsuite_meta_ativo)
                         return json({ valid: false, reason: "ZapSuite Meta não está ativo nesta licença" }, 403);

  // Já existe instalação dessa máquina pra essa licença?
  const { data: existing } = await supa
    .from("zapsuite_meta_instalacoes")
    .select("id")
    .eq("licenca_id", lic.id)
    .eq("machine_id", machineId)
    .maybeSingle();

  if (!existing) {
    // É um dispositivo NOVO — checa limite
    const { count } = await supa
      .from("zapsuite_meta_instalacoes")
      .select("id", { count: "exact", head: true })
      .eq("licenca_id", lic.id);

    const max = lic.zapsuite_meta_max_contas || 1;
    if ((count ?? 0) >= max) {
      return json({
        valid: false,
        reason: `limite de ${max} dispositivos atingido pra esta licença. Desativa um antes ou pede upgrade do plano.`,
      }, 403);
    }
  }

  // Upsert da instalação (cria ou atualiza last_active_at)
  await supa.from("zapsuite_meta_instalacoes").upsert({
    licenca_id: lic.id,
    machine_id: machineId,
    operador_nome: operador || null,
    cli_version: cliVersion || null,
    os: os || null,
    last_active_at: new Date().toISOString(),
  }, { onConflict: "licenca_id,machine_id" });

  return json({
    valid: true,
    plan: lic.zapsuite_meta_plano,
    maxAccounts: lic.zapsuite_meta_max_contas,
    produtosLiberados: null,  // futuro: filtrar por plano
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
