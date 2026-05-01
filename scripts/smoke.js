#!/usr/bin/env node
// Smoke test não-interativo. Renderiza templates com config fake
// e roda o doctor pra confirmar que todo o pipeline funciona offline.
import { renderAll } from '../src/installer/render-templates.js';
import { patchConfig, ensureAppDir } from '../src/lib/config.js';
import { runDoctor } from '../src/commands/doctor.js';
import { ensureMidiasFolders } from '../src/lib/midias.js';

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
  limits: { dailyBudgetMax: 100 },
  telemetry: true,
  installedAt: new Date().toISOString(),
};

await ensureAppDir();
await ensureMidiasFolders();
await patchConfig(fakeCfg);
await renderAll({
  ...fakeCfg,
  today: new Date().toISOString().slice(0, 10),
  nichoLabel: fakeCfg.business.nichoLabel,
  objetivoLabel: fakeCfg.business.objetivoLabel,
});
console.log('\n--- DOCTOR ---\n');
await runDoctor();
