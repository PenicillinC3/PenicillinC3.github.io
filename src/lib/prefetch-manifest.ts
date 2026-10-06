import { readdir } from 'node:fs/promises';
import { listSorted, photoEntries, seriesRolls } from './collections';
import { coverImage, memoImage } from './photo-images';

// 首页加载页要预取的清单 —— 构建期算好，注入加载页的内联脚本。
// §101 起：覆盖全站路由 HTML + 照片展示图（与页面同一套 getImage 参数，见
// photo-images.ts）+ 字体子集。清单只在首页构建时生成一次。

/** 没有动态段的路由（栏目首页 + 首页 + 404 不进清单） */
const STATIC_ROUTES = ['/notes/', '/musings/', '/links/', '/projects/', '/photos/'];

/** getImage 结果的响应式档位 URL（`srcSet.values`，与页面渲染同源） */
function variants(g: { srcSet: { values: Array<{ url: string }> } }): string[] {
  return g.srcSet.values.map((v) => v.url);
}

/**
 * 字体分档。**默认档 4** —— 新增子集自动进清单（只是排在后面），
 * 不会因为忘了登记而漏掉。
 *   skip = 只被加载页 **内联成 base64** 用，作为独立文件从不会被任何页面请求，
 *          放进清单纯属白下（实测：helv-swiss 7KB + maple-pre 12KB）。
 */
const FONT_TIER: Record<string, 0 | 1 | 4 | 'skip'> = {
  'maple-ui.woff2': 0,        // 首页 DOM 文案（导航/按钮/页脚）
  'maple-mono.woff2': 1,      // 每个内容页的正文 —— 后台队列里排第一
  'helv-swiss.woff2': 'skip',
  'maple-pre.woff2': 'skip',
};

/**
 * 分两批返回（§103 / §105）：
 *
 *   critical —— **首页自己**要用的，加载页严格以此为退场条件：
 *               `/`（HTML）+ maple-ui（DOM 文案）+ song-3d.ttf（3D 场景站名/tagline）
 *               + lens.glb（玻璃球模型）。
 *               ⚠ 实测（CDP 记录首页全部请求 + 查实际渲染字体）：**首页只用这 4 个，
 *                 合计约 76KB，且一张图都不请求**。
 *
 *   deferred —— 首页渲染完、主线程空闲后才在后台拉的，**数组顺序即优先级**。
 *               分四档：① 正文字体 → ② 栏目首页 HTML → ③ 卷封面 + 粗体
 *               → ④ 其余字体 + 子页 + 备忘页大图。
 *
 * 为什么这么切：§103 把「全部字体 + 卷封面 + 栏目首页」都压在 critical（1.74MB），
 * 而首页自己只需要其中 76KB —— 剩下 1.66MB 是替「下一次点击」提前下的，代价却记在
 * 首屏账上。慢网下加载页时长 ≈ 下载时长（不是 MIN_MS），所以这笔账很贵。
 * 现在改成：**加载页只等首页自己，其余全部转后台并排好序**。
 */
export async function prefetchPlan(): Promise<{ critical: string[]; deferred: string[] }> {
  const [notes, musings, photos, rolls] = await Promise.all([
    listSorted('notes'),
    listSorted('musings'),
    photoEntries(),
    seriesRolls(),
  ]);

  // ── critical：首页自己 ──
  const critical = new Set<string>(['/', '/assets/3d/lens.glb']);

  // ── deferred：有序 + 全局去重 ──
  // ⚠ 去重必须跨档 —— 同一张照片既可能是卷封面（③）又出现在备忘页大图（④）里，
  //   两边都加会让浏览器重复请求同一个 URL（§103 实测：dsc0025 的 262KB 档两边都有）。
  const seen = new Set(critical);
  const deferred: string[] = [];
  const push = (u: string) => {
    if (seen.has(u)) return;
    seen.add(u);
    deferred.push(u);
  };

  const t1: string[] = [];   // 字体：每个内容页正文都要
  const t2: string[] = [];   // 栏目首页 HTML：最可能的下一跳
  const t3: string[] = [];   // 卷封面 + 粗体
  const t4: string[] = [];   // 其余字体 + 子页 + 备忘页大图

  // ① 字体分档。song-3d 是 .ttf，glob 收不到 → 单独指定（首页 3D 文字要用）
  critical.add('/fonts/song-3d.ttf');
  seen.add('/fonts/song-3d.ttf');
  const fontsDir = new URL('../../public/fonts', import.meta.url);
  for (const f of await readdir(fontsDir)) {
    if (!f.endsWith('.woff2')) continue;
    const tier = FONT_TIER[f] ?? 4;
    if (tier === 'skip') continue;
    if (tier === 0) { critical.add(`/fonts/${f}`); seen.add(`/fonts/${f}`); continue; }
    (tier === 1 ? t1 : t4).push(`/fonts/${f}`);
  }

  // ② 栏目首页 HTML
  for (const r of STATIC_ROUTES) t2.push(r);

  // ③ 卷封面 —— /photos 首屏就是封面，但不是首页的内容
  for (const r of rolls) {
    const g = await coverImage(r.cover.data.image);
    t3.push(g.src, ...variants(g));
  }

  // ④ 子页路由（详情页不在任何首屏上）
  for (const e of notes) t4.push(`/notes/${e.slug}/`);
  for (const e of musings) t4.push(`/musings/${e.slug}/`);
  for (const r of rolls) t4.push(`/photos/${r.entry.slug}/`);

  // ⑤ 备忘页大图及全部档位
  for (const p of photos) {
    const g = await memoImage(p.data.image);
    t4.push(g.src, ...variants(g));
  }

  for (const u of [...t1, ...t2, ...t3, ...t4]) push(u);

  return { critical: [...critical], deferred };
}
