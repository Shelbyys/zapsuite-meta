import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { imageSize } from 'image-size';
import { APP_DIR } from './paths.js';

const IMG_EXT   = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v']);

const META_LIMITS = {
  image: { maxBytes: 30 * 1024 * 1024 },           // 30 MB
  video: { maxBytes: 4 * 1024 * 1024 * 1024 },     // 4 GB
};

// Aspect ratio com tolerância ±5%. Retorna o "label Meta":
//   '9:16' (story/reel) · '1:1' (feed quadrado) · '4:5' (feed vertical)
//   '16:9' (horizontal) · 'irregular' (cropping forçado pela Meta)
function classifyAspect(w, h) {
  if (!w || !h) return null;
  const r = w / h;
  const close = (target) => Math.abs(r - target) / target < 0.05;
  if (close(9 / 16)) return '9:16';
  if (close(1))      return '1:1';
  if (close(4 / 5))  return '4:5';
  if (close(16 / 9)) return '16:9';
  return 'irregular';
}

function suggestPlacement(aspect) {
  if (aspect === '9:16')      return 'ótimo pra Story/Reel; aceito no Feed';
  if (aspect === '1:1')       return 'ótimo pra Feed; aceito no Story (com bordas)';
  if (aspect === '4:5')       return 'ótimo pra Feed; ruim no Story';
  if (aspect === '16:9')      return 'horizontal — ruim pra Story/Reel; só Feed';
  if (aspect === 'irregular') return 'aspect fora do padrão — Meta pode cortar';
  return null;
}

function readImageDimensions(filePath) {
  try {
    // image-size lê só o header, é rápido mesmo em PNG grande
    const dim = imageSize(readFileSync(filePath));
    return { width: dim.width, height: dim.height };
  } catch {
    return { width: null, height: null };
  }
}

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
        let width = null, height = null, aspect = null, placementHint = null;
        if (isImage) {
          ({ width, height } = readImageDimensions(full));
          aspect = classifyAspect(width, height);
          placementHint = suggestPlacement(aspect);
        }
        files.push({
          path: full,
          name: f,
          folder: path.basename(dir),
          kind: isImage ? 'image' : 'video',
          size: st.size,
          sizeHuman: humanSize(st.size),
          modifiedAt: st.mtime,
          oversize: st.size > (isImage ? META_LIMITS.image.maxBytes : META_LIMITS.video.maxBytes),
          width, height, aspect, placementHint,
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

/**
 * Normaliza o caminho colado pelo usuário.
 * Mac: arrastar arquivo no Terminal cola com \ antes de espaços e às vezes
 *      em aspas simples envolvendo tudo.
 * Windows: clicar com botão direito → 'Copy as path' cola entre aspas duplas.
 */
export function normalizePastedPath(raw) {
  if (!raw) return '';
  let p = raw.trim();
  // Tira aspas simples ou duplas envolvendo
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  // Tira escape de espaços do Mac (\  → espaço)
  p = p.replace(/\\(.)/g, '$1');
  // Expande ~ → home
  if (p.startsWith('~')) {
    p = path.join(process.env.HOME || '', p.slice(1));
  }
  return p;
}

/**
 * Copia um arquivo (ou todos os de uma pasta) do path origem pra UPLOAD_DIR.
 * Retorna { ok, copied: [{name, size}], skipped: [{name, reason}] }
 */
export async function addMediaFromPath(rawPath) {
  await ensureMidiasFolders();
  const sourcePath = normalizePastedPath(rawPath);

  let stat;
  try { stat = await fs.stat(sourcePath); }
  catch { return { ok: false, copied: [], skipped: [], error: `arquivo/pasta não existe: ${sourcePath}` }; }

  const candidates = [];
  if (stat.isFile()) {
    candidates.push(sourcePath);
  } else if (stat.isDirectory()) {
    const entries = await fs.readdir(sourcePath);
    for (const e of entries) candidates.push(path.join(sourcePath, e));
  } else {
    return { ok: false, copied: [], skipped: [], error: 'tipo de path não suportado' };
  }

  const copied = [];
  const skipped = [];

  for (const src of candidates) {
    const name = path.basename(src);
    const ext  = path.extname(name).toLowerCase();
    const isImage = IMG_EXT.has(ext);
    const isVideo = VIDEO_EXT.has(ext);

    if (!isImage && !isVideo) { skipped.push({ name, reason: `extensão não suportada (${ext || 'sem ext'})` }); continue; }

    let st;
    try { st = await fs.stat(src); } catch { skipped.push({ name, reason: 'não pôde ler' }); continue; }
    if (!st.isFile())                   { skipped.push({ name, reason: 'não é arquivo' }); continue; }

    const limit = isImage ? META_LIMITS.image.maxBytes : META_LIMITS.video.maxBytes;
    if (st.size > limit)                { skipped.push({ name, reason: `acima do limite Meta (${humanSize(st.size)})` }); continue; }

    // Não sobrescreve — adiciona sufixo se já existe
    let dest = path.join(UPLOAD_DIR, name);
    let n = 1;
    while (true) {
      try { await fs.access(dest); }
      catch { break; }
      const base = name.replace(/(\.[^.]+)?$/, '');
      const e2 = path.extname(name);
      dest = path.join(UPLOAD_DIR, `${base}-${++n}${e2}`);
    }

    try {
      await fs.copyFile(src, dest);
      copied.push({ name: path.basename(dest), size: st.size });
    } catch (err) {
      skipped.push({ name, reason: `erro ao copiar: ${err.message}` });
    }
  }

  return { ok: copied.length > 0, copied, skipped };
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
