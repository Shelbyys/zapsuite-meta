#!/usr/bin/env node
// Smoke test não-interativo. Renderiza templates com config fake
// e roda o doctor pra confirmar que todo o pipeline funciona offline.
import { renderAll } from '../src/installer/render-templates.js';
import { patchConfig, ensureAppDir } from '../src/lib/config.js';
import { runDoctor } from '../src/commands/doctor.js';
import { ensureMidiasFolders } from '../src/lib/midias.js';

const fakeCfg = {
  email: 'dev+smoke@zapsuite.test',
  plan: 'dev',
  operador: {
    nome: 'Time DEV (smoke)',
    produtosAtivos: ['hay-hair', 'movi-mint', 'ton'],
  },
  limits: { dailyBudgetMax: 300 },
  telemetry: true,
  installedAt: new Date().toISOString(),
};

await ensureAppDir();
await ensureMidiasFolders();
await patchConfig(fakeCfg);
await renderAll({
  ...fakeCfg,
  today: new Date().toISOString().slice(0, 10),
  produtosAtivosLabels: ['Hay Hair', 'Movi Mint', 'Ton  (regras especiais)'],
});
console.log('\n--- DOCTOR ---\n');
await runDoctor();
