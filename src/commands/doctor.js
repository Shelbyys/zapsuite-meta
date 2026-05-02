import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { showBanner } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { isClaudeCodeInstalled } from '../lib/claude-detect.js';
import { APP_DIR } from '../lib/paths.js';
import { listAvailableMidias, MIDIAS_DIR } from '../lib/midias.js';

export async function runDoctor() {
  showBanner('Diagnóstico');

  const checks = [];

  const cfg = await loadConfig();
  checks.push(['Config (~/.zapsuite-meta/config.json)', !!cfg]);

  checks.push(['Claude Code instalado',                    isClaudeCodeInstalled()]);

  const claudeMd = await fileExists(path.join(APP_DIR, 'CLAUDE.md'));
  checks.push(['CLAUDE.md gerado',                         claudeMd]);

  const mcp = await fileExists(path.join(APP_DIR, '.mcp.json'));
  checks.push(['.mcp.json gerado',                         mcp]);

  const mcpRegistered = isMetaMcpRegistered();
  checks.push(['MCP Meta registrado no Claude Code',       mcpRegistered]);

  const agents = await dirCount(path.join(APP_DIR, '.claude/agents'));
  checks.push([`Agentes (${agents})`,                      agents > 0]);

  const cmds = await dirCount(path.join(APP_DIR, '.claude/commands'));
  checks.push([`Slash commands (${cmds})`,                 cmds > 0]);

  const playbooks = await dirCount(path.join(APP_DIR, 'playbooks'));
  checks.push([`Playbooks (${playbooks})`,                 playbooks > 0]);

  const midias = await listAvailableMidias();
  const imgs = midias.filter(m => m.kind === 'image').length;
  const vids = midias.filter(m => m.kind === 'video').length;
  checks.push([`Mídias (${imgs === 1 ? '1 imagem' : imgs + ' imagens'} · ${vids === 1 ? '1 vídeo' : vids + ' vídeos'})`, midias.length > 0]);
  const oversize = midias.filter(m => m.oversize).length;
  if (oversize) checks.push([chalk.yellow(`⚠ ${oversize} arquivo(s) acima do limite Meta`), false]);

  console.log();
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? chalk.green('✓') : chalk.red('✗')}  ${label}`);
  }
  console.log();

  if (cfg) {
    console.log(chalk.dim('  Email:     ') + chalk.bold(cfg.email || '—'));
    console.log(chalk.dim('  Operador:  ') + chalk.bold(cfg.operador?.nome || '—'));
    console.log(chalk.dim('  Plano:     ') + (cfg.plan || '—'));
    console.log(chalk.dim('  Produtos:  ') + (cfg.operador?.produtosAtivos?.length
      ? `${cfg.operador.produtosAtivos.length} ativo(s)`
      : 'todos liberados'));
    console.log(chalk.dim('  Limite:    ') + `R$ ${cfg.limits?.dailyBudgetMax}/dia`);
    console.log(chalk.dim('  Conta Meta:') + ' ' + (cfg.meta?.activeAdAccountName
      ? `${cfg.meta.activeAdAccountName} (${cfg.meta.activeAdAccountId})`
      : chalk.yellow('não configurada — rode /configurar-conta no Claude Code')));
    console.log();
  }

  if (!mcpRegistered) {
    console.log(chalk.yellow('  Para registrar o MCP da Meta manualmente:'));
    console.log(chalk.cyan('    claude mcp add --transport http --scope user meta https://mcp.facebook.com/ads\n'));
  }
}

function isMetaMcpRegistered() {
  try {
    const out = execSync('claude mcp list 2>/dev/null', { encoding: 'utf8' });
    return /meta\b/i.test(out) && /mcp\.facebook\.com/i.test(out);
  } catch {
    return false;
  }
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
async function dirCount(p) {
  try { return (await fs.readdir(p)).length; } catch { return 0; }
}
