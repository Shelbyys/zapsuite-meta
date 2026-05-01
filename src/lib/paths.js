import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const HOME = os.homedir();
export const APP_DIR = path.join(HOME, '.zapsuite-meta');
export const SECRETS_FILE = path.join(APP_DIR, '.secrets');
export const CONFIG_FILE = path.join(APP_DIR, 'config.json');
export const LICENSE_CACHE = path.join(APP_DIR, '.license-cache.json');

export const PKG_ROOT = path.resolve(__dirname, '..', '..');
export const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates');

export const DESKTOP_DIR = path.join(HOME, 'Desktop');
