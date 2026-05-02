import { loadConfig } from './config.js';
import { getMachineId } from './machine.js';

const SUPABASE_URL = process.env.EASY4U_SUPABASE_URL || 'https://deolgsizilmcsjufodxn.supabase.co';
const LOG_FN = `${SUPABASE_URL}/functions/v1/log-evento`;
const TIMEOUT_MS = 3000;

export const TIPO = Object.freeze({
  INIT:                 'init',
  CAMPANHA_CRIADA:      'campanha_criada',
  CAMPANHA_PAUSADA:     'campanha_pausada',
  AD_SET_CRIADO:        'ad_set_criado',
  AD_CRIADO:            'ad_criado',
  OTIMIZACAO_APLICADA:  'otimizacao_aplicada',
  CRIATIVO_TROCADO:     'criativo_trocado',
  ERRO:                 'erro',
});

/**
 * Envia evento (best-effort — não bloqueia, não joga erro).
 * Respeita opt-in: se telemetry !== true no config, vira no-op.
 */
export async function logEvento(tipo, payload = {}) {
  try {
    const cfg = await loadConfig();
    if (!cfg || cfg.telemetry !== true) return;
    if (!cfg.email) return;

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);

    await fetch(LOG_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cfg.email,
        machineId: getMachineId(),
        tipo,
        payload,
      }),
      signal: ctl.signal,
    });
    clearTimeout(t);
  } catch {
    // silencioso de propósito — telemetria nunca derruba o CLI
  }
}
