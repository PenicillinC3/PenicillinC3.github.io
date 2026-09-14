import { readdir } from 'node:fs/promises';
import { listSorted, photoEntries, seriesRolls } from './collections';
import { coverImage, memoImage } from './photo-images';

// §101：首页加载页要预取的清单 —— 构建期算好，注入加载页的内联脚本。
// 覆盖：全部路由 HTML + 全部照片展示图（与页面同一套 getImage 参数，见
// photo-images.ts）+ 全部字体子集。清单只在首页构建时生成一次。

/** 没有动态段的路由（栏目首页 + 首页 + 404 不进清单） */
const STATIC_ROUTES = ['/', '/notes/', '/musings/', '/links/', '/projects/', '/photos/'];

/** getImage 结果的响应式档位 URL（`srcSet.values`，与页面渲染同源） */
function variants(g: { srcSet: { values: Array<{ url: string }> } }): string[] {
  return g.srcSet.values.map((v) => v.url);
}

export async function prefetchUrls(): Promise<string[]> {
  const urls = new Set<string>(STATIC_ROUTES);

  const [notes, musings, photos, rolls] = await Promise.all([
    listSorted('notes'),
    listSorted('musings'),
    photoEntries(),
    seriesRolls(),
  ]);

  // 详情页路由（与 getStaticPaths 同源：notes/musings 用 slug，series 用 entry.slug）
  for (const e of notes) urls.add(`/notes/${e.slug}/`);
  for (const e of musings) urls.add(`/musings/${e.slug}/`);
  for (const r of rolls) urls.add(`/photos/${r.entry.slug}/`);

  // 展示图：备忘页大图 + 画廊卷封面（两套参数都取全，srcset 各档一并预取）
  for (const p of photos) {
    const g = await memoImage(p.data.image);
    urls.add(g.src);
    for (const u of variants(g)) urls.add(u);
  }
  for (const r of rolls) {
    const g = await coverImage(r.cover.data.image);
    urls.add(g.src);
    for (const u of variants(g)) urls.add(u);
  }

  // 字体子集：与 `npm run fonts:subset` 的产物目录同步（新增子集自动进清单）
  const fontsDir = new URL('../../public/fonts', import.meta.url);
  for (const f of await readdir(fontsDir)) {
    if (f.endsWith('.woff2')) urls.add(`/fonts/${f}`);
  }

  return [...urls];
}
