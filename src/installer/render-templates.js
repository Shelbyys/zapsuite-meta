import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import { TEMPLATES_DIR, APP_DIR } from '../lib/paths.js';
import { ensureAppDir } from '../lib/config.js';

const COPY_DIRS = ['agents', 'commands', 'playbooks'];
const HBS_FILES = ['CLAUDE.md.hbs', '.mcp.json.hbs'];

export async function renderAll(context) {
  await ensureAppDir();

  for (const f of HBS_FILES) {
    const src = path.join(TEMPLATES_DIR, f);
    const tpl = Handlebars.compile(await fs.readFile(src, 'utf8'));
    const out = path.join(APP_DIR, f.replace(/\.hbs$/, ''));
    await fs.writeFile(out, tpl(context), 'utf8');
  }

  for (const dir of COPY_DIRS) {
    const srcDir = path.join(TEMPLATES_DIR, dir);
    const dstDir = path.join(APP_DIR, dir === 'commands' ? '.claude/commands' : dir === 'agents' ? '.claude/agents' : 'playbooks');
    await fs.mkdir(dstDir, { recursive: true });
    const entries = (await fs.readdir(srcDir)).filter(
      f => !f.startsWith('.') && !f.startsWith('_') && (f.endsWith('.md') || f.endsWith('.yaml'))
    );
    for (const file of entries) {
      const raw = await fs.readFile(path.join(srcDir, file), 'utf8');
      const content = Handlebars.compile(raw, { noEscape: true })(context);
      await fs.writeFile(path.join(dstDir, file), content, 'utf8');
    }
  }
}
