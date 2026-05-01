import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { spawn } from 'node:child_process';
import { showBanner, showHeader } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { runInit } from './init.js';
import { listAvailableMidias, openMidiasFolder, MIDIAS_DIR, UPLOAD_DIR } from '../lib/midias.js';
import { APP_DIR } from '../lib/paths.js';
import { checkForUpdateCached } from '../lib/updater.js';

// Playbooks pré-programados — estrutura validada (documento Easy4u 2026-05).
// Formato: 1-X-1 em ABO (1 campanha · X conjuntos · 1 anúncio cada).
const PLAYBOOKS = [
  { value: 'hay-hair',          label: 'Hay Hair',                        hint: '1-5-1 · R$30-35/dia · F 24-55' },
  { value: 'movi-mint',         label: 'Movi Mint',                       hint: '1-6-1 · R$34+/dia · H+M 45-65+' },
  { value: 'velmo-black-drink', label: 'Velmo Black Drink (Morango/Tang)', hint: '1-6-1 · R$30-35/dia · F 25-54' },
  { value: 'velmo-black',       label: 'Velmo Black',                     hint: '1-5-1 · R$30-35/dia · F 25-45' },
  { value: 'ton',               label: 'Ton',                             hint: '1-4-1 ou 1-5-1 · R$60-70/dia · regras especiais' },
  { value: 'creatina-gummy',    label: 'Creatina Gummy',                  hint: '1-5-1 · R$30-35/dia · H+M 18-45' },
  { value: 'creagym',           label: 'Creagym',                         hint: '1-5-1 · R$30-35/dia · H+M 18-45' },
  { value: 'celuglow',          label: 'Celuglow',                        hint: '1-5-1 · R$30-35/dia · F 25-55' },
  { value: 'calminol',          label: 'Calminol',                        hint: '1-5-1 · R$30-35/dia · H+M 35-65+' },
  { value: 'fiber-slim',        label: 'Fiber Slim',                      hint: '1-5-1 · R$30-35/dia · H+M 25-55' },
  { value: 'clarize',           label: 'Clarize',                         hint: '1-5-1 · R$30-35/dia · F 20-50' },
  { value: 'termo-drink',       label: 'Termo Drink',                     hint: '1-5-1 · R$30-35/dia · H+M 20-50' },
  { value: 'skin-fit',          label: 'Skin Fit',                        hint: '1-5-1 · R$30-35/dia · H+M 25-55' },
  { value: 'inti-feme',         label: 'Inti Feme',                       hint: '1-5-1 · R$30-35/dia · F 25-55' },
  { value: 'inti-masc',         label: 'Inti Masc',                       hint: '1-5-1 · R$30-35/dia · H 25-50' },
  { value: 'quero-mais',        label: 'Quero +',                         hint: '1-5-1 · R$30-35/dia · H+M 25-45' },
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
    cfg.business?.nichoCustom || cfg.business?.nicho?.toUpperCase() || 'ZapSuite Meta',
    cfg.business?.cidade,
    `R$ ${cfg.limits?.dailyBudgetMax}/dia (limite)`
  );

  // Check de update em background (não bloqueia o menu)
  checkForUpdateCached().then(upd => {
    if (upd?.hasUpdate) {
      console.log(
        chalk.yellow(`  📦 Tem versão nova: v${upd.latest} (você tá na v${upd.current}). Rode "${chalk.cyan('zsm update')}".\n`)
      );
    }
  }).catch(() => {});

  while (true) {
    const midias = await listAvailableMidias();
    const totalMidias = midias.length;

    const action = await p.select({
      message: 'O que você quer fazer?',
      options: [
        { value: 'nova',     label: '🚀  Subir nova campanha' },
        { value: 'midias',   label: `📁  Minhas mídias (${totalMidias} arquivo${totalMidias === 1 ? '' : 's'})` },
        { value: 'rel-hoje', label: '📊  Ver como tão meus anúncios (hoje)' },
        { value: 'rel-7',    label: '📈  Relatório dos últimos 7 dias' },
        { value: 'top',      label: '🏆  Top criativos (qual tá vendendo)' },
        { value: 'otimizar', label: '🔧  Otimizar campanhas que tão rodando' },
        { value: 'criativo', label: '🎨  Trocar criativo de um anúncio' },
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
    if (action === 'midias')   await flowMidias();
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
  const playbookId = await p.select({
    message: 'Qual produto vai promover?',
    options: PLAYBOOKS,
  });
  if (p.isCancel(playbookId)) return;

  // carrega o YAML do playbook
  const yamlPath = path.join(APP_DIR, 'playbooks', `${playbookId}.yaml`);
  let pb;
  try {
    pb = YAML.parse(await fs.readFile(yamlPath, 'utf8'));
  } catch (err) {
    p.note(`Não achei o playbook ${playbookId}: ${err.message}`, chalk.red('erro'));
    return;
  }

  // resumo da estrutura pré-programada
  const o = pb.orcamento;
  const generoTxt = pb.publico.generos.length === 2
    ? 'Homens e mulheres'
    : pb.publico.generos[0] === 'feminino' ? 'Mulheres' : 'Homens';
  const idadeTxt = pb.publico.idade_max_aberta
    ? `${pb.publico.idade_min}–${pb.publico.idade_max}+`
    : `${pb.publico.idade_min}–${pb.publico.idade_max}`;
  const orcamentoTxt = o.diario_total_max
    ? `R$ ${o.diario_total_min.toFixed(2)} – R$ ${o.diario_total_max.toFixed(2)}/dia`
    : `R$ ${o.diario_total_min.toFixed(2)}+/dia`;
  const porConj = o.por_conjunto_max && o.por_conjunto_max !== o.por_conjunto_min
    ? `R$ ${o.por_conjunto_min.toFixed(2)} – R$ ${o.por_conjunto_max.toFixed(2)}`
    : `R$ ${(o.por_conjunto_min ?? 0).toFixed(2)}`;

  p.note(
    [
      chalk.bold(pb.nome),
      '',
      `Estrutura: ${chalk.cyan(pb.estrutura)} em ${pb.orcamento_tipo}`,
      `Objetivo:  ${pb.objetivo}`,
      `Posições:  ${pb.posicionamentos.join(' + ')}`,
      `Público:   ${generoTxt} · ${idadeTxt} anos (aberto)`,
      `Orçamento: ${orcamentoTxt}  ${chalk.dim(`(${porConj}/conjunto × ${o.num_conjuntos || '?'} conjuntos)`)}`,
      '',
      ...pb.observacoes.map(o => chalk.dim(`• ${o}`)),
    ].join('\n'),
    chalk.cyan('estrutura pré-programada')
  );

  // valida limite hard
  if (o.diario_total_min > cfg.limits?.dailyBudgetMax) {
    const allow = await p.confirm({
      message: chalk.yellow(`⚠️  Este playbook recomenda mínimo R$ ${o.diario_total_min}/dia, mas seu limite é R$ ${cfg.limits.dailyBudgetMax}/dia. Continuar?`),
      initialValue: false,
    });
    if (p.isCancel(allow) || !allow) return;
  }

  const ok = await p.confirm({ message: 'Usar essa estrutura?', initialValue: true });
  if (p.isCancel(ok) || !ok) return;

  // checa mídia
  const midias = await listAvailableMidias();
  if (midias.length === 0) {
    p.note(
      [
        `Você ainda não colocou nenhuma foto/vídeo na pasta:`,
        `  ${chalk.cyan(UPLOAD_DIR)}`,
        '',
        'Vou abrir o Finder. Arraste suas mídias e volta.',
      ].join('\n'),
      chalk.yellow('preciso das suas mídias')
    );
    openMidiasFolder('upload');
    const ok2 = await p.confirm({ message: 'Já colocou as mídias? Continuar?', initialValue: true });
    if (p.isCancel(ok2) || !ok2) return;
    const after = await listAvailableMidias();
    if (after.length === 0) {
      p.note('Ainda vazia. Volta quando tiver pelo menos 1 foto.', chalk.red('parando aqui'));
      return;
    }
  }

  // delega — Claude Code monta a árvore Meta seguindo o YAML
  await delegateToClaude(`/nova-campanha playbook=${playbookId}`);
}

async function flowMidias() {
  const midias = await listAvailableMidias();
  if (midias.length === 0) {
    p.note(
      [
        `Sua pasta de mídias está vazia: ${chalk.cyan(MIDIAS_DIR)}`,
        '',
        'Vou abrir o Finder pra você arrastar suas fotos/vídeos pra dentro.',
        'Aceita: .jpg .jpeg .png .webp .mp4 .mov .m4v',
      ].join('\n'),
      chalk.yellow('vazia')
    );
    openMidiasFolder('upload');
    return;
  }

  console.log();
  console.log(chalk.bold('  Suas mídias:'));
  console.log();
  for (const m of midias) {
    const icon = m.kind === 'image' ? '🖼️ ' : '🎬';
    const flag = m.oversize ? chalk.red(' (acima do limite Meta!)') : '';
    console.log(`  ${icon}  ${chalk.cyan(m.name)}  ${chalk.dim(`· ${m.folder}/ · ${m.sizeHuman}`)}${flag}`);
  }
  console.log();

  const action = await p.select({
    message: 'O que fazer?',
    options: [
      { value: 'open',  label: '📂  Abrir pasta no Finder (pra adicionar/remover)' },
      { value: 'voltar', label: '← voltar' },
    ],
  });
  if (p.isCancel(action) || action === 'voltar') return;
  if (action === 'open') openMidiasFolder('upload');
}

async function flowPausar() {
  await delegateToClaude('/pausar');
}

async function flowConfig(cfg) {
  const opt = await p.select({
    message: 'Configurações',
    options: [
      { value: 'update',   label: '⬆️   Atualizar ZapSuite Meta (npm + templates)' },
      { value: 'login',    label: '🔄  Reconectar conta Meta' },
      { value: 'doctor',   label: '🩺  Diagnóstico do sistema' },
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
    const cwd = `${process.env.HOME}/.zapsuite-meta`;
    const child = spawn('claude', args, { stdio: 'inherit', cwd });
    child.on('exit', () => resolve());
    child.on('error', err => {
      console.log(chalk.red(`\nNão consegui abrir o Claude Code: ${err.message}`));
      console.log(chalk.dim('Rode `zapsuite-meta doctor` pra checar.'));
      resolve();
    });
  });
}
