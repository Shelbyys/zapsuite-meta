import * as p from '@clack/prompts';
import chalk from 'chalk';
import { showBanner } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { renderAll } from '../installer/render-templates.js';

export async function runUpdate() {
  showBanner('Atualizar templates');
  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Rode `zapsuite-meta init` antes.', chalk.yellow('atenção'));
    return;
  }
  const s = p.spinner();
  s.start('Re-renderizando agentes, slash commands e playbooks');
  await renderAll({
    ...cfg,
    today: new Date().toISOString().slice(0, 10),
  });
  s.stop(chalk.green('Atualizado.'));
}
