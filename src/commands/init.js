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

const NICHOS = [
  { value: 'pizzaria',     label: 'Pizzaria / Delivery' },
  { value: 'salao',        label: 'Salão de Beleza' },
  { value: 'dentista',     label: 'Dentista / Clínica' },
  { value: 'academia',     label: 'Academia / Personal' },
  { value: 'loja',         label: 'Loja Física / Varejo' },
  { value: 'ecommerce',    label: 'E-commerce' },
  { value: 'imobiliaria',  label: 'Imobiliária / Corretor' },
  { value: 'mecanica',     label: 'Mecânica / Auto' },
  { value: 'estetica',     label: 'Estética / Spa' },
  { value: 'outro',        label: 'Outro (descrevo na próxima)' },
];

const OBJETIVOS = [
  { value: 'whatsapp',     label: 'Receber mensagens no WhatsApp' },
  { value: 'agendamento',  label: 'Agendamento online' },
  { value: 'leads',        label: 'Leads / Formulário' },
  { value: 'vendas',       label: 'Vendas pelo site (e-commerce)' },
  { value: 'visitas',      label: 'Visitas à loja física' },
];

export async function runInit() {
  console.clear();
  showBanner('Instalação · vamos preparar tudo em ~3 minutos');

  p.intro(chalk.bgBlue.white(' ZapSuite Meta · setup '));

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
    message: 'Cole sua licença Easy4u (começa com EZ4U- ou DEV- pra modo desenvolvedor):',
    placeholder: 'EZ4U-XXXX-XXXX-XXXX',
    validate: v => (!v || v.length < 6 ? 'licença inválida' : undefined),
  });
  if (p.isCancel(licenseKey)) throw new Error('cancelled');

  const s1 = p.spinner();
  s1.start('Validando licença');
  const lic = await validateLicense(licenseKey);
  if (!lic.valid) {
    s1.stop(chalk.red(`Licença inválida: ${lic.reason || 'desconhecido'}`));
    throw new Error('licença inválida');
  }
  s1.stop(
    chalk.green(
      `Licença válida ${lic.dev ? chalk.dim('(modo dev)') : ''}${lic.fromCache ? chalk.dim(' (cache)') : ''}`
    )
  );

  // ---------- 3. Briefing ----------
  p.note('Agora 6 perguntas rápidas sobre seu negócio.\nIsso vira o cérebro da IA pra todas as campanhas.', chalk.cyan('briefing'));

  const nicho = await p.select({ message: 'Qual seu nicho?', options: NICHOS });
  if (p.isCancel(nicho)) throw new Error('cancelled');

  let nichoCustom = null;
  if (nicho === 'outro') {
    nichoCustom = await p.text({ message: 'Descreva seu nicho em 1 linha:', placeholder: 'Ex.: Cafeteria especialty no centro' });
    if (p.isCancel(nichoCustom)) throw new Error('cancelled');
  }

  const cidade = await p.text({
    message: 'Cidade e raio de atendimento:',
    placeholder: 'Ex.: Juazeiro do Norte/CE · raio 5 km',
    validate: v => (!v ? 'obrigatório' : undefined),
  });
  if (p.isCancel(cidade)) throw new Error('cancelled');

  const ticket = await p.text({
    message: 'Ticket médio (R$):',
    placeholder: '50',
    validate: v => (Number.isNaN(Number(v)) ? 'use só números' : undefined),
  });
  if (p.isCancel(ticket)) throw new Error('cancelled');

  const objetivo = await p.select({ message: 'Objetivo principal das campanhas?', options: OBJETIVOS });
  if (p.isCancel(objetivo)) throw new Error('cancelled');

  const horario = await p.text({
    message: 'Horário de atendimento:',
    placeholder: 'Seg–Sáb · 9h às 22h',
  });
  if (p.isCancel(horario)) throw new Error('cancelled');

  const diferencial = await p.text({
    message: 'Seu diferencial em 1 frase:',
    placeholder: 'Ex.: a única pizzaria do bairro com forno a lenha',
  });
  if (p.isCancel(diferencial)) throw new Error('cancelled');

  const budgetTeto = await p.text({
    message: chalk.yellow('Limite máximo de gasto diário (R$) — a IA NUNCA vai passar disso:'),
    placeholder: '100',
    validate: v => (Number.isNaN(Number(v)) ? 'use só números' : undefined),
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
    business: {
      nicho,
      nichoCustom,
      cidade,
      ticket: Number(ticket),
      objetivo,
      horario,
      diferencial,
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
    nichoLabel: NICHOS.find(n => n.value === nicho)?.label || nichoCustom || nicho,
    objetivoLabel: OBJETIVOS.find(o => o.value === objetivo)?.label || objetivo,
  });
  s3.stop(chalk.green('Arquivos gerados em ~/.zapsuite-meta/'));

  // ---------- 6. MCP da Meta no Claude Code ----------
  const s4 = p.spinner();
  s4.start('Registrando MCP da Meta no Claude Code (mcp.facebook.com/ads)');
  const mcp = registerMetaMcp('user');
  if (mcp.ok) s4.stop(chalk.green('MCP da Meta registrado'));
  else s4.stop(chalk.yellow(`MCP não registrado automaticamente: ${mcp.error}`));

  // ---------- 7. Atalho no Desktop ----------
  await maybeCreateShortcut();

  // ---------- 8. Final ----------
  p.outro(
    [
      chalk.green.bold('Pronto!'),
      '',
      chalk.bold('Próximos passos:'),
      '',
      `  1. Coloque suas fotos/vídeos em ${chalk.cyan(MIDIAS_DIR + '/upload/')}`,
      `     ${chalk.dim('(o menu tem opção pra abrir essa pasta)')}`,
      `  2. Rode ${chalk.cyan('zapsuite-meta')} ${chalk.dim('— ou clique no atalho do Desktop')}`,
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
