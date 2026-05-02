import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function isClaudeCodeInstalled() {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checa heuristicamente se o Claude Code já foi configurado/usado nesta máquina.
 * Não consegue detectar 100% se o token tá válido (isso só rodando o claude),
 * mas detecta se ele NUNCA foi inicializado — caso comum de erro do cliente.
 */
export function isClaudeCodeConfigured() {
  const claudeDir = path.join(os.homedir(), '.claude');
  try {
    const entries = fs.readdirSync(claudeDir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export function installClaudeCode() {
  execSync('npm i -g @anthropic-ai/claude-code', { stdio: 'inherit' });
}

export function registerMetaMcp(scope = 'user') {
  const url = process.env.EASY4U_META_MCP_URL || 'https://mcp.facebook.com/ads';
  try {
    execSync(`claude mcp add --transport http --scope ${scope} meta ${url}`, {
      stdio: 'ignore',
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err.message, url };
  }
}
