# 个人博客主页 · 液态玻璃风格 — 设计文档

- 日期：2026-09-06
- 状态：已获用户批准（2026-09-06）
- 目标平台：GitHub Pages（`*.github.io`），静态托管，无服务器/数据库

## 1. 背景与目标

用户要一个**好维护的个人博客主页**，UI 参照当前主流设计语言（Apple Liquid Glass / 玻璃拟态 2.0 时代），可部署到 GitHub Pages，包含欢迎页与多个细分栏目。

「好维护」的定义：

1. **写内容 = 写文件**：日常更新不碰代码，新增文章/照片/链接就是新增一个 Markdown 文件（带模板）。
2. **改版 = 改组件**：视觉与结构组件化，样式 token 集中管理。
3. **发布零折腾**：推送到 GitHub 即自动构建部署；坏内容（字段错、图片断链）在构建期拦截，不污染线上。

## 2. 范围与非目标

### 范围内
- 欢迎首页（Hero + 各栏目最新内容预览流）
- 五个栏目：个人笔记、摄影作品集、个人迷思、有用的网站参考、项目集
- 五类内容的列表页与详情页（摄影为画廊单页 + 灯箱）
- 液态玻璃视觉系统（亮/暗双主题、光斑层、降级策略）
- 站内搜索（静态索引）
- GitHub Actions 自动部署

### 非目标（YAGNI，明确砍掉）
- 评论系统、登录、数据库
- 独立「分类/标签」页面（笔记列表内做轻量标签过滤）
- RSS、多语言（内容以中文为主）
- 独立「关于」页（欢迎页 Hero 承担自我介绍，日后需要再加）
- 自定义域名、图片外链图床（照片本地托管）

## 3. 信息架构

### 站点地图

```
/                     欢迎页：液态玻璃 Hero（站名/标语/自我简介 + CTA）+ 最新内容预览流
/notes                个人笔记列表（按年分组、标签过滤）
/notes/[slug]         笔记详情（窄栏阅读排版）
/musings              个人迷思列表
/musings/[slug]       迷思详情
/photos               摄影作品集（网格画廊 + 原生 dialog 灯箱）
/links                有用的网站参考（卡片清单：域名徽标 + 一句话点评）
/projects             项目集（玻璃网格卡片：封面/技术栈/链接）
/search               站内搜索
/404                  玻璃风格错误页
```

### 导航
顺序：欢迎（首页）· 个人笔记 · 摄影作品集 · 个人迷思 · 网站参考 · 项目集；右侧：搜索入口 + 主题切换按钮。
移动端（<768px）收进抽屉菜单。

### URL / slug 约定
- 文件名 = ASCII kebab-case slug（如 `2026-09-01-css-glassmorphism.md`），URL 路径显示英文 slug，标题中文显示在页面内。
- 日期不进 URL，仅作 frontmatter 元数据（避免搬文章时改 URL）。

## 4. 内容模型（Astro Content Collections）

位置：`src/content/<collection>/`，schema 定义在 `src/content.config.ts`（zod），**构建期强校验**。

### 共享字段
所有集合：`title: string`（必填）、`date: string (ISO)`（必填）、`summary?: string`（列表卡摘要，缺省取正文首段）、`draft?: boolean`（true 时本地产出但构建排除——给「写了没写完」的内容）。

### 各集合专属字段

| 集合 | 字段 | 必填 | 说明 |
|---|---|---|---|
| `notes` | `tags?: string[]` | 否 | 列表页标签过滤数据源 |
| `musings` | 无专属字段 | — | 与 notes 独立，日后可单独换排版 |
| `photos` | `image: image("./<同名文件>.jpg")`、`alt: string`、`location?: string`、`camera?: { body?, lens?, f?, ss?, iso? }`、`album?: string` | image/alt 必填 | 每张照片 = 一个 `.md`，与其图片**同名同目录**存放；`image()` 由 Astro 构建期解析校验，断链即报错 |
| `links` | `url: string`、`tags?: string[]` | url 必填 | 一句话点评写正文；卡片取 `new URL(url).hostname` 显示域名徽标 |
| `projects` | `repo?: string`、`url?: string`、`tech: string[]`、`image?: image(...)` | tech 必填 | repo/url 至少一个 |

### 目录约定
```
src/content/
  notes/     *.md            （带模板注释的示例文件随脚手架提供）
  musings/   *.md
  photos/    <slug>.md + <slug>.jpg   （同目录同名）
  links/     *.md
  projects/  *.md
```

### 新增内容的维护路径（写进 README）
复制 `src/content/<type>/_template.md` → 改 frontmatter 与正文 → `npm run dev` 预览 → 推送即上线。模板文件 `_template.md` 设置 `draft: true` 或直接以 `.md.example` 后缀避免被构建收录。

## 5. 视觉设计规范（Apple 液态玻璃 × 主流现代 UI）

### 5.1 玻璃系统

核心机制：面板半透明 + `backdrop-filter: blur() saturate()` 模糊折射背后内容 + 高光描边 + 顶部 specular 渐变模拟玻璃边缘反光。

全局 token（`src/styles/tokens.css` 的 `:root` 与 `[data-theme="dark"]`）：

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--glass-bg` | `rgba(255,255,255,.55)` | `rgba(255,255,255,.08)` | 面板底色 |
| `--glass-border` | `rgba(255,255,255,.65)` | `rgba(255,255,255,.16)` | 1px 描边 |
| `--glass-hl` | `rgba(255,255,255,.9)` | `rgba(255,255,255,.28)` | 顶部高光渐变起色 |
| `--glass-blur` | `20px` | `24px` | backdrop 模糊半径 |
| `--glass-saturate` | `180%` | `170%` | backdrop 饱和 |
| `--glass-radius` | `22px` | `22px` | 面板圆角（小件 14px） |
| `--glass-shadow` | `0 8px 32px rgba(31,38,68,.12)` | `0 8px 32px rgba(0,0,0,.4)` | 悬浮投影 |
| `--text-1/2/3` | 深蓝灰阶 | 亮蓝灰阶 | 主/次/弱文字 |
| `--accent` | 靛蓝 `#4f6bff` | 淡蓝紫 `#8fa8ff` | 链接/CTA 强调 |
| `--canvas` | `#eef1f8` | `#0c0e16` | 页面基底 |

高光描边实现：`border: 1px solid var(--glass-border)` + `background-image: linear-gradient(180deg, var(--glass-hl), transparent 40%)`（背景渐变与半透明底色叠加，不透明度由底色控制）。

### 5.2 光斑层（折射素材）
- 全局固定定位层（`position: fixed; inset: 0; z-index: -1`），叠 3~5 个大半径 conic/radial 渐变光斑（紫/蓝/青/暖桃的低饱和系），`filter: blur(60px+)` 自带柔化。
- 缓慢漂移动画 20~40s 循环（transform 位移，触发 GPU）；暗色主题下光斑降饱和降亮度。
- 性能：光斑层用 `will-change: transform`，动画元素数量 ≤5。

### 5.3 暗色模式机制
- `<html data-theme="light|dark">`；默认跟随 `prefers-color-scheme`，手动切换写 `localStorage`。
- 首屏 inline script（`<head>` 内、CSS 前）防 FOUC。
- 无独立暗色布局，仅 token 切换——组件不感知主题。

### 5.4 排版
- 字体栈（零下载）：`-apple-system, "SF Pro Text", "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", system-ui, sans-serif`；等宽 `ui-monospace, "SF Mono", Consolas, monospace`。
- Hero 标题 44~64px 粗字重；正文 17px/1.75；阅读列宽 68ch。

### 5.5 交互与动效
- 卡片 hover：`translateY(-4px)` + 描边/高光增亮 + 投影加深，150~200ms ease-out。
- CTA/胶囊按钮：玻璃面板样式，hover 高光扫过。
- 照片灯箱：原生 `<dialog>`，ESC/点击遮罩关闭，前后箭头翻页，零依赖。
- `@media (prefers-reduced-motion: reduce)`：漂移动画、过渡全部关闭。

### 5.6 降级策略
- `@supports not (backdrop-filter: blur(1px))` → `--glass-bg` 提为 `rgba(255,255,255,.94)` / `rgba(15,17,26,.94)`，视觉近实心但布局、可读性、暗色全保持。

## 6. 页面与组件架构

### 6.1 组件清单（职责单一、可独立维护）

| 组件 | 职责 |
|---|---|
| `BlobField.astro` | 光斑层 + 动画（唯一渲染动效的地方） |
| `Nav.astro` / `Footer.astro` | 导航抽屉、面包屑、版权/建站年份 |
| `GlassCard.astro` | 通用玻璃面板（slot），所有卡片的基底 |
| `Hero.astro` | 欢迎页主视觉（站名、标语、简介、CTA） |
| `PostCard.astro` / `PostList.astro` | 笔记/迷思列表卡与列表（按年分组 + 标签过滤） |
| `PhotoCard.astro` / `Lightbox.astro` | 照片缩略卡（玻璃底衬 + 说明条）与 dialog 灯箱 |
| `LinkCard.astro` | 网站参考卡（favicon 占位圆标 + 域名 + 点评） |
| `ProjectCard.astro` | 项目卡（封面/技术栈 pill/外链） |
| `SearchBox.astro` | 搜索框（交互组件，唯一含客户端 JS 的页面组件） |
| `ThemeToggle.astro` | 主题切换按钮 |
| `Pill.astro` | 标签小胶囊 |
| `SectionHeader.astro` | 栏目页头（标题 + 计数 + 说明） |

### 6.2 布局
`src/layouts/Base.astro`：全站外壳（`<head>` 注入、暗色防闪脚本、BlobField、Nav、slot、Footer）。

### 6.3 样式策略
- `src/styles/tokens.css`：设计 token（§5.1）——**全局唯一配色/圆角/动效来源**。
- `src/styles/base.css`：reset、排版基元、玻璃面板基类、降级查询。
- 组件级 `<style>`：只写自身结构，引用 token。
- 无 UI 框架、无 CSS 后处理依赖。

## 7. 站内搜索设计

- 构建期把 `notes` + `musings`（标题、摘要、正文去标记文本）序列化为 `<script type="application/json" id="search-index">` 直接内嵌进搜索页 HTML；客户端读 DOM 做匹配，**无额外网络请求、不受 `base` 路径影响**，零服务器。索引随页面打包为静态产物。
- 前端 fuse.js（唯一运行时第三方依赖，~15KB gzip 级）：keys = 标题/摘要/正文，阈值宽松、结果上限 20 条。
- 结果分组标注来源栏目；点标题进详情页；空态与无结果态均有玻璃风占位。
- 纯本地索引，不索引照片/链接/项目（YAGNI；日后要可加）。

## 8. 图片管线

- 原件与照片笔记**同目录**存放于 `src/content/photos/`（`image()` schema 相对引用、构建期解析断链即报错）；配合 `getImage()` 构建期生成响应式尺寸与 webp/avif，画廊 `<img loading="lazy" decoding="async">`。
- 初始种子：实现阶段用脚本（sharp）生成 3 张渐变占位图，验证全管线后用户可直接覆盖替换。
- alt 必填（schema 强制），构建期校验图片存在。

## 9. 部署（GitHub Pages）

- `astro.config.mjs`：`site` 与 `base` 由环境变量/仓库判定——`<user>.github.io` 仓库 → `base: "/"`；普通项目仓库 → `base: "/<repo>/"`。**初版按用户提供仓库名后确定**（实现开始前确认：GitHub 用户名与仓库名）。
- `.github/workflows/deploy.yml`：`checkout → setup-node 20 → npm ci → astro build → actions/upload-pages-artifact → deploy-pages`；Pages 设置选 GitHub Actions 为源。
- 本地开发：`npm run dev`（热更新）；`npm run build && npm run preview` 本地验收产物。
- 环境前提：Node ≥ 20 + npm（Windows 本机，实现第一步核验版本）。

## 10. 质量边界与错误处理

- **构建期拦截**：frontmatter schema 校验失败、图片引用断裂、photos 缺 alt → `astro build` 非零退出并给出文件名定位。
- **404 页**：玻璃风格，含回首页入口与站点搜索框（顺手救回迷路的访客）。
- **可访问性**：灯箱焦点圈闭与 ESC；主题切换不闪屏；对比度满足正文阅读；按钮/链接有明确 focus 样式。
- **降级完整**：无 backdrop-filter 浏览器、reduced-motion 用户、JS 关闭（搜索/灯箱不可用但全站可读——页面本身零 JS 依赖）。

## 11. 验证清单（实现完成验收）

1. `astro build` 零警告零错误通过。
2. 五栏目 + 欢迎页导航可达、内容正确渲染；列表分组/计数正确。
3. 搜索能命中种子内容、空态不破版。
4. 暗色/亮色切换即时生效并跨刷新保持；跟随系统默认正确。
5. 照片画廊懒加载 + 灯箱开合/翻页/ESC 正常；无照片集合不报错。
6. 375 / 768 / 1440 三档宽度无溢出、无横向滚动条。
7. 仿真 `prefers-reduced-motion` 与无 backdrop-filter（DevTools）后页面可用。
8. 构建产物 `npm run preview` 本地全站走查一遍（含 404）。
9. 推送到 GitHub 后 Actions 构建成功，Pages 线上走查。

## 12. 风格参考来源（实现时的视觉锚点）

- Apple Liquid Glass 官方设计语言（WWDC 2025 / Apple Design 资源站）——玻璃层级、specular 高光、大圆角
- Apple.com 产品页——玻璃卡片悬浮与光斑背景的运用方式
- Linear / Vercel / Raycast 博客首页——现代内容站的信息密度与间距节奏
- Overreacted 等单栏博客——正文排版比例

## 13. 实施前提（写入实现计划前待确认）

1. GitHub 用户名与仓库名（决定 `base` 与 Pages 配置；仓库需用户创建或授权创建）
2. Node.js 本机版本 ≥ 20（核验；不足则装 LTS）

## 14. 改版记录 v2（2026-09-06，用户逐点批准；与上文冲突处以此节为准）

参考仓库：LGGC-liquid-glass（MIT，Guochen Wang）——玻璃配方借鉴；InternalBeyond（Sui）——欢迎屏概念参考（不复制代码）。

1. **纯白单主题**：页面基底 `#fff`，删除光斑层/背景杂光与全部暗色 token、ThemeToggle 与防闪脚本（§5.2/§5.3 作废）。
2. **玻璃配方校准（LGGC 思路、白底化）**：面板 `rgba(255,255,255,.62)`，`backdrop blur(6px) saturate(150%)`，发丝描边 `1px rgba(15,23,42,.07)`，灰阶低透明投影；常态无内打光。圆角收敛：大面 14px / 控件 9px（§5.1 的 22px 系作废）。
3. **折射色散（新增 `.prism` 交互态）**：hover/激活时边缘泛起 1px 低饱和 conic 棱光环（淡蓝→淡紫→淡粉→淡青，`@property --angle` 缓转 ~6s/圈）；`prefers-reduced-motion` 只淡入不旋转。
4. **导航 v2**：整条 `fixed` 顶栏（白玻璃+底发丝线）；左对齐 站名+五栏目；搜索框最右（紧凑玻璃输入，focus 展宽）；当前栏目水滴弹性玻璃滑块（`cubic-bezier(.34,1.56,.64,1)` + 中段 1.06 放大，JS 量测 FLIP）。<860px 收抽屉，滑块静态。§5.1 的悬浮胶囊与 §3 导航顺序作废（右移搜索仍成立）。
5. **欢迎页独立单屏**：全屏垂直居中 = 华文中宋大字站名（字栈 `"华文中宋","STZhongsong","Songti SC","SimSun",serif`）+ 灰调副标 + 「写字 · 拍照 · 收藏」小字 + 两枚玻璃入口；删除首页五栏预览流（§3 站点地图首页行作废）。
6. **全局同步**：`.glass/.btn/.pill/.prose/卡片 hover` 统一 v2（hover 微浮 2px + 棱光环泛起）；代码块维持深色中性面板。卡片一律不内打光。
7. 其余（内容模型 §4、搜索 §7、图片管线 §8、部署 §9、schema 校验 §10）不变。
