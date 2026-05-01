#!/usr/bin/env node
import { runInit } from '../src/commands/init.js';
import { runMenu } from '../src/commands/menu.js';
import { runLogin } from '../src/commands/login.js';
import { runDoctor } from '../src/commands/doctor.js';
import { runUpdate } from '../src/commands/update.js';
import { runSwitch } from '../src/commands/switch.js';
import { showBanner } from '../src/lib/banner.js';
import chalk from 'chalk';

const [, , cmd = 'menu', ...rest] = process.argv;

const commands = {
  init: runInit,
  login: runLogin,
  doctor: runDoctor,
  update: runUpdate,
  switch: runSwitch,
  'switch-account': runSwitch,
  menu: runMenu,
};

async function main() {
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    showBanner();
    console.log(chalk.bold('\n  Comandos:\n'));
    console.log(`    ${chalk.cyan('zsm')}                       menu interativo (default)`);
    console.log(`    ${chalk.cyan('zsm init')}                  instalação inicial`);
    console.log(`    ${chalk.cyan('zsm login')}                 reconecta a conta Meta`);
    console.log(`    ${chalk.cyan('zsm switch')}                trocar de conta de anúncios ativa`);
    console.log(`    ${chalk.cyan('zsm doctor')}                diagnóstico do sistema`);
    console.log(`    ${chalk.cyan('zsm update')}                atualiza CLI + templates`);
    console.log(chalk.dim(`\n  (zapsuite-meta == zsm — mesmo binário)\n`));
    return;
  }

  const fn = commands[cmd];
  if (!fn) {
    console.error(chalk.red(`Comando desconhecido: ${cmd}`));
    console.error(`Use ${chalk.cyan('zapsuite-meta --help')} para ver os comandos disponíveis.`);
    process.exit(1);
  }

  try {
    await fn(rest);
  } catch (err) {
    if (err?.message === 'cancelled') {
      console.log(chalk.dim('\n  Cancelado.\n'));
      process.exit(0);
    }
    console.error(chalk.red(`\n  Erro: ${err.message}\n`));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
