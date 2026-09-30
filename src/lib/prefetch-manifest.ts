import { readdir } from 'node:fs/promises';
import { listSorted, photoEntries, seriesRolls } from './collections';
import { coverImage, memoImage } from './photo-images';

// 首页加载页要预取的清单 —— 构建期算好，注入加载页的内联脚本。
// §101 起：覆盖全站路由 HTML + 照片展示图（与页面同一套 getImage 参数，见
// photo-images.ts）+ 字体子集。**§103 起分两批**（critical / deferred，见
// prefetchPlan）—— 加载页只等 critical。清单只在首页构建时生成一次。

/** 没有动态段的路由（栏目首页 + 首页 + 404 不进清单） */
const STATIC_ROUTES = ['/', '/notes/', '/musings/', '/links/', '/projects/', '/photos/'];

/** getImage 结果的响应式档位 URL（`srcSet.values`，与页面渲染同源） */
function variants(g: { srcSet: { values: Array<{ url: string }> } }): string[] {
  return g.srcSet.values.map((v) => v.url);
}

/**
 * 分两批返回（§103）：
 *   critical —— **加载页期间**要拉完的：① 首页首屏；② 各一级栏目的「栏目首页」核心资源；
 *               ③ 收尾玻璃球动效所需（字体 + lens.glb 模型）。
 *               加载页**严格以此为退场条件**，不再等子页。
 *   deferred —— 首页渲染完、主线程空闲后才在后台拉的：各栏目下的**子页**（详情页）
 *               及其正文大图。这些不在任何一处首屏上，早拉只会和首屏抢带宽。
 *
 * 为什么这么切：旧版把「全部路由 + 全部图 + 全部字体」都压在加载页里（§101 的
 * 「冷启动一次把整站预热完」），代价是加载页被 1.9MB 拖长；而真正决定用户第一次
 * 点击快不快的，只有「首页 + 五个栏目首页」。子页放后台，加载页能早退，两不耽误。
 */
export async function prefetchPlan(): Promise<{ critical: string[]; deferred: string[] }> {
  // ① 栏目首页（一级导航的入口页）+ 首页本身
  const critical = new Set<string>(STATIC_ROUTES);
  const deferred = new Set<string>();

  const [notes, musings, photos, rolls] = await Promise.all([
    listSorted('notes'),
    listSorted('musings'),
    photoEntries(),
    seriesRolls(),
  ]);

  // ② 子页路由 —— 全部 deferred（详情页不在任何首屏上）
  for (const e of notes) deferred.add(`/notes/${e.slug}/`);
  for (const e of musings) deferred.add(`/musings/${e.slug}/`);
  for (const r of rolls) deferred.add(`/photos/${r.entry.slug}/`);

  // ③ 图片分两类：
  //    卷封面是 /photos/ 这一栏目首页的**首屏内容**（长胶卷画廊第一屏就是封面）→ critical
  //    备忘页大图与所有响应式档位只在子页上出现 → deferred
  for (const r of rolls) {
    const g = await coverImage(r.cover.data.image);
    critical.add(g.src);
    for (const u of variants(g)) critical.add(u);
  }
  for (const p of photos) {
    const g = await memoImage(p.data.image);
    deferred.add(g.src);
    for (const u of variants(g)) deferred.add(u);
  }

  // ④ 字体：全部 critical —— 首屏与五个栏目首页都要用（正文 Maple、UI MapleUI、
  //    宋体 Song、代码 JetBrains），且它们要么内联要么被首屏直接引用。
  const fontsDir = new URL('../../public/fonts', import.meta.url);
  for (const f of await readdir(fontsDir)) {
    if (f.endsWith('.woff2')) critical.add(`/fonts/${f}`);
  }

  // ⑤ 玻璃球模型：收尾动效的主角，必须和字体一起在加载页里备好（旧清单漏了它 ——
  //    球的 GLB 不在任何 HTML 的静态引用里，是 island hydrate 时才 fetch 的）
  critical.add('/assets/3d/lens.glb');

  return { critical: [...critical], deferred: [...deferred] };
}
