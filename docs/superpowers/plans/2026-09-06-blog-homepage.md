# 个人博客主页（液态玻璃）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现本计划。步骤用 checkbox（`- [ ]`）跟踪进度。

**Goal:** 在 `D:\_Vibe` 从零构建一个可部署到 GitHub Pages（`用户名.github.io` 主页仓，根路径）的个人博客：欢迎首页 + 五个内容栏目（个人笔记/摄影作品集/个人迷思/网站参考/项目集），Apple 液态玻璃视觉（纯 CSS），亮/暗双主题 + 站内搜索。

**Architecture:** Astro 5 静态站。全部内容为 `src/content/` 下的 Markdown + Content Collections（zod schema 构建期强校验，坏字段/断图不让上线）。视觉 = 全局 CSS 变量 token（亮/暗双主题）+ 玻璃工具类 + 组件化；客户端 JS 仅三个零框架脚本（主题切换、搜索、灯箱）。构建产物 `dist/` 纯静态，GitHub Actions 推送即部署。

**Tech Stack:** Astro 5（sharp 随包，负责构建期图片优化）、TypeScript、fuse.js（仅站内搜索运行时依赖）。无 UI 框架、无 CSS 后处理、零 webfont 下载。

**设计依据：** `docs/superpowers/specs/2026-09-06-blog-homepage-design.md`（已批准）。本计划与 spec 冲突时以 spec 为准，偏差仅限已注明处。

## Global Constraints

（每条任务均隐含遵守；代码命名、路径、签名全计划唯一，不得自造变体）

1. **环境**：Windows 10 + Git Bash。Node v24.12.0 / npm 11.6.2（≥20 满足）。所有命令走 npm scripts，不依赖全局工具。
2. **依赖上限**：`dependencies` 仅 `astro` 与 `fuse.js`；`devDependencies` 仅 `typescript`。禁止引入 UI 框架/CSS 工具/字体包。
3. **内容集合**：定义在 `src/content.config.ts`（Astro 5 约定路径），5 个集合名 `notes` / `musings` / `photos` / `links` / `projects`，schema 严格按 spec §4：共享字段 `title: string(必填)`、`date: string 形如 YYYY-MM-DD(必填)`、`summary?: string`、`draft?: boolean(默认 false)`；`notes`/`links` 加 `tags: string[]`（默认空）；`links` 加 `url`(z.url())；`projects` 加 `tech: string[](必填)` 与可选 `url`/`repo`；`photos` 用 `({ image }) =>` 回调 schema：`image: image()`（相对路径=与 .md 同目录同名文件）、`alt: string(必填)`，可选 `location`/`album`/`camera{body,lens,f,ss,iso}`。
4. **内容文件约定**：文件名 ASCII kebab-case 作 slug、**不含日期**；日期只进 frontmatter。所有列表过滤 `draft: true`，按 `date` 倒序。照片与其描述 .md **同名同目录**放于 `src/content/photos/`（md 引用 `./同名文件.svg`）。
5. **界面文案**：中文（`<html lang="zh-CN">`）。站点元信息唯一来源为 `src/site.config.ts`（标题/标语/简介/导航/页脚注），页面与组件一律 import，不得硬编码。
6. **主题机制**：`<html data-theme="light|dark">`；默认跟随系统、手动切换写 localStorage；首屏防闪 inline 脚本放 `<head>` 最前。所有配色只能来自 `tokens.css` 变量；组件**不得**按主题写分支逻辑。
7. **字体**：仅系统字体栈（sans/mono 各一条，见 tokens.css），禁止任何字体文件下载。
8. **玻璃降级与可达性**：必须保留 `@supports not (backdrop-filter…)` 实心降级；必须保留 `prefers-reduced-motion: reduce` 全停动效；所有图标按钮带 `aria-label`，灯箱支持 ESC。
9. **URL**：部署形态为 `用户名.github.io` 主页仓 → `astro.config.mjs` 中 `site: 'https://USERNAME.github.io'`（占位，建仓时替换）、`base: '/'`。详情页路径 `/notes/<slug>`、`/musings/<slug>`，其余列表页路径见站点地图。
10. **测试策略**：静态站无单测；验收 = `npm run build` 零错误零警告（schema/图片/TS 由构建拦截）+ `npm run preview` 后对全部路由 curl 状态码 + spec §11 人工走查清单（最后一个任务集中执行）。
11. **提交**：每个任务结束一次 git commit（含步骤里给出的完整提交命令）。⚠️ 本机 git 未配置 user.name/email：**任务 1 第 1 步**先处理（问用户或 `git config --local` 配置），后续任务直接照抄提交命令即可。
12. **摄影占位图**：spec §8 的 sharp 脚本方案简化为**渐变 SVG 占位图**（构建期同样走 `image()` + `getImage()` 全管线；SVG 不经 sharp 光栅化、原样输出，换真图（jpg/webp）后自动获得响应式优化）—— 这是唯一对 spec 的偏差。

## 文件结构

```
D:\_Vibe\
├─ package.json / tsconfig.json / astro.config.mjs
├─ public/favicon.svg
├─ .github/workflows/deploy.yml
├─ README.md                          （内容维护 + 部署指南，任务 11 写）
├─ src/
│  ├─ env.d.ts
│  ├─ site.config.ts                  （站点元信息唯一来源）
│  ├─ content.config.ts               （5 集合 schema）
│  ├─ styles/tokens.css / base.css    （token + 玻璃工具/排版基元）
│  ├─ lib/text.ts date.ts collections.ts
│  ├─ layouts/Base.astro Post.astro
│  ├─ components/
│  │  GlassCard BlobField Nav Footer ThemeToggle Hero
│  │  SectionHeader PostCard PostList Pill PhotoCard LinkCard ProjectCard SearchBox
│  ├─ scripts/lightbox.ts search.ts
│  ├─ pages/
│  │  index.astro  404.astro
│  │  notes/index.astro notes/[slug].astro
│  │  musings/index.astro musings/[slug].astro
│  │  photos/index.astro  links/index.astro  projects/index.astro  search/index.astro
│  └─ content/
│     notes/  musings/  links/  projects/   （每目录：2–3 篇种子 md + 1 个 `_*-template.md.example` 模板）
│     photos/  （3 张渐变 SVG + 同名 md，如 `harbor-sunset.svg`+`harbor-sunset.md`）
```

任务依赖链：Task1 脚手架 → Task2 样式基础 → Task3 外壳(布局/导航/主题/光斑) → Task4 内容层(schema+种子+lib) → Task5 笔记与迷思列表/详情 → Task6 摄影 → Task7 网站参考 → Task8 项目集 → Task9 欢迎首页 → Task10 搜索 → Task11 404/README/终验收 → Task12 部署。

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`、`tsconfig.json`、`astro.config.mjs`、`src/env.d.ts`、`src/pages/index.astro`（占位）

**Interfaces:**
- Produces: npm scripts `dev`/`build`/`preview`/`astro`；Astro 可启动可构建的空站点（后续任务在其上叠加，不再动脚手架配置，除非任务内注明）。

- [ ] **Step 1: git 身份检查**

```bash
git config user.name && git config user.email && echo OK
```
Expected: 若两行均有值输出 `OK` → 跳过本步其余内容。若退出非 0（未配置）→ 向用户询问提交身份，得到后执行：
```bash
git config --local user.name "<用户名>" && git config --local user.email "<邮箱>"
```
若用户选择暂不配置：之后每个任务的 commit 步骤改为只 `git add` 不 commit，并在本计划最后汇总提醒用户自己提交。

- [ ] **Step 2: 写脚手架文件**

`package.json`：
```json
{
  "name": "vibe-blog",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

`tsconfig.json`：
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`astro.config.mjs`：
```js
// @ts-check
import { defineConfig } from 'astro/config';

// 建仓时把 USERNAME 替换为 GitHub 用户名（主页仓 = <用户名>.github.io → base 根路径）
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/',
});
```

`src/env.d.ts`：
```ts
/// <reference types="astro/client" />
```

`src/pages/index.astro`（占位，Task 9 整体替换）：
```astro
---
import { site } from '../site.config';
---
<html lang="zh-CN">
  <head><title>{site.title}</title></head>
  <body><h1>{site.title}</h1><p>脚手架占位页，Task 9 替换为欢迎首页。</p></body>
</html>
```
⚠️ 引用了尚不存在的 `site.config.ts` —— 下一步先建它：

`src/site.config.ts`：
```ts
export const site = {
  title: 'Vibe',
  tagline: '记录 · 拍摄 · 思考',
  intro: '你好，我是 Vibe。这里存放个人笔记、摄影作品、生活迷思，以及值得收藏的网站。',
  footerNote: '本博客内容遵循 CC BY-NC 4.0 许可。',
  nav: [
    { label: '个人笔记', href: '/notes' },
    { label: '摄影作品集', href: '/photos' },
    { label: '个人迷思', href: '/musings' },
    { label: '网站参考', href: '/links' },
    { label: '项目集', href: '/projects' },
  ],
} as const;
```

- [ ] **Step 3: 安装依赖**

Run: `npm install`
Expected: 成功结束（`added N packages`），无 error。

- [ ] **Step 4: 构建验收**

Run: `npm run build`
Expected: 退出码 0，输出 `dist/` 与 `Completed in …`，无 error。产物含 `dist/index.html`。
（此时 `site.config.ts` 尚无内容集合引用，`astro build` 会自动生成 `.astro/types.d.ts`。）

- [ ] **Step 5: 提交**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs src/ && git commit -m "chore: Astro 5 脚手架与站点配置"
```
Expected: commit 成功（Step 1 若跳过则仅 `git add`）。

---

## Task 2: 玻璃样式基础（tokens.css / base.css / favicon）

**Files:**
- Create: `src/styles/tokens.css`、`src/styles/base.css`、`public/favicon.svg`

**Interfaces:**
- Produces（后续所有组件/页面引用，命名锁死）：
  - 语义 token（见下 CSS）：`--canvas` `--canvas-2` `--text-1/2/3` `--accent` `--link-underline` `--glass-bg` `--glass-bg-strong` `--glass-border` `--glass-hl` `--glass-blur` `--glass-sat` `--glass-radius` `--radius-s` `--radius-pill` `--glass-shadow` `--glass-shadow-lg` `--card-hover` `--blob-a/b/c/d` `--font-sans` `--font-mono` `--nav-h` `--maxw` `--gutter`
  - 全局类 `.wrap` `.main` `.glass` `.btn`（可加 `.btn--primary`）`.pill` `.prose` `.page-title`、`::selection`、`:focus-visible`、降级 `@supports not (backdrop-filter…)`、`prefers-reduced-motion` 兜底
  - `<head>` 引用 `/favicon.svg`（Task 3 布局里引用，此处只建文件）

- [ ] **Step 1: tokens.css**

Create `src/styles/tokens.css`：
```css
/* 设计 token —— 全站配色/圆角/阴影/动效唯一来源（spec §5.1）。
   亮色为 :root 默认；暗色在 [data-theme='dark'] 覆盖。组件不得按主题分支。 */
:root {
  color-scheme: light;
  --canvas: #eef1f8;
  --canvas-2: #e3e8f4;

  --text-1: #1b1e27;
  --text-2: #4a5164;
  --text-3: #78809a;
  --accent: #4f6bff;
  --link-underline: rgba(79, 107, 255, 0.35);

  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-bg-strong: rgba(255, 255, 255, 0.82);
  --glass-border: rgba(255, 255, 255, 0.72);
  --glass-hl: rgba(255, 255, 255, 0.95);
  --glass-blur: 20px;
  --glass-sat: 1.8;
  --glass-radius: 22px;
  --radius-s: 14px;
  --radius-pill: 999px;
  --glass-shadow: 0 8px 32px rgba(31, 38, 68, 0.12);
  --glass-shadow-lg: 0 18px 48px rgba(31, 38, 68, 0.18);
  --card-hover: -4px;

  --blob-a: rgba(93, 129, 255, 0.5);
  --blob-b: rgba(190, 140, 255, 0.45);
  --blob-c: rgba(255, 178, 130, 0.4);
  --blob-d: rgba(96, 220, 190, 0.38);

  --font-sans: -apple-system, "SF Pro Text", "PingFang SC", "HarmonyOS Sans SC",
    "Microsoft YaHei", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Consolas, "Cascadia Mono", monospace;

  --nav-h: 64px;
  --maxw: 1160px;
  --gutter: clamp(18px, 4vw, 28px);
}

[data-theme='dark'] {
  color-scheme: dark;
  --canvas: #0c0e16;
  --canvas-2: #12141f;

  --text-1: #eef0f6;
  --text-2: #b3b9cd;
  --text-3: #7a8299;
  --accent: #93aaff;
  --link-underline: rgba(147, 170, 255, 0.4);

  --glass-bg: rgba(255, 255, 255, 0.07);
  --glass-bg-strong: rgba(22, 25, 38, 0.85);
  --glass-border: rgba(255, 255, 255, 0.16);
  --glass-hl: rgba(255, 255, 255, 0.24);
  --glass-blur: 24px;
  --glass-sat: 1.6;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --glass-shadow-lg: 0 18px 48px rgba(0, 0, 0, 0.6);

  --blob-a: rgba(63, 88, 214, 0.42);
  --blob-b: rgba(122, 63, 208, 0.36);
  --blob-c: rgba(176, 106, 46, 0.28);
  --blob-d: rgba(43, 127, 116, 0.34);
}
```

- [ ] **Step 2: base.css**

Create `src/styles/base.css`：
```css
/* 全局基础 + 玻璃工具类 + 文章排版（spec §5） */
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
  line-height: 1.25;
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
  background: color-mix(in srgb, var(--accent) 30%, transparent);
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

/* —— 玻璃面板（液态玻璃核心：半透明 + backdrop 模糊提饱和 + 高光描边） —— */
.glass {
  background:
    linear-gradient(180deg, var(--glass-hl), transparent 34%) var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  box-shadow: var(--glass-shadow);
}

/* 降级：不支持 backdrop-filter → 高不透明度实心面板（spec §5.6） */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root { --glass-bg: rgba(255, 255, 255, 0.94); }
  [data-theme='dark'] { --glass-bg: rgba(15, 17, 26, 0.94); }
  .glass {
    background: linear-gradient(180deg, var(--glass-hl), transparent 22%),
      var(--glass-bg);
  }
}

/* —— 按钮 —— */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 1.35em;
  border-radius: var(--radius-pill);
  border: 1px solid var(--glass-border);
  background: linear-gradient(180deg, var(--glass-hl), transparent 40%),
    var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  color: var(--text-1);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  box-shadow: var(--glass-shadow);
  transition: transform 0.18s ease-out, box-shadow 0.18s ease-out,
    filter 0.18s ease-out;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow-lg);
  text-decoration: none;
}
.btn--primary {
  background: var(--accent);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 35%, transparent);
}
.btn--primary:hover { filter: brightness(1.07); }

/* —— 胶囊 —— */
.pill {
  display: inline-block;
  padding: 0.12em 0.7em;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.7;
  color: var(--text-2);
  background: color-mix(in srgb, var(--text-1) 7%, transparent);
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

/* —— 文章阅读排版（详情页 .prose 容器） —— */
.prose {
  max-width: 68ch;
  margin-inline: auto;
}
.prose h2 { font-size: 1.5rem; margin-top: 2em; }
.prose h3 { font-size: 1.2rem; margin-top: 1.6em; }
.prose pre {
  margin: 1.3em 0;
  padding: 1em 1.2em;
  overflow-x: auto;
  border-radius: var(--radius-s);
  background: rgba(9, 11, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: var(--glass-shadow);
  color: #e8eaf2;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.65;
}
.prose :not(pre) > code {
  padding: 0.14em 0.45em;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-1) 9%, transparent);
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
    color-mix(in srgb, var(--accent) 8%, transparent), transparent);
}
.prose ul, .prose ol { padding-left: 1.4em; }
.prose a {
  text-decoration: underline;
  text-decoration-color: var(--link-underline);
  text-underline-offset: 3px;
}
.prose a:hover { text-decoration-thickness: 2px; }
.prose img {
  border-radius: var(--radius-s);
  box-shadow: var(--glass-shadow);
  margin: 1.4em 0;
}
.prose hr {
  border: 0;
  height: 1px;
  margin: 2.4em 0;
  background: linear-gradient(90deg, transparent, var(--text-3), transparent);
}
.prose table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.4em 0;
  font-size: 0.92rem;
}
.prose th, .prose td {
  border: 1px solid color-mix(in srgb, var(--text-3) 40%, transparent);
  padding: 0.5em 0.8em;
  text-align: left;
}
.prose th { background: color-mix(in srgb, var(--text-1) 6%, transparent); }

/* —— 减少动效 —— */
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

- [ ] **Step 3: favicon**

Create `public/favicon.svg`：
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b7fff"/>
      <stop offset="1" stop-color="#b26be0"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <circle cx="22" cy="16" r="26" fill="#ffffff" opacity="0.25"/>
  <rect x="4" y="4" width="56" height="56" rx="14" fill="none"
        stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
</svg>
```

- [ ] **Step 4: 构建验收**

Run: `npm run build`
Expected: 退出码 0；CSS 无语法错误（Astro 打包 styles 时会报错退出）；`dist/favicon.svg` 存在。

- [ ] **Step 5: 提交**

```bash
git add src/styles public/favicon.svg && git commit -m "feat: 玻璃设计 token 与全局样式基础"
```
Expected: commit 成功。

## Task 3: 站点外壳（Base 布局 + 玻璃导航 + 主题切换 + 光斑 + 页脚）

**Files:**
- Create: `src/layouts/Base.astro`、`src/components/BlobField.astro`、`src/components/Nav.astro`、`src/components/ThemeToggle.astro`、`src/components/Footer.astro`
- Modify: `src/pages/index.astro`（从裸 HTML 改为引用 Base 的最小占位内容，Task 9 再整页替换）

**Interfaces:**
- Consumes: Task 1 的 `src/site.config.ts`（`site.nav` 等）；Task 2 的 token/`.wrap`/`.glass`/`.btn`
- Produces（锁死签名，后续页面/布局引用）：
  - `Base.astro` props：`{ title?: string; description?: string; noindex?: boolean }`。渲染 `<html lang="zh-CN">`、`<head>`（防闪主题脚本 is:inline、`/favicon.svg`）、`BlobField`、`Nav`、`<main class="wrap main"><slot/></main>`、`Footer`
  - `BlobField.astro` 无 props；4 个渐变光斑 `fixed` 全屏漂移，reduced-motion 停
  - `Nav.astro` 无 props；sticky 玻璃胶囊栏：品牌(→`/`) + 5 栏目链接 + 搜索图标钮(→`/search/`) + `ThemeToggle`；<880px 折叠为汉堡抽屉；活跃链接 `is-active`
  - `ThemeToggle.astro` 无 props；读/写 `localStorage.theme`，切 `<html data-theme>`
  - `Footer.astro` 无 props；年份自动更新（data-year）

- [ ] **Step 1: Base.astro**

Create `src/layouts/Base.astro`：
```astro
---
import '../styles/tokens.css';
import '../styles/base.css';
import BlobField from '../components/BlobField.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { site } from '../site.config';

interface Props {
  title?: string;
  description?: string;
  noindex?: boolean;
}
const { title, description = site.tagline, noindex } = Astro.props;
const headTitle = title ? `${title} · ${site.title}` : `${site.title} — ${site.tagline}`;
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{headTitle}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <script is:inline>
      // 主题防闪：CSS 前决定 data-theme（默认跟随系统，手动选择写 localStorage）
      (() => {
        try {
          const saved = localStorage.getItem('theme');
          const dark = matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.dataset.theme = saved ?? (dark ? 'dark' : 'light');
        } catch {
          document.documentElement.dataset.theme = 'light';
        }
      })();
    </script>
  </head>
  <body>
    <BlobField />
    <Nav />
    <main class="wrap main"><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 2: BlobField.astro**

Create `src/components/BlobField.astro`：
```astro
---
// 光斑层：玻璃的折射素材。全站唯一动效渲染处（spec §5.2）。
---
<div class="blobs" aria-hidden="true">
  <span class="blob blob-a"></span>
  <span class="blob blob-b"></span>
  <span class="blob blob-c"></span>
  <span class="blob blob-d"></span>
</div>

<style>
  .blobs {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.9;
    will-change: transform;
  }
  .blob-a { width: 46vw; height: 46vw; left: -12vw; top: -12vw; background: var(--blob-a); animation: drift-a 34s ease-in-out infinite; }
  .blob-b { width: 38vw; height: 38vw; right: -10vw; top: 6vh; background: var(--blob-b); animation: drift-b 42s ease-in-out infinite; }
  .blob-c { width: 40vw; height: 40vw; left: -8vw; bottom: -14vw; background: var(--blob-c); animation: drift-b 38s ease-in-out infinite reverse; }
  .blob-d { width: 34vw; height: 34vw; right: -6vw; bottom: -8vw; background: var(--blob-d); animation: drift-a 46s ease-in-out infinite reverse; }

  @keyframes drift-a {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(9vw, 6vh) scale(1.12); }
    66% { transform: translate(-5vw, 11vh) scale(0.94); }
  }
  @keyframes drift-b {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-8vw, -7vh) scale(1.08); }
  }

  @media (prefers-reduced-motion: reduce) {
    .blob { animation: none; }
  }
</style>
```

- [ ] **Step 3: ThemeToggle.astro**

Create `src/components/ThemeToggle.astro`：
```astro
---
// 主题切换：切 <html data-theme> 并持久化。图标由 CSS 按主题显隐。
---
<button class="toggle" type="button" data-theme-btn aria-label="切换亮暗主题" title="切换主题">
  <svg class="ico-sun" viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
  </svg>
  <svg class="ico-moon" viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
  </svg>
</button>

<script>
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-btn]');
  btn?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* 隐私模式忽略 */ }
  });
</script>

<style>
  .toggle {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 0;
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    transition: color 0.15s ease-out, background 0.15s ease-out;
  }
  .toggle:hover { color: var(--text-1); background: color-mix(in srgb, var(--text-1) 8%, transparent); }
  .ico-moon { display: none; }
</style>
<style is:global>
  /* 亮色显示太阳，暗色显示月亮（依赖 html[data-theme]，必须全局） */
  [data-theme='dark'] .ico-sun { display: none; }
  [data-theme='dark'] .ico-moon { display: block; }
</style>
```

- [ ] **Step 4: Nav.astro**

Create `src/components/Nav.astro`：
```astro
---
import ThemeToggle from './ThemeToggle.astro';
import { site } from '../site.config';

const path = Astro.url.pathname;
const isActive = (href: string) =>
  href === '/' ? path === '/' : path.startsWith(href);
---
<header class="navwrap">
  <div class="glass navbar">
    <a class="brand" href="/">{site.title}</a>

    <button class="burger" type="button" data-nav-btn aria-expanded="false" aria-label="展开菜单">
      <span></span><span></span><span></span>
    </button>

    <nav class="links" data-nav-panel aria-label="主导航">
      {
        site.nav.map((n) => (
          <a
            class:list={['link', isActive(n.href) && 'is-active']}
            href={n.href}
          >{n.label}</a>
        ))
      }
    </nav>

    <div class="tools">
      <a class="tool" href="/search/" aria-label="站内搜索" title="搜索">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="M21 21l-4.3-4.3"></path>
        </svg>
      </a>
      <ThemeToggle />
    </div>
  </div>
</header>

<script>
  const btn = document.querySelector<HTMLButtonElement>('[data-nav-btn]');
  const panel = document.querySelector('[data-nav-panel]');
  btn?.addEventListener('click', () => {
    const open = panel?.classList.toggle('open') ?? false;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      panel?.classList.remove('open');
      btn?.setAttribute('aria-expanded', 'false');
    }
  });
</script>

<style>
  /* 悬浮玻璃胶囊导航栏 */
  .navwrap {
    position: sticky;
    top: 14px;
    z-index: 40;
    padding: 0 var(--gutter);
    pointer-events: none; /* 空隙可点穿到页面内容 */
  }
  .navbar {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    border-radius: var(--radius-pill);
    max-width: var(--maxw);
    margin-inline: auto;
  }
  .brand {
    font-weight: 800;
    font-size: 1.06rem;
    letter-spacing: 0.01em;
    color: var(--text-1);
    padding: 6px 12px;
    border-radius: 12px;
    white-space: nowrap;
  }
  .brand:hover { text-decoration: none; }
  .links {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-inline: auto;
  }
  .link {
    padding: 7px 13px;
    border-radius: var(--radius-pill);
    color: var(--text-2);
    font-size: 0.95rem;
    font-weight: 500;
    white-space: nowrap;
    transition: color 0.15s ease-out, background 0.15s ease-out;
  }
  .link:hover {
    color: var(--text-1);
    background: color-mix(in srgb, var(--text-1) 8%, transparent);
    text-decoration: none;
  }
  .link.is-active {
    color: var(--text-1);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent);
  }
  .tools { display: flex; align-items: center; gap: 4px; }
  .tool {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    color: var(--text-2);
    transition: color 0.15s ease-out, background 0.15s ease-out;
  }
  .tool:hover {
    color: var(--text-1);
    background: color-mix(in srgb, var(--text-1) 8%, transparent);
    text-decoration: none;
  }
  .burger {
    display: none;
    width: 38px;
    height: 38px;
    margin-left: auto;
    border-radius: 50%;
    border: 0;
    background: transparent;
    color: var(--text-1);
    cursor: pointer;
  }
  .burger span {
    display: block;
    width: 18px;
    height: 2px;
    margin: 3px auto;
    background: currentColor;
    border-radius: 2px;
  }

  @media (max-width: 880px) {
    .burger { display: block; }
    .navbar { position: relative; }
    .links {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
      padding: 10px;
      border-radius: var(--radius-s);
      border: 1px solid var(--glass-border);
      background: var(--glass-bg-strong);
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
      box-shadow: var(--glass-shadow-lg);
    }
    .links.open { display: flex; }
    .link { text-align: center; }
  }
</style>
```

- [ ] **Step 5: Footer.astro**

Create `src/components/Footer.astro`：
```astro
---
import { site } from '../site.config';
---
<footer class="foot">
  <div class="wrap">
    <div class="glass inner">
      <p class="note">{site.footerNote}</p>
      <p class="copy">
        © <span data-year>2026</span> {site.title}
        <span class="dot">·</span>
        <a href="/">回到首页</a>
      </p>
    </div>
  </div>
</footer>

<script>
  // 年份跟随构建/浏览时间自动更新，避免静态年份过期
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
</script>

<style>
  .foot { padding: 0 var(--gutter) clamp(24px, 5vw, 48px); }
  .inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 24px;
    padding: 16px clamp(18px, 3vw, 28px);
    border-radius: var(--radius-pill);
  }
  .note { margin: 0; font-size: 0.85rem; color: var(--text-2); }
  .copy { margin: 0; font-size: 0.85rem; color: var(--text-3); }
  .copy a { color: var(--text-3); }
  .dot { padding: 0 8px; }
</style>
```

- [ ] **Step 6: index.astro 挂到 Base**

替换 `src/pages/index.astro` 全部内容：
```astro
---
import Base from '../layouts/Base.astro';
---
<Base>
  <section class="glass card">
    <h1>脚手架已就绪</h1>
    <p>导航、玻璃外壳、主题切换已可用。欢迎首页将在 Task 9 落地。</p>
  </section>
</Base>
```

- [ ] **Step 7: 构建验收 + 视觉抽检**

Run: `npm run build`
Expected: 退出码 0，无 error/warning。

Run: `npm run dev`（终端后台运行，`Ctrl+C` 停止）
Expected: `Local http://localhost:4321/`。浏览器打开检查：① 页面有彩色光斑缓慢流动（若系统开「减少动态效果」则静止，属预期）；② 顶部悬浮玻璃胶囊导航，当前页「欢迎」外无高亮（主页不在 nav 里）；③ 点击主题按钮全站亮/暗切换、刷新后保持；④ 窗口缩到 <880px 出现汉堡按钮，点开出现下拉菜单；⑤ 页脚年份正确。

- [ ] **Step 8: 提交**

```bash
git add src/pages src/layouts src/components && git commit -m "feat: 玻璃外壳 — Base 布局、导航、主题切换、光斑层、页脚"
```
Expected: commit 成功。

## Task 4: 内容层（5 集合 schema + 种子内容 + 内容工具库）

**Files:**
- Create: `src/content.config.ts`、`src/lib/text.ts`、`src/lib/date.ts`、`src/lib/collections.ts`
- Create 种子与模板：`src/content/notes/_notes-template.md.example`、`src/content/musings/_musings-template.md.example`、`src/content/photos/_photos-template.md.example`、`src/content/links/_links-template.md.example`、`src/content/projects/_projects-template.md.example`
- Create 种子内容：notes 3 篇、musings 2 篇、links 3 条、projects 2 个；photos 3 张渐变 SVG + 同名 md

**Interfaces:**
- Consumes: Task 1 脚手架。
- Produces（锁死签名，Task 5–12 全部引用）：
  - `src/content.config.ts`：导出 `collections`（5 集合，字段见 Global Constraints 第 3 条）
  - `src/lib/text.ts`：`stripMarkdown(md: string): string`、`excerpt(md: string, len?: number): string`
  - `src/lib/date.ts`：`formatDate(iso: string): string`（`2026年9月6日` 样式；解析失败原样返回）
  - `src/lib/collections.ts`：
    - `listSorted<C>(coll: C)`：过滤 draft、date 倒序（photos 也按 date 倒序）
    - 接口 `PostItem { title; url; date; summary; tags: string[] }`、`LinkItem { title; url; date; note; tags: string[]; host }`、`ProjectItem { title; date; url?; repo?; tech: string[]; summary }`
    - 异步函数：`noteItems(): Promise<PostItem[]>`、`musingItems(): Promise<PostItem[]>`（tags 恒 []）、`linkItems(): Promise<LinkItem[]>`、`projectItems(): Promise<ProjectItem[]>`、`photoEntries()`（返回排序后 `CollectionEntry<'photos'>[]`）

- [ ] **Step 1: 内容 schema**

Create `src/content.config.ts`：
```ts
import { defineCollection, z } from 'astro:content';

const base = {
  title: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 需为 YYYY-MM-DD'),
  summary: z.string().optional(),
  draft: z.boolean().default(false),
};

export const collections = {
  notes: defineCollection({
    type: 'content',
    schema: z.object({ ...base, tags: z.array(z.string()).default([]) }),
  }),
  musings: defineCollection({
    type: 'content',
    schema: z.object({ ...base }),
  }),
  links: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      url: z.url(),
      tags: z.array(z.string()).default([]),
    }),
  }),
  projects: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      tech: z.array(z.string()),
      url: z.url().optional(),
      repo: z.string().optional(),
    }),
  }),
  photos: defineCollection({
    type: 'content',
    schema: ({ image }) =>
      z.object({
        ...base,
        image: image(), // 相对路径 = 与本 .md 同目录的同名文件
        alt: z.string().min(1, 'alt 必填'),
        location: z.string().optional(),
        album: z.string().optional(),
        camera: z
          .object({
            body: z.string().optional(),
            lens: z.string().optional(),
            f: z.string().optional(),
            ss: z.string().optional(),
            iso: z.string().optional(),
          })
          .optional(),
      }),
  }),
};
```

- [ ] **Step 2: 文本与日期工具**

Create `src/lib/text.ts`：
```ts
/** 去除 Markdown 标记，仅保留可读文本（供搜索索引/摘要用） */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 代码块整体视为空格
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^#{1,6}\s+/gm, '') // 标题
    .replace(/^>\s?/gm, '') // 引用
    .replace(/^[-*+]\s+/gm, '') // 无序列表符
    .replace(/^\d+[.)]\s+/gm, '') // 有序列表符
    .replace(/[*_~]/g, '') // 强调符号
    .replace(/\s+/g, ' ')
    .trim();
}

/** 生成定长摘要，超出截断加省略号 */
export function excerpt(md: string, len = 140): string {
  const text = stripMarkdown(md);
  return text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;
}
```

Create `src/lib/date.ts`：
```ts
/** ISO 日期 → 「2026年9月6日」；解析失败时原样返回 */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
```

- [ ] **Step 3: 集合工具**

Create `src/lib/collections.ts`：
```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { excerpt } from './text';

/** 过滤 draft 并按 date 倒序（Global Constraints 第 4 条） */
export async function listSorted<C extends 'notes' | 'musings' | 'links' | 'projects' | 'photos'>(
  coll: C,
): Promise<CollectionEntry<C>[]> {
  const all = await getCollection(coll);
  return all
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export interface PostItem {
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
}

export interface LinkItem {
  title: string;
  url: string;
  date: string;
  note: string;
  tags: string[];
  host: string;
}

export interface ProjectItem {
  title: string;
  date: string;
  url?: string;
  repo?: string;
  tech: string[];
  summary: string;
}

function toPostItem(e: CollectionEntry<'notes'>): PostItem {
  return {
    title: e.data.title,
    url: `/notes/${e.slug}`,
    date: e.data.date,
    summary: e.data.summary ?? excerpt(e.body ?? '', 150),
    tags: e.data.tags ?? [],
  };
}

export async function noteItems(): Promise<PostItem[]> {
  return (await listSorted('notes')).map(toPostItem);
}

export async function musingItems(): Promise<PostItem[]> {
  const all = await listSorted('musings');
  return all.map((e) => ({
    title: e.data.title,
    url: `/musings/${e.slug}`,
    date: e.data.date,
    summary: e.data.summary ?? excerpt(e.body ?? '', 150),
    tags: [],
  }));
}

export async function linkItems(): Promise<LinkItem[]> {
  const all = await listSorted('links');
  return all.map((e) => ({
    title: e.data.title,
    url: e.data.url,
    date: e.data.date,
    note: excerpt(e.body ?? '', 130),
    tags: e.data.tags ?? [],
    host: new URL(e.data.url).hostname.replace(/^www\./, ''),
  }));
}

export async function projectItems(): Promise<ProjectItem[]> {
  const all = await listSorted('projects');
  return all.map((e) => ({
    title: e.data.title,
    date: e.data.date,
    url: e.data.url,
    repo: e.data.repo,
    tech: e.data.tech,
    summary: excerpt(e.body ?? '', 180),
  }));
}

export async function photoEntries(): Promise<CollectionEntry<'photos'>[]> {
  return listSorted('photos');
}
```

- [ ] **Step 4: 各集合模板文件（5 个，用户日后复制即可发文）**

Create `src/content/notes/_notes-template.md.example`：
```md
---
title: 文章标题（必填）
date: 2026-09-06
summary: 列表卡片上的一句话摘要（可留空，留空自动取正文开头）
tags: [标签一, 标签二]
draft: true
---
文件名 = URL slug，用英文 kebab-case、不要带日期（如 my-first-post.md）。
正文用 Markdown 书写。写完把 draft 改为 false（或删掉该行）才会出现在站点上。
```

Create `src/content/musings/_musings-template.md.example`：
```md
---
title: 迷思标题
date: 2026-09-06
summary: 一句话摘要（可留空）
draft: true
---
个人迷思没有标签字段。文件名用英文 kebab-case，如 a-small-thought.md。
```

Create `src/content/links/_links-template.md.example`：
```md
---
title: 站点名称
url: https://example.com
date: 2026-09-06
tags: [工具, 前端]
draft: true
---
正文第一段 = 为什么收藏它的一句话点评（列表页展示摘要）。
```

Create `src/content/projects/_projects-template.md.example`：
```md
---
title: 项目名
date: 2026-09-06
url: https://demo.example.com
repo: https://github.com/you/repo
tech: [Astro, CSS]
draft: true
---
正文描述项目：解决的问题、我的角色、亮点。url 与 repo 至少提供一个。
```

Create `src/content/photos/_photos-template.md.example`：
```md
---
title: 照片标题
date: 2026-09-06
image: ./同名文件.jpg
alt: 图片内容描述（无障碍必填，空则构建失败）
location: 拍摄地点（可省）
camera:
  body: 机身
  lens: 镜头
  f: f/2.8
  ss: 1/500s
  iso: ISO 100
album: 相册名（可省）
draft: true
---
照片原件与本文档同名同目录（如 tokyo-night.jpg）。可留空正文。
```

- [ ] **Step 5: notes 种子（3 篇，正文含代码块与标题，供渲染与搜索验收）**

Create `src/content/notes/astro-glass-notes.md`：
```md
---
title: 用纯 CSS 还原 Apple 液态玻璃
date: 2026-09-01
tags: [CSS, 设计系统]
summary: 液态玻璃不是图片特效，而是一套可复刻的视觉规则：半透明、背景模糊提饱和、高光描边。
---
液态玻璃（Liquid Glass）在 Web 上完全可以用纯 CSS 还原。

## 三个关键层

1. **半透明面板** —— 背景色带 alpha 通道；
2. **折射素材** —— 背后必须有流动的彩色光斑，玻璃才有可模糊的东西；
3. **高光描边** —— 1px 半透明白边框加顶部渐变模拟玻璃反光。

```css
.glass {
  background: linear-gradient(180deg, var(--glass-hl), transparent 34%),
    var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid var(--glass-border);
}
```

## 别忘了降级

不支持 `backdrop-filter` 的浏览器要回退到近实心面板；`prefers-reduced-motion` 用户要停掉光斑动画。
```

Create `src/content/notes/git-rebase-cheatsheet.md`：
```md
---
title: Git Rebase 速查：何时用、何时逃
date: 2026-08-20
tags: [Git, 工具]
summary: 把 rebase 当作整理本地历史的手段，而不是合并分支的默认姿势。
---
`rebase` 的价值在于把本地一堆「WIP」压缩成清晰的提交。

## 常用命令

```bash
git rebase -i HEAD~3   # 整理最近 3 个提交
git rebase main        # 把分支移到 main 之上
git rebase --abort     # 反悔，回到整理前
```

## 黄金法则

**绝不对已推送的提交 rebase**。推送过的历史要改写时，先想清楚谁会受害。

被 force-push 打乱的同事实操：`git fetch && git reset --hard origin/main` 之前，先 `git stash` 或另开分支保命。
```

Create `src/content/notes/terminal-setup-2026.md`：
```md
---
title: 2026 年我的终端清单
date: 2026-07-15
tags: [终端, 效率]
summary: 一套跨平台够用的终端组合：字体、提示符、模糊玻璃半透明。
---
从 Windows Terminal 到 macOS 的 iTerm，能统一的地方尽量统一。

## 固定搭配

- 终端：Windows Terminal / iTerm2，背景开毛玻璃半透明；
- Shell：zsh + starship 提示符；
- 字体：等宽字体里找支持中文的，避免中文回退到宋体。

> 提示符宁简勿繁：显示「目录 + 分支」就够了。

## 配置放仓库

把 dotfiles 放进 git 仓库是维护终端配置最省心的方式——重装系统后一条命令拉回来。
```

- [ ] **Step 6: musings / links / projects 种子**

Create `src/content/musings/why-keep-a-blog.md`：
```md
---
title: 为什么还在写博客
date: 2026-08-28
summary: 输出是最好的输入。给自己看的笔记，写着写着就成了给别人的文章。
---
写博客这件事，坚持下来的人越来越少。

但我越来越觉得它值得：把一个想法写到能给别人看的程度，才算真正想明白了。笔记是零散的，文章是完整的；而博客恰好逼着你走完中间那段路。

数据、算法、评论都抵不上「写下来」这一个动作本身。
```

Create `src/content/musings/slow-photography.md`：
```md
---
title: 慢摄影
date: 2026-06-02
summary: 一卷 36 张的胶片迫使我重新学会等待。
---
数码时代按下快门不要钱，但「不要钱」也意味着「不珍惜」。

带胶片机出门时，每一张都要先想：光线对吗？值得吗？于是拍得少了，看得多了。36 张的配额让取景框重新变得珍贵。

也许写作也一样——有了发布成本，才会认真打磨。
```

Create `src/content/links/raycast-manual.md`：
```md
---
title: Raycast 官方手册
url: https://manual.raycast.com
date: 2026-08-30
tags: [工具, macOS]
---
把启动器玩成生产力中枢的官方说明书，快捷键与扩展的最佳实践都在这里。
```

Create `src/content/links/plaintext-blog.md`：
```md
---
title: 写作要有 68 字符的边界
url: https://example.com/plaintext-blog
date: 2026-08-15
tags: [写作, 排版]
---
关于正文行宽与可读性的经典讨论：窄栏阅读为何更舒适。
```

Create `src/content/links/shadcn-css.md`：
```md
---
title: CSS 变量驱动的主题切换实践
url: https://example.com/shadcn-css
date: 2026-07-02
tags: [CSS, 前端]
---
如何用语义 token + 变量覆盖做多主题，与本站的暗色方案思路一致。
```

Create `src/content/projects/this-blog.md`：
```md
---
title: 本站 · 液态玻璃博客
date: 2026-09-06
repo: https://github.com/USERNAME/USERNAME.github.io
tech: [Astro, TypeScript, CSS]
---
用 Astro 5 构建的个人站点：内容集合 + schema 校验、纯 CSS 液态玻璃视觉、亮暗双主题、站内搜索，GitHub Actions 自动部署到 Pages。

日常更新只需要往 `src/content/` 丢 Markdown 文件。
```

Create `src/content/projects/photo-organizer.md`：
```md
---
title: Photo Organizer（占位项目）
date: 2026-05-12
url: https://example.com/photo-organizer
tech: [Go, SQLite]
---
按拍摄时间自动整理照片目录的命令行小工具。思路：EXIF 读取 + 移动 + 冲突改名，一条命令完成。

（示例内容，替换为自己的真实项目即可。）
```

- [ ] **Step 7: photos 占位图 + 描述（3 张渐变 SVG 走完整 image 管线）**

Create `src/content/photos/harbor-sunset.svg`：
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" viewBox="0 0 1600 1067">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#27406e"/>
      <stop offset="0.55" stop-color="#f28a57"/>
      <stop offset="1" stop-color="#f7c98b"/>
    </linearGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="120"/>
    </filter>
  </defs>
  <rect width="1600" height="1067" fill="url(#sky)"/>
  <rect y="760" width="1600" height="307" fill="#1d2a3f"/>
  <circle cx="1120" cy="620" r="180" fill="#ffd9a0" filter="url(#soft)" opacity="0.9"/>
  <circle cx="300" cy="300" r="260" fill="#ffb27d" filter="url(#soft)" opacity="0.7"/>
  <circle cx="1330" cy="250" r="300" fill="#7d9bd6" filter="url(#soft)" opacity="0.8"/>
</svg>
```
> 占位说明：橙色光斑压深蓝「海面」的合成 —— 替换真图时把 `<slug>.svg` 换成同名 `<slug>.jpg`，md 里 `image:` 路径同步改，其余零改动（Global Constraints 第 12 条）。

Create `src/content/photos/harbor-sunset.md`：
```md
---
title: 港口日落
date: 2026-09-03
image: ./harbor-sunset.svg
alt: 深蓝海面上方由靛蓝过渡到橙黄的渐变天空，右下有一颗明亮的光斑
location: 示例地点（替换为真实拍摄地）
camera:
  f: f/8
  ss: 1/250s
  iso: ISO 100
---
占位照片：替换为真实摄影作品。
```

Create `src/content/photos/misty-valley.svg`：
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" viewBox="0 0 1600 1067">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#31586b"/>
      <stop offset="1" stop-color="#cfe3e0"/>
    </linearGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="110"/>
    </filter>
  </defs>
  <rect width="1600" height="1067" fill="url(#g)"/>
  <circle cx="460" cy="330" r="230" fill="#e8f4ee" filter="url(#soft)" opacity="0.85"/>
  <circle cx="1180" cy="760" r="280" fill="#2c4a5e" filter="url(#soft)" opacity="0.9"/>
  <circle cx="900" cy="520" r="200" fill="#9db8bb" filter="url(#soft)" opacity="0.7"/>
</svg>
```

Create `src/content/photos/misty-valley.md`：
```md
---
title: 雾谷
date: 2026-08-11
image: ./misty-valley.svg
alt: 青色山谷渐变，中央一团柔和的雾光
location: 示例地点
camera:
  body: 示例机身
  lens: 35mm
  f: f/5.6
  iso: ISO 200
---
占位照片：替换为真实摄影作品。
```

Create `src/content/photos/neon-street.svg`：
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067" viewBox="0 0 1600 1067">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#160f2e"/>
      <stop offset="1" stop-color="#331d4e"/>
    </linearGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="100"/>
    </filter>
  </defs>
  <rect width="1600" height="1067" fill="url(#bg)"/>
  <circle cx="520" cy="380" r="220" fill="#ff4fd8" filter="url(#soft)" opacity="0.85"/>
  <circle cx="1130" cy="700" r="260" fill="#39a0ff" filter="url(#soft)" opacity="0.8"/>
  <circle cx="840" cy="200" r="180" fill="#8a6cff" filter="url(#soft)" opacity="0.6"/>
  <rect x="240" y="640" width="1120" height="10" rx="5" fill="#39a0ff" opacity="0.5"/>
  <rect x="420" y="740" width="760" height="10" rx="5" fill="#ff4fd8" opacity="0.45"/>
</svg>
```

Create `src/content/photos/neon-street.md`：
```md
---
title: 霓虹街
date: 2026-06-28
image: ./neon-street.svg
alt: 深紫夜色中品红与蓝色霓虹光斑，下方两条水平的霓虹灯带
location: 示例地点
camera:
  f: f/2
  ss: 1/60s
  iso: ISO 1600
---
占位照片：替换为真实摄影作品。
```

- [ ] **Step 8: 构建验收（schema 生效）**

Run: `npm run build`
Expected: 退出码 0。关键验证——把 schema 与内容接上电：临时把某篇 notes 的 `date` 改成 `2026/09/01` 再 build，应报错并指名该文件；随后**还原**并再 build 确认 0 error（还原后退出码 0 即通过）。

- [ ] **Step 9: 提交**

```bash
git add src/content src/lib && git commit -m "feat: 内容层 — 5 集合 schema、种子内容与集合工具库"
```
Expected: commit 成功。

## Task 5: 通用内容组件 + 笔记/迷思列表与详情页

**Files:**
- Create: `src/components/GlassCard.astro`、`src/components/Pill.astro`、`src/components/SectionHeader.astro`、`src/components/PostCard.astro`、`src/components/PostList.astro`、`src/layouts/Post.astro`
- Create: `src/pages/notes/index.astro`、`src/pages/notes/[slug].astro`、`src/pages/musings/index.astro`、`src/pages/musings/[slug].astro`

**Interfaces:**
- Consumes: Task 2 `.glass` 等；Task 4 `noteItems()` `musingItems()` `listSorted()`、`PostItem`、`formatDate`
- Produces（锁死签名）：
  - `GlassCard.astro` props `{ hover?: boolean; class?: string }`，默认 hover 提升，slot 内容
  - `Pill.astro` props `{ text: string; as?: 'span' | 'a'; href?: string }`（href 给定时渲染 `<a>`）
  - `SectionHeader.astro` props `{ title: string; count?: number; moreHref?: string; moreLabel?: string; note?: string }`
  - `PostCard.astro` props `{ post: PostItem; hideTags?: boolean }` —— 首页复用
  - `PostList.astro` props `{ items: PostItem[]; title?: string; groupByYear?: boolean; filterable?: boolean }` —— 笔记/迷思列表通用
  - `Post.astro`（详情布局）props `{ label: string; backHref: string; title: string; date: string; tags?: string[]; summary?: string }` + slot=正文 `<Content/>`

- [ ] **Step 1: GlassCard / Pill / SectionHeader**

Create `src/components/GlassCard.astro`：
```astro
---
interface Props {
  hover?: boolean;
  class?: string;
}
const { hover = true, class: className } = Astro.props;
---
<div class:list={['glass', 'glasscard', hover && 'raise', className]}>
  <slot />
</div>

<style>
  .glasscard { transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out; }
  .raise:hover {
    transform: translateY(var(--card-hover));
    box-shadow: var(--glass-shadow-lg);
    border-color: color-mix(in srgb, var(--glass-hl) 75%, var(--glass-border));
  }
</style>
```

Create `src/components/Pill.astro`：
```astro
---
interface Props {
  text: string;
  as?: 'span' | 'a';
  href?: string;
}
const { text, as = 'span', href } = Astro.props;
---
{
  as === 'a' && href ? (
    <a class="pill" href={href}>{text}</a>
  ) : (
    <span class="pill">{text}</span>
  )
}
```

Create `src/components/SectionHeader.astro`：
```astro
---
import Pill from './Pill.astro';

interface Props {
  title: string;
  count?: number;
  moreHref?: string;
  moreLabel?: string;
  note?: string;
}
const { title, count, moreHref, moreLabel = '查看全部', note } = Astro.props;
---
<div class="head">
  <h2 class="t">
    {title}
    {count !== undefined && <Pill text={String(count)} />}
  </h2>
  {note && <p class="note">{note}</p>}
  {moreHref && <a class="more" href={moreHref}>{moreLabel} →</a>}
</div>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 18px;
    margin: 0 0 18px;
  }
  .t {
    margin: 0;
    font-size: clamp(1.25rem, 3vw, 1.55rem);
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .note { margin: 0; color: var(--text-3); font-size: 0.9rem; flex-basis: 100%; }
  .more { margin-left: auto; font-size: 0.92rem; font-weight: 600; }
  .more:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 2: PostCard / PostList**

Create `src/components/PostCard.astro`：
```astro
---
import GlassCard from './GlassCard.astro';
import Pill from './Pill.astro';
import { formatDate } from '../lib/date';
import type { PostItem } from '../lib/collections';

interface Props {
  post: PostItem;
  hideTags?: boolean;
}
const { post, hideTags = false } = Astro.props;
const year = post.date.slice(0, 4);
---
<GlassCard class="pcard" hover>
  <article data-tags={post.tags.join(' ')}>
    <h3 class="pt"><a href={post.url}>{post.title}</a></h3>
    <p class="pm">{year} · {formatDate(post.date)}</p>
    {post.summary && <p class="ps">{post.summary}</p>}
    {!hideTags && post.tags.length > 0 && (
      <div class="ptags">
        {post.tags.map((t) => <Pill text={t} />)}
      </div>
    )}
  </article>
</GlassCard>

<style>
  .pcard { display: block; padding: clamp(16px, 2.4vw, 22px) clamp(16px, 2.6vw, 24px); }
  .pcard:hover { text-decoration: none; }
  .pt { margin: 0 0 6px; font-size: 1.12rem; }
  .pt a { color: var(--text-1); }
  .pt a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .pm { margin: 0 0 8px; font-size: 0.82rem; color: var(--text-3); }
  .ps { margin: 0 0 12px; color: var(--text-2); font-size: 0.94rem; line-height: 1.6; }
  .ptags { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
```
> 说明：整卡包 `<GlassCard>` 但链接仅标题，避免整卡可点带来的嵌套链接与选中麻烦 —— 维护上更稳。

Create `src/components/PostList.astro`：
```astro
---
import PostCard from './PostCard.astro';
import type { PostItem } from '../lib/collections';

interface Props {
  items: PostItem[];
  title?: string;
  groupByYear?: boolean;
  filterable?: boolean; // 笔记页标签过滤
}
const { items, groupByYear = false, filterable = false } = Astro.props;
const tags = filterable ? [...new Set(items.flatMap((p) => p.tags))].sort() : [];

const groups = groupByYear
  ? [...new Set(items.map((p) => p.date.slice(0, 4)))].map((y) => ({
      year: y,
      posts: items.filter((p) => p.date.slice(0, 4) === y),
    }))
  : [{ year: '', posts: items }];
---
{
  filterable && tags.length > 1 && (
    <div class="chips" role="group" aria-label="按标签过滤">
      {tags.map((t) => (
        <button type="button" class="chip" data-tag-chip data-tag={t}>{t}</button>
      ))}
    </div>
  )
}
{
  groups.map((g) => (
    <section class="ygroup">
      {groupByYear && <h2 class="yr">{g.year}</h2>}
      <div class="pcols">
        {g.posts.map((p) => <PostCard post={p} />)}
      </div>
    </section>
  ))
}
{
  items.length === 0 && (
    <div class="glass empty">这里还空着 —— 第一篇内容正在路上。</div>
  )
}

<script>
  // 标签过滤：点选高亮、卡片显隐；再点一次取消
  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-tag-chip]')];
  const cards = [...document.querySelectorAll<HTMLElement>('[data-tags]')];
  let active: string | null = null;
  const apply = () => {
    cards.forEach((c) => {
      const own = (c.dataset.tags ?? '').split(' ').filter(Boolean);
      c.closest('.glasscard')!.hidden = !!active && !own.includes(active);
    });
    chips.forEach((ch) => ch.classList.toggle('on', ch.dataset.tag === active));
  };
  chips.forEach((ch) =>
    ch.addEventListener('click', () => {
      const t = ch.dataset.tag ?? null;
      active = active === t ? null : t;
      apply();
    }),
  );
</script>

<style>
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; }
  .chip {
    border: 1px solid var(--glass-border);
    background: linear-gradient(180deg, var(--glass-hl), transparent 40%), var(--glass-bg);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    color: var(--text-2);
    border-radius: var(--radius-pill);
    padding: 0.32em 1em;
    font-size: 0.85rem;
    cursor: pointer;
    transition: color 0.15s ease-out, box-shadow 0.15s ease-out;
  }
  .chip:hover { color: var(--text-1); }
  .chip.on {
    color: var(--text-1);
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
  .ygroup { margin-bottom: clamp(28px, 5vw, 44px); }
  .yr { font-size: 1rem; color: var(--text-3); font-weight: 600; margin: 0 0 12px; }
  .pcols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```

- [ ] **Step 3: 详情布局 Post.astro**

Create `src/layouts/Post.astro`：
```astro
---
import Base from './Base.astro';
import Pill from '../components/Pill.astro';
import { formatDate } from '../lib/date';

interface Props {
  label: string;
  backHref: string;
  title: string;
  date: string;
  tags?: string[];
  summary?: string;
}
const { label, backHref, title, date, tags = [], summary } = Astro.props;
---
<Base title={title} description={summary}>
  <article class="postpage">
    <header class="glass phead">
      <p class="crumb"><a href={backHref}>← {label}</a></p>
      <h1 class="page-title">{title}</h1>
      <p class="meta">
        {formatDate(date)}
        {tags.length > 0 && (
          <span class="tagrow">
            {tags.map((t) => <Pill text={t} />)}
          </span>
        )}
      </p>
      {summary && <p class="sum">{summary}</p>}
    </header>
    <div class="prose body"><slot /></div>
  </article>
</Base>

<style>
  .postpage { display: grid; gap: clamp(22px, 4vw, 36px); }
  .phead { padding: clamp(22px, 4vw, 36px) clamp(18px, 4vw, 40px); }
  .crumb { margin: 0 0 14px; font-size: 0.88rem; }
  .crumb a { color: var(--text-2); }
  .crumb a:hover { color: var(--accent); }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 0 0 6px; color: var(--text-3); font-size: 0.9rem; }
  .tagrow { display: inline-flex; gap: 6px; }
  .sum { color: var(--text-2); margin: 10px 0 0; }
  .body { color: var(--text-1); font-size: 1.02rem; line-height: 1.85; }
</style>
```

- [ ] **Step 4: 笔记列表页（含标签过滤）**

Create `src/pages/notes/index.astro`：
```astro
---
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import PostList from '../../components/PostList.astro';
import { noteItems } from '../../lib/collections';

const items = await noteItems();
---
<Base title="个人笔记" description="个人笔记与学习记录">
  <SectionHeader title="个人笔记" count={items.length} note="记录学习与实践中的想法，可按标签过滤。" />
  <PostList items={items} groupByYear filterable />
</Base>
```

- [ ] **Step 5: 笔记详情页**

Create `src/pages/notes/[slug].astro`：
```astro
---
import { render } from 'astro:content';
import Post from '../../layouts/Post.astro';
import { listSorted } from '../../lib/collections';
import { excerpt } from '../../lib/text';

export async function getStaticPaths() {
  const posts = await listSorted('notes');
  return posts.map((e) => ({ params: { slug: e.slug }, props: { e } }));
}

const { e } = Astro.props;
const { Content } = await render(e);
const summary = e.data.summary ?? excerpt(e.body ?? '', 150);
---
<Post
  label="个人笔记"
  backHref="/notes"
  title={e.data.title}
  date={e.data.date}
  tags={e.data.tags ?? []}
  summary={summary}
>
  <Content />
</Post>
```

- [ ] **Step 6: 迷思列表与详情页**

Create `src/pages/musings/index.astro`：
```astro
---
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import PostList from '../../components/PostList.astro';
import { musingItems } from '../../lib/collections';

const items = await musingItems();
---
<Base title="个人迷思" description="个人迷思与随笔">
  <SectionHeader title="个人迷思" count={items.length} note="没有体系的碎碎念，按时间倒序。" />
  <PostList items={items} />
</Base>
```

Create `src/pages/musings/[slug].astro`：
```astro
---
import { render } from 'astro:content';
import Post from '../../layouts/Post.astro';
import { listSorted } from '../../lib/collections';
import { excerpt } from '../../lib/text';

export async function getStaticPaths() {
  const posts = await listSorted('musings');
  return posts.map((e) => ({ params: { slug: e.slug }, props: { e } }));
}

const { e } = Astro.props;
const { Content } = await render(e);
const summary = e.data.summary ?? excerpt(e.body ?? '', 150);
---
<Post label="个人迷思" backHref="/musings" title={e.data.title} date={e.data.date} summary={summary}>
  <Content />
</Post>
```

- [ ] **Step 7: 构建 + 走查验收**

Run: `npm run build`
Expected: 退出码 0、零警告；产物包含 `dist/notes/index.html`、`dist/notes/astro-glass-notes/index.html`、`dist/musings/index.html` 等。

Run: `npm run dev` 后浏览器验收：
- `/notes`：按年分组（2026 组）卡片齐全；点标签 chip 过滤生效、再点取消；计数正确（3）
- `/notes/astro-glass-notes`：玻璃页头 + 窄栏正文，代码块为深色玻璃卡，行内代码/引用有样式
- `/musings` 与 `/musings/why-keep-a-blog`：同样正常
- 不存在 slug（如 `/notes/nope`）由 404 兜底（Task 11 才有专门页，此刻出现 Astro 默认 404 属正常）
- 导航「个人笔记」项高亮 `is-active`

- [ ] **Step 8: 提交**

```bash
git add src/components src/layouts src/pages && git commit -m "feat: 笔记与迷思 — 列表(年份分组/标签过滤)与详情页"
```
Expected: commit 成功。

## Task 6: 摄影作品集（PhotoCard + Lightbox + /photos）

**Files:**
- Create: `src/components/PhotoCard.astro`、`src/components/Lightbox.astro`、`src/scripts/lightbox.ts`、`src/pages/photos/index.astro`

**Interfaces:**
- Consumes: Task 4 `photoEntries()`（返回 `CollectionEntry<'photos'>[]`）；Task 2 `.glass`
- Produces（锁死签名）：
  - `PhotoCard.astro` props `{ title; alt; date; location?; img: { src: string; srcset?: string }; index?: number; href?: string }` —— 有 `href` 渲染为链接（首页预览用）；有 `index` 渲染为 `data-photo` 按钮（/photos 用）；两者都无 = 纯展示
  - `Lightbox.astro` 无 props：原生 `<dialog id="lightbox">`，内部 `[data-lb-img]`/`[data-lb-cap]`/`[data-lb-close]`/`[data-lb-prev]`/`[data-lb-next]`
  - `src/scripts/lightbox.ts`：读 `#photo-collection`（JSON，由页面内嵌）与 `#lightbox`，`[data-photo][data-index]` 点击开图、翻页、ESC/遮罩/按钮关闭、关闭后焦点还原

- [ ] **Step 1: PhotoCard.astro**

Create `src/components/PhotoCard.astro`：
```astro
---
interface Props {
  title: string;
  alt: string;
  date: string;
  location?: string;
  img: { src: string; srcset?: string };
  index?: number;
  href?: string;
}
const { title, alt, date, location, img, index, href } = Astro.props;
const attrs = href
  ? { href, ...(index !== undefined ? {} : {}) }
  : index !== undefined
    ? { type: 'button', 'data-photo': '', 'data-index': String(index) }
    : {};
---
{
  href ? (
    <a class="glass photocard" {href} aria-label={`查看摄影作品集：${title}`}>
      <span class="frame">
        <img src={img.src} srcset={img.srcset} alt={alt} loading="lazy" decoding="async" />
        <span class="cap"><strong>{title}</strong><em>{location ?? date}</em></span>
      </span>
    </a>
  ) : index !== undefined ? (
    <button class="glass photocard" {...attrs} aria-label={`查看大图：${title}`}>
      <span class="frame">
        <img src={img.src} srcset={img.srcset} alt={alt} loading="lazy" decoding="async" />
        <span class="cap"><strong>{title}</strong><em>{location ?? date}</em></span>
      </span>
    </button>
  ) : (
    <figure class="glass photocard">
      <span class="frame">
        <img src={img.src} srcset={img.srcset} alt={alt} loading="lazy" decoding="async" />
        <figcaption class="cap"><strong>{title}</strong><em>{location ?? date}</em></figcaption>
      </span>
    </figure>
  )
}

<style>
  .photocard {
    display: block;
    width: 100%;
    padding: 10px;
    border-radius: calc(var(--glass-radius) + 6px);
    color: var(--text-1);
    cursor: pointer;
    transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out;
    text-align: left;
    font: inherit;
  }
  .photocard:hover {
    transform: translateY(var(--card-hover));
    box-shadow: var(--glass-shadow-lg);
    border-color: color-mix(in srgb, var(--glass-hl) 75%, var(--glass-border));
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
    background: linear-gradient(180deg, transparent, rgba(8, 10, 20, 0.62));
    color: #f4f6ff;
    font-size: 0.86rem;
    font-style: normal;
  }
  .cap em { font-style: normal; opacity: 0.82; font-size: 0.78rem; }
  figure.photocard { margin: 0; }
</style>
```

- [ ] **Step 2: Lightbox.astro**

Create `src/components/Lightbox.astro`：
```astro
---
// 原生 <dialog> 灯箱：零依赖。逻辑在 scripts/lightbox.ts（由页面挂载时 import）。
---
<dialog class="lb" id="lightbox" aria-label="照片查看器">
  <div class="panel">
    <button class="ctl close" type="button" data-lb-close aria-label="关闭">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12"></path>
      </svg>
    </button>
    <button class="ctl prev" type="button" data-lb-prev aria-label="上一张">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6"></path>
      </svg>
    </button>
    <button class="ctl next" type="button" data-lb-next aria-label="下一张">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6"></path>
      </svg>
    </button>
    <figure class="stage">
      <img data-lb-img alt="" />
      <figcaption data-lb-cap></figcaption>
    </figure>
  </div>
</dialog>

<style>
  .lb { padding: 0; border: 0; background: transparent; max-width: none; max-height: none; }
  .lb::backdrop {
    background: rgba(8, 10, 20, 0.55);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  .panel {
    position: relative;
    border-radius: var(--glass-radius);
    padding: 10px;
    background: rgba(20, 22, 34, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: var(--glass-shadow-lg);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    max-width: min(1240px, 94vw);
  }
  .stage { margin: 0; max-width: min(1200px, 92vw); }
  .stage img { max-height: 82vh; width: auto; max-width: 100%; margin-inline: auto; border-radius: calc(var(--radius-s) - 4px); }
  .stage figcaption {
    padding: 12px 4px 2px;
    color: var(--text-1);
    font-size: 0.92rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
  }
  .stage figcaption em { font-style: normal; color: var(--text-3); }
  .ctl {
    position: absolute;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    cursor: pointer;
    transition: background 0.15s ease-out;
  }
  .ctl:hover { background: rgba(255, 255, 255, 0.24); }
  .close { top: 18px; right: 18px; }
  .prev { left: 18px; top: 50%; transform: translateY(-50%); }
  .next { right: 18px; top: 50%; transform: translateY(-50%); }
</style>
```

- [ ] **Step 3: lightbox.ts**

Create `src/scripts/lightbox.ts`：
```ts
interface PhotoMeta {
  title: string;
  alt: string;
  date: string;
  location?: string;
  camera?: string;
  full: string;
}

const raw = document.getElementById('photo-collection');
const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
if (!raw || !dialog) throw new Error('灯箱缺少 #photo-collection 或 #lightbox');

const photos = JSON.parse(raw.textContent ?? '[]') as PhotoMeta[];
if (photos.length === 0) return;

const img = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!;
const cap = dialog.querySelector<HTMLElement>('[data-lb-cap]')!;
let idx = 0;
let opener: HTMLElement | null = null;

function cameraLine(p: PhotoMeta): string {
  return [p.date, p.location, p.camera].filter(Boolean).join(' · ');
}

function show(i: number): void {
  idx = (i + photos.length) % photos.length;
  const p = photos[idx];
  img.src = p.full;
  img.alt = p.alt;
  cap.textContent = `${p.title} — ${cameraLine(p)}`;
}

function open(i: number, btn: HTMLElement): void {
  opener = btn;
  show(i);
  dialog?.showModal();
}

function close(): void {
  dialog?.close();
  opener?.focus();
}

const buttons = [...document.querySelectorAll<HTMLElement>('[data-photo][data-index]')];
buttons.forEach((b) => {
  const i = Number(b.dataset.index ?? 0);
  b.addEventListener('click', () => open(i, b));
});

dialog.querySelector('[data-lb-close]')?.addEventListener('click', close);
dialog.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(idx - 1));
dialog.querySelector('[data-lb-next]')?.addEventListener('click', () => show(idx + 1));
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) close(); // 点遮罩关闭（::backdrop 上的点击目标是 dialog 自身）
});
dialog.addEventListener('close', () => opener?.focus());
dialog.addEventListener('cancel', () => close()); // ESC
```
> 说明：`cancel` 事件里调 `close()` 是为了把焦点还给缩略图；不阻止默认行为，dialog 仍会正常关闭。

- [ ] **Step 4: photos/index.astro**

Create `src/pages/photos/index.astro`：
```astro
---
import { getImage } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import PhotoCard from '../../components/PhotoCard.astro';
import Lightbox from '../../components/Lightbox.astro';
import { photoEntries } from '../../lib/collections';

const entries = await photoEntries();

// 构建期生成缩略图(响应式 webp)与大图；SVG 占位原样直出（Global Constraints 12 条）
const metas = await Promise.all(
  entries.map(async (p) => {
    const grid = await getImage({
      src: p.data.image,
      widths: [420, 800, 1200],
      sizes: '(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw',
      format: 'webp',
    });
    const big = await getImage({ src: p.data.image, width: 1800 });
    const c = p.data.camera;
    const camera = c
      ? [c.body, c.lens, c.f, c.ss, c.iso].filter(Boolean).join(' · ')
      : undefined;
    return {
      title: p.data.title,
      alt: p.data.alt,
      date: p.data.date,
      location: p.data.location,
      camera,
      full: big.src,
      src: grid.src,
      srcset: grid.attributes.srcset ?? undefined,
    };
  }),
);
// 数组顺序即灯箱翻页顺序（与缩略图 data-index 对齐）；转义 < 防 JSON 被当 HTML 解析
const metaJson = JSON.stringify(metas).replace(/</g, '\\u003c');
---
<Base title="摄影作品集" description="摄影作品集">
  <SectionHeader
    title="摄影作品集"
    count={entries.length}
    note="点击照片查看大图与拍摄信息。"
  />
  {
    entries.length > 0 ? (
      <div class="pgrid">
        {entries.map((p, i) => (
          <PhotoCard
            title={p.data.title}
            alt={p.data.alt}
            date={p.data.date}
            location={p.data.location}
            img={{ src: metas[i].src, srcset: metas[i].srcset }}
            index={i}
          />
        ))}
      </div>
    ) : (
      <div class="glass empty">相册还空着 —— 把第一张照片放进 src/content/photos/ 吧。</div>
    )
  }
  <Lightbox />
</Base>

<script is:inline type="application/json" id="photo-collection">{metaJson}</script>
<script>
  import '../scripts/lightbox.ts';
</script>

<style>
  .pgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```

- [ ] **Step 5: 构建 + 走查验收**

Run: `npm run build`
Expected: 退出码 0；产物含 `dist/photos/index.html`。

Run: `npm run dev` 浏览器验收（`/photos`）：
- 3 张渐变占位图以 3:2 玻璃卡片网格展示，卡片带玻璃底衬与底部渐变说明条
- 点击第 1 张：灯箱打开显示大图；「→」到第 2 张、「←」回第 1 张；到末尾再「→」回绕到第 1 张
- 关闭按钮、点遮罩、ESC 三种方式均可关闭，关闭后焦点回到被点的缩略图
- 图片区域滚动懒加载正常（`loading="lazy"`）

- [ ] **Step 6: 提交**

```bash
git add src/pages/photos src/components/PhotoCard.astro src/components/Lightbox.astro src/scripts && git commit -m "feat: 摄影作品集 — 玻璃画廊与原生 dialog 灯箱"
```
Expected: commit 成功。

## Task 7: 网站参考页（/links）

**Files:**
- Create: `src/components/LinkCard.astro`、`src/pages/links/index.astro`

**Interfaces:**
- Consumes: Task 4 `linkItems()`、`LinkItem`；Task 2 `.glass`；Task 6 无
- Produces: `LinkCard.astro` props `{ link: LinkItem }`；`/links` 页面（玻璃卡片清单，外链新标签打开）

- [ ] **Step 1: LinkCard.astro**

Create `src/components/LinkCard.astro`：
```astro
---
import GlassCard from './GlassCard.astro';
import Pill from './Pill.astro';
import { formatDate } from '../lib/date';
import type { LinkItem } from '../lib/collections';

interface Props { link: LinkItem }
const { link } = Astro.props;
const initial = link.host.charAt(0).toUpperCase();
---
<GlassCard class="lcard" hover>
  <article>
    <div class="row">
      <span class="fav" aria-hidden="true">{initial}</span>
      <div class="ids">
        <h3 class="lt"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></h3>
        <p class="host">{link.host}</p>
      </div>
    </div>
    {link.note && <p class="ln">{link.note}</p>}
    <p class="lm">{formatDate(link.date)} · 收藏</p>
    {link.tags.length > 0 && (
      <div class="ltags">
        {link.tags.map((t) => <Pill text={t} />)}
      </div>
    )}
  </article>
</GlassCard>

<style>
  .lcard { padding: clamp(16px, 2.4vw, 22px) clamp(16px, 2.6vw, 24px); height: 100%; }
  .lcard:hover { text-decoration: none; }
  .row { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .fav {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    font-weight: 800;
    font-size: 1.1rem;
    color: #fff;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #b26be0));
    box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .ids { min-width: 0; }
  .lt { margin: 0; font-size: 1.06rem; }
  .lt a { color: var(--text-1); }
  .lt a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .host { margin: 2px 0 0; font-size: 0.8rem; color: var(--text-3); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ln { margin: 0 0 12px; color: var(--text-2); font-size: 0.94rem; line-height: 1.6; }
  .lm { margin: 0 0 10px; font-size: 0.8rem; color: var(--text-3); }
  .ltags { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
```

- [ ] **Step 2: links/index.astro**

Create `src/pages/links/index.astro`：
```astro
---
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import LinkCard from '../../components/LinkCard.astro';
import { linkItems } from '../../lib/collections';

const items = await linkItems();
---
<Base title="网站参考" description="有用的网站与工具收藏">
  <SectionHeader title="有用的网站参考" count={items.length} note="值得反复回访的网站，附一句收藏理由。" />
  {
    items.length > 0 ? (
      <div class="lgrid">
        {items.map((l) => <LinkCard link={l} />)}
      </div>
    ) : (
      <div class="glass empty">收藏夹还空着 —— 在 src/content/links/ 放一条吧。</div>
    )
  }
</Base>

<style>
  .lgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```

- [ ] **Step 3: 构建 + 走查**

Run: `npm run build`
Expected: 退出码 0；`dist/links/index.html` 生成。

Run: `npm run dev`：`/links` 显示 3 张收藏卡（首字母渐变圆标 + 域名等宽字体 + 点评 + 标签）；外链新标签打开；导航「网站参考」高亮。

- [ ] **Step 4: 提交**

```bash
git add src/components/LinkCard.astro src/pages/links && git commit -m "feat: 网站参考收藏页"
```
Expected: commit 成功。

---

## Task 8: 项目集页（/projects）

**Files:**
- Create: `src/components/ProjectCard.astro`、`src/pages/projects/index.astro`

**Interfaces:**
- Consumes: Task 4 `projectItems()`、`ProjectItem`
- Produces: `ProjectCard.astro` props `{ project: ProjectItem }`；`/projects` 页（玻璃网格 + 技术栈 pill + 链接按钮）

- [ ] **Step 1: ProjectCard.astro**

Create `src/components/ProjectCard.astro`：
```astro
---
import GlassCard from './GlassCard.astro';
import Pill from './Pill.astro';
import type { ProjectItem } from '../lib/collections';

interface Props { project: ProjectItem }
const { project } = Astro.props;
---
{/* 约定：样式类放本组件自渲染元素上，不传给 GlassCard 根（根元素持 GlassCard 自身 scope，
    调用方 class 上的 scoped 样式会失效 —— PostCard/LinkCard 已两次验证并修复，见 02e2e7a/feadf4e） */}
<GlassCard hover>
  <article class="prjcard">
    <h3 class="pt"><a href={project.url ?? project.repo ?? '#'}>{project.title}</a></h3>
    <p class="ps">{project.summary}</p>
    <div class="tech">
      {project.tech.map((t) => <Pill text={t} />)}
    </div>
    <div class="acts">
      {project.url && (
        <a class="act" href={project.url} target="_blank" rel="noopener noreferrer">
          在线演示 <span aria-hidden="true">↗</span>
        </a>
      )}
      {project.repo && (
        <a class="act" href={project.repo} target="_blank" rel="noopener noreferrer">
          源代码 <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  </article>
</GlassCard>

<style>
  .prjcard { padding: clamp(18px, 2.6vw, 26px); height: 100%; }
  .prjcard:hover { text-decoration: none; }
  .pt { margin: 0 0 10px; font-size: 1.16rem; }
  .pt a { color: var(--text-1); }
  .pt a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .ps { margin: 0 0 14px; color: var(--text-2); font-size: 0.94rem; line-height: 1.65; }
  .tech { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .act {
    font-size: 0.86rem;
    font-weight: 600;
    padding: 0.42em 1.05em;
    border-radius: var(--radius-pill);
    border: 1px solid var(--glass-border);
    background: color-mix(in srgb, var(--text-1) 6%, transparent);
    color: var(--text-2);
    transition: color 0.15s ease-out, border-color 0.15s ease-out;
  }
  .act:hover { color: var(--text-1); border-color: var(--accent); text-decoration: none; }
</style>
```

- [ ] **Step 2: projects/index.astro**

Create `src/pages/projects/index.astro`：
```astro
---
import Base from '../../layouts/Base.astro';
import SectionHeader from '../../components/SectionHeader.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { projectItems } from '../../lib/collections';

const items = await projectItems();
---
<Base title="项目集" description="做过的项目与作品">
  <SectionHeader title="项目集" count={items.length} note="做过的东西，以及正在做的。" />
  {
    items.length > 0 ? (
      <div class="xgrid">
        {items.map((p) => <ProjectCard project={p} />)}
      </div>
    ) : (
      <div class="glass empty">还没有项目 —— 在 src/content/projects/ 放第一个吧。</div>
    )
  }
</Base>

<style>
  .xgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .empty { padding: clamp(28px, 6vw, 60px); text-align: center; color: var(--text-2); }
</style>
```

- [ ] **Step 3: 构建 + 走查**

Run: `npm run build`
Expected: 退出码 0；`dist/projects/index.html` 生成。

Run: `npm run dev`：`/projects` 两张项目卡（标题外链、摘要、技术栈 pill、演示/源代码按钮）；导航「项目集」高亮。

- [ ] **Step 4: 提交**

```bash
git add src/components/ProjectCard.astro src/pages/projects && git commit -m "feat: 项目集页"
```
Expected: commit 成功。

## Task 9: 欢迎首页（Hero + 跨栏目最新预览流）

**Files:**
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`（整体替换 Task 3 占位）

**Interfaces:**
- Consumes: `site.config.ts`（title/tagline/intro）；Task 5 `PostCard`；Task 6 `PhotoCard`；Task 7 `LinkCard`；Task 8 `ProjectCard`；Task 4 `noteItems()/musingItems()/linkItems()/projectItems()/photoEntries()`、`getImage`；Task 2 `.glass` `.btn` `.page-title`
- Produces: `Hero.astro` 无 props；`/` 欢迎首页。首页图片预览点击跳 `/photos`（不带灯箱，避免重复挂载）

- [ ] **Step 1: Hero.astro**

Create `src/components/Hero.astro`：
```astro
---
import { site } from '../site.config';
---
<section class="glass hero">
  <div class="orb" aria-hidden="true"></div>
  <p class="eyebrow">欢迎来到我的站点</p>
  <h1 class="page-title">{site.title}</h1>
  <p class="tagline">{site.tagline}</p>
  <p class="intro">{site.intro}</p>
  <div class="acts">
    <a class="btn btn--primary" href="/notes/">开始阅读笔记</a>
    <a class="btn" href="/photos/">逛逛摄影集</a>
  </div>
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    padding: clamp(44px, 9vw, 96px) clamp(20px, 5vw, 64px);
    text-align: center;
  }
  .orb {
    position: absolute;
    width: 340px;
    height: 340px;
    left: 50%;
    top: -160px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: conic-gradient(from 180deg, var(--accent), #b26be0, #ff9db1, var(--accent));
    filter: blur(60px);
    opacity: 0.4;
    pointer-events: none;
  }
  .eyebrow {
    margin: 0 0 8px;
    font-size: 0.86rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--text-3);
    text-transform: uppercase;
  }
  .tagline { margin: 0 0 14px; font-size: clamp(1.15rem, 3vw, 1.5rem); font-weight: 600; color: var(--text-2); }
  .intro { margin: 0 auto 26px; max-width: 46ch; color: var(--text-2); }
  .acts { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
</style>
```

- [ ] **Step 2: index.astro（欢迎首页）**

替换 `src/pages/index.astro` 全部内容：
```astro
---
import { getImage } from 'astro:assets';
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
import PostCard from '../components/PostCard.astro';
import PhotoCard from '../components/PhotoCard.astro';
import LinkCard from '../components/LinkCard.astro';
import ProjectCard from '../components/ProjectCard.astro';
import {
  noteItems, musingItems, linkItems, projectItems, photoEntries,
} from '../lib/collections';

const [notes, musings, links, projects] = await Promise.all([
  noteItems(), musingItems(), linkItems(), projectItems(),
]);
const photos = (await photoEntries()).slice(0, 3);
const photoMetas = await Promise.all(
  photos.map(async (p) => {
    const g = await getImage({
      src: p.data.image,
      widths: [420, 800],
      sizes: '(min-width: 760px) 30vw, 92vw',
      format: 'webp',
    });
    return { src: g.src, srcset: g.attributes.srcset ?? undefined };
  }),
);
---
<Base>
  <Hero />

  <section class="stream">
    <SectionHeader title="最新笔记" count={notes.length} moreHref="/notes/" />
    {
      notes.length > 0 ? (
        <div class="cols">
          {notes.slice(0, 3).map((p) => <PostCard post={p} />)}
        </div>
      ) : (
        <div class="glass empty">笔记区空着 —— 期待第一篇。</div>
      )
    }
  </section>

  <section class="stream">
    <SectionHeader title="摄影精选" count={photos.length} moreHref="/photos/" />
    {
      photos.length > 0 ? (
        <div class="cols cols-photo">
          {photos.map((p, i) => (
            <PhotoCard
              title={p.data.title}
              alt={p.data.alt}
              date={p.data.date}
              location={p.data.location}
              img={photoMetas[i]}
              href="/photos/"
            />
          ))}
        </div>
      ) : (
        <div class="glass empty">摄影集空着 —— 等第一张照片。</div>
      )
    }
  </section>

  <section class="stream">
    <SectionHeader title="最近迷思" count={musings.length} moreHref="/musings/" />
    {
      musings.length > 0 ? (
        <div class="cols">
          {musings.slice(0, 3).map((p) => <PostCard post={p} hideTags />)}
        </div>
      ) : (
        <div class="glass empty">迷思区空着。</div>
      )
    }
  </section>

  <section class="stream">
    <SectionHeader title="网站参考" count={links.length} moreHref="/links/" />
    {
      links.length > 0 ? (
        <div class="cols">
          {links.slice(0, 3).map((l) => <LinkCard link={l} />)}
        </div>
      ) : (
        <div class="glass empty">收藏夹空着。</div>
      )
    }
  </section>

  <section class="stream">
    <SectionHeader title="最近项目" count={projects.length} moreHref="/projects/" />
    {
      projects.length > 0 ? (
        <div class="cols">
          {projects.slice(0, 2).map((p) => <ProjectCard project={p} />)}
        </div>
      ) : (
        <div class="glass empty">项目区空着。</div>
      )
    }
  </section>
</Base>

<style>
  .stream { margin: clamp(40px, 7vw, 64px) 0 0; }
  .stream:first-of-type { margin-top: clamp(24px, 4vw, 40px); }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: clamp(14px, 2vw, 20px);
  }
  .cols-photo { grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
  .empty { padding: clamp(24px, 4vw, 44px); text-align: center; color: var(--text-2); }
</style>
```

- [ ] **Step 3: 构建 + 走查**

Run: `npm run build`
Expected: 退出码 0；`dist/index.html` 生成。

Run: `npm run dev` 浏览器验收 `/`：
- 玻璃 Hero：渐变光晕（orb）、站点名大标题、标语、简介、两个 CTA 按钮（hover 上浮/主按钮亮起）
- 自上而下五个预览流，各区标题右侧「查看全部 →」可跳对应栏目；计数与列表页一致
- 摄影预览卡整卡可点、跳到 `/photos`
- 无内容时各流显示空态（当前种子齐，空态逻辑留待删内容后可见）

- [ ] **Step 4: 提交**

```bash
git add src/components/Hero.astro src/pages/index.astro && git commit -m "feat: 欢迎首页 — 液态玻璃 Hero 与跨栏目预览流"
```
Expected: commit 成功。

## Task 10: 站内搜索（/search）

**Files:**
- Create: `src/components/SearchBox.astro`、`src/scripts/search.ts`、`src/pages/search/index.astro`

**Interfaces:**
- Consumes: Task 4 `noteItems()`/`musingItems()` 数据（索引在构建期由页面内嵌）；`fuse.js`（Task 1 起就应已装，未装则本任务 Step 0 安装）
- Produces:
  - `SearchBox.astro` 无 props：玻璃胶囊搜索框（`form role="search" action="/search/" method="get"`，输入框 `id="search-q" name="q"`）
  - `src/scripts/search.ts`：模块脚本，构建期内嵌的 `#search-index` JSON + 客户端 fuse 匹配 + 高亮渲染（笔记与迷思）
  - `/search` 页：`noindex`（内容全文已内嵌，避免重复收录）

- [ ] **Step 0: 安装 fuse.js**（若 `package.json` 尚无）

Run: `npm install fuse.js`
Expected: `added 1 package`；`package.json` dependencies 出现 `"fuse.js"`。

- [ ] **Step 1: 安装核对**

Run: `node -e "console.log(require('./node_modules/fuse.js/package.json').version)"`
Expected: 打印 `7.x.x`（存在即已安装，第 0 步可跳过）。

- [ ] **Step 2: SearchBox.astro**

Create `src/components/SearchBox.astro`：
```astro
---
// 搜索框（逻辑在 scripts/search.ts，构建期索引由页面内嵌 #search-index）
---
<form class="sform" role="search" action="/search/" method="get">
  <svg class="sicon" viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M21 21l-4.3-4.3"></path>
  </svg>
  <input id="search-q" name="q" type="search" placeholder="搜索笔记与迷思…" autocomplete="off" />
  <button class="sbtn" type="submit">搜索</button>
</form>

<style>
  .sform {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px 10px 20px;
    border-radius: var(--radius-pill);
    background: linear-gradient(180deg, var(--glass-hl), transparent 40%), var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    transition: box-shadow 0.18s ease-out, border-color 0.18s ease-out;
  }
  .sform:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .sicon { flex: none; color: var(--text-3); }
  #search-q {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text-1);
    font: inherit;
    font-size: 1rem;
  }
  #search-q::placeholder { color: var(--text-3); }
  .sbtn {
    flex: none;
    border: 0;
    cursor: pointer;
    padding: 0.5em 1.3em;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: #fff;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    transition: filter 0.15s ease-out;
  }
  .sbtn:hover { filter: brightness(1.08); }
</style>
```

- [ ] **Step 3: search 页（构建期内嵌索引）**

Create `src/pages/search/index.astro`（正文原文直接取内容集合自带的 `entry.body`，与 Task 4 的 excerpt 同源）：
```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import SearchBox from '../../components/SearchBox.astro';
import { stripMarkdown } from '../../lib/text';

// —— 构建期：把笔记+迷思压成纯文本索引，内嵌进页面 HTML（spec §7）——
const [allNotes, allMusings] = await Promise.all([
  getCollection('notes'),
  getCollection('musings'),
]);
const docs = [
  ...allNotes
    .filter((e) => !e.data.draft)
    .map((e) => ({
      t: e.data.title,
      s: e.data.summary ?? stripMarkdown(e.body ?? '').slice(0, 160),
      b: stripMarkdown(e.body ?? ''),
      u: `/notes/${e.slug}`,
      c: 'notes',
    })),
  ...allMusings
    .filter((e) => !e.data.draft)
    .map((e) => ({
      t: e.data.title,
      s: e.data.summary ?? stripMarkdown(e.body ?? '').slice(0, 160),
      b: stripMarkdown(e.body ?? ''),
      u: `/musings/${e.slug}`,
      c: 'musings',
    })),
];
const indexJson = JSON.stringify(docs).replace(/</g, '\\u003c');
---
<Base title="站内搜索" description="搜索笔记与迷思" noindex>
  <section class="glass head">
    <h1 class="page-title">站内搜索</h1>
    <p class="sub">覆盖范围：个人笔记与个人迷思的标题、摘要和正文。</p>
    <SearchBox />
    <p class="count" data-search-count aria-live="polite"></p>
  </section>

  <ol class="results" data-search-results></ol>

  <p class="hint" data-search-empty hidden>
    换个关键词试试？搜索支持模糊匹配，中文按词组切分。
  </p>
</Base>

<script is:inline type="application/json" id="search-index">{indexJson}</script>
<script>
  import '../scripts/search.ts';
</script>

<style>
  .head { padding: clamp(24px, 4vw, 40px) clamp(18px, 4vw, 40px); margin-bottom: clamp(20px, 3vw, 28px); }
  .sub { margin: 0 0 20px; color: var(--text-2); font-size: 0.92rem; }
  .count { margin: 12px 0 0; font-size: 0.88rem; color: var(--text-3); }
  .results { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .results:empty { display: none; }
  .res {
    display: block;
    padding: 14px 20px;
    border-radius: var(--radius-s);
    border: 1px solid var(--glass-border);
    background: linear-gradient(180deg, var(--glass-hl), transparent 34%), var(--glass-bg);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
    box-shadow: var(--glass-shadow);
    transition: transform 0.15s ease-out, border-color 0.15s ease-out;
  }
  .res:hover { transform: translateY(-2px); border-color: var(--accent); text-decoration: none; }
  .res .rt { display: flex; align-items: baseline; gap: 10px; color: var(--text-1); font-size: 1.05rem; font-weight: 700; margin: 0 0 4px; }
  .res .rt .cc { font-size: 0.72rem; font-weight: 600; color: var(--accent); letter-spacing: 0.06em; flex: none; }
  .res .rs { margin: 0; color: var(--text-2); font-size: 0.9rem; line-height: 1.6; }
  mark.hit { background: color-mix(in srgb, var(--accent) 26%, transparent); color: var(--text-1); border-radius: 3px; padding: 0 1px; }
  .hint { margin-top: 18px; color: var(--text-3); font-size: 0.9rem; }
  .hint[hidden] { display: none; }
</style>
```

- [ ] **Step 4: search.ts**

Create `src/scripts/search.ts`：
```ts
import Fuse from 'fuse.js';

interface Doc {
  t: string;
  s: string;
  b: string;
  u: string;
  c: 'notes' | 'musings';
}

const raw = document.getElementById('search-index');
const listEl = document.querySelector<HTMLOListElement>('[data-search-results]');
const countEl = document.querySelector<HTMLElement>('[data-search-count]');
const emptyEl = document.querySelector<HTMLElement>('[data-search-empty]');
const input = document.querySelector<HTMLInputElement>('#search-q');
if (!raw || !listEl || !input) throw new Error('搜索页缺少必需节点');

const docs = JSON.parse(raw.textContent ?? '[]') as Doc[];
const fuse = new Fuse(docs, {
  keys: [
    { name: 't', weight: 0.5 },
    { name: 's', weight: 0.3 },
    { name: 'b', weight: 0.2 },
  ],
  threshold: 0.45,
  ignoreLocation: true,
});

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function highlight(text: string, q: string): string {
  const needle = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!needle) return esc(text);
  const re = new RegExp(`(${needle})`, 'gi');
  return esc(text).split(re).map((part, i) => (i % 2 === 1 ? `<mark class="hit">${part}</mark>` : part)).join('');
}

function snippet(doc: Doc, q: string, span = 130): string {
  const hay = `${doc.s} ${doc.b}`.trim();
  const at = q.trim() ? hay.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  const start = at > span / 2 ? at - span / 2 : 0;
  const cut = hay.slice(start, start + span);
  return (start > 0 ? '…' : '') + cut + (start + span < hay.length ? '…' : '');
}

function label(c: Doc['c']): string {
  return c === 'notes' ? '笔记' : '迷思';
}

function render(q: string): void {
  const hits = q.trim() ? fuse.search(q.trim()) : [];
  listEl.innerHTML = '';
  for (const { item } of hits.slice(0, 20)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'res';
    a.href = item.u;
    const title = document.createElement('p');
    title.className = 'rt';
    title.innerHTML = `<span class="cc">${label(item.c)}</span>${highlight(item.t, q)}`;
    const sum = document.createElement('p');
    sum.className = 'rs';
    sum.innerHTML = highlight(snippet(item, q), q);
    a.append(title, sum);
    li.append(a);
    listEl.append(li);
  }
  if (countEl) countEl.textContent = q.trim() ? `共 ${hits.length} 条结果` : '';
  if (emptyEl) emptyEl.hidden = q.trim() !== '' && hits.length > 0;
}

let timer: number | undefined;
input.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const q = input.value;
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    render(q);
  }, 150);
});

// 初次载入：若有 ?q= 参数则直接执行一次搜索
const q0 = new URLSearchParams(location.search).get('q') ?? '';
input.value = q0;
render(q0);
input.focus();
```
> 安全说明：`render()` 里所有进 `innerHTML` 的文本都先经 `esc()` 再包 `<mark>`（`esc` 后才 split 高亮，实体不会二次注入）。`href` 来自构建期自己生成的内容集合 slug，可信。

- [ ] **Step 5: 构建 + 走查**

Run: `npm run build`
Expected: 退出码 0；`dist/search/index.html` 生成且体积包含索引文本（`grep -c "液态玻璃" dist/search/index.html` 应 ≥1）。

Run: `npm run dev` 浏览器验收 `/search`：
- 输入「玻璃」：约 150ms 后出现结果（命中《用纯 CSS 还原 Apple 液态玻璃》），标题与摘要中关键词有高亮
- 输入「写博客」：命中《为什么还在写博客》
- 输入乱串如「zzzzzz」：无结果列表 + 提示文案出现
- 输入清空：结果清空、不显示提示
- 带 `?q=胶片` 直接打开 `/search/?q=胶片`：自动执行并高亮
- URL 随输入实时更新且不刷新页面
- 页面不要求登录等，纯前端可工作

- [ ] **Step 6: 提交**

```bash
git add src/components/SearchBox.astro src/scripts/search.ts src/pages/search && git commit -m "feat: 站内搜索 — 构建期内嵌索引 + fuse.js 模糊匹配与高亮"
```
Expected: commit 成功。

## Task 11: 404 页 + README（维护指南）+ 全站终验收

**Files:**
- Create: `src/pages/404.astro`、`README.md`

**Interfaces:**
- Consumes: Base/SearchBox 链接；spec §11 验证清单
- Produces: `dist/404.html`（GitHub Pages 对未知路径回落到它）；README 让「不碰代码」的日常维护可自助完成

- [ ] **Step 1: 404.astro**

Create `src/pages/404.astro`：
```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="页面不存在" description="404 · 页面走丢了" noindex>
  <section class="glass nf">
    <p class="code" aria-hidden="true">404</p>
    <h1 class="page-title">页面走丢了</h1>
    <p class="msg">这块玻璃后面没有路 —— 也许内容被搬走了。</p>
    <div class="acts">
      <a class="btn btn--primary" href="/">回到首页</a>
      <a class="btn" href="/search/">试试搜索</a>
    </div>
  </section>
</Base>

<style>
  .nf { padding: clamp(48px, 10vw, 110px) clamp(20px, 5vw, 60px); text-align: center; }
  .code {
    margin: 0 0 4px;
    font-size: clamp(4rem, 14vw, 8rem);
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(120deg, var(--accent), #b26be0 60%, #ff9db1);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .msg { color: var(--text-2); margin-bottom: 26px; }
  .acts { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
</style>
```

- [ ] **Step 2: README.md（日常维护自助指南）**

Create `README.md`：
```md
# Vibe 个人博客

Apple 液态玻璃风格的静态个人站点。内容全部是 Markdown 文件，推送到 GitHub 即自动构建部署到 GitHub Pages。

技术：Astro 5 · TypeScript · 纯 CSS（零 UI 框架）· fuse.js（站内搜索）。设计依据见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。

## 本地开发

```bash
npm install     # 首次
npm run dev     # 开发服务器（热更新），Ctrl+C 退出
npm run build   # 构建到 dist/
npm run preview # 本地预览构建产物
```

## 日常更新 = 加文件

五个栏目对应五个目录，**复制对应模板改名即可**（`.example` 结尾的模板不会被构建）：

| 栏目 | 放哪里 | 模板 |
|---|---|---|
| 个人笔记 | `src/content/notes/` | `_notes-template.md.example` |
| 个人迷思 | `src/content/musings/` | `_musings-template.md.example` |
| 摄影作品 | `src/content/photos/` | `_photos-template.md.example` |
| 网站参考 | `src/content/links/` | `_links-template.md.example` |
| 项目 | `src/content/projects/` | `_projects-template.md.example` |

要点：

- 文件名 = 英文 kebab-case slug，**不要带日期**（日期写进 frontmatter 的 `date`）；
- `draft: true` 的内容本地预览可见、正式构建不会上线，写完删掉该行即可发布；
- 照片文件与其说明 `.md` **同名同目录**（`harbor-sunset.md` ↔ `harbor-sunset.jpg`），md 里 `image: ./同名文件.jpg` 指向它；`alt` 必填；
- frontmatter 写错（缺字段/日期格式错/图片不存在）时 `npm run build` 会直接报错并指出文件 —— 这是特性，不是 bug；
- 搜索索引构建期自动生成，加内容后重新 build 即更新。

## 改外观

- 站点名/标语/简介/导航/页脚注：`src/site.config.ts`
- 颜色/圆角/阴影/光斑全部主题值：`src/styles/tokens.css`（亮暗两套）
- 玻璃面板/按钮/排版基元：`src/styles/base.css`

## 部署（GitHub Pages）

1. 在 GitHub 建**同名主页仓库** `<用户名>.github.io`（要部署成该域名，仓库名必须等于用户名）；
2. 把仓库地址替换到 `astro.config.mjs`：`site: 'https://USERNAME.github.io'`（把 `USERNAME` 换掉，并同步替换 `src/content/projects/this-blog.md` 里的示例 repo 链接）；
3. `git remote add origin https://github.com/<用户名>/<用户名>.github.io.git && git push -u origin main`；
4. 仓库 Settings → Pages → **Source 选 “GitHub Actions”**（首次部署后生效）；
5. 以后每次推送 `main`，Actions 自动 `astro build` 并发布，无需任何手动步骤。

## 目录速览

```
src/
  site.config.ts     站点元信息（改这里换名字）
  content.config.ts  内容 schema（校验规则）
  content/           全部内容（.md + 照片）
  styles/            tokens.css（主题值）/ base.css（玻璃基元）
  components/  layouts/  lib/  scripts/    UI 与逻辑
  pages/             各路由页面
```

## 内容许可

正文默认 CC BY-NC 4.0（见 `src/site.config.ts` 的 `footerNote`，可自行修改）。
```

- [ ] **Step 3: 构建 + 404 走查**

Run: `npm run build`
Expected: 退出码 0；`dist/404.html` 生成。

Run: `npm run dev`：访问一个不存在的路径（如 `/nope-xyz`）→ 玻璃风格 404 页（渐变 404 字、回首页/去搜索按钮）；从 404 点「搜索」跳 `/search`。

- [ ] **Step 4: 全站终验收（spec §11 清单逐条过）**

Run: `npm run build`，确认输出 **0 error / 0 warning**。

Run: `npm run preview`（后台运行后执行下条命令，用 Git Bash）：
```bash
npm run preview &
sleep 3
for p in / /notes/ /notes/astro-glass-notes/ /musings/ /musings/why-keep-a-blog/ \
         /photos/ /links/ /projects/ /search/ /favicon.svg; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321$p"); echo "$code  $p"
done
curl -s -o /dev/null -w "%{http_code}  /nope-xyz(期望404)\n" "http://localhost:4321/nope-xyz"
kill %1 2>/dev/null
```
Expected：上表每一行 `200`（`/nope-xyz` 为 `404`）。
> Windows 下若 `kill %1` 无效，改用任务管理器结束 `node` 预览进程即可，不影响验收。

浏览器走查（`npm run dev`，若已跑过 dev 服务器直接复用）：
- [ ] 五栏目 + 欢迎页导航可达、标题/计数正确，当前项高亮
- [ ] 暗色/亮色切换即时生效、刷新保持、首次跟随系统（DevTools 仿真 prefers-color-scheme）
- [ ] 搜索命中/高亮/空态/`?q=` 直达 ✓（Task 10 已过，抽验一次）
- [ ] 灯箱：开/合/翻页/回绕/ESC/遮罩 ✓（Task 6 已过，抽验一次）
- [ ] DevTools 375px / 768px / 1440px 三档宽度：无横向滚动、汉堡菜单可用
- [ ] DevTools Rendering → 勾选 `prefers-reduced-motion: reduce`：光斑静止、hover 无位移动画
- [ ] DevTools 模拟「无 backdrop-filter」（或直接禁用 CSS 里 backdrop-filter 属性再开）→ 面板接近实心、文字清晰可读
- [ ] 键盘 Tab 全站可走通，焦点环（accent 描边）可见

- [ ] **Step 5: 提交**

```bash
git add src/pages/404.astro README.md && git commit -m "feat: 404 页与维护指南 README，全站终验收通过"
```
Expected: commit 成功。

---

## Task 12: GitHub Pages 部署工作流

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `astro build` → `dist/`；`astro.config.mjs` 的 `site`/`base`
- Produces: 推送 `main` 即自动发布到 `<用户名>.github.io`（前提：仓库为同名主页仓 + Pages Source=GitHub Actions）

- [ ] **Step 1: deploy.yml**

Create `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 本地模拟 Actions 构建（与 CI 同路径）**

Run: `npm ci && npm run build`
Expected: 退出码 0，`dist/` 生成（`npm ci` 会按 lockfile 重装，验证 lockfile 已提交且干净）。

- [ ] **Step 3: 提交**

```bash
git add .github && git commit -m "ci: GitHub Pages 自动部署工作流"
```
Expected: commit 成功。

- [ ] **Step 4: 用户上线清单（写进对话交付，不自动执行）**

1. GitHub 创建同名仓库 `<用户名>.github.io`（Public）；
2. `astro.config.mjs` 里 `USERNAME` 替换成真实用户名；`src/content/projects/this-blog.md` 的示例 repo 链接同步替换；
3. `git remote add origin https://github.com/<用户名>/<用户名>.github.io.git` → `git push -u origin main`；
4. 仓库 Settings → Pages → Source 选 **GitHub Actions**（首次跑完 workflow 后可选）；
5. Actions 绿勾后访问 `https://<用户名>.github.io/` 验收：路由（含 `/notes/astro-glass-notes/` 等深层路径）全部可达 —— 因 `base: '/'`，刷新任意深层路径都由 Pages 正确回退。

至此，本计划全部任务完成。站点进入「日常只加 Markdown」的维护模式。

