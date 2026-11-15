// 展示用衬线体子集化（spec §111）：思源宋体（中文）+ Anthropic Serif（拉丁）。
//
// 两套字体**共用同一份字符集**，由浏览器逐字挑选：
//   拉丁字母/数字/常用标点 → Anthropic Serif（Display 面）
//   汉字/全角标点          → 思源宋体 SC
// 所以字体栈写成 "Anthropic Serif Web", "Source Han Serif Web", …，让拉丁先命中。
//
// 产物：
//   public/fonts/anthropic-serif.woff2   ← _font/AnthropicSerif-Display-Regular.otf
//   public/fonts/source-han-serif.woff2  ← _font/SourceHanSerifSC-VF.otf.ttf（可变字重 250–900）
//
// ⚠ 与 subset-maple 同理：字形集随内容走，漏跑是**静默**的（缺形逐字回退系统字体，
//   新旧混排看着像「字体坏了」）。已由 package.json 的 prebuild / predev 钩子自动执行。
// ⚠ 思源宋体是**可变字体**，默认 wght=250（ExtraLight）。页面用 400，浏览器会实例化，
//   不需要额外切静态面 —— 但子集必须保留 fvar/gvar，subset-font 默认保留。
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/');
const SRC = join(ROOT, 'src');
const ANTHROPIC_IN = join(ROOT, '_font/AnthropicSerif-Display-Regular.otf');
const ANTHROPIC_OUT = join(ROOT, 'public/fonts/anthropic-serif.woff2');
const SOURCE_HAN_IN = join(ROOT, '_font/SourceHanSerifSC-VF.otf.ttf');
const SOURCE_HAN_OUT = join(ROOT, 'public/fonts/source-han-serif.woff2');

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

// —— 摄影页上还有一批字是**代码模板拼出来的**，内容 md 里根本没有：
//      年 ← src/lib/date.ts       `${y} 年 ${m} 月 ${d} 日`
//      共 ← src/pages/photos/[slug].astro   「共 {n} 张」
//    漏一个就**静默回退到系统宋体**。顺带扫这几个源文件，并**剥掉注释**
//    （注释里的中文永远渲染不到，收进来纯属死重）。
//    正则与 scripts/subset-maple.mjs 的 stripComments 同一套，改一处要同步另一处。
const stripComments = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')          // HTML 注释（.astro 模板里的中文多是这种）
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')     // JSX 注释 {/* */}
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '') // 顶格块注释
    .replace(/^[ \t]*\/\/.*$/gm, '');         // 整行行注释
const SRC_FILES = ['pages/photos/index.astro', 'pages/photos/[slug].astro', 'lib/date.ts'];

let text = UI_TEXT.join('');
const files = await walk(SRC);
for (const f of files) {
  if (FOLDERS.some((fd) => f.replace(/\\/g, '/').includes('/' + fd + '/'))) {
    text += '\n' + (await readFile(f, 'utf8'));
  }
}
for (const rel of SRC_FILES) {
  text += '\n' + stripComments(await readFile(join(SRC, rel), 'utf8'));
}
// 站名（首页大标题）永远是拉丁，但两套字体都带上它，免得哪天改了站名还得单独补
const SITE_CFG = await readFile(join(SRC, 'site.config.ts'), 'utf8');
const quoted = (key) => (SITE_CFG.match(new RegExp(key + "\\s*:\\s*'([^']+)'")) || [])[1] || '';
text += quoted('title') + quoted('tagline');

// 全 ASCII 兜底：拉丁数字/标点在任何页面都可能出现（日期、相机参数、页码）
const chars = new Set(String.fromCharCode(...Array.from({ length: 95 }, (_, i) => i + 32)));
for (const ch of text) chars.add(ch);
// 常见中文标点（正文里随时可能用到，字形很小）
for (const ch of '，。、；：？！“”‘’（）《》〈〉【】…—·') chars.add(ch);
const charset = [...chars].join('');

async function build(input, output, label) {
  const font = await readFile(input);
  const out = await subsetFont(font, charset, { targetFormat: 'woff2' });
  await writeFile(output, out);
  const inKb = Math.round((await stat(input)).size / 1024);
  console.log(`${label}: ${inKb} KB -> ${Math.round(out.length / 1024)} KB (${chars.size} 字形)  ${output.split('/').pop()}`);
}

await build(ANTHROPIC_IN, ANTHROPIC_OUT, 'Anthropic Serif');
await build(SOURCE_HAN_IN, SOURCE_HAN_OUT, '思源宋体');
