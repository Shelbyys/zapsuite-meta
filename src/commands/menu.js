import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { showBanner, showHeader } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { runInit } from './init.js';

const PLAYBOOKS = [
  { value: 'lead-whatsapp', label: '📱  Lead WhatsApp', hint: 'mais usado' },
  { value: 'agendamento',   label: '📅  Agendamento',  hint: 'salão · dentista · clínica' },
  { value: 'pizzaria',      label: '🍕  Pizzaria / Delivery' },
  { value: 'loja',          label: '🏪  Loja física' },
  { value: 'ecommerce',     label: '🛒  E-commerce' },
  { value: 'imobiliaria',   label: '🏠  Imobiliária' },
  { value: 'academia',      label: '💪  Academia' },
  { value: 'promo',         label: '⚡  Promoção relâmpago' },
];

const BUDGETS = [
  { value: 20,  label: 'R$ 20/dia',  hint: 'recomendado pra começar' },
  { value: 50,  label: 'R$ 50/dia' },
  { value: 100, label: 'R$ 100/dia' },
  { value: 200, label: 'R$ 200/dia' },
  { value: -1,  label: 'Outro valor (digitar)' },
];

export async function runMenu() {
  console.clear();
  showBanner();

  const cfg = await loadConfig();
  if (!cfg) {
    p.note('Primeira vez aqui? Vou rodar a instalação.', chalk.cyan('boas-vindas'));
    await runInit();
    return;
  }

  showHeader(
    cfg.business?.nichoCustom || cfg.business?.nicho?.toUpperCase() || 'Easy4u Tráfego',
    cfg.business?.cidade,
    `R$ ${cfg.limits?.dailyBudgetMax}/dia (limite)`
  );

  while (true) {
    const action = await p.select({
      message: 'O que você quer fazer?',
      options: [
        { value: 'nova',     label: '🚀  Subir nova campanha' },
        { value: 'rel-hoje', label: '📊  Ver como tão meus anúncios (hoje)' },
        { value: 'rel-7',    label: '📈  Relatório dos últimos 7 dias' },
        { value: 'top',      label: '🏆  Top criativos (qual tá vendendo)' },
        { value: 'otimizar', label: '🔧  Otimizar campanhas que tão rodando' },
        { value: 'criativo', label: '🎨  Trocar criativo (gerar imagem nova)' },
        { value: 'pausar',   label: '⏸   Pausar uma campanha' },
        { value: 'claude',   label: '💬  Abrir Claude Code (conversa livre)' },
        { value: 'config',   label: '⚙️   Configurações' },
        { value: 'sair',     label: '❌  Sair' },
      ],
    });

    if (p.isCancel(action) || action === 'sair') {
      p.outro(chalk.dim('Até mais 👋'));
      return;
    }

    if (action === 'nova')     await flowNovaCampanha(cfg);
    if (action === 'rel-hoje') await delegateToClaude('/relatorio-hoje');
    if (action === 'rel-7')    await delegateToClaude('/relatorio-7dias');
    if (action === 'top')      await delegateToClaude('/top-criativos');
    if (action === 'otimizar') await delegateToClaude('/otimizar');
    if (action === 'criativo') await delegateToClaude('/novo-criativo');
    if (action === 'pausar')   await flowPausar();
    if (action === 'claude')   await openClaudeInteractive();
    if (action === 'config')   await flowConfig(cfg);
  }
}

async function flowNovaCampanha(cfg) {
  const playbook = await p.select({
    message: 'Qual modelo usar?',
    options: PLAYBOOKS,
  });
  if (p.isCancel(playbook)) return;

  let budget = await p.select({
    message: 'Quanto investir por dia?',
    options: BUDGETS,
  });
  if (p.isCancel(budget)) return;
  if (budget === -1) {
    const v = await p.text({
      message: 'Digite o valor diário (R$):',
      placeholder: '75',
      validate: x => (Number.isNaN(Number(x)) ? 'só números' : undefined),
    });
    if (p.isCancel(v)) return;
    budget = Number(v);
  }

  if (budget > cfg.limits?.dailyBudgetMax) {
    const allow = await p.confirm({
      message: chalk.yellow(`⚠️  Você definiu limite de R$ ${cfg.limits.dailyBudgetMax}/dia. Continuar mesmo assim?`),
      initialValue: false,
    });
    if (p.isCancel(allow) || !allow) return;
  }

  const oferta = await p.text({
    message: 'Sua oferta em 1 frase (vai virar a copy do anúncio):',
    placeholder: 'Pizza grande + refri R$ 49,90 só hoje',
  });
  if (p.isCancel(oferta)) return;

  const duracao = await p.select({
    message: 'Por quanto tempo a campanha roda?',
    options: [
      { value: 7,  label: '7 dias' },
      { value: 14, label: '14 dias' },
      { value: 30, label: '30 dias' },
      { value: 0,  label: 'Sem prazo (até eu pausar)' },
    ],
  });
  if (p.isCancel(duracao)) return;

  // Delega para o Claude Code com argumentos prontos.
  const cmd = `/nova-campanha playbook=${playbook} budget=${budget} duracao=${duracao} oferta="${String(oferta).replace(/"/g, '\\"')}"`;
  await delegateToClaude(cmd);
}

async function flowPausar() {
  await delegateToClaude('/pausar');
}

async function flowConfig(cfg) {
  const opt = await p.select({
    message: 'Configurações',
    options: [
      { value: 'login',    label: '🔄  Reconectar conta Meta' },
      { value: 'doctor',   label: '🩺  Diagnóstico do sistema' },
      { value: 'update',   label: '⬆️   Atualizar templates' },
      { value: 'voltar',   label: '← voltar' },
    ],
  });
  if (p.isCancel(opt) || opt === 'voltar') return;
  if (opt === 'login')  return import('./login.js').then(m => m.runLogin());
  if (opt === 'doctor') return import('./doctor.js').then(m => m.runDoctor());
  if (opt === 'update') return import('./update.js').then(m => m.runUpdate());
}

async function delegateToClaude(slashCommand) {
  p.note(
    `Vou abrir o Claude Code e enviar:\n  ${chalk.cyan(slashCommand)}\n\nÉ lá dentro que a IA vai conversar com você e confirmar antes de criar/alterar qualquer coisa na Meta.`,
    chalk.dim('próximo passo')
  );
  const go = await p.confirm({ message: 'Abrir agora?', initialValue: true });
  if (p.isCancel(go) || !go) return;

  await openClaudeWith(slashCommand);
}

async function openClaudeInteractive() {
  await openClaudeWith(null);
}

function openClaudeWith(initialPrompt) {
  return new Promise(resolve => {
    const args = initialPrompt ? ['-p', initialPrompt] : [];
    const cwd = `${process.env.HOME}/.easy4u-trafego`;
    const child = spawn('claude', args, { stdio: 'inherit', cwd });
    child.on('exit', () => resolve());
    child.on('error', err => {
      console.log(chalk.red(`\nNão consegui abrir o Claude Code: ${err.message}`));
      console.log(chalk.dim('Rode `easy4u-trafego doctor` pra checar.'));
      resolve();
    });
  });
}
