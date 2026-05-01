import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import { SECRETS_FILE } from './paths.js';
import { ensureAppDir } from './config.js';

function machineKey(licenseKey = 'easy4u') {
  const id = `${os.hostname()}::${os.platform()}::${os.arch()}::${licenseKey}`;
  return crypto.createHash('sha256').update(id).digest();
}

export async function saveSecret(name, value, licenseKey) {
  await ensureAppDir();
  const all = (await readAll(licenseKey)) || {};
  all[name] = value;
  const key = machineKey(licenseKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(all), 'utf8'), cipher.final()]);
  const payload = Buffer.concat([iv, enc]).toString('base64');
  await fs.writeFile(SECRETS_FILE, payload, { encoding: 'utf8', mode: 0o600 });
}

export async function readSecret(name, licenseKey) {
  const all = await readAll(licenseKey);
  return all?.[name] ?? null;
}

async function readAll(licenseKey) {
  try {
    const raw = await fs.readFile(SECRETS_FILE, 'utf8');
    const buf = Buffer.from(raw, 'base64');
    const iv = buf.subarray(0, 16);
    const enc = buf.subarray(16);
    const key = machineKey(licenseKey);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return null;
  }
}

export async function clearSecrets() {
  try {
    await fs.unlink(SECRETS_FILE);
  } catch {}
}
