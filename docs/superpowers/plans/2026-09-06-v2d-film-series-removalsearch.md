# v2d 计划：胶片式摄影集（series 模型+备忘页）+ 删除站内搜索

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。checkbox 跟踪。

**Goal:** spec §19/§20。①摄影集主页改横向胶卷（series 卷模型、封面帧、两段式选中+时间/地点浮现、选中微光并影响页脚玻璃）；②卷备忘页（卷文+照片混排，横版整行、竖版左图右文），删除旧单张照片页与 PhotoCard；③全链路删除站内搜索。

**Architecture:** 内容层加 `series` 集合 + photos 增 `series` 字段；lib 加 `seriesRolls()` 连接查询；/photos 重写为胶片 UI（客户端仅选中态与键盘，无依赖）；/photos/[slug] 语义改为卷备忘页（服务端按宽高比排版）。删除搜索各件（页面/脚本/组件/依赖/导航引用）。

## Global Constraints（增量，spec §19/20）

1. series schema：title/date(YYYY-MM-DD)/location?/summary?/cover:string 必填/draft?；photos schema 增 `series: z.string().optional()`。
2. `seriesRolls()`（lib）：返回 `{ entry, photos[] }[]` —— photos 按 `data.series === series.slug` 过滤、date 升序；cover slug 不在卷内时退用卷内第一张并 console.warn（构建可见）；series 按 date 倒序。
3. 胶片帧 = series.cover 所指照片缩略图（getImage）；无 series 的照片不进主页（文件保留）。
4. 选中微光：CSS 变量 `--film-glow`（accent 系柔光）；`body.film-on .foot .inner` 追加外发光同色微光；帧 `.is-selected` 灰边→微光边。
5. 删除清单（§20.1）：文件删除 + 全库 grep 清零（search/SearchBox/fuse/search-q）；`npm uninstall fuse.js`；Nav/.drawer/404/README 同步。
6. 备注页横竖判定用 `e.data.image.width/height`（同 v2b）。
7. 验收：build 0 警告；路由 200（/photos、/photos/<3卷slug>/ 等）；grep 残留清零；人工清单（胶片观感/微光/两段交互/备忘排布/键盘）。

## Task 1: series 内容层 + 胶片主页

**Files:**
- Modify: `src/content.config.ts`（+series 集合、photos 增 series 字段）、`src/lib/collections.ts`（+`seriesRolls()` 与类型）、`src/pages/photos/index.astro`（整体重写为胶片）
- Delete: `src/components/PhotoCard.astro`
- Create 种子：`src/content/series/` 3 个 md；修改 `src/content/photos/` 3 个 md（增 series/cover 字段与简短示例正文；photo body 替换占位文案为 2-3 行中文描述性文字以验证排版）

- [ ] Step 1: content.config.ts

`series` 集合定义（追加到 `export const collections`）：
```ts
  series: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      location: z.string().optional(),
      cover: z.string(), // 卷封面 = 卷内某照片的 slug
    }),
  }),
```
`photos` 集合 schema 的 base 展开后追加 `series: z.string().optional(),`（放在 camera 之后、image 之前均可——注意对象顺序无约束）。

- [ ] Step 2: collections.ts 增 seriesRolls

文件末尾追加：
```ts
import type { CollectionEntry } from 'astro:content'; // 顶部已有则复用

export interface SeriesRoll {
  entry: CollectionEntry<'series'>;
  photos: CollectionEntry<'photos'>[];
  cover: CollectionEntry<'photos'>;
}

/** 卷：photos 按 series 字段挂靠、date 升序；封面缺省退第一张（构建期 console.warn） */
export async function seriesRolls(): Promise<SeriesRoll[]> {
  const allPhotos = await getCollection('photos');
  const allSeries = (await getCollection('series'))
    .filter((s) => !s.data.draft)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  return allSeries.map((s) => {
    const photos = allPhotos
      .filter((p) => p.data.series === s.slug)
      .sort((a, b) => a.data.date.localeCompare(b.data.date));
    let cover = photos.find((p) => p.slug === s.data.cover);
    if (!cover && photos.length > 0) {
      cover = photos[0];
      console.warn(`[series] ${s.slug} 封面 ${s.data.cover} 不在卷内，回退 ${cover.slug}`);
    }
    if (!cover) {
      throw new Error(`[series] ${s.slug} 卷内无照片（photos 需带 series: ${s.slug}）`);
    }
    return { entry: s, photos, cover };
  });
}
```
> photos 为空但 series 存在 → build 抛错（坏内容拦截）。注意 photos 里的 draft 照片仍会参与（series 内不过滤 draft；若要过滤请说明——默认不过滤，draft 照片仍可预览）。

- [ ] Step 3: 种子内容迁移

`src/content/series/` 新建三卷（date/地点可自拟与照片呼应）：
- `harbor-roll.md`（title 港口日落卷、cover harbor-sunset、正文 2-3 段备忘）
- `valley-walk.md`（cover misty-valley）
- `night-neon.md`（cover neon-street）
卷正文写像个人笔记的备忘长文（示范混排观感），每卷至少让一张照片有 2-3 行中文正文（放在该照片 md 的 body）。

三张照片 md frontmatter 增 `series: harbor-roll / valley-walk / night-neon`（对应）；正文替换原「占位照片：替换为真实摄影作品。」为示例描述文字（横版示例文本；留 neon-street 为竖版说明注释亦可——种子仍横版）。

- [ ] Step 4: photos/index.astro 胶片主页

整体替换（客户端脚本：选中态/键盘/页脚微光；无第三方依赖）：
```astro
---
import { getImage } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import { seriesRolls } from '../../lib/collections';

const rolls = await seriesRolls();
const coverImgs = await Promise.all(
  rolls.map(async (r) => {
    const g = await getImage({
      src: r.cover.data.image,
      widths: [300, 560],
      sizes: '(min-width: 900px) 240px, 46vw',
      format: 'webp',
    });
    return { src: g.src, srcset: g.attributes.srcset ?? undefined };
  }),
);
---
<Base title="摄影作品集" description="摄影作品集">
  <SectionHeader title="摄影作品集" count={rolls.length} note="点选胶片查看时间与地点，再点一次进入卷内备忘录。" />
  {
    rolls.length > 0 ? (
      <section class="filmwrap">
        <ul class="film" data-film role="list" aria-label="摄影胶卷">
          {
            rolls.map((r, i) => (
              <li class="frame" data-frame data-slug={r.entry.slug} data-idx={i}
                  tabindex="0" role="button"
                  aria-label={`${r.entry.data.title} · ${r.entry.data.date} · ${r.entry.data.location ?? '未标注地点'} · 共 ${r.photos.length} 张，点击进入`}>
                <img src={coverImgs[i].src} srcset={coverImgs[i].srcset} alt={r.cover.data.alt} loading="lazy" decoding="async" />
                <span class="meta-top" data-meta-top>{r.entry.data.date.replaceAll('-', '.')}</span>
                <span class="meta-bottom" data-meta-bottom>{r.entry.data.location ?? ''}</span>
                <a class="enter" data-enter href={`/photos/${r.entry.slug}/`} aria-label={`进入卷：${r.entry.data.title}`} hidden>→</a>
              </li>
            ))
          }
        </ul>
        <p class="film-hint" data-film-hint>已选中第一卷，再次点击或按 Enter 进入</p>
      </section>
    ) : (
      <div class="glass empty">还没有胶卷 —— 在 src/content/series/ 放第一卷吧。</div>
    )
  }
</Base>

<script>
  // 胶片两段式交互 + 键盘 + 页脚微光
  const film = document.querySelector<HTMLElement>('[data-film]');
  if (film) {
    const frames = [...film.querySelectorAll<HTMLElement>('[data-frame]')];
    const hint = document.querySelector<HTMLElement>('[data-film-hint]');
    let sel = 0;

    const select = (i: number, scroll = false) => {
      sel = (i + frames.length) % frames.length;
      frames.forEach((f, k) => {
        const on = k === sel;
        f.classList.toggle('is-selected', on);
        const mt = f.querySelector('[data-meta-top]');
        const mb = f.querySelector('[data-meta-bottom]');
        const ent = f.querySelector<HTMLAnchorElement>('[data-enter]');
        if (mt) (mt as HTMLElement).style.opacity = on ? '1' : '0';
        if (mb) (mb as HTMLElement).style.opacity = on ? '1' : '0';
        if (ent) ent.hidden = !on;
      });
      document.body.classList.add('film-on');
      if (hint) hint.textContent = `已选中：${frames[sel].dataset.slug} —— 再次点击或按 Enter 进入备忘录`;
      if (scroll) frames[sel].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };

    frames.forEach((f) => {
      f.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-enter]')) return; // 箭头交给链接
        const i = Number(f.dataset.idx ?? 0);
        if (i === sel) {
          // 二段式：再点 = 进入
          const a = f.querySelector<HTMLAnchorElement>('[data-enter]');
          if (a) window.location.href = a.href;
          return;
        }
        select(i);
      });
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const i = Number(f.dataset.idx ?? 0);
          if (i === sel) {
            const a = f.querySelector<HTMLAnchorElement>('[data-enter]');
            if (a) window.location.href = a.href;
          } else {
            select(i);
          }
        }
      });
    });
    select(0); // 默认选中第一卷
  }
</script>

<style>
  /* 灰边胶片横轨（spec §19） */
  .filmwrap { margin-top: 4px; }
  .film {
    list-style: none;
    margin: 0;
    padding: 26px 22px 34px; /* 上/下留齿孔区 */
    display: flex;
    gap: 18px;
    overflow-x: auto;
    border: 1px solid rgba(15, 23, 42, 0.16); /* 胶片灰边 */
    border-radius: 14px;
    background:
      repeating-linear-gradient(90deg, transparent 0 14px, rgba(15,23,42,0.05) 14px 16px) 0 0 / 100% 100% no-repeat,
      rgba(15, 23, 42, 0.03);
    scroll-snap-type: x proximity;
    position: relative;
  }
  /* 齿孔 */
  .film::before,
  .film::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    height: 10px;
    background: repeating-linear-gradient(90deg, #fff 0 18px, rgba(15, 23, 42, 0.22) 18px 28px);
    border-radius: 5px;
    opacity: 0.9;
  }
  .film::before { top: 8px; }
  .film::after { bottom: 8px; }
  .frame {
    position: relative;
    flex: none;
    width: 240px;
    aspect-ratio: 3 / 2;
    border-radius: 8px;
    overflow: visible;
    border: 2px solid rgba(15, 23, 42, 0.2);
    background: #eee;
    cursor: pointer;
    scroll-snap-align: center;
    transition: border-color 0.25s ease-out, box-shadow 0.25s ease-out, transform 0.2s ease-out;
  }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .frame:hover { transform: translateY(-2px); }
  .frame.is-selected {
    border-color: color-mix(in srgb, var(--accent) 70%, #888);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent),
      0 0 26px -2px color-mix(in srgb, var(--accent) 55%, transparent); /* 选中微光 */
  }
  .meta-top,
  .meta-bottom {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    opacity: 0;
    transition: opacity 0.3s ease-out;
    pointer-events: none;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
    color: var(--text-2);
    z-index: 2;
  }
  .meta-top { top: -24px; color: var(--text-1); }
  .meta-bottom { bottom: -24px; }
  .enter {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 3;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    box-shadow: var(--glass-shadow);
    text-decoration: none;
  }
  .enter:hover { filter: brightness(1.1); text-decoration: none; }
  .enter[hidden] { display: none; }
  .film-hint { margin: 12px 0 0; font-size: 0.85rem; color: var(--text-3); }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```
> 页脚微光：全局 CSS 规则（base.css 或 Footer 组件里）追加 —— `body.film-on .foot .inner { box-shadow: var(--glass-inset), var(--glass-shadow), 0 0 44px -6px color-mix(in srgb, var(--accent) 45%, transparent); }`（放 Footer.astro `<style is:global>` 或 base.css；实现者自选其一并在本任务内完成）。时间戳/地点的显隐只在选中帧显示（spec §19.3 语义），通过 JS 控制 opacity。

- [ ] Step 5: 删除 PhotoCard + 构建 + 冒烟

Run: `git rm src/components/PhotoCard.astro`
Run: `npm run build` → 0 警告（页面数仍 16：/photos 1 + 卷页 3 + 其余）
Preview：`/photos/` 200 且含 `data-frame` ≥3；grep 确认 PhotoCard 无残留引用。
Commit：
```bash
git add src/content.config.ts src/lib src/pages/photos src/content && git commit -m "feat: 摄影胶片主页 — series 卷模型、封面帧、两段式选中与微光"
```

## Task 2: 卷备忘页（/photos/[slug] 语义替换 + 混排版式）

**Files:**
- Rewrite: `src/pages/photos/[slug].astro`

- [ ] Step 1: 整体替换为卷备忘页

```astro
---
import { getImage } from 'astro:assets';
import { render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { seriesRolls } from '../../lib/collections';
import { formatDate } from '../../lib/date';

export async function getStaticPaths() {
  const rolls = await seriesRolls();
  return rolls.map((r) => ({ params: { slug: r.entry.slug }, props: { roll: r } }));
}

interface Props {
  roll: { entry: CollectionEntry<'series'>; photos: CollectionEntry<'photos'>[]; cover: CollectionEntry<'photos'> };
}
const { roll } = Astro.props;
const { entry: s, photos } = roll;
const { Content } = await render(s);

// 每张照片的展示图（卷备忘页内最大宽度）
const imgs = await Promise.all(
  photos.map(async (p) => {
    const g = await getImage({
      src: p.data.image,
      widths: [900, 1600, 2400],
      sizes: '(min-width: 900px) min(88vw, 1200px), 100vw',
      format: 'webp',
      quality: 86,
    });
    const isPortrait = (p.data.image.height ?? 0) > (p.data.image.width ?? 0);
    return { p, src: g.src, srcset: g.attributes.srcset, isPortrait };
  }),
);
---
<Base title={s.data.title} description={s.data.summary ?? `摄影备忘录：${s.data.title}`}>
  <article class="memo">
    <p class="crumb"><a href="/photos/">← 摄影作品集</a></p>
    <header class="glass memohead">
      <h1 class="page-title">{s.data.title}</h1>
      <p class="meta">
        {formatDate(s.data.date)}
        {s.data.location && <span class="sep">·</span>}
        {s.data.location}
        <span class="sep">·</span>共 {photos.length} 张
      </p>
    </header>
    {s.body && s.body.trim() !== '' && (
      <div class="prose memobody"><Content /></div>
    )}
    <div class="photos">
      {imgs.map(({ p, src, srcset, isPortrait }) => (
        <figure class:list={['glass shot', isPortrait && 'portrait']}>
          <img src={src} srcset={srcset} alt={p.data.alt} loading="lazy" decoding="async"
               sizes="(min-width: 900px) min(88vw, 1200px), 100vw" />
          <figcaption>
            <h2 class="shot-title">{p.data.title}</h2>
            {p.body && p.body.trim() !== '' && <div class="prose shot-body"><p>{p.body}</p></div>}
          </figcaption>
        </figure>
      ))}
    </div>
  </article>
</Base>

<style>
  .memo { display: grid; gap: clamp(22px, 3vw, 30px); }
  .crumb { margin: 0; font-size: 0.88rem; }
  .crumb a { color: var(--text-2); }
  .crumb a:hover { color: var(--accent); }
  .memohead { padding: clamp(20px, 3.6vw, 34px) clamp(18px, 3.6vw, 36px); }
  .meta { margin: 6px 0 0; color: var(--text-3); font-size: 0.92rem; }
  .sep { padding: 0 6px; opacity: 0.6; }
  .memobody { margin-top: 2px; }
  .photos { display: grid; gap: clamp(26px, 5vw, 44px); }

  /* 横版：照片独占一行，正文在下方 */
  .shot {
    margin: 0;
    padding: 10px;
    border-radius: calc(var(--radius-m) + 6px);
    display: grid;
    gap: 14px;
  }
  .shot img {
    width: 100%;
    height: auto;
    max-height: 76vh;
    object-fit: contain;
    border-radius: calc(var(--radius-m) - 4px);
  }
  .shot figcaption { padding: 0 6px 4px; }
  .shot-title { margin: 0 0 8px; font-size: 1.15rem; }
  .shot-body { color: var(--text-2); }

  /* 竖版：左图右文 */
  .shot.portrait {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
  }
  .shot.portrait figcaption { padding-top: 6px; }

  @media (max-width: 879px) {
    .shot.portrait { grid-template-columns: 1fr; }
  }
</style>
```
> 说明：photo body 是纯文本 md（无 frontmatter 渲染需求），用 `<p>{p.body}</p>` 直插；若未来需富 Markdown 可换 render——本任务按纯文本处理并注释。标题下 facts（原单张页信息条）不再展示（备忘语境不需要，用户未要求保留相机参数展示——如需要可再加回）。

- [ ] Step 2: 构建 + 冒烟

`npm run build` → 0 警告；preview：`/photos/harbor-roll/` 等 3 卷页 200 且包含 memohead、shot 数正确、`/photos/harbor-sunset/`（旧照片 slug）应 404（旧路由消失属预期）；kill。

- [ ] Step 3: Commit

```bash
git add src/pages/photos && git commit -m "feat: 卷备忘录页 — 卷文+照片混排(横版整行/竖版左图右文)，替换单张照片页"
```

## Task 3: 删除站内搜索（全链路）+ 收尾

**Files:**
- Delete: `src/pages/search/`、`src/scripts/`（整目录）、`src/components/SearchBox.astro`
- Modify: `src/components/Nav.astro`（去 navsearch/drawer-search/相关 CSS 与 import）、`src/pages/404.astro`（去搜索框与 .searchrow，第二按钮改「回到摄影作品集」/photos/）、`README.md`（删搜索相关句子与 scripts/ 目录行）、`package.json`（npm uninstall fuse.js）
- Optional: base.css / Footer 无搜索引用（核对）

- [ ] Step 1: 删文件

```bash
git rm -r src/pages/search src/scripts src/components/SearchBox.astro
npm uninstall fuse.js
```
Expected: package.json dependencies 只剩 astro。

- [ ] Step 2: Nav.astro 清理

- frontmatter 删 `import SearchBox …`
- `.tools` 中删 `.navsearch` 块（保留 `.menu-btn`；`<div class="tools">` 仅剩按钮时直接删 tools 容器，menu-btn 放 links 后、margin-left:auto 于媒体查询内）
- 抽屉 `.drawer-search` 块删除
- CSS 删 `.navsearch{…}/.navsearch:focus-within{…}` 与 `.drawer-search` 相关；媒体查询 880 内 `.navsearch` 选择器移除；`.tools` 相关规则删除或调整
- 结果：桌面 = brand + links（左），无右侧物；<880 = 汉堡。布局核对 build + 冒烟。

- [ ] Step 3: 404 调整

删除 SearchBox import 与 `.searchrow` 块与样式；第二个按钮 `<a class="btn prism" href="/search/">试试搜索</a>` → `<a class="btn prism" href="/photos/">回到摄影作品集</a>`。

- [ ] Step 4: README 更新

- 「技术：… fuse.js（站内搜索）」句删除 fuse 部分；
- 「日常更新」表中摄影行提示不变；「要点」中「搜索索引构建期自动生成，加内容后重新 build 即更新。」删除；
- 目录速览中 `scripts/` 与搜索相关删除/修正；
- 摄影维护小节更新为：系列在 `src/content/series/`，照片 `series:` 字段挂靠 + cover 选封面（若 README 有旧摄影说明则按 spec §19 修正）。

- [ ] Step 5: 残留清零 + 构建 + 全路由

```bash
grep -rn 'search\|Search\|fuse' src package.json astro.config.mjs || echo none
grep -rn 'SearchBox\|search-q\|/search' src || echo none
```
（`.astro` 缓存目录与 dist 除外）。Expected: 除注释/无外全部 none（Nav 也许有“搜索…”placeholder 删除后应无）。
`npm run build` → 0 警告；preview 全路由 200（/search 应 404——注意：它不再存在，页面不列它）；404 页含「回到摄影作品集」。
Commit：
```bash
git add -A src package.json package-lock.json README.md && git commit -m "feat: 删除站内搜索(页面/脚本/组件/依赖/导航/404)，404 入口改回摄影集"
```

## Task 4: 验收

- [ ] build 0 警告；grep 无残留；路由扫（含 3 卷页）200/404 正确
- [ ] 人工清单：胶片观感（灰边/齿孔/横滑）、两段式选中与时间/地点浮现、选中微光+页脚柔光、Enter/再点进入备忘页、备忘页混排（当前全横版：每张图整行+文下；待竖版照片出现验证左图右文）、404 新按钮、导航无搜索、笔记标签筛选可用（点击 chip 卡片隐藏/恢复 + 高亮 + aria-pressed）
