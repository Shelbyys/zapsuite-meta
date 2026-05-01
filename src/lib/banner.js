import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';

const brandGradient = gradient(['#2563eb', '#7c3aed', '#ec4899']);

export function showBanner(subtitle = 'Meta · campanha completa em 1 comando') {
  const logo = `
  ███████╗ █████╗ ██████╗ ███████╗██╗   ██╗██╗████████╗███████╗
  ╚══███╔╝██╔══██╗██╔══██╗██╔════╝██║   ██║██║╚══██╔══╝██╔════╝
    ███╔╝ ███████║██████╔╝███████╗██║   ██║██║   ██║   █████╗
   ███╔╝  ██╔══██║██╔═══╝ ╚════██║██║   ██║██║   ██║   ██╔══╝
  ███████╗██║  ██║██║     ███████║╚██████╔╝██║   ██║   ███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝
                                                  ${chalk.bold('M E T A')}
`;
  console.log(brandGradient.multiline(logo));
  console.log(chalk.dim(`   ${subtitle}\n`));
}

export function showHeader(business, account, balance) {
  const lines = [];
  if (business) lines.push(chalk.bold(business));
  if (account) lines.push(chalk.dim(`Local: ${account}`));
  if (balance != null) lines.push(chalk.dim(`${balance}`));
  if (lines.length === 0) return;
  console.log(
    boxen(lines.join('\n'), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'magenta',
    })
  );
}
