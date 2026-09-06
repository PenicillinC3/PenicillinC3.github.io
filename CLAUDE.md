# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

个人博客静态站（Astro 5 + TypeScript + 纯 CSS），Apple 液态玻璃视觉演化版（水珠拟态、纯白/浅灰网格底、全透面板、交互棱光）。部署 GitHub Pages（`username.github.io` 主页仓形态）。内容全部为 Markdown。设计史与现行规范：`docs/superpowers/specs/2026-09-06-blog-homepage-design.md` —— **后节覆盖先节**（如 §19–§21 已取代早期胶片/灯箱/搜索设计）；实现计划在 `docs/superpowers/plans/`。README.md 是内容维护自助指南（发文/照片/部署）。

## 常用命令

```bash
npm install          # 首次
npm run dev          # 开发服务器（:4321，热更新；dev 工具栏已在 astro.config 关闭）
npm run build        # 产物到 dist/（验收标准：0 error / 0 warning，当前 14 页）
npm run preview      # 本地预览构建产物（旧 dev/preview 进程会占端口，先 taskkill node）
npm run fonts:subset # 新增内容后重建 woff2 子集（song §28 + maple §29）
```

**无单元测试**。验收 = `npm run build` 零警告 + `npm run preview` 后对路由 curl 状态码（全 200、`/nope-xyz` 404）+ 浏览器人工走查（视觉项）。每次改动后必须 build 通过再提交；git 提交身份已配置（PenicillinC3），逐任务小步提交。

## 架构要点

- **内容层**：`src/content.config.ts` 用 zod 定义 6 个集合 —— `notes`/`musings`/`links`/`projects`/`photos`/`series`。共享字段 `title/date(YYYY-MM-DD)/summary?/draft?`；`photos` 经 `image()` 引用**同目录同名文件**（md 与其图同放 `src/content/photos/`），并带可选 `series` slug 挂靠；`series`（摄影卷）有 `cover`（卷内照片 slug，必填）。frontmatter 错误在构建期报错拦截，这是特性。
- **查询层**：`src/lib/collections.ts` 是唯一取数入口（`listSorted`/`noteItems`/`musingItems`/`linkItems`/`projectItems`/`seriesRolls`）。`listSorted` 与搜索页曾用 `import.meta.env.DEV` 放行 draft（spec §4「dev 可见、构建排除」）；`seriesRolls` 不过滤 draft 卷、卷内无照片会 throw —— 有意为之。
- **页面形态**：
  - `/` 单屏欢迎页：中央华文中宋大站名 **PenicillinC3** + tagline + 两枚入口按钮（液态玻璃镜头 spec §34 已于 2026-09-07 按用户要求删除，见 spec §35；React 栈随之下线，首页已无框架岛）。`.main:has(.welcome)` 特判居中；**页脚仅首页渲染**（Base isHome 判断；其余页无最下方栏），版权行 `© 2026 PenicillinC3 Via Claude Code`（无回到首页链接）。body 是 flex 纵向吸底布局。
  - `/notes`、`/musings`、`/links` 列表为**单列通栏大卡**（spec §24/§25：一行一张 ~1100px；PostCard 标题↔日期对顶、摘要 76ch 限宽；三栏目卡统一 `min-height:230px` 对齐）+ `/[slug]` 详情；笔记列表有标签过滤（PostList 事件委托 + `style.display` 直控，勿改回 `hidden` 属性方案）。
  - `/photos` 是**长胶卷画廊**（spec §30，替代 §27 单帧版式）：Base 传 `dark gallery`（`body.page-gallery` = 视口锁高、页脚保留可见）；一条连续 135 底片（每卷封面 3:2 等宽等距 + 上下贯穿齿孔带，首尾纯灰占位，几何变量挂 `.arena`）；视口中心=当前卷，翻卷 = reel `translateX` 弹簧非线性平移（邻卷在左右仅露 ~100px）；**日期居中在封面上方、地点居中下方**（红光白字 overlay），dock 只剩「N 张」+提示；首尾不循环。**红光射线**（spec §26/§32 `Rays.astro`，ogl 移植去 react 壳）：全栏目统一配方 = 白红双色 `#ff0000/#ffffff` intensity1.7 spread2 falloff1.6 opacity1（overlay 叠于 arena、backdrop 沉备忘页卡后）。备忘页版面横/竖混排 + backdrop 射线。**无**单张照片页、无灯箱、无搜索。
  - **字体**（spec §28/§29/§32）：正文 = `MapleMono Web`（子集 200KB；摄影页 page-dark 覆写为华文中宋）；代码 = `JetBrains Mono Web` + **注释栈 `--font-comment` = JetBrains Italic → `MapleMono Italic Web`（217KB 子集）** —— 英文注释 JetBrains 斜体、**中文字符逐字落到斜体 Maple**（markdown 已切 prism 高亮，勿改回 shiki）。`npm run fonts:subset` 重建 song/maple/maple-italic 三件。`--font-song` 首项 Song Web。
  - 404 页有搜索框？没有 —— 搜索已全链路删除（fuse.js、SearchBox、/search 均不存在）。
- **视觉系统**：token 全在 `src/styles/tokens.css`（单一 `:root` 亮色；`body.page-dark` 在 base.css 覆写为暗房 token：`--accent #ff6b6b` 红光，并将**正文字体切为 `--font-song`**（spec §28：华文中宋子集嵌入，@font-face "Song Web" local 优先、无系统字体才下载 51KB woff2））。玻璃配方 v3.1：**面板全透**（`--glass-bg: rgba(255,255,255,0)`）+ `--glass-inset` 内外影对仗 + 右下重投阴影 + **§31 边缘色差线**（±1px 红/青）；`--glass-blur: 1px`。`--grid-line/--grid-size` 是方格背景。`base.css` 提供 `.glass/.btn(12px 圆角)/.pill/.prism/.prose`。
- **交互脚本**（均无框架）：Nav 水滴滑块 = **鼠标跟随液态吸附**（spec §25：pointermove 现量 + rAF 指数阻尼 τ90ms，离开回激活栏，点击跳页；落位刷新 = document/window 双挂 astro:page-load + MutationObserver 兜底；垂直居中 `translateY(-50%)` 常驻 CSS、JS 只写 `--sx`/width；暗色页覆写为暗红辉光；边缘色差层 ::before 左红右青，§31）；PostList 过滤；photos reel 平移翻卷（几何变量 setGeom + CSS 弹簧 --tx，无逐帧动画）。

## 关键坑（踩过并验证，改动前必读）

1. **Astro 组件作用域**：样式类永远放**组件自身渲染的元素**上。传给 `<GlassCard class="x">` 的类会因 scope 错配而失效（PostCard/LinkCard/ProjectCard 均因此修过）。
2. **`<script is:inline>` 内容不插值** `{expr}`（按字面输出）。内嵌 JSON 用 `set:html={json}`，且先 `.replace(/</g,'\\u003c')` 防 `</script>` 逃逸（photos stage 的 roll-data 即此模式）。
3. **`src/pages/<子目录>/` 里 import `src/scripts` 需两级 `../../`**。
4. **zod 是 v3**（astro 锁定）：无 `z.url()`，用 `z.string().url()`；js-yaml 把裸日期解析成 Date → `date` 字段必须经 `z.preprocess` 归一为 `YYYY-MM-DD`（勿改成要求引号，作者体验靠它）。
5. **Astro 内容集合完全忽略 `_` 前缀文件**（包括带 `_` 的 .md.example 也不会被收集；模板靠 `.example` 后缀排除，别改）。调试时建临时条目别用 `_` 开头，会静默消失。
6. **沉浸页舞台必须用 `position: fixed; inset:` 铺满** —— 曾有浏览器对 `100dvh` calc 解析塌陷成 0 导致全黑（见 base.css `body.page-immersive .stage`）。photos 组件内**勿再给 `.stage` 写 height/position**（base 以更高特异性生效；加了 height 会参与定高、把 dock 挤出屏）。⚠ 胶片画廊改用 `page-gallery`（spec §27）：`.main` 身兼 `.wrap`，需显式 `width:100%`（曾测到非 100% 收缩宽度）；html 需 `:has()` 锁高。
7. **JS 别直写 `style.transform` 覆盖 CSS 组合位移** —— Nav 滑块曾因此把 `translateY(-50%)` 居中挤掉、整体下挂半身。组合位移（含 `-50%`、`--sx` 变量）写在 CSS，JS 只设变量。
8. 依赖上限纪律：`dependencies` = `astro` + `ogl`（射线着色器 §26）——React/three 栈已随首页液态玻璃镜头删除而全量移除（spec §35；历史安装注记含 `--legacy-peer-deps` 原因见 §34.1，勿加回）。devDependencies = typescript + `subset-font`（字体子集构建 §28/§29）。**禁止再加 UI 框架/运行时依赖**。字体：允许嵌入（font/ 原件 + public/fonts 子集；新文案后跑 `npm run fonts:subset`）。
9. 图片管线：真实 JPEG 走构建期 sharp 自动出响应式 webp；SVG 直通不优化。`img/`（根目录原件）已 gitignore。
10. 上线占位待替换：`astro.config.mjs` 的 `USERNAME`、`src/content/projects/this-blog.md` 的 repo 链接（站点名已定 PenicillinC3，见 site.config.ts）。部署 = 推送 main 触发 `.github/workflows/deploy.yml`。

## 目录速览（细节可自行发现处从略）

```
src/content.config.ts   zod schema（6 集合）
src/content/            全部内容：notes musings links projects photos(图+md) series(卷) + _*-template.md.example
src/lib/                取数/文本/日期工具（页面唯一数据入口）
src/layouts/Base.astro  props: {title?, description?, noindex?, dark?, immersive?, gallery?}
src/components/         玻璃组件族（GlassCard/Nav/Footer/Rays 等）
src/pages/              路由（photos 为胶片画廊 + 卷备忘）
src/styles/tokens.css + base.css
font/ + public/fonts/   华文中宋原件(STZHONGS.TTF) + woff2 子集（scripts/subset-song.mjs）
docs/superpowers/       spec（设计权威，后节覆盖前节）+ plans（历史实现计划）
```

允许字体文件嵌入页面
