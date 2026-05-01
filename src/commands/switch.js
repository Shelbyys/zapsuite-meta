import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { showBanner } from '../lib/banner.js';
import { loadConfig, patchConfig } from '../lib/config.js';
import { isClaudeCodeInstalled } from '../lib/claude-detect.js';
import { APP_DIR } from '../lib/paths.js';

/**
 * Trocar de conta de anúncios ativa.
 * Como o token Meta tá no Claude Code (via MCP), pra LISTAR contas
 * a gente delega lá. O operador escolhe pela linha de comando que ele
 * cola aqui depois (UX simples — evita parser de output do Claude).
 */
export async function runSwitch() {
  showBanner('Trocar conta de anúncios');

  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Rode `zsm init` antes.', chalk.yellow('atenção'));
    return;
  }

  const atual = cfg.meta?.activeAdAccountName
    ? `${cfg.meta.activeAdAccountName} (${cfg.meta.activeAdAccountId})`
    : chalk.dim('— nenhuma configurada ainda —');

  p.note(`Conta ativa agora: ${chalk.bold(atual)}`, chalk.cyan('estado'));

  const action = await p.select({
    message: 'O que fazer?',
    options: [
      { value: 'list',   label: '🔍  Listar contas via Claude Code (e me diz qual escolher)' },
      { value: 'manual', label: '⌨️   Já sei o ID e nome — colar manualmente' },
      { value: 'cancel', label: '← cancelar' },
    ],
  });
  if (p.isCancel(action) || action === 'cancel') return;

  if (action === 'list') {
    if (!isClaudeCodeInstalled()) {
      p.note(
        `Claude Code não tá instalado. Instale com:\n  ${chalk.cyan('npm i -g @anthropic-ai/claude-code')}`,
        chalk.red('falta dependência')
      );
      return;
    }
    p.note(
      'Vou abrir o Claude Code com a pergunta. Quando ele listar suas contas,\nvolta aqui e cola o ID e nome da que você quer ativar.',
      chalk.dim('próximo passo')
    );
    await new Promise(resolve => {
      const child = spawn('claude', ['-p', 'Use mcp__meta__ads_get_ad_accounts pra listar minhas contas de anúncios. Mostre ID e nome em formato de tabela. Não crie nada.'], {
        stdio: 'inherit',
        cwd: APP_DIR,
      });
      child.on('exit', () => resolve());
      child.on('error', () => resolve());
    });
  }

  // Manual: pede ID + nome
  const id = await p.text({
    message: 'ID da conta (ex: act_1234567890):',
    validate: v => (!/^act_\d+$/.test(v) ? 'formato esperado: act_<números>' : undefined),
  });
  if (p.isCancel(id)) return;

  const name = await p.text({
    message: 'Nome da conta (rótulo amigável pra você):',
    validate: v => (!v ? 'obrigatório' : undefined),
  });
  if (p.isCancel(name)) return;

  await patchConfig({
    meta: { ...(cfg.meta || {}), activeAdAccountId: id, activeAdAccountName: name },
  });

  p.outro(chalk.green(`Pronto. Conta ativa: ${name} (${id}).`));
}
