// MapleMono-NF-CN 子集化（spec §29/§32）：全站（除摄影页，正文用字）TTF
// → public/fonts/maple-mono.woff2（常规）与 maple-mono-italic.woff2（中文注释用斜体）。
// 字形取自全部内容 md + 页面/组件文案。新增内容后执行：npm run fonts:subset
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/');
const SRC = join(ROOT, 'src');
const FONTS = [
  { in: join(ROOT, 'font/MapleMono-NF-CN-Medium.ttf'), out: join(ROOT, 'public/fonts/maple-mono.woff2') },
  { in: join(ROOT, 'font/MapleMono-NF-CN-MediumItalic.ttf'), out: join(ROOT, 'public/fonts/maple-mono-italic.woff2') },
  // §98：真粗体（font/ 由用户放入 Bold 原件）——仅在页面实际使用 ≥600 字重时下载
  { in: join(ROOT, 'font/MapleMono-NF-CN-Bold.ttf'), out: join(ROOT, 'public/fonts/maple-mono-bold.woff2') },
];

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

for (const f of FONTS) {
  const font = await readFile(f.in);
  const out = await subsetFont(font, text, { targetFormat: 'woff2' });
  await writeFile(f.out, out);
  const inKb = Math.round((await stat(f.in)).size / 1024);
  console.log(`MapleMono 子集完成: ${inKb} KB -> ${Math.round(out.length / 1024)} KB  ${f.out.split('/').pop()}`);
}

// —— §90 UI 子集（首页提速）：全站「框架文案」字形（站点名/标语/导航/页脚/
//    按钮）单独切一个极小 woff2 放字体栈最前 —— 首页文本全部命中它，238KB 的
//    正文字体不再下载；内容页正文汉字不在其中，照旧逐字回退到大会话字体。
//    来源：site.config.ts 全部字符串字面量 + ASCII + 少量组件级固定文案 ——
//    任何遗漏都会安全回退到大字体（只损失速度，不丢字形）。
const SITE_CFG = await readFile(join(SRC, 'site.config.ts'), 'utf8');
const coreChars = new Set(
  String.fromCharCode(...Array.from({ length: 95 }, (_, i) => i + 32)), // 全 ASCII
);
for (const m of SITE_CFG.matchAll(/'([^'\n]*)'/g)) for (const ch of m[1]) coreChars.add(ch);
for (const ch of 'ViaClaudeCode©←→·—张第共张照片搜索') coreChars.add(ch);
const uiFont = await subsetFont(await readFile(FONTS[0].in), [...coreChars].join(''), {
  targetFormat: 'woff2',
});
const UI_OUT = join(ROOT, 'public/fonts/maple-ui.woff2');
await writeFile(UI_OUT, uiFont);
console.log(`MapleUI 子集完成: ${coreChars.size} 字形 -> ${Math.round(uiFont.length / 1024)} KB  maple-ui.woff2`);
