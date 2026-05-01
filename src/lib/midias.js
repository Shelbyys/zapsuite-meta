import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { APP_DIR } from './paths.js';

const IMG_EXT   = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v']);

const META_LIMITS = {
  image: { maxBytes: 30 * 1024 * 1024 },           // 30 MB
  video: { maxBytes: 4 * 1024 * 1024 * 1024 },     // 4 GB
};

export const MIDIAS_DIR  = path.join(APP_DIR, 'midias');
export const UPLOAD_DIR  = path.join(MIDIAS_DIR, 'upload');
export const PRODUTO_DIR = path.join(MIDIAS_DIR, 'produto');
export const AMBIENTE_DIR = path.join(MIDIAS_DIR, 'ambiente');
export const EQUIPE_DIR  = path.join(MIDIAS_DIR, 'equipe');

const ALL_DIRS = [UPLOAD_DIR, PRODUTO_DIR, AMBIENTE_DIR, EQUIPE_DIR];

export async function ensureMidiasFolders() {
  await Promise.all(ALL_DIRS.map(d => fs.mkdir(d, { recursive: true })));
  // README amigável dentro de upload/
  const readme = path.join(UPLOAD_DIR, 'COMO_USAR.txt');
  try {
    await fs.access(readme);
  } catch {
    await fs.writeFile(
      readme,
      [
        'ZapSuite Meta · pasta de mídias',
        '====================================',
        '',
        'Arraste suas fotos e vídeos pra esta pasta.',
        '',
        'Formatos aceitos:',
        '  Imagem: .jpg, .jpeg, .png, .webp  (até 30 MB)',
        '  Vídeo:  .mp4, .mov, .m4v          (até 4 GB)',
        '',
        'Dicas:',
        '  - Foto vertical (9:16) funciona melhor em Stories e Reels.',
        '  - Foto quadrada (1:1) é mais segura — funciona em todos os lugares.',
        '  - Vídeo curto (até 15s) tem melhor desempenho.',
        '  - Use fotos REAIS do seu negócio. Stock photo performa pior.',
        '',
        'Você pode apagar este arquivo.',
      ].join('\n'),
      'utf8'
    );
  }
}

export async function listAvailableMidias({ kind = 'all' } = {}) {
  const files = [];
  for (const dir of ALL_DIRS) {
    try {
      const entries = await fs.readdir(dir);
      for (const f of entries) {
        if (f.startsWith('.') || f.startsWith('_') || f === 'COMO_USAR.txt') continue;
        const full = path.join(dir, f);
        const st = await fs.stat(full);
        if (!st.isFile()) continue;
        const ext = path.extname(f).toLowerCase();
        const isImage = IMG_EXT.has(ext);
        const isVideo = VIDEO_EXT.has(ext);
        if (!isImage && !isVideo) continue;
        if (kind === 'image' && !isImage) continue;
        if (kind === 'video' && !isVideo) continue;
        files.push({
          path: full,
          name: f,
          folder: path.basename(dir),
          kind: isImage ? 'image' : 'video',
          size: st.size,
          sizeHuman: humanSize(st.size),
          modifiedAt: st.mtime,
          oversize: st.size > (isImage ? META_LIMITS.image.maxBytes : META_LIMITS.video.maxBytes),
        });
      }
    } catch {
      // pasta não existe ainda
    }
  }
  // mais novos primeiro
  files.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return files;
}

export function openMidiasFolder(sub = 'upload') {
  const target = path.join(MIDIAS_DIR, sub);
  if (process.platform === 'darwin')      execSync(`open "${target}"`);
  else if (process.platform === 'win32')  execSync(`explorer "${target}"`);
  else                                    execSync(`xdg-open "${target}"`);
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
