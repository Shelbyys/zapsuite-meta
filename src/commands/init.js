import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { showBanner } from '../lib/banner.js';
import { validateByEmail } from '../lib/licenca.js';
import { patchConfig, ensureAppDir } from '../lib/config.js';
import {
  isClaudeCodeInstalled,
  isClaudeCodeConfigured,
  installClaudeCode,
} from '../lib/claude-detect.js';
import { renderAll } from '../installer/render-templates.js';
import { DESKTOP_DIR, APP_DIR } from '../lib/paths.js';
import { ensureMidiasFolders, MIDIAS_DIR } from '../lib/midias.js';
import { logEvento, TIPO } from '../lib/telemetria.js';

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

  await ensureAppDir();

  // ============================================================
  // FASE 1 · pré-checks (Claude Code instalado E logado)
  // ============================================================
  p.intro(chalk.bgMagenta.white(' ZapSuite Meta · setup '));

  const sCC = p.spinner();
  sCC.start('Verificando Claude Code');
  if (!isClaudeCodeInstalled()) {
    sCC.stop(chalk.yellow('Claude Code não encontrado — instalando...'));
    try {
      installClaudeCode();
      console.log(chalk.green('  ✓ Claude Code instalado'));
    } catch (err) {
      console.log(chalk.red(`  ✗ Falhou: ${err.message}`));
      console.log(chalk.dim(`  Instala manualmente: npm i -g @anthropic-ai/claude-code`));
      throw new Error('Claude Code não pôde ser instalado');
    }
  } else {
    sCC.stop(chalk.green('Claude Code instalado'));
  }

  if (!isClaudeCodeConfigured()) {
    p.note(
      [
        'O Claude Code está instalado, mas você ainda não fez login com sua conta Anthropic.',
        '',
        chalk.bold('Faça estes 2 passos antes de continuar:'),
        '',
        `  ${chalk.cyan('1.')} Login no Claude Code:`,
        `     Abre ${chalk.cyan('outro terminal')} → digita ${chalk.cyan('claude')}`,
        `     O navegador abre — faz login em claude.ai com sua conta Pro/Team/Max`,
        '',
        `  ${chalk.cyan('2.')} Ativa o conector Meta em claude.ai:`,
        `     Vai em ${chalk.cyan('https://claude.ai/settings/connectors')}`,
        `     Procura ${chalk.bold('Meta')} → clica em ${chalk.bold('Connect')}`,
        `     Faz OAuth no Facebook → autoriza tudo`,
        `     Confirma que aparece ${chalk.green('"Connected"')}`,
        '',
        `  Volta aqui e roda de novo: ${chalk.cyan('zsm init')}`,
      ].join('\n'),
      chalk.yellow('faltam 2 passos antes')
    );
    p.outro(chalk.dim('Setup pausado.'));
    throw new Error('cancelled');
  }

  // Aviso sobre conector Meta no claude.ai (não tem como detectar daqui — é responsabilidade do cliente)
  p.note(
    [
      'Pra subir campanha, você precisa do conector ' + chalk.bold('Meta') + ' ativo na sua conta Anthropic.',
      '',
      `Se ainda não ativou, vai em ${chalk.cyan('https://claude.ai/settings/connectors')} e conecta.`,
      `Já ativou? Pode continuar.`,
    ].join('\n'),
    chalk.cyan('importante')
  );

  const conectorOk = await p.confirm({
    message: 'Já ativou o conector Meta no claude.ai?',
    initialValue: true,
  });
  if (p.isCancel(conectorOk)) throw new Error('cancelled');
  if (!conectorOk) {
    p.outro(chalk.dim('Beleza. Volta quando ativar — roda zsm init de novo.'));
    throw new Error('cancelled');
  }

  // ============================================================
  // FASE 2 · operador + email (validado)
  // ============================================================
  const operadorNome = await p.text({
    message: 'Como você quer ser chamado? (aparece no topo do menu)',
    placeholder: 'Ex.: Time da loja · Ana · Operação 1',
    validate: v => (!v ? 'obrigatório' : undefined),
  });
  if (p.isCancel(operadorNome)) throw new Error('cancelled');

  let email = null;
  let lic = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const tentativaTxt = tentativa === 1 ? '' : chalk.dim(` (tentativa ${tentativa}/3)`);
    const input = await p.text({
      message: `Qual seu email cadastrado?${tentativaTxt}`,
      placeholder: 'voce@exemplo.com',
      validate: v => {
        if (!v) return 'obrigatório';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'formato de email inválido';
      },
    });
    if (p.isCancel(input)) throw new Error('cancelled');

    const s1 = p.spinner();
    s1.start('Autorizando');
    lic = await validateByEmail(input, { operador: operadorNome });
    if (lic.valid) {
      email = input;
      s1.stop(
        chalk.green(
          `Autorizado ${lic.dev ? chalk.dim('(modo dev)') : ''}${lic.fromCache ? chalk.dim(' (cache)') : ''} · plano ${lic.plan} · até ${lic.maxAccounts} dispositivos`
        )
      );
      break;
    }
    s1.stop(chalk.red(`✗ ${lic.reason}`));

    if (tentativa < 3) {
      const tentar = await p.confirm({ message: 'Tentar com outro email?', initialValue: true });
      if (p.isCancel(tentar) || !tentar) throw new Error('cancelled');
    }
  }
  if (!email) {
    p.note('Sua autorização não passou em 3 tentativas. Verifica o email no painel ou fala com o suporte.', chalk.red('parando aqui'));
    throw new Error('email não autorizado');
  }

  // Salva o mínimo já — pra Claude conseguir ler config se precisar
  await patchConfig({ email: email.toLowerCase(), plan: lic.plan, operador: { nome: operadorNome } });

  // Renderiza templates já agora (pra /configurar-conta existir como slash command)
  await ensureMidiasFolders();
  const today = new Date().toISOString().slice(0, 10);
  await renderAll({
    email: email.toLowerCase(),
    plan: lic.plan,
    operador: { nome: operadorNome, produtosAtivos: null },
    limits: { dailyBudgetMax: 0 },  // placeholder
    telemetry: false,
    today,
    produtosAtivosLabels: ['(a definir)'],
  });

  // (sem registerMetaMcp — Meta vem do conector claude.ai)

  // ============================================================
  // FASE 3 · CONFIGURAR CONTA META (já que conector tá ativo)
  // ============================================================
  p.note(
    [
      'Agora vou abrir o Claude Code pra confirmar qual conta de anúncios usar.',
      'Como o conector Meta já tá ativo na sua Anthropic, ele vai listar suas contas',
      'automaticamente — você só escolhe qual usar.',
    ].join('\n'),
    chalk.cyan('próximo passo: escolher conta de anúncios')
  );
  const conectar = await p.confirm({ message: 'Abrir agora?', initialValue: true });
  if (p.isCancel(conectar)) throw new Error('cancelled');

  p.outro(chalk.dim('Pausando setup — abrindo Claude Code...'));

  if (conectar) {
    console.log();
    console.log(chalk.bold.bgCyan.black(' DENTRO DO CLAUDE CODE: '));
    console.log();
    console.log(`  ${chalk.bold.cyan('1.')}  Digite: ${chalk.bold.cyan('/configurar-conta')}`);
    console.log(`      ${chalk.dim('Ele lista suas contas de anúncios da Meta e pergunta qual usar.')}`);
    console.log(`      ${chalk.dim('Confirma página, Instagram, forma de pagamento.')}`);
    console.log();
    console.log(`  ${chalk.bold.cyan('2.')}  Quando terminar: ${chalk.bold.cyan('/quit')} ${chalk.dim('(ou Ctrl+C 2x)')}`);
    console.log(`      ${chalk.dim('Você volta aqui automaticamente pra finalizar.')}`);
    console.log();
    console.log(chalk.dim('─────────────────────────────────────────────────'));
    console.log(chalk.cyan('Abrindo Claude Code em 3 segundos...'));
    console.log();
    await new Promise(r => setTimeout(r, 3000));

    await new Promise(resolve => {
      const child = spawn('claude', ['/configurar-conta'], { stdio: 'inherit', cwd: APP_DIR });
      child.on('exit', () => resolve());
      child.on('error', err => {
        console.log(chalk.red(`\n  Erro: ${err.message}\n`));
        resolve();
      });
    });
    console.log(chalk.dim('\n← Voltando ao setup do ZapSuite Meta...\n'));
  } else {
    console.log(chalk.dim('\n  Pulou — você pode configurar depois pelo menu.\n'));
  }

  // ============================================================
  // FASE 4 · resto da config (produtos, limite, telemetria)
  // ============================================================
  p.intro(chalk.bgMagenta.white(' continuação · últimas perguntas '));

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
    message: 'Pode mandar eventos anônimos pro time melhorar o produto? (opt-in)',
    initialValue: true,
  });
  if (p.isCancel(telemetria)) throw new Error('cancelled');

  // ============================================================
  // FASE 5 · salvar tudo + atalho + final
  // ============================================================
  const config = {
    email: email.trim().toLowerCase(),
    plan: lic.plan,
    operador: {
      nome: operadorNome,
      produtosAtivos: produtosAtivos.length ? produtosAtivos : null,
    },
    limits: { dailyBudgetMax: Number(budgetTeto) },
    telemetry: telemetria,
    installedAt: new Date().toISOString(),
  };
  await patchConfig(config);

  const sR = p.spinner();
  sR.start('Atualizando templates com seus dados finais');
  await renderAll({
    ...config,
    today,
    produtosAtivosLabels: (produtosAtivos.length
      ? PRODUTOS.filter(pp => produtosAtivos.includes(pp.value)).map(pp => pp.label)
      : ['(todos os 16 produtos liberados)']
    ),
  });
  sR.stop(chalk.green('Templates atualizados'));

  await maybeCreateShortcut();

  logEvento(TIPO.INIT, {
    plan: lic.plan,
    produtos: produtosAtivos,
    limit: Number(budgetTeto),
  });

  p.outro(
    [
      chalk.green.bold('✓ Setup concluído!'),
      '',
      chalk.bold('Como usar:'),
      `  • Rode ${chalk.cyan('zsm')} ou clique em ${chalk.cyan('"ZapSuite Meta.command"')} no Desktop`,
      `  • ${chalk.cyan('📁 Minhas mídias → 📥 Adicionar')} pra colocar suas fotos/vídeos`,
      `  • ${chalk.cyan('🚀 Subir nova campanha')} quando estiver pronto`,
    ].join('\n')
  );
}

async function maybeCreateShortcut() {
  if (process.platform !== 'darwin') return;
  try {
    const shortcut = path.join(DESKTOP_DIR, 'ZapSuite Meta.command');
    const body = `#!/bin/zsh\ncd "$HOME"\nexec zapsuite-meta\n`;
    await fs.writeFile(shortcut, body, { mode: 0o755 });
  } catch {}
}
