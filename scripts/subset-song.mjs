// 华文中宋子集化（spec §28）：把 font/STZHONGS.TTF（~12MB）按「摄影作品集
// 首页及其分页实际用到的字形」子集 → public/fonts/stzhongsong.woff2。
// 新增照片/卷文案后重新执行：npm run fonts:subset
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/');
const SRC = join(ROOT, 'src');
const FONT_IN = join(ROOT, 'font/STZHONGS.TTF');
const FONT_OUT = join(ROOT, 'public/fonts/stzhongsong.woff2');

// 摄影栏目页面上的固定 UI 文案（不在 md 里的字也纳入，避免缺形回退）
const UI_TEXT = [
  '摄影作品集', '暗房 · 摄影作品集', '未标注地点', '张', '点击胶片进入备忘录',
  '两侧半露翻卷', '键', '上一卷', '下一卷', '（无）', '进入', '备忘录', '郊野', '七月',
  '还没有胶卷', '在', '放第一卷吧', '←', '→', '·', '—', '第', '张照片',
];

// 摄影栏目内容（series 卷文案 + photos 照片说明）
const FOLDERS = ['content/series', 'content/photos'];

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (extname(e.name) === '.md') acc.push(p);
  }
  return acc;
}

let text = UI_TEXT.join('');
const files = await walk(SRC);
for (const f of files) {
  if (FOLDERS.some((fd) => f.replace(/\\/g, '/').includes('/' + fd + '/'))) {
    text += '\n' + await readFile(f, 'utf8');
  }
}

const font = await readFile(FONT_IN);
const out = await subsetFont(font, text, { targetFormat: 'woff2' });
await writeFile(FONT_OUT, out);
const inKb = Math.round((await stat(FONT_IN)).size / 1024);
const outKb = Math.round(out.length / 1024);
console.log(`华文中宋子集完成: ${inKb} KB -> ${outKb} KB (${Math.round((out.length / (await stat(FONT_IN)).size) * 1000) / 10}%)`);
console.log(`输出: ${FONT_OUT}`);
