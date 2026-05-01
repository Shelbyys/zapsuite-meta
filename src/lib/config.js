import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_DIR, CONFIG_FILE } from './paths.js';

export async function ensureAppDir() {
  await fs.mkdir(APP_DIR, { recursive: true });
}

export async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConfig(config) {
  await ensureAppDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export async function patchConfig(patch) {
  const current = (await loadConfig()) || {};
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await saveConfig(next);
  return next;
}
