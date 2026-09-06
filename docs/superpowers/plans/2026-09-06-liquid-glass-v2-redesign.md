# 液态玻璃 v2 改版实现计划（白底单主题 + 棱光 + 导航重构 + 独立欢迎页）

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 checkbox 跟踪。

**Goal:** 按 spec §14（已批准）把站点视觉从「暗光斑+悬浮胶囊+双主题」改为「纯白单主题 + 更透玻璃 + 交互棱光色散 + 固定整条顶栏水滴滑块 + 单屏欢迎页」，并全局同步到所有栏目页。

**Architecture:** 保留 Astro 5 全部内容/页面/组件结构，只做视觉系统层与外壳层重构：token 层（tokens.css）→ 基元层（base.css：新玻璃配方/棱光 .prism/按钮）→ 外壳层（Base/Nav/SearchBox/Footer，启用 Astro View Transitions 使栏目切换可见水滴动效）→ 页面层（欢迎页单屏）→ 组件清扫。不引入新依赖。

**Tech Stack:** 不变（Astro 5 + 纯 CSS）。新增用法：`astro:transitions` 的 `<ViewTransitions />`、CSS `@property` 注册角变量做棱光环旋转、弹性缓动 `cubic-bezier(.34,1.56,.64,1)`。

**设计依据：** `docs/superpowers/specs/2026-09-06-blog-homepage-design.md` §14（冲突处 §14 优先）。参考实现（仅技法，MIT）：LGGC-liquid-glass 玻璃配方。

## Global Constraints（v2 专用，叠加在 v1 全局约束之上）

1. **单主题亮色**：删除 `[data-theme='dark']` 全部 token、ThemeToggle 组件、Base 防闪脚本、BlobField。任何文件不得再引用 `data-theme`、`ThemeToggle`、`BlobField`、`blob-`、`localStorage('theme')`。
2. **底色纯白**：body/画布 `#fff`；全站不得再出现背景光斑/杂光装饰层；卡片面板不设内打光（允许导航条/滑块/水滴的小高光斑）。
3. **玻璃配方 v2**（值锁死，写进 tokens）：`--glass-bg: rgba(255,255,255,.62)`、`--glass-bg-strong: rgba(255,255,255,.85)`、`--glass-border: rgba(15,23,42,.07)`、`--glass-blur: 6px`、`--glass-sat: 1.5`、`--glass-shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 28px rgba(16,24,40,.06)`、`--glass-shadow-lg: 0 2px 6px rgba(16,24,40,.06), 0 18px 44px rgba(16,24,40,.10)`。
4. **圆角 v2**：`--radius-s: 9px`（控件）、`--radius-m: 14px`（卡片/面板）、`--radius-lg: 20px`（顶栏滑块等）、`--radius-pill: 999px`；`--glass-radius` 保留为 `--radius-m` 的别名（旧组件引用不破）。
5. **棱光 .prism**（spec §14.3）：`@property --prism-angle` 注册；`::after` 1px 渐变描边（`mask-composite: exclude` 见代码）；常态 opacity 0，`:hover/:focus-visible/[data-on]` 显示；`prefers-reduced-motion: no-preference` 时才旋转 `--prism-dur: 6s`。
6. **导航 v2**：整条 fixed 顶栏高 `--nav-h: 56px`；左对齐 站名+5 栏目；右侧紧凑搜索（focus 180→260px）；栏目激活由水滴滑块指示（弹簧缓动）；移动端 <880px 收抽屉、滑块静态高亮。
7. **栏目切换动效**：Base 启用 `<ViewTransitions />`；滑块在 `astro:page-load` 时重新量测并以「水滴着陆」动效呈现（弹性缓动 + 高光斑脉冲）；`prefers-reduced-motion` 用户跳过。
8. **欢迎页单屏**：首页 = 垂直居中华文中宋大字站名 + 副标 + heroNote 小字 + 双玻璃入口；不再渲染任何预览流。
9. 字体：中文正文/界面仍 `--font-sans`；欢迎页站名等展示用 `--font-song: "华文中宋","STZhongsong","Songti SC","SimSun",serif`。零字体下载。
10. 测试策略：同 v1（build 零警告 + preview 全路由状态码 + 残留 grep 清零 + 人工浏览器清单）。
11. 每次 commit 必须全量构建通过后再提交；所有删除动作（文件/类/引用）需 grep 确认无引用残留。

## 文件结构（本次改动面）

```
src/styles/tokens.css        重写：单主题 v2 token 表 + 别名兼容
src/styles/base.css          重写要点：body 白底、.glass v2、.prism、.btn v2、降级 v2、保留 prose/排版
src/layouts/Base.astro       改：去防闪脚本，加 <ViewTransitions/>，去 BlobField
src/components/Nav.astro     重写：固定整条 + 水滴滑块 + 量测脚本(astro:page-load/resize)
src/components/SearchBox.astro 改：props {id?, compact?} 支持导航紧凑形态
src/components/Footer.astro  改：去玻璃胶囊，白底发丝线极简
src/components/BlobField.astro  删除
src/components/ThemeToggle.astro 删除
src/components/Hero.astro    删除（被欢迎页取代）
src/pages/index.astro        重写：单屏欢迎页
src/site.config.ts           增：heroNote 字段
src/components/GlassCard.astro  改：hover -2px + prism 环
src/components/PhotoCard.astro  改：hover 棱光（可选小调）
其余组件原则上零改动（跟随 token）
```

---

## Task 1: 样式系统 v2（tokens.css + base.css）

**Files:**
- Rewrite: `src/styles/tokens.css`、`src/styles/base.css`

**Interfaces:**
- Produces（后续任务锁死引用）：token 表见 Global Constraints 3/4 + 下列新增：`--prism-a/b/c/d`、`--prism-dur: 6s`、`--font-song`、`--ease-spring`、`--t-fast: .15s`、`--t-med: .25s`、`--card-hover: -2px`、`--nav-h: 56px`（沿用名）；保留旧名 `--glass-radius/--glass-hl/--glass-border`（border 值改），`--accent: #2f62e6`、`--link-underline` 同比例。
- 类契约：`.glass`（新配方）、`.prism`（+`[data-on]`）、`.btn/.btn--primary`（新配方含 prism）、`.pill/.wrap/.main/.prose/.page-title/:focus-visible/::selection`、降级 `@supports not backdrop-filter`（白底 .97 实心）、`prefers-reduced-motion` 全停（保留并覆盖 prism 旋转）。

- [ ] **Step 1: 重写 tokens.css**

完整文件（替换全部内容）：
```css
/* 设计 token v2 —— 纯白单主题（spec §14）。无暗色分支。
   旧组件引用的历史名（--glass-radius/--glass-hl/--glass-border 等）以别名/新值保留。 */
:root {
  color-scheme: light;

  --canvas: #ffffff;

  --text-1: #17191f;
  --text-2: #565d6e;
  --text-3: #8b91a3;
  --accent: #2f62e6;
  --link-underline: rgba(47, 98, 230, 0.35);

  /* 玻璃 v2（白底版，LGGC 配方校准，spec §14.2） */
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-bg-strong: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(15, 23, 42, 0.07);
  --glass-hl: rgba(255, 255, 255, 0.8); /* 历史名保留：仅导航/滑块小高光使用 */
  --glass-blur: 6px;
  --glass-sat: 1.5;
  --glass-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.06);
  --glass-shadow-lg: 0 2px 6px rgba(16, 24, 40, 0.06), 0 18px 44px rgba(16, 24, 40, 0.1);

  /* 圆角 v2：收敛 */
  --radius-s: 9px;    /* 控件/输入 */
  --radius-m: 14px;   /* 卡片/面板 */
  --radius-lg: 20px;  /* 顶栏滑块/大玻璃 */
  --radius-pill: 999px;
  --glass-radius: var(--radius-m); /* 历史名别名（旧组件引用不破） */

  /* 棱光色散（spec §14.3）：低饱和环，仅在交互态浮现 */
  --prism-a: rgba(122, 168, 255, 0.55);
  --prism-b: rgba(178, 140, 255, 0.45);
  --prism-c: rgba(255, 158, 190, 0.4);
  --prism-d: rgba(120, 224, 190, 0.45);
  --prism-dur: 6s;

  /* 字体 */
  --font-sans: -apple-system, "SF Pro Text", "PingFang SC", "HarmonyOS Sans SC",
    "Microsoft YaHei", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Consolas, "Cascadia Mono", monospace;
  --font-song: "华文中宋", "STZhongsong", "Songti SC", "SimSun", serif; /* 展示用 */

  /* 动效 */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --t-fast: 0.15s;
  --t-med: 0.25s;
  --card-hover: -2px;

  --nav-h: 56px;
  --maxw: 1160px;
  --gutter: clamp(18px, 4vw, 28px);
}
```
> 兼容性说明：删除 `--canvas-2/--link-underline 覆盖/…` 仅剩以上；凡旧组件引用了已删名（构建期 CSS 无引用报错，只有视觉失效，需靠 P4 grep 兜底清单核对）——本文件完成后 grep 全部 `var(--` 使用并核对下表存在：canvas,text-1..3,accent,link-underline,glass-bg,glass-bg-strong,glass-border,glass-hl,glass-blur,glass-sat,glass-shadow,glass-shadow-lg,radius-s,m,lg,pill,glass-radius,font-sans,font-mono,font-song,ease-spring,t-fast,t-med,card-hover,nav-h,maxw,gutter。

- [ ] **Step 2: 重写 base.css**

完整文件（替换全部内容）：
```css
/* 全局基础 + 玻璃 v2 + 棱光 + 按钮 + 排版（spec §14） */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--canvas);
  color: var(--text-1);
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4 {
  line-height: 1.3;
  font-weight: 700;
  color: var(--text-1);
  margin: 0 0 0.5em;
}
p { margin: 0 0 1em; }

a {
  color: var(--accent);
  text-decoration: none;
  border-radius: 4px;
}
a:hover { text-decoration: underline; text-decoration-color: var(--link-underline); }
a:not(:hover) { text-decoration: none; }

img { max-width: 100%; height: auto; display: block; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

::selection {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}

.wrap {
  max-width: var(--maxw);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.main {
  padding: clamp(20px, 4vw, 44px) 0 clamp(60px, 10vw, 110px);
  min-height: 62vh;
}

/* —— 玻璃 v2（LGGC 配方白底化：极淡填充 + 发丝描边 + 灰阶轻投影） —— */
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  box-shadow: var(--glass-shadow);
}

/* 降级：无 backdrop-filter → 近实心白面板（spec §14 同款） */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: rgba(255, 255, 255, 0.97); }
}

/* —— 棱光色散环（spec §14.3）：1px 低饱和渐变描边，交互态浮现 —— */
@property --prism-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
.prism {
  position: relative;
  isolation: isolate;
}
.prism::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from var(--prism-angle),
    transparent 0deg,
    var(--prism-a) 50deg,
    var(--prism-b) 110deg,
    transparent 180deg,
    var(--prism-c) 240deg,
    var(--prism-d) 300deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.prism:hover::after,
.prism:focus-visible::after,
.prism[data-on]::after {
  opacity: 1;
}
@media (prefers-reduced-motion: no-preference) {
  .prism:hover::after,
  .prism:focus-visible::after {
    animation: prism-spin var(--prism-dur) linear infinite;
  }
}
@keyframes prism-spin {
  to { --prism-angle: 360deg; }
}

/* —— 按钮 v2：直角玻璃 + 交互棱光 —— */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.62em 1.4em;
  border-radius: var(--radius-m);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  color: var(--text-1);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  box-shadow: var(--glass-shadow);
  transition: transform var(--t-fast) ease-out, box-shadow var(--t-fast) ease-out,
    color var(--t-fast) ease-out;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--glass-shadow-lg);
  text-decoration: none;
}
.btn--primary {
  background: var(--accent);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 28%, transparent);
}
.btn--primary:hover { filter: brightness(1.05); }

/* —— 胶囊（标签等小件保留胶囊形） —— */
.pill {
  display: inline-block;
  padding: 0.12em 0.7em;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.7;
  color: var(--text-2);
  background: color-mix(in srgb, var(--text-1) 6%, transparent);
  border: 1px solid var(--glass-border);
  white-space: nowrap;
}

/* —— 页面标题 —— */
.page-title {
  font-size: clamp(1.7rem, 4.2vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0 0 0.2em;
  color: var(--text-1);
}

/* —— 文章阅读排版（与 v1 一致；代码块维持深色中性面板） —— */
.prose { max-width: 68ch; margin-inline: auto; }
.prose h2 { font-size: 1.5rem; margin-top: 2em; }
.prose h3 { font-size: 1.2rem; margin-top: 1.6em; }
.prose pre {
  margin: 1.3em 0;
  padding: 1em 1.2em;
  overflow-x: auto;
  border-radius: var(--radius-s);
  background: rgba(15, 17, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--glass-shadow);
  color: #e8eaf2;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.65;
}
.prose :not(pre) > code {
  padding: 0.14em 0.45em;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-1) 7%, transparent);
  border: 1px solid var(--glass-border);
  font-family: var(--font-mono);
  font-size: 0.86em;
}
.prose blockquote {
  margin: 1.4em 0;
  padding: 0.2em 0 0.2em 1.2em;
  border-left: 3px solid var(--accent);
  color: var(--text-2);
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--accent) 6%, transparent), transparent);
}
.prose ul, .prose ol { padding-left: 1.4em; }
.prose a {
  text-decoration: underline;
  text-decoration-color: var(--link-underline);
  text-underline-offset: 3px;
}
.prose a:hover { text-decoration-thickness: 2px; }
.prose img { border-radius: var(--radius-s); box-shadow: var(--glass-shadow); margin: 1.4em 0; }
.prose hr {
  border: 0; height: 1px; margin: 2.4em 0;
  background: linear-gradient(90deg, transparent, var(--text-3), transparent);
}
.prose table { border-collapse: collapse; width: 100%; margin: 1.4em 0; font-size: 0.92rem; }
.prose th, .prose td {
  border: 1px solid color-mix(in srgb, var(--text-3) 40%, transparent);
  padding: 0.5em 0.8em; text-align: left;
}
.prose th { background: color-mix(in srgb, var(--text-1) 5%, transparent); }

/* —— 减少动效（覆盖棱光旋转与水滴动效） —— */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: 残留核对 + 构建**

Run: `npm run build`
Expected: 退出码 0、零警告。

Run: 全库 var(-- 引用核对（Git Bash）：
```bash
grep -rhoE 'var\(--[a-z0-9-]+' src --include=*.astro --include=*.css --include=*.ts | sed 's/var(//' | sort -u > /tmp/v2-used.txt
comm -23 /tmp/v2-used.txt <(grep -oE -- '--[a-z0-9-]+:' src/styles/tokens.css | sed 's/://' | sort -u)
```
Expected: 输出为空（无引用未定义 token）。若列出旧 token（如 --blob-*）→ 属「待 P4 清除」清单，记录到本任务报告（不阻塞构建）；凡构建已用的未知名必须在此修复。

- [ ] **Step 4: 提交**

```bash
git add src/styles && git commit -m "feat: 样式 v2 — 纯白单主题、LGGC 配方玻璃、交互棱光 .prism、圆角收敛"
```

## Task 2: 外壳重构（Base + Nav v2 + SearchBox 变体 + Footer 简化 + 删除暗色组件）

**Files:**
- Modify: `src/layouts/Base.astro`、`src/components/Nav.astro`（重写）、`src/components/SearchBox.astro`、`src/components/Footer.astro`、`src/styles/base.css`（body 加 `padding-top: var(--nav-h)` 一行）
- Delete: `src/components/BlobField.astro`、`src/components/ThemeToggle.astro`

**Interfaces:**
- Consumes: Task 1 的 token 与 `.prism`；既有 `site.config.ts`（title/nav 5 项）
- Produces（锁死）：
  - `Base.astro`：`<ViewTransitions />`（astro:transitions）置于 head；移除防闪脚本与 BlobField；props 不变
  - `Nav.astro`：fixed 顶栏；`[data-nav-item]`×5 + `.is-active`；`[data-slider]` 指示片；`[data-menu-btn]/[data-menu]` 抽屉（<880px）；内置紧凑 `SearchBox id="nav-q"`；脚本：量测定位滑块 + `astro:page-load`/resize 重定位 + 水滴着陆脉冲
  - `SearchBox.astro` props：`{ id?: string; compact?: boolean; class?: string }`（默认 id `search-q`，与 search.ts 绑定不变）
  - `Footer.astro`：白底发丝线极简（无玻璃胶囊）
  - 删除两组件文件，全库 grep 零残留（data-theme/ThemeToggle/BlobField/blob-/localStorage theme）

- [ ] **Step 1: base.css 补一行（fixed 顶栏占位）**

`src/styles/base.css` 的 `body` 规则追加（保持其余不动）：
```css
  padding-top: var(--nav-h); /* fixed 顶栏占位 */
```

- [ ] **Step 2: 重写 Nav.astro**

完整文件（替换全部内容）：
```astro
---
import SearchBox from './SearchBox.astro';
import { site } from '../site.config';

const path = Astro.url.pathname;
const isActive = (href: string) =>
  href === '/' ? path === '/' : path.startsWith(href);
---
<header class="topbar" data-topbar>
  <div class="inner">
    <a class="brand" href="/" data-nav-item-home>{site.title}</a>

    <nav class="links" data-nav aria-label="主导航">
      <span class="slider" data-slider aria-hidden="true"></span>
      {
        site.nav.map((n) => (
          <a
            class:list={['navlink', isActive(n.href) && 'is-active']}
            data-nav-item
            data-nav-href={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? 'page' : undefined}
          >{n.label}</a>
        ))
      }
    </nav>

    <div class="tools">
      <div class="navsearch">
        <SearchBox id="nav-q" compact />
      </div>
      <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-label="展开菜单">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  <div class="drawer" data-menu hidden>
    <nav class="drawer-links" aria-label="移动端导航">
      {
        site.nav.map((n) => (
          <a
            class:list={['drawer-link', isActive(n.href) && 'is-active']}
            href={n.href}
            data-drawer-link
          >{n.label}</a>
        ))
      }
    </nav>
    <div class="drawer-search">
      <SearchBox id="drawer-q" compact />
    </div>
  </div>
</header>

<script>
  // —— 水滴滑块：量测当前栏目并弹性定位（View Transitions 保留旧 inline 值 →
  //    页面切换后更新 left/width 即产生弹性滑动，见 spec §14.4/14.7） ——
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const slider = document.querySelector<HTMLElement>('[data-slider]');

  function posSlider(animate: boolean): void {
    if (!nav || !slider) return;
    const act = nav.querySelector<HTMLElement>('[data-nav-item].is-active');
    if (!act) {
      slider.style.opacity = '0';
      return;
    }
    const w = act.offsetWidth;
    const l = act.offsetLeft;
    if (!animate) {
      slider.style.transition = 'none';
      slider.style.width = `${w}px`;
      slider.style.transform = `translateX(${l}px)`;
      // 强制回流后恢复过渡
      void slider.offsetWidth;
      slider.style.transition = '';
    } else {
      slider.style.width = `${w}px`;
      slider.style.transform = `translateX(${l}px)`;
    }
    slider.style.opacity = '1';
    slider.classList.remove('land');
    void slider.offsetWidth;
    slider.classList.add('land');
  }

  window.addEventListener('astro:page-load', () => posSlider(true));
  let t: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => posSlider(false), 150);
  });
  try { document.fonts?.ready?.then(() => posSlider(false)); } catch { /* 忽略 */ }

  // —— 移动端抽屉 ——
  const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
  const drawer = document.querySelector<HTMLElement>('[data-menu]');
  menuBtn?.addEventListener('click', () => {
    const open = drawer?.toggleAttribute('hidden') === false;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.hidden) {
      drawer.hidden = true;
      menuBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      menuBtn?.focus();
    }
  });
</script>

<style>
  /* 固定整条顶栏（spec §14.4） */
  .topbar {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 60;
    height: var(--nav-h);
    background: rgba(255, 255, 255, 0.72);
    -webkit-backdrop-filter: blur(14px) saturate(1.6);
    backdrop-filter: blur(14px) saturate(1.6);
    border-bottom: 1px solid var(--glass-border);
  }
  .inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    max-width: var(--maxw);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }
  .brand {
    margin-right: 10px;
    font-weight: 800;
    font-size: 1.06rem;
    letter-spacing: 0.02em;
    color: var(--text-1);
    padding: 6px 10px;
    border-radius: var(--radius-s);
    white-space: nowrap;
  }
  .brand:hover { text-decoration: none; color: var(--text-1); }

  .links {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 100%;
  }
  .navlink {
    position: relative;
    z-index: 1;
    padding: 6px 13px;
    border-radius: var(--radius-s);
    color: var(--text-2);
    font-size: 0.95rem;
    font-weight: 500;
    white-space: nowrap;
    transition: color var(--t-fast) ease-out;
  }
  .navlink:hover { color: var(--text-1); text-decoration: none; }
  .navlink.is-active { color: var(--text-1); font-weight: 650; }

  /* 水滴滑块（悬浮玻璃指示片） */
  .slider {
    position: absolute;
    top: 50%;
    left: 0;
    height: 34px;
    transform: translateY(-50%);
    border-radius: var(--radius-pill);
    background:
      radial-gradient(130% 70% at 50% 0%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 55%),
      rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: var(--glass-shadow);
    opacity: 0;
    will-change: transform, width;
    transition: width 0.6s var(--ease-spring), transform 0.6s var(--ease-spring),
      opacity 0.25s ease;
    pointer-events: none;
  }
  .slider.land::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(80% 60% at 32% 0%, rgba(255, 255, 255, 0.9), transparent 60%);
    animation: droplet-pulse 0.55s var(--ease-spring);
    pointer-events: none;
  }
  @keyframes droplet-pulse {
    0% { opacity: 0; transform: scale(0.86); }
    45% { opacity: 1; transform: scale(1.06); }
    100% { opacity: 0; transform: scale(1); }
  }

  .tools { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .navsearch { width: 190px; transition: width 0.35s var(--ease-spring); }
  .navsearch:focus-within { width: 290px; }

  .menu-btn {
    display: none;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-1);
    cursor: pointer;
  }
  .menu-btn span { display: block; width: 18px; height: 2px; margin: 3px auto; background: currentColor; border-radius: 2px; }

  /* 移动端抽屉 */
  .drawer {
    position: fixed;
    inset: var(--nav-h) 0 0 0;
    z-index: 59;
    padding: 18px var(--gutter) 24px;
    background: rgba(255, 255, 255, 0.96);
    overflow-y: auto;
  }
  .drawer[hidden] { display: none; }
  .drawer-links { display: flex; flex-direction: column; gap: 4px; margin-bottom: 18px; }
  .drawer-link {
    padding: 13px 16px;
    border-radius: var(--radius-s);
    color: var(--text-2);
    font-size: 1.02rem;
    font-weight: 550;
  }
  .drawer-link:hover { color: var(--text-1); text-decoration: none; }
  .drawer-link.is-active {
    color: var(--text-1);
    background: radial-gradient(140% 100% at 50% 0%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.65) 60%);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: var(--glass-shadow);
  }

  @media (max-width: 880px) {
    .links, .navsearch { display: none; }
    .menu-btn { display: block; margin-left: auto; }
    .tools { margin-left: 0; }
  }
  @media (min-width: 881px) {
    .drawer { display: none; }
  }
</style>
```
> 注：`.slider.land::after` 复用 `::after` 做水滴脉冲（元素无其他伪元素需求）；`is-active` 的 navlink 与 slider 分层（z-index 1 vs 未设）——slider 在 links 里先渲染、navlink 后渲染且带 z-index，故文字在滑块上方。

- [ ] **Step 3: SearchBox.astro 增加 props**

`src/components/SearchBox.astro` 替换为：
```astro
---
interface Props {
  id?: string;
  compact?: boolean;
  class?: string;
}
const { id = 'search-q', compact = false, class: className } = Astro.props;
---
<form class:list={['sform', compact && 'sform--compact', className]} role="search" action="/search/" method="get">
  <svg class="sicon" viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M21 21l-4.3-4.3"></path>
  </svg>
  <input id={id} name="q" type="search" placeholder={compact ? '搜索…' : '搜索笔记与迷思…'} autocomplete="off" />
  <button class="sbtn" type="submit" aria-label="搜索">{compact ? '' : '搜索'}</button>
</form>

<style>
  .sform {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px 9px 16px;
    border-radius: var(--radius-s);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    transition: border-color var(--t-fast) ease-out, box-shadow var(--t-fast) ease-out;
  }
  .sform:focus-within {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--glass-border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .sform--compact { height: 36px; padding: 0 8px 0 12px; }
  .sicon { flex: none; color: var(--text-3); }
  #search-q, input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
    color: var(--text-1); font: inherit; font-size: 0.95rem; }
  input::placeholder { color: var(--text-3); }
  .sbtn {
    flex: none;
    border: 0;
    cursor: pointer;
    padding: 0.4em 1.1em;
    border-radius: var(--radius-s);
    background: var(--accent);
    color: #fff;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    transition: filter var(--t-fast) ease-out;
  }
  .sbtn:hover { filter: brightness(1.06); }
  .sform--compact .sbtn { display: none; }
  .sform--compact:focus-within .sbtn { display: inline-flex; }
</style>
```
> 注：compact 变体默认只显示图标，聚焦时按钮淡出输入区（宽度展开由 `.navsearch` 容器承担）。`#search-q, input` 选择器覆盖多实例。

- [ ] **Step 4: Base.astro 调整**

`src/layouts/Base.astro` 中做四处修改：
1. frontmatter 增 `import { ViewTransitions } from 'astro:transitions';`，删 `import BlobField from '../components/BlobField.astro';`
2. `<head>` 内删除整个防闪 `<script is:inline>…</script>` 块，在 favicon link 之后加 `<ViewTransitions />`
3. `<body>` 内删除 `<BlobField />`
4. 其余（props、meta、Nav、main、Footer）不动

- [ ] **Step 5: Footer.astro 极简化**

`src/components/Footer.astro` 替换为：
```astro
---
import { site } from '../site.config';
---
<footer class="foot">
  <div class="wrap inner">
    <p class="note">{site.footerNote}</p>
    <p class="copy">
      © <span data-year>2026</span> {site.title}
      <span class="dot">·</span>
      <a href="/">回到首页</a>
    </p>
  </div>
</footer>

<script>
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
</script>

<style>
  .foot { border-top: 1px solid var(--glass-border); }
  .inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 24px;
    padding-block: 18px;
  }
  .note { margin: 0; font-size: 0.85rem; color: var(--text-3); }
  .copy { margin: 0; font-size: 0.85rem; color: var(--text-3); }
  .copy a { color: var(--text-3); }
  .dot { padding: 0 8px; }
</style>
```

- [ ] **Step 6: 删除暗色组件 + 残留清零**

Run:
```bash
git rm src/components/BlobField.astro src/components/ThemeToggle.astro
```
然后全库残留核对（Git Bash）：
```bash
echo "data-theme:";        grep -rn 'data-theme' src || echo none
echo "ThemeToggle:";       grep -rn 'ThemeToggle\|theme-btn\|ico-sun\|ico-moon' src || echo none
echo "BlobField/blob-:";   grep -rni 'blobfield\|blob-' src || echo none
echo "localStorage theme:"; grep -rn "localStorage.getItem('theme')" src || echo none
echo "--blob-a:";          grep -rn -- '--blob-a' src || echo none
```
Expected: 除预期空行外全部 `none`。（Nav drawer 用 `.drawer`，无残留。）

- [ ] **Step 7: 构建 + 冒烟验收**

Run: `npm run build`
Expected: 退出码 0、零警告。

Run: `npm run preview`（后台），逐条执行并记录：
- 全路由 200 抽测：`/`、`/notes/`、`/photos/`、`/search/`、`/projects/`
- `/` HTML 含 `data-nav-item` 与 `data-slider`（`curl -s http://localhost:4321/ | grep -c 'data-slider'` ≥1）
- `/notes/` HTML 中该页激活项带 `aria-current="page"`（`curl -s http://localhost:4321/notes/ | grep -c 'aria-current="page"'` ≥1）
- `/` 不再含 BlobField/theme 脚本残留（grep -c 'BlobField' = 0）
- kill preview
> 水滴滑动/脉冲、抽屉、聚焦展开等交互动效 → 人工浏览器清单（Task 5 收口）。

- [ ] **Step 8: 提交**

```bash
git add -A src && git commit -m "feat: 外壳 v2 — 固定整条导航+水滴滑块、ViewTransitions、紧凑搜索、极简页脚，删暗色/光斑组件"
```

## Task 3: 欢迎页单屏（华文中宋）

**Files:**
- Modify: `src/site.config.ts`（增 `heroNote`）
- Rewrite: `src/pages/index.astro`
- Delete: `src/components/Hero.astro`

**Interfaces:**
- Consumes: Task 2 的 Base/Nav；token `--font-song`
- Produces：`site.heroNote`（'写字 · 拍照 · 收藏'）；首页单屏欢迎，无预览流

- [ ] **Step 1: site.config.ts 增 heroNote**

在 `intro` 行之后插入：
```ts
  heroNote: '写字 · 拍照 · 收藏',
```

- [ ] **Step 2: 重写 index.astro**

完整文件（替换全部内容）：
```astro
---
import Base from '../layouts/Base.astro';
import { site } from '../site.config';
---
<Base>
  <section class="welcome">
    <div class="stack">
      <h1 class="name">{site.title}</h1>
      <p class="tagline">{site.tagline}</p>
      <p class="note" aria-hidden="true">{site.heroNote}</p>
      <div class="acts">
        <a class="btn prism" href="/notes/">个人笔记</a>
        <a class="btn prism" href="/photos/">摄影作品集</a>
      </div>
    </div>
  </section>
</Base>

<style>
  .welcome {
    min-height: calc(100vh - var(--nav-h) - 120px);
    display: grid;
    place-items: center;
    text-align: center;
    padding-block: clamp(24px, 6vh, 72px);
  }
  .stack { display: grid; justify-items: center; gap: 0; }
  .name {
    margin: 0;
    font-family: var(--font-song);
    font-size: clamp(3.2rem, 11vw, 6.4rem);
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: 0.08em;
    color: var(--text-1);
  }
  .tagline {
    margin: clamp(14px, 3vh, 26px) 0 0;
    font-size: clamp(1.05rem, 2.6vw, 1.35rem);
    font-weight: 400;
    color: var(--text-2);
    letter-spacing: 0.02em;
  }
  .note {
    margin: 22px 0 0;
    font-size: 0.86rem;
    color: var(--text-3);
    letter-spacing: 0.42em;
    text-indent: 0.42em; /* 视觉居中补偿 */
  }
  .acts {
    margin-top: clamp(28px, 5vh, 46px);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
</style>
```
> `.prism` 让两枚入口按钮 hover 时泛起棱光环；无装饰光、无预览流。

- [ ] **Step 3: 删除旧 Hero**

Run:
```bash
git rm src/components/Hero.astro
```

- [ ] **Step 4: 构建 + 冒烟**

Run: `npm run build`
Expected: 退出码 0、零警告（若 index 不再引用 PostCard 等导致未使用 import 报错——不可能，imports 已删——但请 grep 确认 `src/pages/index.astro` 无残留 import：PostCard/PhotoCard/LinkCard/ProjectCard/SectionHeader/getImage/collections）。

Preview 冒烟（Git Bash）：
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/` → 200
- `curl -s http://localhost:4321/ | grep -c '最新笔记'` → 0（无预览流）
- `curl -s http://localhost:4321/ | grep -c 'font-song\|华文中宋'` → ≥1（样式含中宋字栈）
- `curl -s http://localhost:4321/ | grep -c 'data-slider'` ≥1 且 `curl -s http://localhost:4321/ | grep -c 'BlobField'` = 0
- kill preview

- [ ] **Step 5: 提交**

```bash
git add src/site.config.ts src/pages/index.astro && git add -u src/components/Hero.astro && git commit -m "feat: 欢迎页单屏 — 华文中宋大字、极简白、双玻璃入口"
```

---

## Task 4: 组件视觉清扫（hover 棱光跟随 v2）

**Files:**
- Modify: `src/components/GlassCard.astro`、`src/components/PhotoCard.astro`、`src/pages/404.astro`、`src/components/SectionHeader.astro`（可选小改）
- 原则：不引入新视觉语言，只让既有卡片/按钮跟随 v2（hover 微浮 + 棱光环；删除「提亮描边」旧 hover 语法残留）。

**Interfaces:**
- Consumes: Task 1 `.prism`/token；Task 2 外壳

- [ ] **Step 1: GlassCard.astro**

`src/components/GlassCard.astro` 完整替换为：
```astro
---
interface Props {
  hover?: boolean;
  class?: string;
}
const { hover = true, class: className } = Astro.props;
---
<div class:list={['glass', 'glasscard', 'prism', hover && 'raise', className]}>
  <slot />
</div>

<style>
  .glasscard { transition: transform var(--t-fast) ease-out, box-shadow var(--t-fast) ease-out; }
  .raise:hover {
    transform: translateY(var(--card-hover));
    box-shadow: var(--glass-shadow-lg);
  }
</style>
```
（hover 提亮描边旧语法删除——白底上以棱光环替代。）

- [ ] **Step 2: PhotoCard.astro 加 prism**

在三个根元素（`<a class="glass photocard" …>`、`<button class="glass photocard" …>`、`<figure class="glass photocard">`）的 class 里补 `prism`（改三处 class 字符串为 `"glass photocard prism"`），其余不动；其 hover 已有 `translateY(var(--card-hover))` 与 `--glass-shadow-lg`，与新 token 自动对齐。

- [ ] **Step 3: 404 按钮加 prism + 卡片 hover 跟随**

`src/pages/404.astro`：
- 两枚 `.btn` 加 `prism` 类（`<a class="btn btn--primary prism" href="/">回到首页</a>` 与 `<a class="btn prism" href="/search/">试试搜索</a>`）
- `.nf` 玻璃卡 `class="glass nf"` 加 `prism`？卡片非常驻交互——保持不加（卡片 hover 时 .glass 无 raise）。为一致性可加 `prism`（仅 hover 出现环）。**决定：不加**，仅按钮。
- `.searchrow` 间距已修（v1 修复保留）。

- [ ] **Step 4: 全库 hover 旧语法残留核对**

Run:
```bash
grep -rn 'border-color: color-mix' src/components src/pages || echo "no leftover brighten-hover"
```
Expected: 若有残留（LinkCard/ProjectCard/PostList 等）→ 该处 `:hover` 的 border-color 提亮删除或保留判定：白色系微提亮无害，但为一致统一删（逐处小编辑，不改变结构）。逐处处理后 build。

- [ ] **Step 5: 构建 + 提交**

Run: `npm run build` → 退出码 0、零警告。

```bash
git add src/components src/pages && git commit -m "feat: 组件视觉清扫 — 卡片/按钮 hover 棱光环化、跟随 v2 token"
```

---

## Task 5: 全站验收（v2）

**Files:** 无代码改动（除非发现回归）。

**验收步骤：**

- [ ] **Step 1: 残留与构建**

Run:
```bash
npm run build
```
Expected: 退出码 0、零警告（13 页）。

Run（残留清零核对）：
```bash
echo "theme-dark:";  grep -rn "data-theme\|prefers-color-scheme: dark\|--blob-\|ThemeToggle\|BlobField" src || echo none
```
Expected: `none`。

- [ ] **Step 2: 全路由状态码扫**

Run: `npm run preview` 后台；逐行输出记录：
```bash
for p in / /notes/ /notes/astro-glass-notes/ /musings/ /musings/why-keep-a-blog/ /photos/ /links/ /projects/ /search/ /favicon.svg; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4321$p)  $p"
done
curl -s -o /dev/null -w '%{http_code}  /nope-xyz(期望404)\n' http://localhost:4321/nope-xyz
```
Expected: 全部 200（nope 为 404）。kill preview。

- [ ] **Step 3: 人工浏览器清单（交付用户，本任务标记 PENDING HUMAN）**

1. 白底无杂光；导航整条贴顶固定，滚动时内容从其下穿过
2. 点击不同栏目（经 View Transitions）：滑块以弹性曲线滑动到新栏目 + 水滴脉冲；开启「减少动态效果」后无滑动/脉冲
3. 搜索框最右：hover/聚焦 190→290px 展开，Enter 跳 `/search/?q=`
4. 欢迎页：华文中宋大字居中、副标与 heroNote 间距、两入口按钮 hover 泛起旋转棱光环
5. 各栏目页：卡片 hover 微浮 + 棱光环；详情页排版/代码块正常
6. 移动端 <880px：汉堡抽屉（含搜索）、激活项静态高亮；375/768/1440 无横向滚动
7. 摄影灯箱、标签过滤、站内搜索（/search 大输入框仍工作）、404（含搜索框）逐一过一遍

- [ ] **Step 4: 收尾提交（如无改动则跳过）**

如有回归修复，另 commit；否则 git status 应为干净。

至此 v2 改版完成。继续以子代理驱动执行（每任务独立 brief + 评审）。

