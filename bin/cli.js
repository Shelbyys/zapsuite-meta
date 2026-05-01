#!/usr/bin/env node
import { runInit } from '../src/commands/init.js';
import { runMenu } from '../src/commands/menu.js';
import { runLogin } from '../src/commands/login.js';
import { runDoctor } from '../src/commands/doctor.js';
import { runUpdate } from '../src/commands/update.js';
import { showBanner } from '../src/lib/banner.js';
import chalk from 'chalk';

const [, , cmd = 'menu', ...rest] = process.argv;

const commands = {
  init: runInit,
  login: runLogin,
  doctor: runDoctor,
  update: runUpdate,
  menu: runMenu,
};

async function main() {
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    showBanner();
    console.log(chalk.bold('\n  Comandos:\n'));
    console.log(`    ${chalk.cyan('easy4u-trafego')}            menu interativo (default)`);
    console.log(`    ${chalk.cyan('easy4u-trafego init')}       instalação inicial`);
    console.log(`    ${chalk.cyan('easy4u-trafego login')}      reconecta a conta Meta`);
    console.log(`    ${chalk.cyan('easy4u-trafego doctor')}     diagnóstico do sistema`);
    console.log(`    ${chalk.cyan('easy4u-trafego update')}     atualiza templates\n`);
    return;
  }

  const fn = commands[cmd];
  if (!fn) {
    console.error(chalk.red(`Comando desconhecido: ${cmd}`));
    console.error(`Use ${chalk.cyan('easy4u-trafego --help')} para ver os comandos disponíveis.`);
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
