import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { showBanner } from '../lib/banner.js';
import { validateLicense } from '../lib/licenca.js';
import { patchConfig, ensureAppDir } from '../lib/config.js';
import { isClaudeCodeInstalled, installClaudeCode, registerMetaMcp } from '../lib/claude-detect.js';
import { renderAll } from '../installer/render-templates.js';
import { DESKTOP_DIR } from '../lib/paths.js';
import { ensureMidiasFolders, MIDIAS_DIR } from '../lib/midias.js';
import { logEvento, TIPO } from '../lib/telemetria.js';

// Lista de produtos pré-cadastrados — precisa bater com templates/playbooks/*.yaml
const PRODUTOS = [
  { value: 'hay-hair',          label: 'Hay Hair' },
  { value: 'movi-mint',         label: 'Movi Mint' },
  { value: 'velmo-black-drink', label: 'Velmo Black Drink (Morango/Tangerina)' },
  { value: 'velmo-black',       label: 'Velmo Black' },
  { value: 'ton',               label: 'Ton  (regras especiais)' },
  { value: 'creatina-gummy',    label: 'Creatina Gummy' },
  { value: 'creagym',           label: 'Creagym' },
  { value: 'celuglow',          label: 'Celuglow' },
  { value: 'calminol',          label: 'Calminol' },
  { value: 'fiber-slim',        label: 'Fiber Slim' },
  { value: 'clarize',           label: 'Clarize' },
  { value: 'termo-drink',       label: 'Termo Drink' },
  { value: 'skin-fit',          label: 'Skin Fit' },
  { value: 'inti-feme',         label: 'Inti Feme' },
  { value: 'inti-masc',         label: 'Inti Masc' },
  { value: 'quero-mais',        label: 'Quero +' },
];

export async function runInit() {
  console.clear();
  showBanner('Instalação · ~2 minutos');

  p.intro(chalk.bgMagenta.white(' ZapSuite Meta · setup '));

  await ensureAppDir();

  // ---------- 1. Claude Code ----------
  await p.tasks([
    {
      title: 'Verificando Claude Code',
      task: async () => {
        if (isClaudeCodeInstalled()) return chalk.green('Claude Code já instalado');
        installClaudeCode();
        return chalk.green('Claude Code instalado');
      },
    },
  ]);

  // ---------- 2. Licença ----------
  const licenseKey = await p.text({
    message: 'Cole sua licença Easy4u (ou DEV-XXXX pra modo desenvolvedor):',
    placeholder: 'EZ4U-XXXX-XXXX-XXXX',
    validate: v => (!v || v.length < 6 ? 'licença inválida' : undefined),
  });
  if (p.isCancel(licenseKey)) throw new Error('cancelled');

  const s1 = p.spinner();
  s1.start('Validando licença');
  const lic = await validateLicense(licenseKey, { operador: null });
  if (!lic.valid) {
    s1.stop(chalk.red(`Licença inválida: ${lic.reason || 'desconhecido'}`));
    throw new Error('licença inválida');
  }
  s1.stop(
    chalk.green(
      `Licença válida ${lic.dev ? chalk.dim('(modo dev)') : ''}${lic.fromCache ? chalk.dim(' (cache)') : ''}`
    )
  );

  // ---------- 3. Perfil de operação (curto) ----------
  p.note(
    'Vou perguntar 3 coisas pra deixar tudo do seu jeito.',
    chalk.cyan('briefing')
  );

  const operadorNome = await p.text({
    message: 'Como você quer ser chamado? (aparece no topo do menu)',
    placeholder: 'Ex.: Time Easy4u · Ana · Operação 1',
    validate: v => (!v ? 'obrigatório' : undefined),
  });
  if (p.isCancel(operadorNome)) throw new Error('cancelled');

  const produtosAtivos = await p.multiselect({
    message: 'Quais produtos você promove? (espaço pra marcar, enter pra confirmar)',
    options: PRODUTOS,
    required: false,
    initialValues: [],
  });
  if (p.isCancel(produtosAtivos)) throw new Error('cancelled');

  const budgetTeto = await p.text({
    message: chalk.yellow('Limite máximo de gasto diário (R$) — somando TODAS as campanhas ativas:'),
    placeholder: '300',
    validate: v => (Number.isNaN(Number(v)) || Number(v) <= 0 ? 'use só números, > 0' : undefined),
  });
  if (p.isCancel(budgetTeto)) throw new Error('cancelled');

  const telemetria = await p.confirm({
    message: 'Pode mandar eventos anônimos pro time Easy4u melhorar o produto? (opt-in)',
    initialValue: true,
  });
  if (p.isCancel(telemetria)) throw new Error('cancelled');

  // ---------- 4. Salvar config ----------
  const config = {
    licenseKey,
    plan: lic.plan,
    operador: {
      nome: operadorNome,
      produtosAtivos: produtosAtivos.length ? produtosAtivos : null, // null = todos liberados
    },
    limits: {
      dailyBudgetMax: Number(budgetTeto),
    },
    telemetry: telemetria,
    installedAt: new Date().toISOString(),
  };
  await patchConfig(config);

  // ---------- 5. Pasta de mídias ----------
  await ensureMidiasFolders();

  // ---------- 6. Render templates ----------
  const s3 = p.spinner();
  s3.start('Gerando arquivos do Claude Code (CLAUDE.md, agentes, slash commands, playbooks)');
  const today = new Date().toISOString().slice(0, 10);
  await renderAll({
    ...config,
    today,
    produtosAtivosLabels: (produtosAtivos.length
      ? PRODUTOS.filter(p => produtosAtivos.includes(p.value)).map(p => p.label)
      : ['(todos os 16 produtos liberados)']
    ),
  });
  s3.stop(chalk.green('Arquivos gerados em ~/.zapsuite-meta/'));

  // ---------- 7. MCP da Meta no Claude Code ----------
  const s4 = p.spinner();
  s4.start('Registrando MCP da Meta no Claude Code (mcp.facebook.com/ads)');
  const mcp = registerMetaMcp('user');
  if (mcp.ok) s4.stop(chalk.green('MCP da Meta registrado'));
  else s4.stop(chalk.yellow(`MCP não registrado automaticamente: ${mcp.error}`));

  // ---------- 8. Atalho no Desktop ----------
  await maybeCreateShortcut();

  // ---------- 8b. Telemetria ----------
  logEvento(TIPO.INIT, {
    plan: lic.plan,
    produtos: produtosAtivos,
    limit: Number(budgetTeto),
  });

  // ---------- 9. Final ----------
  p.outro(
    [
      chalk.green.bold('Pronto!'),
      '',
      chalk.bold('Próximos passos:'),
      '',
      `  1. Coloque suas fotos/vídeos em ${chalk.cyan(MIDIAS_DIR + '/upload/')}`,
      `     ${chalk.dim('(o menu tem opção pra abrir essa pasta)')}`,
      `  2. Rode ${chalk.cyan('zsm')} ${chalk.dim('— ou clique no atalho do Desktop')}`,
      `  3. Escolha ${chalk.cyan('🚀 Subir nova campanha')} no menu`,
      `  4. Na primeira tool da Meta, o Claude Code abre o navegador pra você`,
      `     ${chalk.dim('autorizar o Facebook (uma única vez).')}`,
      '',
      chalk.dim(`Atalho: Desktop → "ZapSuite Meta.command"`),
    ].join('\n')
  );
}

async function maybeCreateShortcut() {
  if (process.platform !== 'darwin') return;
  try {
    const shortcut = path.join(DESKTOP_DIR, 'ZapSuite Meta.command');
    const body = `#!/bin/zsh\ncd "$HOME"\nexec zapsuite-meta\n`;
    await fs.writeFile(shortcut, body, { mode: 0o755 });
  } catch {
    // Desktop pode não existir; ignorar.
  }
}
