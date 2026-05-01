import * as p from '@clack/prompts';
import chalk from 'chalk';
import { showBanner } from '../lib/banner.js';
import { loadConfig, patchConfig } from '../lib/config.js';
import { renderAll } from '../installer/render-templates.js';
import { checkForUpdate, runNpmUpdate, getCurrentVersion } from '../lib/updater.js';

export async function runUpdate() {
  showBanner('Atualizar ZapSuite Meta');

  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Rode `zsm init` antes.', chalk.yellow('atenção'));
    return;
  }

  // 1) Checa npm
  const s1 = p.spinner();
  s1.start('Verificando se tem versão nova no npm');
  const upd = await checkForUpdate();
  s1.stop(
    upd.reachable
      ? upd.hasUpdate
        ? chalk.yellow(`Versão nova: v${upd.latest} (você tá na v${upd.current})`)
        : chalk.green(`Você já tá na última: v${upd.current}`)
      : chalk.dim(`Não consegui checar npm (offline?). Versão local: v${upd.current}`)
  );

  // 2) Se tem update, oferece npm i -g
  if (upd.hasUpdate) {
    const ok = await p.confirm({
      message: `Atualizar agora pra v${upd.latest}?`,
      initialValue: true,
    });
    if (!p.isCancel(ok) && ok) {
      const s2 = p.spinner();
      s2.start('Rodando npm i -g @zapsuite/meta@latest');
      try {
        runNpmUpdate();
        s2.stop(chalk.green('Pacote atualizado.'));
      } catch (err) {
        s2.stop(chalk.red(`Falhou: ${err.message}`));
        p.note(
          `Se deu permissão negada, tente:\n  ${chalk.cyan('sudo npm i -g @zapsuite/meta@latest')}`,
          chalk.dim('dica')
        );
      }
    }
  }

  // 3) Re-renderiza templates locais com config atual (sempre)
  const s3 = p.spinner();
  s3.start('Re-renderizando agentes, slash commands e playbooks');
  await renderAll({
    ...cfg,
    today: new Date().toISOString().slice(0, 10),
  });
  await patchConfig({ templatesAtPkgVersion: await getCurrentVersion() });
  s3.stop(chalk.green('Templates atualizados.'));

  p.outro(chalk.green('Tudo certo.'));
}
