// Edge Function: validar-licenca
// ============================================================
// Body esperado (JSON):
//   {
//     "licenseKey": "EZ4U-XXXX-XXXX-XXXX",
//     "product": "trafego_ai",         // legacy id; ZapSuite Meta usa essa flag
//     "operador": "Time Easy4u · Ana", // opcional
//     "cliVersion": "0.1.0",           // opcional
//     "os": "darwin"                   // opcional
//   }
//
// Resposta sucesso:
//   {
//     "valid": true,
//     "plan": "beta",
//     "maxAccounts": 1,
//     "produtosLiberados": ["hay-hair","movi-mint", ...]  // null = todos
//   }
//
// Resposta falha:
//   { "valid": false, "reason": "licença não encontrada" }
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ valid: false, reason: "use POST" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ valid: false, reason: "JSON inválido" }, 400);
  }

  const { licenseKey, product, operador, cliVersion, os } = body || {};
  if (!licenseKey || typeof licenseKey !== "string") {
    return json({ valid: false, reason: "licenseKey ausente" }, 400);
  }

  // Modo dev — DEV-XXXXX libera tudo sem bater no banco
  if (licenseKey.startsWith("DEV-")) {
    return json({ valid: true, plan: "dev", maxAccounts: 99, produtosLiberados: null, dev: true });
  }

  const { data: lic, error } = await supa
    .from("licencas")
    .select("id, status, zapsuite_meta_ativo, zapsuite_meta_plano, zapsuite_meta_max_contas")
    .eq("chave", licenseKey)
    .maybeSingle();

  if (error)            return json({ valid: false, reason: `db error: ${error.message}` }, 500);
  if (!lic)             return json({ valid: false, reason: "licença não encontrada" }, 404);
  if (lic.status !== "ativa")
                        return json({ valid: false, reason: `licença está ${lic.status}` }, 403);
  if (!lic.zapsuite_meta_ativo)
                        return json({ valid: false, reason: "ZapSuite Meta não está ativo nesta licença" }, 403);

  // Registra/atualiza instalação (best-effort, não bloqueia resposta)
  if (operador) {
    supa.from("zapsuite_meta_instalacoes")
      .upsert({
        licenca_id: lic.id,
        operador_nome: operador,
        cli_version: cliVersion || null,
        os: os || null,
        last_active_at: new Date().toISOString(),
      }, { onConflict: "licenca_id,operador_nome" })
      .then(() => {});
  }

  return json({
    valid: true,
    plan: lic.zapsuite_meta_plano,
    maxAccounts: lic.zapsuite_meta_max_contas,
    produtosLiberados: null,  // null = todos os 16 (futuro: filtrar por plano)
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
