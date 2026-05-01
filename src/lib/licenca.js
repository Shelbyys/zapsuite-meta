import fs from 'node:fs/promises';
import os from 'node:os';
import { LICENSE_CACHE } from './paths.js';
import { ensureAppDir } from './config.js';
import { getCurrentVersion } from './updater.js';

const SUPABASE_URL = process.env.EASY4U_SUPABASE_URL || 'https://deolgsizilmcsjufodxn.supabase.co';
const VALIDATE_FN = `${SUPABASE_URL}/functions/v1/validar-licenca`;
const TIMEOUT_MS = 5000;

/**
 * Valida licença.
 *
 *  - DEV-XXX: liberado sempre, não toca a rede.
 *  - { force: true }: força revalidação online (ignora cache permanente).
 *  - Padrão: depois da PRIMEIRA validação bem-sucedida, retorna do cache
 *    pra sempre — não revalida em runs futuros (regra "valida só na 1ª vez").
 *  - { offline: true }: só usa cache (não tenta rede).
 */
export async function validateLicense(licenseKey, { offline = false, operador = null, force = false } = {}) {
  if (!licenseKey || licenseKey.length < 6) {
    return { valid: false, reason: 'formato inválido' };
  }

  if (process.env.EASY4U_DEV === '1' || licenseKey.startsWith('DEV-')) {
    return { valid: true, plan: 'dev', maxAccounts: 99, produtosLiberados: null, dev: true };
  }

  // Cache permanente: se já validou com sucesso, retorna direto sem rebater no servidor.
  if (!force) {
    const cached = await readCache();
    if (cached?.licenseKey === licenseKey && cached?.result?.valid === true) {
      return { ...cached.result, fromCache: true };
    }
  }

  if (offline) {
    return { valid: false, reason: 'sem cache válido — precisa de internet pra validar a 1ª vez' };
  }

  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);

    const cliVersion = await getCurrentVersion().catch(() => 'unknown');
    const res = await fetch(VALIDATE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        product: 'zapsuite_meta',
        operador,
        cliVersion,
        os: os.platform(),
      }),
      signal: ctl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const result = await res.json();
    if (result.valid) {
      await writeCache({ licenseKey, result, cachedAt: Date.now() });
    }
    return result;
  } catch (err) {
    // Sem rede mas com cache válido? aceita.
    const cached = await readCache();
    if (cached?.licenseKey === licenseKey && cached?.result?.valid === true) {
      return { ...cached.result, fromCache: true, offlineFallback: true };
    }
    return { valid: false, reason: `validação falhou: ${err.message}` };
  }
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(LICENSE_CACHE, 'utf8'));
  } catch {
    return null;
  }
}

async function writeCache(data) {
  await ensureAppDir();
  await fs.writeFile(LICENSE_CACHE, JSON.stringify(data, null, 2), 'utf8');
}
