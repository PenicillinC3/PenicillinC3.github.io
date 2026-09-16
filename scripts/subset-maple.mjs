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
  { in: join(ROOT, '_font/MapleMono-NF-CN-Medium.ttf'), out: join(ROOT, 'public/fonts/maple-mono.woff2') },
  { in: join(ROOT, '_font/MapleMono-NF-CN-MediumItalic.ttf'), out: join(ROOT, 'public/fonts/maple-mono-italic.woff2') },
  // §98：真粗体（_font/ 由用户放入 Bold 原件）——仅在页面实际使用 ≥600 字重时下载
  { in: join(ROOT, '_font/MapleMono-NF-CN-Bold.ttf'), out: join(ROOT, 'public/fonts/maple-mono-bold.woff2') },
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

// 源码里的**中文注释**字形永远渲染不到，收进子集纯属死重 —— 实测三款正文字体各被
// 撑大 51~55KB（276→225KB，−18%），而内容页真的在下载它们。
//
// ⚠ 剥离必须**保守**，否则会反过来吞掉真代码：
//   · 块注释只认**顶格**（可有缩进）起头的 `/*`。不能见 `/*` 就删 ——
//     src/content.config.ts 里有一句 `pattern: '**/*.md'`，字符串里就含 `/*`，
//     朴素剥离器会从那儿一直吞到下一个 `*/`。实测：朴素做法比谨慎做法多丢
//     **26 个真代码字形**（不致命但会静默回退到别的字体，属「不看不知道」那类）。
//   · 行注释只认**整行**（可有缩进）的 `//`，行内的不碰（`https://` 之类全在行内）。
//   · **.md 一律不剥**：markdown 里 `//` 根本不是注释，代码块里的 `//` 是要渲染的正文。
function stripComments(src, ext) {
  if (ext === '.md') return src;
  return (
    src
      // ⚠ .astro 模板里的中文注释大多是 HTML / JSX 形态，上面那两条正则够不着 ——
      //   实测漏掉它们会白搭 181 个注释字形（「齿孔带」「贯穿视口」那类）。
      .replace(/<!--[\s\S]*?-->/g, '')          // HTML 注释
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')     // JSX 注释 {/* */}
      .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '') // 顶格块注释
      .replace(/^[ \t]*\/\/.*$/gm, '')          // 整行行注释
  );
}

// 全站正文/UI 用字来源：所有内容 md + 页面与组件脚本（含导航/按钮/页脚文案）
let text = '';
let allRaw = '';
for (const f of await walk(SRC)) {
  const raw = await readFile(f, 'utf8');
  allRaw += raw;
  text += stripComments(raw, extname(f));
}
const dropped = new Set([...allRaw].filter((ch) => !text.includes(ch)));
console.log(`注释剥离：去掉 ${dropped.size} 个只出现在注释里的字形（全文 ${new Set([...allRaw]).size} → 子集来源 ${new Set([...text]).size}）`);

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

// —— §102 加载页子集：加载页是首屏，字体必须 base64 内联进它自己的 <style>，
//    等不起一次网络往返（否则数字和标签会先以回退字体闪一下）。页面文案全是
//    ASCII（大写标签 + 数字 + `/ . %`），切全 ASCII 95 个字形就够，且留足余量。
//    取 **Bold 面**而不是 Medium —— 标签是 font-weight:700，用 Medium 会被合成加粗
//    （伪粗），与站内 §98 的真粗体不是一回事。
// 字符集刻意收窄：全 ASCII 要 30KB（base64 后 40KB，首页 HTML 直接翻倍），
// 而加载页文案只有大写标签 + 数字 + 几个符号。带上小写是防「哪天有人去掉
// text-transform:uppercase 或加了小写串」——只多 4KB，换掉一整类缺字回退风险。
const PRE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /.:%()-+';
const preFont = await subsetFont(await readFile(FONTS[2].in), PRE_CHARS, { targetFormat: 'woff2' });
const PRE_OUT = join(ROOT, 'public/fonts/maple-pre.woff2');
await writeFile(PRE_OUT, preFont);
console.log(`MaplePre 子集完成: ASCII ${PRE_CHARS.length} 字形 -> ${Math.round(preFont.length / 1024)} KB  maple-pre.woff2`);
