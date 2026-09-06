# v2e 计划：摄影集暗房化（全屏无边界 + dark 机制）

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。checkbox 跟踪。

**Goal:** spec §21。①Base 支持 `dark`/`immersive` 页面与 `body.page-dark` token 覆写；②/photos 改无边框全屏暗房（一卷一屏、两侧底片切换、中央点击进入、白字红光时间/地点）；③卷备忘页 dark 化（红光点缀）；④列表大卡已由控制器完成（§21.4 不回退）。

## Global Constraints（增量）

1. dark 覆写集中于 base.css `body.page-dark{...}` 单块 + 组件级覆写（.topbar/.drawer）；photos 两页各用自己的 style 只做本页点缀，不复制 token 表。
2. immersive 页：隐藏 .foot；main padding 0；stage 高度 `calc(100dvh - var(--nav-h))`。
3. 侧条缩略 = 相邻卷封面（getImage 小图）；单卷时不渲染侧条。中央点击区 = 排除左右侧条宽后的整面。键盘左右切换 + 中央 Enter 进入（stage 可聚焦）。
4. 红光点缀统一色 `#ff6b6b`（= dark 的 --accent）；时间戳/地点文字 `#fff` + `text-shadow: 0 0 6px/18px rgba(255,77,77,.9/.55)`。
5. 切换动画仅 opacity 0.35s；`prefers-reduced-motion` 由全局兜底。
6. 卷备忘页沿用 v2d 内容结构（seriesRolls/mixed layout 不动），只加 dark 与红光点缀与 dark 相框适配。
7. 验收：build 0 警告、/photos 与 3 卷页 200、无 film 时代残留类名（.film/.frame/data-frame 从 photos/index 消失——seriesRolls 保留）、人工清单。

## Task 1: dark/immersive 机制 + 全屏暗房主页

**Files:**
- Modify: `src/layouts/Base.astro`（props dark/immersive → body class）、`src/styles/base.css`（page-dark 覆写块 + page-immersive 规则）
- Rewrite: `src/pages/photos/index.astro`（胶片主页 → 全屏暗房）

- [ ] Step 1: Base.astro

frontmatter Props 增 `dark?: boolean; immersive?: boolean;`，解构默认 false；`<body class:list={['base-body', dark && 'page-dark', immersive && 'page-immersive']}>`。其余不动。

- [ ] Step 2: base.css 追加（文件尾部）

```css
/* —— 暗房页（spec §21.1）：photos 模块页面 dark —— */
body.page-dark {
  --canvas: #0b0c10;
  --grid-line: rgba(255, 255, 255, 0.035);
  --text-1: #eceef4;
  --text-2: #b4bacb;
  --text-3: #7e8598;
  --accent: #ff6b6b;
  --link-underline: rgba(255, 107, 107, 0.4);
  --glass-bg: rgba(12, 13, 18, 0.4);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-inset:
    inset 3px 3px 7px -2px rgba(0, 0, 0, 0.5),
    inset -3px -3px 7px -2px rgba(255, 255, 255, 0.1);
}
body.page-dark .topbar {
  background: rgba(9, 10, 14, 0.55);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
body.page-dark .drawer { background: #0d0e13; }

/* —— 沉浸页（spec §21.2）：无边框全屏，隐藏页脚 —— */
body.page-immersive .foot { display: none; }
body.page-immersive .main { padding: 0; }
```
> .slider/.navlink 文字经 var 自动适配；nav 玻璃滑块白底在暗色下由 --glass-bg 覆写为准（滑块 CSS 用的是白 rgba 硬值——检查 Nav.astro：若 .slider 背景为硬编码白，追加 `body.page-dark .slider { background: radial-gradient(130% 70% at 50% 0%, rgba(255,255,255,.14), transparent 55%), rgba(255,255,255,.05); border-color: rgba(255,255,255,.14); }`）。

- [ ] Step 3: photos/index.astro 全屏暗房（整体替换）

```astro
---
import { getImage } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import { seriesRolls } from '../../lib/collections';

const rolls = await seriesRolls();
const covers = await Promise.all(
  rolls.map(async (r) => {
    const big = await getImage({ src: r.cover.data.image, widths: [1200, 2000], sizes: '100vw', format: 'webp', quality: 88 });
    const small = await getImage({ src: r.cover.data.image, widths: [160, 320], sizes: '140px', format: 'webp' });
    return {
      slug: r.entry.slug,
      title: r.entry.data.title,
      date: r.entry.data.date.replaceAll('-', '.'),
      location: r.entry.data.location ?? '',
      count: r.photos.length,
      big: { src: big.src, srcset: big.attributes.srcset },
      small: small.src,
    };
  }),
);
const json = JSON.stringify(covers).replace(/</g, '\\u003c');
---
<Base title="摄影作品集" description="暗房 · 摄影作品集" dark immersive>
  <section class="stage" data-stage tabindex="0" aria-label="摄影作品暗房浏览">
    <img class="bg" data-bg alt="" draggable="false" />
    <div class="vignette" aria-hidden="true"></div>
    <div class="redlamp" aria-hidden="true"></div>

    <p class="meta" data-meta>
      <span class="ts" data-ts></span>
      <span class="loc" data-loc></span>
    </p>
    <p class="count" data-count></p>
    <p class="hint">点击画面进入备忘录 · 左右两侧底片切换 · ←/→ 键</p>

    <button class="strip prev prism" data-prev aria-label="上一卷" hidden><img data-prev-img alt="" loading="lazy" /></button>
    <button class="strip next prism" data-next aria-label="下一卷" hidden><img data-next-img alt="" loading="lazy" /></button>
  </section>
</Base>

<script is:inline type="application/json" id="roll-data">{json}</script>
<script>
  const covers = JSON.parse(document.getElementById('roll-data')!.textContent ?? '[]') as {
    slug: string; title: string; date: string; location: string; count: number;
    big: { src: string; srcset?: string }; small: string;
  }[];
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (stage && covers.length > 0) {
    const bg = stage.querySelector<HTMLImageElement>('[data-bg]')!;
    const ts = stage.querySelector<HTMLElement>('[data-ts]')!;
    const loc = stage.querySelector<HTMLElement>('[data-loc]')!;
    const cnt = stage.querySelector<HTMLElement>('[data-count]')!;
    const prevBtn = stage.querySelector<HTMLButtonElement>('[data-prev]')!;
    const nextBtn = stage.querySelector<HTMLButtonElement>('[data-next]')!;
    const prevImg = stage.querySelector<HTMLImageElement>('[data-prev-img]')!;
    const nextImg = stage.querySelector<HTMLImageElement>('[data-next-img]')!;
    let i = 0;

    const render = () => {
      const c = covers[i];
      bg.alt = c.title;
      bg.style.opacity = '0';
      // 预加载完成后淡入
      const img = new Image();
      img.onload = () => { bg.src = img.src; bg.style.opacity = '1'; };
      img.src = c.big.src;
      ts.textContent = c.date;
      loc.textContent = c.location || '未标注地点';
      loc.style.opacity = c.location ? '1' : '0.35';
      cnt.textContent = `${c.count} 张`;
      const p = covers[i - 1];
      const n = covers[i + 1];
      prevBtn.hidden = !p;
      nextBtn.hidden = !n;
      if (p) prevImg.src = p.small;
      if (n) nextImg.src = n.small;
    };

    const go = (d: number) => { i = (i + d + covers.length) % covers.length; render(); };
    const enter = () => { window.location.href = `/photos/${covers[i].slug}/`; };

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
    stage.addEventListener('click', enter);
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Enter') enter();
    });
    render();
  }
</script>

<style>
  .stage {
    position: relative;
    height: calc(100dvh - var(--nav-h));
    overflow: hidden;
    outline: none;
    background: #05060a;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.35s ease-out;
  }
  .vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
  }
  .redlamp {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(90% 60% at 80% 100%, rgba(255, 70, 70, 0.16), transparent 60%);
  }
  .meta {
    position: absolute;
    left: clamp(18px, 4vw, 44px);
    bottom: clamp(20px, 5vh, 52px);
    margin: 0;
    display: grid;
    gap: 6px;
    z-index: 2;
  }
  .ts {
    color: #fff;
    font-size: clamp(1.2rem, 3vw, 2rem);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-shadow: 0 0 6px rgba(255, 77, 77, 0.9), 0 0 18px rgba(255, 77, 77, 0.55);
  }
  .loc {
    color: #fff;
    font-size: clamp(0.9rem, 1.8vw, 1.15rem);
    letter-spacing: 0.22em;
    text-shadow: 0 0 6px rgba(255, 77, 77, 0.75), 0 0 14px rgba(255, 77, 77, 0.4);
  }
  .count {
    position: absolute;
    right: clamp(18px, 4vw, 44px);
    bottom: clamp(20px, 5vh, 52px);
    margin: 0;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.85rem;
    letter-spacing: 0.3em;
    z-index: 2;
  }
  .hint {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    margin: 0;
    color: rgba(255, 255, 255, 0.32);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    white-space: nowrap;
    z-index: 2;
  }
  /* 两侧底片条：半伸出、hover 展开 */
  .strip {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 148px;
    aspect-ratio: 3 / 2;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 6px;
    padding: 0;
    overflow: hidden;
    background: #111;
    cursor: pointer;
    z-index: 3;
    opacity: 0.85;
    transition: transform 0.3s var(--ease-spring), opacity 0.3s ease-out;
  }
  .strip img { width: 100%; height: 100%; object-fit: cover; }
  .strip.prev { left: 0; transform: translate(-78%, -50%); }
  .strip.next { right: 0; transform: translate(78%, -50%); }
  .strip.prev:hover, .strip.next:hover { transform: translate(0, -50%); opacity: 1; }
  .strip[hidden] { display: none; }
  @media (max-width: 760px) {
    .strip { width: 96px; transform: translate(-64%, -50%); }
    .strip.next { transform: translate(64%, -50%); }
    .strip.prev:hover { transform: translate(0, -50%); }
    .strip.next:hover { transform: translate(0, -50%); }
    .hint { display: none; }
  }
</style>
```
> 说明：中央整面点击 = 进入（两侧条按钮 stopPropagation 后各自切换）；stage tabindex 支持 ←/→/Enter；侧条 hover 弹出；图片切换先淡出再 onload 淡入（避免闪烁）。immersive 隐藏页脚 & main padding 0 → stage 顶到 topbar 下缘、底到视口底。

- [ ] Step 4: 构建 + 冒烟

`npm run build` → 0 警告（15 页）。
Preview 4322：`/photos/` 200；HTML 含 data-stage、roll-data JSON 3 条、data-prev/next；无残留 `.film`/`data-frame`/`film-on` 字样（grep dist/photos/index.html）；`/photos/harbor-roll/` 200。kill。
Commit：
```bash
git add src/layouts/Base.astro src/styles/base.css src/pages/photos/index.astro && git commit -m "feat: 摄影主页暗房化 — 无边框全屏、两侧底片切换、白字红光时间地点、中央进入卷"
```

## Task 2: 卷备忘页 dark + 红光点缀

**Files:**
- Modify: `src/pages/photos/[slug].astro`（Base 加 dark；样式加红光发丝线与暗房相框微调）

- [ ] Step 1: 页面改动

- `<Base title=... description=...>` → 加 `dark`
- `<style>` 追加：
```css
  /* 暗房点缀：页头红光发丝线 */
  .memohead { border-bottom: 1px solid rgba(255, 107, 107, 0.45); box-shadow: var(--glass-inset), var(--glass-shadow), 0 10px 40px -18px rgba(255, 77, 77, 0.5); }
  .memohead .page-title { color: #fff; text-shadow: 0 0 24px rgba(255, 77, 77, 0.35); }
  .meta { color: var(--text-3); }
```
（memohead 已是 glass：加底部红光边 + 标题白光晕。照片 .shot 玻璃相框经 page-dark token 自动深色。）

- [ ] Step 2: 构建 + 冒烟 + Commit

build 0 警告；preview：3 卷页 200 且 HTML class 含 page-dark；grep `.memohead` 样式在产物中。Commit：
```bash
git add src/pages/photos && git commit -m "feat: 卷备忘页暗房化 — dark 主题 + 红光发丝线点缀"
```

## Task 3: 验收

- [ ] build 0 警告；grep 无 .film/data-frame/film-on 残留（photos/index）；路由扫（含 /photos、3 卷页）200
- [ ] 人工清单：主页全屏覆盖、中央点击进入、两侧底片 hover 弹出点击切换、←/→ 键、时间/地点白字红光、红光底灯与 vignette 观感、进入卷备忘页为黑底+红光线、顶栏/页脚在暗色下的观感、从备忘页返回 /photos 仍暗房、移动端侧条形态
