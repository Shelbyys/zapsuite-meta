import * as p from '@clack/prompts';
import chalk from 'chalk';
import { showBanner } from '../lib/banner.js';
import { startOAuth } from '../lib/meta-oauth.js';
import { saveSecret } from '../lib/secrets.js';
import { loadConfig } from '../lib/config.js';

export async function runLogin() {
  showBanner('Reconectar conta Meta');
  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Você ainda não rodou o init. Use: easy4u-trafego init', chalk.yellow('atenção'));
    return;
  }

  const go = await p.confirm({
    message: 'Vou abrir o navegador para você autorizar a Meta de novo. Pode ir?',
    initialValue: true,
  });
  if (p.isCancel(go) || !go) return;

  const s = p.spinner();
  s.start('Aguardando autorização no navegador');
  const oauth = await startOAuth({ devMode: cfg.plan === 'dev' });
  s.stop(chalk.green('Conectado'));

  await saveSecret('meta_access_token', oauth.accessToken, cfg.licenseKey);
  if (oauth.expiresIn)
    await saveSecret('meta_token_expires_at', Date.now() + oauth.expiresIn * 1000, cfg.licenseKey);

  p.outro(chalk.green('Token Meta atualizado.'));
}
