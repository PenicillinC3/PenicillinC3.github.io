// MapleMono-NF-CN 子集化（spec §29）：全站（除摄影页，正文用字）20.5MB TTF
// → public/fonts/maple-mono.woff2。字形取自全部内容 md + 页面/组件文案。
// 新增内容后执行：npm run fonts:subset（同时重建 song + maple）
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/');
const SRC = join(ROOT, 'src');
const FONT_IN = join(ROOT, 'font/MapleMono-NF-CN-Medium.ttf');
const FONT_OUT = join(ROOT, 'public/fonts/maple-mono.woff2');

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (['.md', '.astro', '.ts', '.tsx'].includes(extname(e.name))) acc.push(p);
  }
  return acc;
}

// 全站正文/UI 用字来源：所有内容 md + 页面与组件脚本（含导航/按钮/页脚文案）
let text = '';
for (const f of await walk(SRC)) text += await readFile(f, 'utf8');

const font = await readFile(FONT_IN);
const out = await subsetFont(font, text, { targetFormat: 'woff2' });
await writeFile(FONT_OUT, out);
const inKb = Math.round((await stat(FONT_IN)).size / 1024);
console.log(`MapleMono 子集完成: ${inKb} KB -> ${Math.round(out.length / 1024)} KB`);
