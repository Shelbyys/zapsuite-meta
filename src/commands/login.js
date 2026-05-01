import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { showBanner } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { APP_DIR } from '../lib/paths.js';

export async function runLogin() {
  showBanner('Reconectar conta Meta');
  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Você ainda não rodou o init. Use: zapsuite-meta init', chalk.yellow('atenção'));
    return;
  }

  p.note(
    [
      'Quem gerencia o login na Meta agora é o Claude Code (via MCP Facebook).',
      '',
      'Vou abrir o Claude Code e disparar uma chamada de teste.',
      'Se o token tiver expirado, ele abre o navegador automaticamente',
      'pra você reautenticar.',
    ].join('\n'),
    chalk.cyan('como funciona')
  );

  const go = await p.confirm({ message: 'Abrir Claude Code agora?', initialValue: true });
  if (p.isCancel(go) || !go) return;

  await new Promise(resolve => {
    const child = spawn(
      'claude',
      ['-p', 'Use a tool da Meta pra listar minhas contas de anúncios. Não crie nada — só lista.'],
      { stdio: 'inherit', cwd: APP_DIR }
    );
    child.on('exit', () => resolve());
    child.on('error', err => {
      console.log(chalk.red(`\nNão consegui abrir o Claude Code: ${err.message}`));
      resolve();
    });
  });

  p.outro(chalk.green('Pronto.'));
}
