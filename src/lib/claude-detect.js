import { execSync } from 'node:child_process';

export function isClaudeCodeInstalled() {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function installClaudeCode() {
  execSync('npm i -g @anthropic-ai/claude-code', { stdio: 'inherit' });
}

export function registerMetaMcp(scope = 'user') {
  // Tenta registrar o MCP da Meta no Claude Code do usuário.
  // Se falhar, não bloqueia — o usuário pode rodar manualmente depois.
  const url = process.env.EASY4U_META_MCP_URL || 'https://mcp.meta.com/mcp';
  try {
    execSync(`claude mcp add --transport http --scope ${scope} meta ${url}`, {
      stdio: 'ignore',
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err.message, url };
  }
}
