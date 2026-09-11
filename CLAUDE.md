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

- **内容层**：`src/content.config.ts` 用 zod 定义 6 个集合 —— `notes`/`musings`/`links`/`projects`/`photos`/`series`。共享字段 `title/date(YYYY-MM-DD)/summary?/draft?`；`photos` 经 `image()` 引用**同目录同名文件**（md 与其图按卷分文件夹存放：`src/content/photos/<卷名>/`，§96；集合 glob loader，slug = **文件夹名/文件名**（如 `nikon-roll/dsc0007`）—— 引用带卷前缀，同名照片跨卷互不冲突，仅需卷内不重名），并带可选 `series` slug 挂靠；`series`（摄影卷）有 `cover`（卷内照片 slug，必填）。frontmatter 错误在构建期报错拦截，这是特性。
- **查询层**：`src/lib/collections.ts` 是唯一取数入口（`listSorted`/`noteItems`/`musingItems`/`linkItems`/`projectItems`/`seriesRolls`）。`listSorted` 与搜索页曾用 `import.meta.env.DEV` 放行 draft（spec §4「dev 可见、构建排除」）；`seriesRolls` 不过滤 draft 卷、卷内无照片会 throw —— 有意为之。
- **页面形态**：
  - `/` 单屏欢迎页：中央华文中宋大站名 **PenicillinC3** + tagline「记录 · 拍摄 · 思考」（**两者均场景内渲染** §69.5/§69.6：DOM 同名元素 opacity:0 占位保布局/语义，视觉版由 troika Text 承接；打字机动效 §39/§40 已移除 §69.4）+ 两枚入口按钮（DOM）。**§69 玻璃球**（方案 B，React 回归仅此一个 island）：`FluidGlass.jsx` 全屏 fixed 垫底（z0）跑 react-bits 官方 lens 移植（portal→useFBO→quad 铺底→MTT 折射同 buffer、跟手 damp3；scale 0.10；**Canvas flat 关 ACES 色调映射** —— 否则纯白底泛灰且压没网格 §69.6；折射内容 = 与普通页同观感的**矢量发丝方格** 22px/0.05 细条几何 + **SceneTexts**〔标题/tagline，song-3d.ttf 含中文子集，TEXT_Z=3，按 DOM rect 实测换算〕—— 不用 CanvasTexture：纹理重采样失真 §69.2）；tagline/按钮提层 z1（.welcome pointer-events none 穿透、.acts auto、footer z1、Nav z60）；<900px/reduced-motion/无 JS 不挂载（标题/tagline 退回 DOM 可见 —— opacity:0 仅在该挂载条件下生效）。历史脉络：§34 镜头 §35 删、§58–67 全套 §68 撤销、§69 官方组件重做 —— 本质区别：**折射场景内内容副本，不折射 DOM**（spec §69–§69.6）。`.main:has(.welcome)` 特判居中；**页脚仅首页渲染**（Base isHome 判断；其余页无最下方栏），版权行 `© 2026 PenicillinC3 Via Claude Code`（无回到首页链接）。body 是 flex 纵向吸底布局。
  - `/notes`、`/musings`、`/links` 列表为**单列通栏大卡**（spec §24/§25：一行一张 ~1100px；PostCard 标题↔日期对顶、摘要 76ch 限宽；三栏目卡统一 `min-height:230px` 对齐）+ `/[slug]` 详情；笔记列表有标签过滤（PostList 事件委托：不匹配卡 0.2s 快速淡出后 **FLIP 平滑上浮**填位，spec §54；§37 收合跳变版与 §53 占位保留版均已作废）。
  - `/photos` 是**长胶卷画廊**（spec §30，替代 §27 单帧版式）：Base 传 `dark gallery`（`body.page-gallery` = 视口锁高、页脚保留可见）；一条连续 135 底片（每卷封面 3:2 等宽等距 + 上下贯穿齿孔带，首尾纯灰占位，几何变量挂 `.arena`）；视口中心=当前卷，翻卷 = reel `translateX` **缓出非线性平移**（无弹簧过冲，spec §38；邻卷在左右仅露 ~100px）；**日期居中在封面上方、地点/作品名居中下方**（红光白字 overlay，离胶片留白较远；§75：卷 frontmatter 可选 `workName` 作品名，填了画廊字幕优先显示它、缺省回落 `location`），dock 只剩「N 张」+提示；首尾不循环。**红光射线**（spec §26/§32 `Rays.astro`，ogl 移植去 react 壳）：全栏目统一配方 = 白红双色 `#ff0000/#ffffff` intensity1.7 spread2 falloff1.6 opacity1（overlay 叠于 arena、backdrop 沉备忘页卡后）。备忘页版面横/竖混排 + backdrop 射线；**§81 图文交错**：卷 md 里独占一行的 `![[照片slug]]` 把该照片卡片（`ShotCard.astro`）就地插进正文流（未标记的照片自动补到正文后；无标记 = 旧版「正文块 + 底部网格」，slug 不属于本卷会构建报错）。**无**单张照片页、无灯箱、无搜索。
  - **字体**（spec §28/§29/§32/§57）：正文 = `MapleMono Web`（子集；摄影页 page-dark 覆写为华文中宋）；代码 = `JetBrains Mono Web` 打头 + 字链兜底 —— `--font-mono` = JetBrains → 正体 `MapleMono Web`（§57：JetBrains 缺中文字形，代码内**非注释中文**逐字落正体 Maple，拉丁全归 JetBrains）；注释栈 `--font-comment` = JetBrains Italic → `MapleMono Italic Web` 子集 —— 英文注释 JetBrains 斜体、**注释中文逐字落斜体 Maple**（markdown 已切 prism 高亮，勿改回 shiki）。`npm run fonts:subset` 重建 song/maple/maple-italic/maple-ui（§90 UI 极小号子集，置于 --font-sans 栈首。**首页提速关键**：框架文案全命中它、正文大写 238KB 子集不下载；其外汉字逐字回退到 MapleMono Web）五件（+ maple-bold §98：真粗体，仅 strong/b/th 等 ≥600 字重页面按需下载；Medium 面字重范围 100–599、Bold 面 600–900 —— 勿把 Medium 面写回 100 900，否则粗体字形永不被采用）。`--font-song` 首项 Song Web。导航栏 `.topbar` 显式 `font-family: var(--font-sans)`（spec §38：暗色页正文切宋体不影响导航，全栏目一致）。
  - 404 页有搜索框？没有 —— 搜索已全链路删除（fuse.js、SearchBox、/search 均不存在）。
- **视觉系统**：token 全在 `src/styles/tokens.css`（单一 `:root` 亮色；`body.page-dark` 在 base.css 覆写为暗房 token：`--accent #ff6b6b` 红光，并将**正文字体切为 `--font-song`**（spec §28：华文中宋子集嵌入，@font-face "Song Web" local 优先、无系统字体才下载 51KB woff2））。玻璃配方 v3.1：**面板全透**（`--glass-bg: rgba(255,255,255,0)`）+ `--glass-inset` 内外影对仗 + 右下重投阴影 + **§31 边缘色差线**（±1px 红/青）；`--glass-blur: 1px`。`--grid-line/--grid-size` 是方格背景。`base.css` 提供 `.glass/.btn(12px 圆角)/.pill/.prism/.prose`。
- **交互脚本**（均无框架）：Nav 水滴滑块 = **鼠标跟随液态吸附**（spec §25：pointermove 现量 + rAF 指数阻尼 τ90ms，离开回激活栏，点击跳页；落位刷新 = document/window 双挂 astro:page-load + MutationObserver 兜底；垂直居中 `translateY(-50%)` 常驻 CSS、JS 只写 `--sx`/width；暗色页覆写为暗红辉光；边缘色差层 ::before 左红右青，§31）；PostList 过滤（spec §54：is-out 快速淡出 + FLIP 上浮填位；卡只平移不形变，勿退回 §37 display:none 直切/§53 占位保留两版）；photos reel 平移翻卷（几何变量 setGeom + CSS 缓出 --tx，无逐帧动画）。

## 关键坑（踩过并验证，改动前必读）

1. **Astro 组件作用域**：样式类永远放**组件自身渲染的元素**上。传给 `<GlassCard class="x">` 的类会因 scope 错配而失效（PostCard/LinkCard/ProjectCard 均因此修过）。
2. **`<script is:inline>` 内容不插值** `{expr}`（按字面输出）。内嵌 JSON 用 `set:html={json}`，且先 `.replace(/</g,'\\u003c')` 防 `</script>` 逃逸（photos stage 的 roll-data 即此模式）。
3. **`src/pages/<子目录>/` 里 import `src/scripts` 需两级 `../../`**。
4. **zod 是 v3**（astro 锁定）：无 `z.url()`，用 `z.string().url()`；js-yaml 把裸日期解析成 Date → `date` 字段必须经 `z.preprocess` 归一为 `YYYY-MM-DD`（勿改成要求引号，作者体验靠它）。
5. **Astro 内容集合完全忽略 `_` 前缀文件**（包括带 `_` 的 .md.example 也不会被收集；模板靠 `.example` 后缀排除，别改）。调试时建临时条目别用 `_` 开头，会静默消失。
6. **沉浸页舞台必须用 `position: fixed; inset:` 铺满** —— 曾有浏览器对 `100dvh` calc 解析塌陷成 0 导致全黑（见 base.css `body.page-immersive .stage`）。photos 组件内**勿再给 `.stage` 写 height/position**（base 以更高特异性生效；加了 height 会参与定高、把 dock 挤出屏）。⚠ 胶片画廊改用 `page-gallery`（spec §27）：`.main` 身兼 `.wrap`，需显式 `width:100%`（曾测到非 100% 收缩宽度）；html 需 `:has()` 锁高。
7. **JS 别直写 `style.transform` 覆盖 CSS 组合位移** —— Nav 滑块曾因此把 `translateY(-50%)` 居中挤掉、整体下挂半身。组合位移（含 `-50%`、`--sx` 变量）写在 CSS，JS 只设变量。
8. 依赖上限纪律：`dependencies` = `astro` + `ogl`（射线着色器 §26）+ **React 栈（spec §69 首页玻璃球特批，仅此 island）**：react/react-dom、@astrojs/react **v4**（须配 Astro5/vite6；@astrojs/react v6 是 Astro6/vite8 用，勿升）、three、@react-three/fiber、@react-three/drei、maath —— 组件在 `src/components/FluidGlass.jsx`、模型在 `public/assets/3d/`。**除该 island 外禁止再加任何 UI 框架/运行时依赖**（§34/§35 旧液态玻璃栈删后勿加回；历史 `--legacy-peer-deps` 注记见 §34.1）。devDependencies = typescript + `subset-font`（字体子集构建 §28/§29）+ @types/react(-dom)。字体：允许嵌入（font/ 原件 + public/fonts 子集；新文案后跑 `npm run fonts:subset`）。
9. 图片管线：真实 JPEG 走构建期 sharp 自动出响应式 webp；SVG 直通不优化。`img/`（根目录原件）已 gitignore。
10. 已上线：远端 origin = `PenicillinC3/PenicillinC3.github.io`（空仓首推建成，base '/' 主页仓形态）；`astro.config.mjs` 的 `site` 与 `this-blog.md` 的 repo 链接已填真实地址。部署 = 推送 main 触发 `.github/workflows/deploy.yml`（configure-pages 自动启用 Pages，无需手动 Settings）。

## 目录速览（细节可自行发现处从略）

```
src/content.config.ts   zod schema（6 集合）
src/content/            全部内容：notes musings links projects photos(图+md) series(卷) + _*-template.md.example
src/lib/                取数/文本/日期工具（页面唯一数据入口）
src/layouts/Base.astro  props: {title?, description?, noindex?, dark?, immersive?, gallery?}
src/components/         玻璃组件族（GlassCard/Nav/Footer/Rays 等；FluidGlass.jsx = §69 首页玻璃球 React island）
src/pages/              路由（photos 为胶片画廊 + 卷备忘）
src/styles/tokens.css + base.css
font/ + public/fonts/   华文中宋原件(STZHONGS.TTF) + woff2 子集（scripts/subset-song.mjs）
docs/superpowers/       spec（设计权威，后节覆盖前节）+ plans（历史实现计划）
```

允许字体文件嵌入页面
