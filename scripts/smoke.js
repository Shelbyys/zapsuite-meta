#!/usr/bin/env node
// Smoke test não-interativo. Renderiza templates com config fake
// e roda o doctor pra confirmar que todo o pipeline funciona offline.
import { renderAll } from '../src/installer/render-templates.js';
import { patchConfig, ensureAppDir } from '../src/lib/config.js';
import { saveSecret } from '../src/lib/secrets.js';
import { runDoctor } from '../src/commands/doctor.js';

const fakeCfg = {
  licenseKey: 'DEV-SMOKE-0001',
  plan: 'dev',
  business: {
    nicho: 'pizzaria',
    nichoLabel: 'Pizzaria / Delivery',
    nichoCustom: null,
    cidade: 'Juazeiro do Norte/CE · raio 5km',
    ticket: 50,
    objetivo: 'whatsapp',
    objetivoLabel: 'Receber mensagens no WhatsApp',
    horario: 'Seg–Dom · 18h às 23h',
    diferencial: 'única pizzaria do bairro com forno a lenha',
  },
  meta: {
    adAccountId: 'act_1234567890',
    adAccountName: 'Pizzaria do João (DEV)',
    currency: 'BRL',
  },
  limits: { dailyBudgetMax: 100 },
  telemetry: true,
  installedAt: new Date().toISOString(),
};

await ensureAppDir();
await patchConfig(fakeCfg);
await saveSecret('meta_access_token', 'DEV_TOKEN_smoke', fakeCfg.licenseKey);
await renderAll({
  ...fakeCfg,
  today: new Date().toISOString().slice(0, 10),
  nichoLabel: fakeCfg.business.nichoLabel,
  objetivoLabel: fakeCfg.business.objetivoLabel,
});
console.log('\n--- DOCTOR ---\n');
await runDoctor();
