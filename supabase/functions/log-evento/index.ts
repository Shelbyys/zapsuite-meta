// Edge Function: log-evento · ZapSuite Meta
// ============================================================
// Body (JSON):
//   {
//     "email":     "alissonmariaisis@gmail.com",
//     "machineId": "abc123...",
//     "tipo":      "campanha_criada",
//     "payload":   { ... }
//   }
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const TIPOS_VALIDOS = new Set([
  "init", "campanha_criada", "campanha_pausada", "ad_set_criado",
  "ad_criado", "otimizacao_aplicada", "criativo_trocado", "erro",
]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, reason: "use POST" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ ok: false, reason: "JSON inválido" }, 400); }

  const { email, machineId, tipo, payload } = body || {};

  if (typeof email === "string" && email.toLowerCase().startsWith("dev+")) {
    return json({ ok: true, dev: true });
  }
  if (!email)                            return json({ ok: false, reason: "email ausente" }, 400);
  if (!tipo || !TIPOS_VALIDOS.has(tipo)) return json({ ok: false, reason: `tipo inválido (${tipo})` }, 400);

  const { data: lic } = await supa
    .from("licencas").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (!lic) return json({ ok: false, reason: "email não encontrado" }, 404);

  let instalacaoId: string | null = null;
  if (machineId) {
    const { data: inst } = await supa
      .from("zapsuite_meta_instalacoes")
      .select("id")
      .eq("licenca_id", lic.id)
      .eq("machine_id", machineId)
      .maybeSingle();
    instalacaoId = inst?.id ?? null;
  }

  const { error } = await supa.from("zapsuite_meta_eventos").insert({
    instalacao_id: instalacaoId,
    tipo,
    payload: payload ?? {},
  });
  if (error) return json({ ok: false, reason: error.message }, 500);

  return json({ ok: true });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
