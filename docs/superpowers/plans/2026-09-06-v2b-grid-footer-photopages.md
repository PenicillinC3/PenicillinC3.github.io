# v2.1 增量计划：网格背景 + 页脚吸底 + 摄影独立详情页

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。步骤 checkbox 跟踪。

**Goal:** spec §15 三改动：①全站细灰线方格背景衬托棱光；②页脚吸底（内容不满屏贴底、超长随滚动出现）；③每张摄影作品独立详情页（横图上文下图、竖图左图右文），画廊缩略图改为进详情页，移除灯箱。

**Architecture:** 纯样式层 + 布局层改动（tokens/base/body flex），加 1 个新路由页 `src/pages/photos/[slug].astro`；摄影组件收敛（PhotoCard 链接卡化），删 Lightbox 组件与脚本。方向判断用内容集合 `image()` 元数据自带的 width/height（构建期静态，无 JS）。

**设计依据：** spec §15。叠加于 v2（§14）之上。

## Global Constraints（增量）

1. 网格背景全站生效：颜色 `--grid-line: rgba(15,23,42,.05)`、单元 `--grid-size: 22px`；body 用两层 linear-gradient + background-size 平铺；除网格外仍无任何装饰光（§14.1）。
2. 页脚吸底布局：`body { display:flex; flex-direction:column; min-height:100dvh }`、`.main { flex:1 0 auto }`；含欢迎页时 `.main:has(.welcome){ display:flex; flex-direction:column; padding-block:0 }`、`.welcome{ flex:1 1 auto; min-height:0 }`（居中区精确 = 剩余空间，页脚恰好贴折叠线）。其余页面正文/留白不变。
3. 摄影详情页 `/photos/[slug]`：横图（width≥height）默认流式 = 图在上、信息+正文在下；竖图 `.portrait` = `grid-template-columns: minmax(0,1.5fr) minmax(0,1fr)` 图左文右；<880px 一律单列。方向 = `e.data.image.width/height` 构建期判定。
4. PhotoCard 收敛：props 锁 `{ title; alt; date; location?; img:{src;srcset?}; href }`，只渲染链接卡（三态分支删除）；灯箱相关（Lightbox.astro、scripts/lightbox.ts、photo-collection JSON、getImage 大图变体）全删，grep 零残留。
5. 详情页底部分页：`prev`（较旧）/`next`（较新）按 date 倒序列表取相邻，越界隐藏；链接带标题；中文文案。
6. 验收：build 零警告、残留 grep 清零、全路由含 3 个新详情页 200。

## Task 1: 网格背景 + 页脚吸底

**Files:**
- Modify: `src/styles/tokens.css`（root 尾部增 2 token）、`src/styles/base.css`（body/main/新增 :has 规则）、`src/pages/index.astro`（.welcome 几何规则替换）

- [ ] **Step 1: tokens.css 追加**

在 `:root` 的 `--canvas: #ffffff;` 后加两行：
```css
  --grid-line: rgba(15, 23, 42, 0.05); /* v2.1 方格背景线（spec §15.1） */
  --grid-size: 22px;
```

- [ ] **Step 2: base.css 修改（三处规则替换）**

`body` 规则改为（在原 body 规则基础上加 flex 与网格背景）：
```css
body {
  margin: 0;
  min-height: 100dvh;
  display: flex; /* 页脚吸底：纵向弹性布局（spec §15.2） */
  flex-direction: column;
  background-color: var(--canvas);
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
  color: var(--text-1);
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  padding-top: var(--nav-h); /* fixed 顶栏占位 */
}
```

`.main` 规则加 `flex: 1 0 auto;`（其余不变）：
```css
.main {
  flex: 1 0 auto; /* 吸底：短内容时吞掉剩余高度 */
  padding: clamp(20px, 4vw, 44px) 0 clamp(60px, 10vw, 110px);
  min-height: 62vh;
}
```

`.main` 规则之后追加欢迎页专用覆盖：
```css
/* 欢迎页：单屏居中区 = 视口剩余空间，页脚贴折叠线（spec §15.2） */
.main:has(.welcome) {
  display: flex;
  flex-direction: column;
  padding-block: 0;
}
```

- [ ] **Step 3: index.astro 的 .welcome 几何替换**

`.welcome` 规则改为（替换原 min-height/display 两行，padding 保留）：
```css
  .welcome {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    place-items: center;
    text-align: center;
    padding-block: clamp(24px, 6vh, 72px);
  }
```

- [ ] **Step 4: 构建 + 验证**

Run: `npm run build` → 退出 0 零警告。

Preview（后台）验证页脚吸底两态：
- 短页 `/`：`curl -s http://localhost:4321/ | grep -c 'foot'` 结构在；人工目检交由用户（页脚贴底、欢迎居中）——自动化仅确认无回归：`/`、`/notes/`、`/404`（经 /nope-xyz）返回 200/404 正常。
- kill preview。

- [ ] **Step 5: 提交**

```bash
git add src/styles/tokens.css src/styles/base.css src/pages/index.astro && git commit -m "feat: v2.1 — 灰线方格背景 + 页脚吸底 flex 布局"
```

---

## Task 2: 摄影作品独立详情页（替换灯箱）

**Files:**
- Create: `src/pages/photos/[slug].astro`
- Modify: `src/pages/photos/index.astro`（链接化 + 去灯箱）、`src/components/PhotoCard.astro`（收敛链接卡）
- Delete: `src/components/Lightbox.astro`、`src/scripts/lightbox.ts`

**Interfaces:**
- Consumes: `photoEntries()`（date 倒序，`CollectionEntry<'photos'>`；`.data.image` 为含 width/height 的图片引用）、`formatDate`、`render`（astro:content）、getImage；Base（title/description props）
- Produces: `/photos/[slug]`（`{ slug }` 静态路径 ×3 种子）

- [ ] **Step 1: PhotoCard.astro 收敛为链接卡**

完整替换（三态分支删除）：
```astro
---
interface Props {
  title: string;
  alt: string;
  date: string;
  location?: string;
  img: { src: string; srcset?: string };
  href: string;
}
const { title, alt, date, location, img, href } = Astro.props;
---
<a class="glass photocard prism" {href} aria-label={`查看摄影作品：${title}`}>
  <span class="frame">
    <img src={img.src} srcset={img.srcset} alt={alt} loading="lazy" decoding="async" />
    <span class="cap"><strong>{title}</strong><em>{location ?? date}</em></span>
  </span>
</a>

<style>
  .photocard {
    display: block;
    width: 100%;
    padding: 10px;
    border-radius: calc(var(--radius-m) + 6px);
    color: var(--text-1);
    transition: transform var(--t-fast) ease-out, box-shadow var(--t-fast) ease-out;
  }
  .photocard:hover {
    transform: translateY(var(--card-hover));
    box-shadow: var(--glass-shadow-lg);
    text-decoration: none;
  }
  .frame { position: relative; display: block; overflow: hidden; border-radius: var(--radius-s); }
  .frame img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; }
  .cap {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 26px 14px 10px;
    background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.55));
    color: #fff;
    font-size: 0.86rem;
    font-style: normal;
  }
  .cap em { font-style: normal; opacity: 0.82; font-size: 0.78rem; }
</style>
```
> 首页预览流用法不变（其 href 传 `/photos/`）；画廊改为传详情路径。`prism` 环让缩略图 hover 泛棱光。

- [ ] **Step 2: photos/index.astro 链接化 + 去灯箱**

替换 frontmatter 与主体：删除 Lightbox import、photo-collection JSON 脚本、lightbox.ts import、大图 big 变体与 camera 字符串（列表不再需要）；metas 仅保留缩略图 `{ src, srcset }`；PhotoCard 传 `href={`/photos/${p.slug}/`}`。

```astro
---
import { getImage } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import PhotoCard from '../../components/PhotoCard.astro';
import { photoEntries } from '../../lib/collections';

const entries = await photoEntries();

const metas = await Promise.all(
  entries.map(async (p) => {
    const grid = await getImage({
      src: p.data.image,
      widths: [420, 800, 1200],
      sizes: '(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw',
      format: 'webp',
    });
    return { src: grid.src, srcset: grid.attributes.srcset ?? undefined };
  }),
);
---
<Base title="摄影作品集" description="摄影作品集">
  <SectionHeader title="摄影作品集" count={entries.length} note="点击照片进入单张详情。" />
  {
    entries.length > 0 ? (
      <div class="pgrid">
        {entries.map((p, i) => (
          <PhotoCard
            title={p.data.title}
            alt={p.data.alt}
            date={p.data.date}
            location={p.data.location}
            img={metas[i]}
            href={`/photos/${p.slug}/`}
          />
        ))}
      </div>
    ) : (
      <div class="glass empty">相册还空着 —— 把第一张照片放进 src/content/photos/ 吧。</div>
    )
  }
</Base>

<style>
  .pgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```
> 若 grep 显示原页面还有对 `camera`/`big` 的引用，一并清除（以本块为最终内容）。

- [ ] **Step 3: 新建 photos/[slug].astro**

```astro
---
import { getImage } from 'astro:assets';
import { render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { photoEntries } from '../../lib/collections';
import { formatDate } from '../../lib/date';

export async function getStaticPaths() {
  const photos = await photoEntries();
  return photos.map((e) => ({ params: { slug: e.slug }, props: { e, photos } }));
}

interface Props {
  e: CollectionEntry<'photos'>;
  photos: CollectionEntry<'photos'>[];
}
const { e, photos } = Astro.props;
const { Content } = await render(e);

const idx = photos.findIndex((p) => p.id === e.id);
const older = idx >= 0 ? photos[idx + 1] : undefined; // date 倒序：后一位 = 较旧
const newer = idx > 0 ? photos[idx - 1] : undefined;

const img = await getImage({
  src: e.data.image,
  widths: [900, 1600, 2400],
  sizes: '(min-width: 900px) min(88vw, 1280px), 100vw',
  format: 'webp',
  quality: 86,
});

// 方向：构建期按图片元数据判定（spec §15.3）——横图图上文下、竖图图左文右
const w = e.data.image.width ?? 0;
const h = e.data.image.height ?? 0;
const isPortrait = h > w;

const c = e.data.camera;
const cameraLine = [c?.body, c?.lens, c?.f, c?.ss, c?.iso].filter(Boolean).join(' · ');
const facts = [
  formatDate(e.data.date),
  e.data.location ? `地点 · ${e.data.location}` : null,
  e.data.album ? `相册 · ${e.data.album}` : null,
  cameraLine ? `相机 · ${cameraLine}` : null,
].filter((x): x is string => !!x);
---
<Base title={e.data.title} description={e.data.summary ?? `摄影作品：${e.data.title}`}>
  <article class="detail">
    <p class="crumb"><a href="/photos/">← 摄影作品集</a></p>

    <div class:list={['pane', isPortrait && 'portrait']}>
      <figure class="glass imgshell">
        <img
          src={img.src}
          srcset={img.attributes.srcset}
          sizes="(min-width: 900px) min(88vw, 1280px), 100vw"
          alt={e.data.alt}
          decoding="async"
        />
      </figure>

      <div class="txt">
        <h1 class="page-title">{e.data.title}</h1>
        {facts.length > 0 && (
          <ul class="facts">
            {facts.map((f) => <li>{f}</li>)}
          </ul>
        )}
        {e.body && e.body.trim() !== '' && (
          <div class="prose"><Content /></div>
        )}
      </div>
    </div>

    <nav class="pager" aria-label="照片前后篇">
      {
        newer && (
          <a class="pager-link" href={`/photos/${newer.slug}/`}>
            <span class="dir">较新一篇</span>
            <span class="t">{newer.data.title}</span>
          </a>
        )
      }
      {
        older && (
          <a class="pager-link next" href={`/photos/${older.slug}/`}>
            <span class="dir">较旧一篇</span>
            <span class="t">{older.data.title}</span>
          </a>
        )
      }
    </nav>
  </article>
</Base>

<style>
  .detail { display: grid; gap: 20px; }
  .crumb { margin: 0; font-size: 0.88rem; }
  .crumb a { color: var(--text-2); }
  .crumb a:hover { color: var(--accent); }

  .pane { display: grid; gap: clamp(20px, 3vw, 32px); }
  .portrait {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
  }
  .imgshell {
    padding: 10px;
    border-radius: calc(var(--radius-m) + 6px);
    display: flex;
    justify-content: center;
    background: var(--glass-bg);
  }
  .imgshell img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 76vh;
    object-fit: contain;
    border-radius: calc(var(--radius-m) - 4px);
  }
  .txt { min-width: 0; }
  .facts { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 6px; }
  .facts li {
    color: var(--text-2);
    font-size: 0.9rem;
    padding: 7px 14px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-s);
    background: color-mix(in srgb, var(--text-1) 3%, transparent);
    width: fit-content;
  }
  .prose { margin-top: 6px; }

  .pager {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .pager-link {
    display: grid;
    gap: 2px;
    padding: 12px 18px;
    min-width: min(100%, 260px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-m);
    background: var(--glass-bg);
    box-shadow: var(--glass-shadow);
    transition: transform var(--t-fast) ease-out, box-shadow var(--t-fast) ease-out;
  }
  .pager-link:hover {
    transform: translateY(var(--card-hover));
    box-shadow: var(--glass-shadow-lg);
    text-decoration: none;
  }
  .pager-link.next { margin-left: auto; text-align: right; }
  .dir { font-size: 0.78rem; color: var(--text-3); }
  .t { color: var(--text-1); font-weight: 600; }

  @media (max-width: 879px) {
    .portrait { grid-template-columns: 1fr; }
  }
</style>
```
> 说明：`.imgshell` 用 `--glass-bg`（列表缩略图是 3:2 裁切卡，详情页展示完整画面，object-fit 保护比例）。

- [ ] **Step 4: 删除灯箱两文件 + 残留清零**

Run:
```bash
git rm src/components/Lightbox.astro src/scripts/lightbox.ts
```
全库 grep（须全部 none）：
```bash
grep -rn 'Lightbox\|lightbox\|photo-collection\|data-photo\|data-lb' src || echo none
grep -rn 'photocard' src/pages/index.astro src/pages/photos/index.astro | head   # 仅剩新用法
```

- [ ] **Step 5: 构建 + 冒烟**

Run: `npm run build` → 退出 0 零警告（页面数应为 16：13 + 3 照片详情）。

Preview（后台）：
- `/photos/` 200 且 `curl -s http://localhost:4321/photos/ | grep -c 'photos/harbor-sunset'` ≥1（链接化）
- `/photos/harbor-sunset/` → 200；`grep -o '地点 · '` 在正文 ≥0；`grep -c '较旧一篇\|较新一篇'` 报告实际值（中间页应为 2）
- `/photos/neon-street/`（竖版占位暂无，3 张种子均横版 1600×1067 → portrait 分支人工目检留待用户替换竖图时验证；代码路径由评审把关）
- kill preview

- [ ] **Step 6: 提交**

```bash
git add src/pages/photos src/components/PhotoCard.astro && git commit -m "feat: 摄影作品独立详情页(横竖自适应版式+前后篇导航)，画廊改链接，移除灯箱"
```

---

## Task 3: 验收

- [ ] **Step 1**: `npm run build` 0 警告；残留 grep（上任务命令）none。
- [ ] **Step 2**: 全路由状态码扫（含 3 个新详情页）+ 404 正确。
- [ ] **Step 3**: 人工清单（交付用户）：
  1. 网格背景全站可见、玻璃边缘棱光在网格衬托下清晰；无其他杂光
  2. 短内容页（欢迎页/404）页脚贴视口底；长列表页（/notes 大量文章时）页脚在滚动末尾出现
  3. 欢迎页仍单屏居中（flex 新布局下视觉无位移）
  4. /photos 缩略图点击进入详情；详情页横图「图上文下」；未来竖版照片（用户替换竖图或新增竖图种子）出现「图左文右」两栏；<880px 单列
  5. 前后篇导航正确（边界页只显一侧）；详情正文可图文混排（种子照片可补一段文字验证）
  6. 顶栏滑块/棱光/搜索/灯箱移除后无残留引用报错
