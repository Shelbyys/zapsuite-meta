import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { spawn } from 'node:child_process';
import { showBanner, showHeader } from '../lib/banner.js';
import { loadConfig } from '../lib/config.js';
import { runInit } from './init.js';
import { listAvailableMidias, openMidiasFolder, addMediaFromPath, MIDIAS_DIR, UPLOAD_DIR } from '../lib/midias.js';
import { APP_DIR } from '../lib/paths.js';
import { checkForUpdateCached } from '../lib/updater.js';
import { isClaudeCodeInstalled } from '../lib/claude-detect.js';
import { logEvento, TIPO } from '../lib/telemetria.js';

// Whitelist de IDs de playbook válidos — bate com PLAYBOOKS abaixo. Bloqueia
// shell injection caso playbookId venha alterado.
const VALID_PLAYBOOKS = new Set([
  'hay-hair', 'movi-mint', 'velmo-black-drink', 'velmo-black', 'ton',
  'creatina-gummy', 'creagym', 'celuglow', 'calminol', 'fiber-slim',
  'clarize', 'termo-drink', 'skin-fit', 'inti-feme', 'inti-masc', 'quero-mais',
]);

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
    cfg.operador?.nome || 'ZapSuite Meta',
    cfg.operador?.produtosAtivos?.length
      ? `${cfg.operador.produtosAtivos.length} produto${cfg.operador.produtosAtivos.length === 1 ? '' : 's'} ativo${cfg.operador.produtosAtivos.length === 1 ? '' : 's'}`
      : '16 produtos liberados',
    `R$ ${cfg.limits?.dailyBudgetMax}/dia (limite hard)`
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
    cfg = await loadConfig();  // recarrega — pode ter mudado entre iterações
    const midias = await listAvailableMidias();
    const totalMidias = midias.length;
    const metaConectada = !!cfg?.meta?.activeAdAccountId;

    const action = await p.select({
      message: 'O que você quer fazer?',
      options: [
        ...(metaConectada
          ? []
          : [{ value: 'connect', label: '🔌  ' + chalk.yellow('Conectar conta Meta') + chalk.dim(' · 1ª vez') }]),
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

    if (action === 'connect')  await delegateToClaude('/configurar-conta');
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
  // GUARD — sem conta Meta conectada não dá pra subir campanha
  if (!cfg?.meta?.activeAdAccountId) {
    p.note(
      [
        'Antes de subir campanha, você precisa conectar sua conta do Facebook.',
        '',
        'Vou abrir o Claude Code com /configurar-conta — ele te guia passo a passo:',
        '  • Lista suas contas de anúncios e você escolhe',
        '  • Confirma página + Instagram + forma de pagamento',
        '  • Salva tudo aqui pra próxima vez',
      ].join('\n'),
      chalk.yellow('preciso conectar Meta primeiro')
    );
    const go = await p.confirm({ message: 'Conectar agora?', initialValue: true });
    if (p.isCancel(go) || !go) return;
    await delegateToClaude('/configurar-conta');

    // recarrega config — Claude pode ter atualizado meta.activeAdAccountId
    const updated = await loadConfig();
    if (!updated?.meta?.activeAdAccountId) {
      p.note('Conta Meta ainda não configurada. Volta quando concluir.', chalk.dim('cancelado'));
      return;
    }
    cfg = updated;
  }

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
  if (!VALID_PLAYBOOKS.has(playbookId)) {
    p.note(`playbook desconhecido: ${playbookId}`, chalk.red('erro'));
    return;
  }
  logEvento(TIPO.CAMPANHA_CRIADA, { playbook: playbookId, source: 'menu' });
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
    const dim  = (m.width && m.height) ? chalk.dim(` · ${m.width}×${m.height}`) : '';
    const ar   = m.aspect ? chalk.dim(` · ${m.aspect}`) : '';
    console.log(`  ${icon}  ${chalk.cyan(m.name)}  ${chalk.dim(`· ${m.folder}/ · ${m.sizeHuman}`)}${dim}${ar}${flag}`);
    if (m.placementHint) {
      const isWarn = m.aspect === '16:9' || m.aspect === 'irregular';
      console.log(`        ${(isWarn ? chalk.yellow : chalk.dim)('↳ ' + m.placementHint)}`);
    }
  }
  console.log();

  const action = await p.select({
    message: 'O que fazer?',
    options: [
      { value: 'add',    label: '📥  Adicionar foto/vídeo (cola o caminho ou arrasta o arquivo)' },
      { value: 'open',   label: '📂  Abrir a pasta no Finder/Explorer' },
      { value: 'voltar', label: '← voltar' },
    ],
  });
  if (p.isCancel(action) || action === 'voltar') return;
  if (action === 'open') return openMidiasFolder('upload');
  if (action === 'add')  return flowAdicionarMidia();
}

async function flowAdicionarMidia() {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  p.note(
    [
      isMac
        ? `${chalk.bold('Mac:')} arrasta o arquivo (ou pasta inteira) do Finder pra dentro desta janela do Terminal — o caminho aparece sozinho.`
        : isWin
          ? `${chalk.bold('Windows:')} clica com botão direito no arquivo → "Copiar como caminho" → cola aqui.\nOu arrasta da janela do Explorer pra dentro do PowerShell.`
          : `Cole o caminho absoluto do arquivo ou pasta. Ex: ${chalk.cyan('/home/voce/foto.jpg')}`,
      '',
      `Aceita: ${chalk.dim('.jpg .jpeg .png .webp .mp4 .mov .m4v')}`,
      `Pode ser um arquivo único ${chalk.dim('OU')} uma pasta (copia tudo de dentro).`,
    ].join('\n'),
    chalk.cyan('como adicionar')
  );

  const raw = await p.text({
    message: 'Caminho do arquivo ou pasta:',
    placeholder: isMac ? '/Users/voce/Downloads/foto.jpg' : isWin ? 'C:\\Users\\voce\\Downloads\\foto.jpg' : '/caminho/foto.jpg',
    validate: v => (!v ? 'obrigatório' : undefined),
  });
  if (p.isCancel(raw)) return;

  const s = p.spinner();
  s.start('Copiando');
  const result = await addMediaFromPath(raw);
  s.stop(
    result.ok
      ? chalk.green(`${result.copied.length} arquivo(s) copiado(s)`)
      : chalk.red(result.error || 'nada foi copiado')
  );

  if (result.copied.length) {
    console.log();
    console.log(chalk.bold('  Adicionados:'));
    for (const c of result.copied) console.log(`    ${chalk.green('✓')}  ${c.name}`);
  }
  if (result.skipped.length) {
    console.log();
    console.log(chalk.bold('  Ignorados:'));
    for (const s of result.skipped) console.log(`    ${chalk.yellow('⚠')}  ${s.name} ${chalk.dim(`(${s.reason})`)}`);
  }
  console.log();

  const mais = await p.confirm({ message: 'Adicionar mais?', initialValue: false });
  if (!p.isCancel(mais) && mais) return flowAdicionarMidia();
}

async function flowPausar() {
  await delegateToClaude('/pausar');
}

async function flowConfig(cfg) {
  const ativa = cfg.meta?.activeAdAccountName
    ? `${cfg.meta.activeAdAccountName} (${cfg.meta.activeAdAccountId})`
    : '— nenhuma —';

  const opt = await p.select({
    message: `Configurações  ${chalk.dim(`· conta ativa: ${ativa}`)}`,
    options: [
      { value: 'switch',   label: '🔁  Trocar conta de anúncios' },
      { value: 'update',   label: '⬆️   Atualizar ZapSuite Meta (npm + templates)' },
      { value: 'login',    label: '🔄  Reconectar conta Meta' },
      { value: 'doctor',   label: '🩺  Diagnóstico do sistema' },
      { value: 'voltar',   label: '← voltar' },
    ],
  });
  if (p.isCancel(opt) || opt === 'voltar') return;
  if (opt === 'switch') return import('./switch.js').then(m => m.runSwitch());
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
  // Guard: cliente pode ter desinstalado o Claude Code depois do init.
  if (!isClaudeCodeInstalled()) {
    console.log();
    console.log(chalk.red('  Claude Code não tá instalado nesta máquina.'));
    console.log(chalk.dim('  Pra instalar:'));
    console.log(chalk.cyan('    npm i -g @anthropic-ai/claude-code'));
    console.log(chalk.dim('  Depois roda `zsm doctor` pra confirmar e tenta de novo.\n'));
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const args = initialPrompt ? ['-p', initialPrompt] : [];
    const cwd = APP_DIR;
    const child = spawn('claude', args, { stdio: 'inherit', cwd });
    child.on('exit', () => resolve());
    child.on('error', err => {
      console.log(chalk.red(`\n  Não consegui abrir o Claude Code: ${err.message}`));
      console.log(chalk.dim('  Rode `zsm doctor` pra checar.\n'));
      resolve();
    });
  });
}
