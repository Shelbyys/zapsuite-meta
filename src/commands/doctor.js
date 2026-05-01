import chalk from 'chalk';
import { showBanner } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { readSecret } from '../lib/secrets.js';
import { isClaudeCodeInstalled } from '../lib/claude-detect.js';
import fs from 'node:fs/promises';
import { APP_DIR } from '../lib/paths.js';
import path from 'node:path';

export async function runDoctor() {
  showBanner('Diagnóstico');

  const checks = [];

  const cfg = await loadConfig();
  checks.push(['Config (~/.easy4u-trafego/config.json)', !!cfg]);

  const tok = cfg ? await readSecret('meta_access_token', cfg.licenseKey) : null;
  checks.push(['Token Meta criptografado',                !!tok]);

  checks.push(['Claude Code instalado',                    isClaudeCodeInstalled()]);

  const claudeMd = await fileExists(path.join(APP_DIR, 'CLAUDE.md'));
  checks.push(['CLAUDE.md gerado',                         claudeMd]);

  const mcp = await fileExists(path.join(APP_DIR, '.mcp.json'));
  checks.push(['.mcp.json gerado',                         mcp]);

  const agents = await dirCount(path.join(APP_DIR, '.claude/agents'));
  checks.push([`Agentes (${agents})`,                      agents > 0]);

  const cmds = await dirCount(path.join(APP_DIR, '.claude/commands'));
  checks.push([`Slash commands (${cmds})`,                 cmds > 0]);

  const playbooks = await dirCount(path.join(APP_DIR, 'playbooks'));
  checks.push([`Playbooks (${playbooks})`,                 playbooks > 0]);

  console.log();
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? chalk.green('✓') : chalk.red('✗')}  ${label}`);
  }
  console.log();

  if (cfg) {
    console.log(chalk.dim('  Negócio:  ') + chalk.bold(cfg.business?.nichoCustom || cfg.business?.nicho || '—'));
    console.log(chalk.dim('  Conta:    ') + (cfg.meta?.adAccountName || '—'));
    console.log(chalk.dim('  Limite:   ') + `R$ ${cfg.limits?.dailyBudgetMax}/dia`);
    console.log();
  }
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
async function dirCount(p) {
  try { return (await fs.readdir(p)).length; } catch { return 0; }
}
