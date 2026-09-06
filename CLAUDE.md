# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

个人博客静态站（Astro 5 + TypeScript + 纯 CSS），Apple 液态玻璃视觉演化版（水珠拟态、纯白/浅灰网格底、全透面板、交互棱光）。部署 GitHub Pages（`username.github.io` 主页仓形态）。内容全部为 Markdown。设计史与现行规范：`docs/superpowers/specs/2026-09-06-blog-homepage-design.md` —— **后节覆盖先节**（如 §19–§21 已取代早期胶片/灯箱/搜索设计）；实现计划在 `docs/superpowers/plans/`。README.md 是内容维护自助指南（发文/照片/部署）。

## 常用命令

```bash
npm install          # 首次
npm run dev          # 开发服务器（:4321，热更新；dev 工具栏已在 astro.config 关闭）
npm run build        # 产物到 dist/（验收标准：0 error / 0 warning，当前 13 页）
npm run preview      # 本地预览构建产物（旧 dev/preview 进程会占端口，先 taskkill node）
```

**无单元测试**。验收 = `npm run build` 零警告 + `npm run preview` 后对路由 curl 状态码（全 200、`/nope-xyz` 404）+ 浏览器人工走查（视觉项）。每次改动后必须 build 通过再提交；git 提交身份已配置（PenicillinC3），逐任务小步提交。

## 架构要点

- **内容层**：`src/content.config.ts` 用 zod 定义 6 个集合 —— `notes`/`musings`/`links`/`projects`/`photos`/`series`。共享字段 `title/date(YYYY-MM-DD)/summary?/draft?`；`photos` 经 `image()` 引用**同目录同名文件**（md 与其图同放 `src/content/photos/`），并带可选 `series` slug 挂靠；`series`（摄影卷）有 `cover`（卷内照片 slug，必填）。frontmatter 错误在构建期报错拦截，这是特性。
- **查询层**：`src/lib/collections.ts` 是唯一取数入口（`listSorted`/`noteItems`/`musingItems`/`linkItems`/`projectItems`/`seriesRolls`）。`listSorted` 与搜索页曾用 `import.meta.env.DEV` 放行 draft（spec §4「dev 可见、构建排除」）；`seriesRolls` 不过滤 draft 卷、卷内无照片会 throw —— 有意为之。
- **页面形态**：
  - `/` 单屏欢迎页（华文中宋大字）；`.main:has(.welcome)` 特判居中；body 是 flex 纵向吸底布局，页脚短页贴底、长页随滚动。
  - `/notes`、`/musings` 列表（双栏大卡）+ `/[slug]` 详情；笔记列表有标签过滤（PostList 事件委托 + `style.display` 直控，勿改回 `hidden` 属性方案）。
  - `/photos` 是**沉浸暗房全屏**：Base 传 `dark immersive`（`body.page-dark` / `page-immersive`）；一卷一屏、SSR 首帧直出、两侧底片缩略切换、中央点击进卷备忘页 `/photos/<series-slug>/`（卷文 + 照片混排：横版整行图文上下、竖版 1.5fr/1fr 左图右文，<880px 单列）。**无**单张照片页、无灯箱、无搜索。
  - 404 页有搜索框？没有 —— 搜索已全链路删除（fuse.js、SearchBox、/search 均不存在）。
- **视觉系统**：token 全在 `src/styles/tokens.css`（单一 `:root` 亮色；`body.page-dark` 在 base.css 覆写为暗房 token：`--accent #ff6b6b` 红光）。玻璃配方 v3.1：**面板全透**（`--glass-bg: rgba(255,255,255,0)`）+ `--glass-inset` 内外影对仗 + 右下重投阴影；`--glass-blur: 1px`。`--grid-line/--grid-size` 是方格背景。`base.css` 提供 `.glass/.btn(12px 圆角)/.pill/.prism/.prose`。
- **交互脚本**（均无框架）：Nav 水滴滑块量测（`astro:page-load`/resize 重定位，节点随 View Transitions 重建 → 动效为「着陆」语义非滑动）；PostList 过滤；photos stage 切换（含请求令牌防竞态）。

## 关键坑（踩过并验证，改动前必读）

1. **Astro 组件作用域**：样式类永远放**组件自身渲染的元素**上。传给 `<GlassCard class="x">` 的类会因 scope 错配而失效（PostCard/LinkCard/ProjectCard 均因此修过）。
2. **`<script is:inline>` 内容不插值** `{expr}`（按字面输出）。内嵌 JSON 用 `set:html={json}`，且先 `.replace(/</g,'\\u003c')` 防 `</script>` 逃逸（photos stage 的 roll-data 即此模式）。
3. **`src/pages/<子目录>/` 里 import `src/scripts` 需两级 `../../`**。
4. **zod 是 v3**（astro 锁定）：无 `z.url()`，用 `z.string().url()`；js-yaml 把裸日期解析成 Date → `date` 字段必须经 `z.preprocess` 归一为 `YYYY-MM-DD`（勿改成要求引号，作者体验靠它）。
5. **Astro 内容集合完全忽略 `_` 前缀文件**（包括带 `_` 的 .md.example 也不会被收集；模板靠 `.example` 后缀排除，别改）。调试时建临时条目别用 `_` 开头，会静默消失。
6. **沉浸页舞台必须用 `position: fixed; inset:` 铺满** —— 曾有浏览器对 `100dvh` calc 解析塌陷成 0 导致全黑（见 base.css `body.page-immersive .stage`）。
7. 依赖上限纪律：`dependencies` 仅 `astro`（devDependencies 仅 typescript）；不要引入 UI 框架/字体下载。
8. 图片管线：真实 JPEG 走构建期 sharp 自动出响应式 webp；SVG 直通不优化。`img/`（根目录原件）已 gitignore。
9. 上线占位待替换：`astro.config.mjs` 的 `USERNAME`、`src/site.config.ts` 的站点名/简介（现 "Vibe"）、`src/content/projects/this-blog.md` 的 repo 链接。部署 = 推送 main 触发 `.github/workflows/deploy.yml`。

## 目录速览（细节可自行发现处从略）

```
src/content.config.ts   zod schema（6 集合）
src/content/            全部内容：notes musings links projects photos(图+md) series(卷) + _*-template.md.example
src/lib/                取数/文本/日期工具（页面唯一数据入口）
src/layouts/Base.astro  props: {title?, description?, noindex?, dark?, immersive?}
src/components/         玻璃组件族（GlassCard/Nav/Footer 等）
src/pages/              路由（photos 为暗房全屏 + 卷备忘）
src/styles/tokens.css + base.css
docs/superpowers/       spec（设计权威，后节覆盖前节）+ plans（历史实现计划）
```
