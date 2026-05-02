import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PKG_ROOT } from './paths.js';

const REPO = 'Shelbyys/zapsuite-meta';
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CHECK_TIMEOUT_MS = 4000;

export async function getCurrentVersion() {
  const pkg = JSON.parse(await fs.readFile(path.join(PKG_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * Busca a tag da última release no GitHub. Retorna 'v0.1.0' → '0.1.0', null se falhar.
 */
export async function getLatestVersion({ timeoutMs = CHECK_TIMEOUT_MS } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      signal: ctl.signal,
      headers: { 'Accept': 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.tag_name ? j.tag_name.replace(/^v/, '') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function compareVersions(a, b) {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export async function checkForUpdate() {
  const [current, latest] = await Promise.all([getCurrentVersion(), getLatestVersion()]);
  if (!latest) return { hasUpdate: false, current, latest: null, reachable: false };
  return {
    hasUpdate: compareVersions(latest, current) > 0,
    current,
    latest,
    reachable: true,
  };
}

/**
 * Instala/atualiza globalmente direto do GitHub.
 * Pega o HEAD do main (que = última release tagueada).
 */
export function runNpmUpdate() {
  execSync(`npm i -g github:${REPO}`, { stdio: 'inherit' });
}

const CACHE_KEY = 'lastUpdateCheck';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

import { loadConfig, patchConfig } from './config.js';

export async function checkForUpdateCached() {
  try {
    const cfg = await loadConfig();
    const last = cfg?.[CACHE_KEY];
    if (last && Date.now() - last.checkedAt < CACHE_TTL_MS) {
      return last.result;
    }
    const result = await checkForUpdate();
    await patchConfig({ [CACHE_KEY]: { checkedAt: Date.now(), result } });
    return result;
  } catch {
    return { hasUpdate: false, current: null, latest: null, reachable: false };
  }
}
