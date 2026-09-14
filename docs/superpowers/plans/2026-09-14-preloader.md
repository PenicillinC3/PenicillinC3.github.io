# 进站加载页（CRT 灰屏 / 像素→清晰 / 真实预取）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页首次整页加载时播放一段 CRT 风格加载动画，期间把全站 HTML / 展示图 / 字体预取进浏览器缓存，动画结束移除自身且不残留。

**Architecture:** 单个自包含组件 `src/components/Preloader.astro`（内联 style + 内联 script + noscript），由 `Base.astro` 仅在首页渲染为 `<body>` 首个元素 —— 首屏关键 CSS/JS 必须内联，否则先闪一帧无样式/白屏（本仓踩过：模块脚本是 deferred）。动效 = Canvas 2D 分辨率阶梯（低分辨率离屏 → 最近邻放大 → 随进度抬档）+ 逐行条带变形做 CRT 管面。进度 = 真实下载字节数，预取清单在构建期生成。

**Tech Stack:** Astro 5 静态站、Canvas 2D、内联脚本（无框架、无新依赖）；预取用 `fetch(priority:'low')` + `response.body` 流式计数。

**Spec:** `docs/superpowers/specs/2026-09-06-blog-homepage-design.md` §101（2026-09-14）

## Global Constraints

- `npm run build` 必须 **0 error / 0 warning**（本仓验收标准；无单元测试）。
- **不新增任何运行时依赖**（`dependencies` 限 astro + ogl + Spec §69 的 React 栈；本特性只用 Canvas 2D + 已有字体）。
- 内联脚本内**不能写 `{expr}` 插值**（按字面输出）；注入 JSON 用 `set:html={json}` 且先 `.replace(/</g,'\\u003c')`（CLAUDE.md 坑 2）。
- 站点正文/组件字体走 `--font-sans`（Maple 子集）；不新增字体文件、不改 `scripts/subset-*`。
- 文案与注释沿用中文，与既有代码密度一致；提交逐任务小步、Conventional Commits 风格（`feat:`/`fix:`）。
- 只在**首页 `/` 的整页加载**出现，且**本会话只播一次**（sessionStorage）；`/notes/`、`/photos/xxx` 等内页直接进入不出现。
- 时长硬约束：**最小 ~1.2s、最大 ~6s**（到点无论进度一律放行）。
- 结束时必须移除画布与 DOM、恢复 body 滚动；任何异常都不得留下灰屏（CSS 兜底动画独立于 JS）。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/lib/photo-images.ts`（新建） | 集中照片展示图的两处 `getImage()` 参数（照片页 / 画廊封面），供页面与预取清单共用，保证 URL 完全同源 |
| `src/lib/prefetch-manifest.ts`（新建） | 构建期产出预取清单：全部路由 HTML + 全部展示图 + 全部字体子集 |
| `src/components/Preloader.astro`（新建） | 加载页本体：内联 CSS/JS、像素阶梯渲染、CRT 变形、预取引擎、时长约束、全部兜底 |
| `src/layouts/Base.astro`（改 1 行 + 1 import） | `{isHome && <Preloader />}` 作为 `<body>` 首个元素 |
| `src/pages/photos/index.astro`、`src/pages/photos/[slug].astro`（改） | 改用 `photo-images.ts` 的两个 helper（纯搬参数，行为不变） |
| `CLAUDE.md`（改） | 加一条「加载页」说明（触发条件、兜底、改哪儿调参） |

---

### Task 1: 抽出照片展示图参数（纯重构，零行为变更）

**Files:**
- Create: `src/lib/photo-images.ts`
- Modify: `src/pages/photos/[slug].astro`（`imgs` 构建处）、`src/pages/photos/index.astro`（`covers` 构建处的 `big`）

**Interfaces:**
- Produces: `memoImage(src)` 与 `coverImage(src)` —— 均返回 `getImage()` 的结果（含 `.src` 与 `.attributes.srcset`），参数与现状逐字一致：
  - `memoImage`：`widths: [900, 1600]`、`sizes: '(min-width: 900px) min(88vw, 1200px), 100vw'`、`format: 'webp'`、`quality: 80`
  - `coverImage`：`widths: [640, 1000, 1600]`、`sizes: '(min-width: 900px) 46vw, 90vw'`、`format: 'webp'`、`quality: 80`

- [ ] **Step 1: 记录基线** —— `ls dist/_astro/*.webp | xargs -n1 basename | sort > /tmp/webp-before.txt`（当前 13 个文件）
- [ ] **Step 2: 建 `src/lib/photo-images.ts`**，两个导出函数与注释（注明「参数是构建期产物 URL 的一部分，改动会让缓存/预取清单同时失效」）
- [ ] **Step 3: 两个页面改用 helper**（`memoImage(p.data.image)` / `coverImage(r.cover.data.image)`），删掉原地的参数对象
- [ ] **Step 4: `npm run build`** —— 期望 0 error / 0 warning；`ls dist/_astro/*.webp | xargs -n1 basename | sort > /tmp/webp-after.txt && diff /tmp/webp-before.txt /tmp/webp-after.txt` —— **必须无差异**（证明纯重构）
- [ ] **Step 5: 提交** —— `refactor: 照片展示图 getImage 参数集中到 lib(§101 预备)`

---

### Task 2: 预取清单 + Preloader 骨架（可见的静态灰屏，先不播放动画）

**Files:**
- Create: `src/lib/prefetch-manifest.ts`、`src/components/Preloader.astro`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Produces: `prefetchUrls(): Promise<string[]>`（去重后的完整 URL 列表：站内绝对路径）
- Produces: 组件内联脚本读到的全局 `window.__plUrls`（由 `set:html` 注入的 JSON 数组），Task 4 消费

- [ ] **Step 1: `src/lib/prefetch-manifest.ts`**
  - 静态路由：`/`、`/notes/`、`/musings/`、`/links/`、`/projects/`、`/photos/`
  - 详情路由：`notes`/`musings` 集合 → `/<栏目>/<id>/`；`seriesRolls()` → `/photos/<卷slug>/`
  - 图片：把 `photos` 集合全部条目过 `memoImage()`，`seriesRolls()` 的封面过 `coverImage()`；从结果的 `.src` + `.attributes.srcset` 里正则抽 URL（`/\/_astro\/[^\s,]+/g`）
  - 字体：`readdir('public/fonts')` 过滤 `.woff2` → `/fonts/<name>`
  - 全部 `.filter(Boolean)` 后 `new Set()` 去重返回
- [ ] **Step 2: `Preloader.astro` 骨架**（内联、自包含）
  - 结构：`<div id="pl">`（fixed inset 0，z-index 9999）内含 `<canvas id="pl-canvas">` + `<p class="pl-scan">`（CSS 叠加层，Task 3 用）+ 预取清单兜底 `<template>`? 不需要 —— 清单直接 `set:html` 进一个 `<script type="application/json" id="pl-urls">{json}</script>`，脚本 `JSON.parse(document.getElementById('pl-urls').textContent)`
  - CSS（`<style is:inline>`）：灰底径向渐变 `#8f8f8f → #6a6a6a`、居中、`cursor: default`；**兜底动画**：`#pl{animation: pl-out .4s ease 8.5s forwards}`（JS 死掉也会自行淡出）；`<noscript><style>#pl{display:none!important}</style></noscript>`
  - 紧跟标记的**同步内联脚本**（不做动画）：`if (sessionStorage.getItem('plPlayed') === '1') { el.remove(); }` 否则 `sessionStorage.setItem('plPlayed','1')` + `document.body.style.overflow='hidden'` + 记 `html.pl-on`（给后面的脚本判断）
  - 本步先不画 canvas、不预取：屏幕上就是灰屏 + 一行静态 `LOADING`（用 DOM 文本，Task 3 换成 canvas 绘制）
- [ ] **Step 3: `Base.astro` 接入** —— import + `{isHome && <Preloader />}` 放在 `<body>` 开标签之后、`<Nav />` 之前
- [ ] **Step 4: 无头探针 A（新建 `scripts/_probe-preloader.mjs`，验完删）**：用已有 `puppeteer-core` + Edge（`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`），本地 `npx astro preview` 起 `dist`
  - ① 首次加载首页 → 首帧（`waitUntil:'domcontentloaded'` 立刻查）`#pl` 存在
  - ② 同页面 `page.reload()` → `#pl` 不存在
  - ③ 新开 page 访问 `/notes/` → `#pl` 不存在
  - ④ 禁 JS（`page.setJavaScriptEnabled(false)`）→ `#pl` 不存在（noscript 生效）且正文可见
  - ⑤ 清单注入正确：首页 HTML 里 `pl-urls` JSON 解析后长度 ≥ 25，含 `/notes/blog-writing-guide/`、`/fonts/maple-ui.woff2`、至少 13 条 `/_astro/*.webp`
- [ ] **Step 5: `npm run build` 0 警告 + 探针全绿 → 提交** —— `feat: 进站加载页骨架 + 构建期预取清单(§101)`

---

### Task 3: Canvas 渲染器 —— 像素阶梯 + CRT 管面变形

**Files:**
- Modify: `src/components/Preloader.astro`（骨架里的静态 DOM 文本换成 canvas 绘制 + 新增渲染脚本块）

**Interfaces:**
- Produces: `setProgress(p: number)`（0→1，驱动像素档位与进度条）；`renderLoop()`（rAF，封顶 30fps）；本任务先用**假进度**（内部计时 0→1 循环，Step 5 换成真实进度）

- [ ] **Step 1: 核心算法（写进组件内联脚本）**
  - 内部分辨率：`resFor(p)` —— `LOW=18` 行起步，前 70% 进度完成大部分爬升（`Math.pow(min(1,p/0.7), 0.7)`），末档 = 画布 CSS 像素高度（此时 1:1 = 完全锐利）
  - 离屏画布 `off`（宽 = `round(res*aspect)`，高 = `res`）：灰底 + `LOADING`（`bold ${res*0.30}px MapleMono Web, monospace`）+ 分段格子进度条（16 格，填充 = `round(p*16)`）+ 右侧百分比（`Math.round(p*100)+'%'`）
  - 上屏：`dst.imageSmoothingEnabled=false`；**逐行条带变形**
    ```js
    const K = -0.16;              // 曲率：负 = 枕形四角内收，正 = 桶形外凸（dev 里切换定案）
    const STRIP = 2;              // 目标条带高（px）
    for (let y = 0; y < H; y += STRIP) {
      const ny = ((y + STRIP / 2) / H) * 2 - 1;       // -1..1
      const sx = 1 - K * ny * ny;                      // 水平收缩系数
      const sy0 = (y / H) * off.height, sh = (STRIP / H) * off.height;
      dst.drawImage(off, 0, sy0, off.width, sh,
                    (W - W * sx) / 2, y, W * sx, STRIP);
    }
    ```
  - 叠加层（CSS，不参与逐帧）：扫描线 `repeating-linear-gradient(rgba(0,0,0,.14) 0 1px, transparent 1px 3px)`、四角压暗 `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%)`、极轻闪烁（`@keyframes` opacity 0.97↔1，8 步随机感）、文字红/青色差（`text-shadow: -1px 0 rgba(255,0,0,.18), 1px 0 rgba(0,120,255,.18)` 画在 canvas 文本上：`fillText` 前用 `ctx.shadowColor/shadowOffsetX` 做双色重绘）
  - DPR 上限 1.5、帧率封顶 30fps（`if (now - last < 33) return`）
- [ ] **Step 2: 假进度驱动** —— 内部 `p` 在 3s 内 0→1（`easeInOut`），用于本任务验收；`window.__plProgress = p` 供探针读取
- [ ] **Step 3: 无头探针 B（扩展 `_probe-preloader.mjs`）**：加载首页后每 300ms 采样
  - 断言 `#pl-canvas` 存在且尺寸 = 视口 × min(dpr,1.5)
  - **锐度单调性**：对 canvas 中心带做 `toDataURL` 后的像素采样，统计相邻像素亮度差 > 阈值的比例，在 p≈0.2 / 0.5 / 0.9 三个点依次**递增**（这就是「像素块变小 → 变清晰」的机器可验证代理）
  - 断言底部条带行的左右端点 x 随 y 呈内收（枕形）趋势
- [ ] **Step 4: 人工走查**（`npm run dev`）：像素→清晰观感、曲率方向（K 正负各看一遍）、扫描线/暗角强度、色差轻重 —— **本步定下 K 的符号与大小、扫描线密度**
- [ ] **Step 5: `npm run build` 0 警告 + 探针 B 全绿 → 提交** —— `feat: 加载页 Canvas 像素阶梯 + CRT 管面变形(§101)`

---

### Task 4: 预取引擎 + 真实字节进度 + 时长约束 + 收尾

**Files:**
- Modify: `src/components/Preloader.astro`（渲染脚本块内：假进度 → 真实进度；新增预取与收尾）

**Interfaces:**
- Consumes: `window.__plUrls`（Task 2 注入）
- Produces: `window.__plState = { done, total, bytes, finished }`（探针读）

- [ ] **Step 1: 预取引擎**
  ```js
  async function grab(url, onBytes) {
    const r = await fetch(url, { priority: 'low', cache: 'force-cache' });
    const len = Number(r.headers.get('content-length')) || 0;
    if (!r.body) { await r.arrayBuffer(); onBytes(len || 12000); return; }
    const rd = r.body.getReader();
    for (;;) { const { done, value } = await rd.read(); if (done) break; onBytes(value.length); }
  }
  ```
  - 并发 4 的队列；`total` 用「已见 content-length 之和」动态累计（未响应的先用该 URL 的保守估值），`p = received / total`
  - `saveData` 或 2G（`navigator.connection`）：只保留 HTML 类 URL（以 `/` 结尾）
  - 单个失败：`catch` 后计入完成，不重试
- [ ] **Step 2: 时长约束与收尾**
  - `MIN_MS = 1200`、`MAX_MS = 6000`；显示进度 = `max(真实进度, 显示进度)` 并向真实值缓动（避免回退跳变）；到 `MAX_MS` 强制 `targetP = 1`
  - 收尾：`p >= 1` 且 `elapsed >= MIN_MS` → 白闪（80ms）→ 灰幕内收（`transform: scaleY(.004)` + 亮度衰减，220ms）→ `el.remove()`、`document.body.style.overflow=''`、`delete window.__plState.finished = true`
  - `prefers-reduced-motion`：跳过像素爬升与变形帧循环（直接画末档 = 锐利版），进度条仍真实推进，`MIN_MS` 缩短为 400ms
- [ ] **Step 3: 无头探针 C**（限速 `latency 200ms / 500KB/s`）
  - ① `window.__plState.finished === true` 后 `#pl` 已从 DOM 移除、`body.style.overflow` 为空、`window.scrollY` 可改
  - ② 请求数：CDP 网络日志里站点同源请求覆盖清单中的全部 HTML 路由（≥ 14）与全部 `/_astro/*.webp`
  - ③ 上限：把清单替换成一组永不响应的 URL（探针注入）→ 断言 `finished` 在 6.5s 内为真
  - ④ reduced-motion 模拟（`page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])`）→ 直接锐利版、仍会结束并移除
- [ ] **Step 4: `npm run build` 0 警告 + 探针全绿 → 提交** —— `feat: 加载页真实预取进度 + 时长约束与收尾(§101)`

---

### Task 5: 文档同步 + 全量验收

**Files:**
- Modify: `CLAUDE.md`（在「页面形态」或「链接预取」bullet 后追加一条）、必要时 `README.md` 不动

- [ ] **Step 1: CLAUDE.md 追加**：加载页只在首页整页加载 + 每会话一次；改哪儿调参（K 曲率、LOW 分辨率、MIN/MAX_MS、清单来源）；兜底六条一句话列全；提示「改动照片 getImage 参数会让预取清单与页面 URL 不再同源 —— Task 1 的 helper 就是为此集中管理」
- [ ] **Step 2: 全量验收**：`npm run build` 0 警告；`npm run preview` 后 curl `/`、`/notes/`、`/photos/`、`/photos/nikon-roll/` 全 200、`/nope-xyz` 404；无头探针 A/B/C 连跑全绿；`npm run dev` 人工走查一次完整首访（含移动端 375px 视口）
- [ ] **Step 3: 清理临时探针脚本**（`scripts/_probe-preloader.mjs` 删除，保持工作区干净）
- [ ] **Step 4: 提交** —— `docs: 加载页参数与兜底写入 CLAUDE(§101)`

---

## Self-Review

**Spec 覆盖**：出现时机（Task 2 Step 2/3）✓；像素→清晰（Task 3 Step 1-3）✓；CRT 管面/暗角/扫描线/闪烁/色差（Task 3 Step 1、Step 4）✓；预取清单与真实字节进度（Task 2 Step 1、Task 4 Step 1）✓；saveData/2G 降级（Task 4 Step 1）✓；六重兜底 —— 失败不卡（Task 4 Step 1）、6s 上限（Task 4 Step 2）、1.2s 下限（同）、无 JS noscript（Task 2 Step 2/4④）、reduced-motion（Task 4 Step 2/3④）、CSS 强制淡出（Task 2 Step 2）✓；性能边界 DPR/帧率（Task 3 Step 1）✓；落点与零残留（Task 2 Step 3、Task 4 Step 2）✓。

**占位符扫描**：无 TBD/TODO；每个代码步骤都给了可直接落地的实现或精确参数。

**命名一致性**：`memoImage`/`coverImage`（Task 1）→ Task 2 清单消费同名；`window.__plUrls`（Task 2 注入 → Task 4 消费）；`window.__plState`（Task 4 生产 → Task 4 探针消费）；`#pl` / `#pl-canvas` 全程一致。
