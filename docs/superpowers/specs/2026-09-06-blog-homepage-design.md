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

## 15. 改版记录 v2.1（2026-09-06，用户逐点批准；冲突处以此节为准）

1. **网格背景**：全站底色改为细灰线方格（`--grid-line: rgba(15,23,42,.05)`、`--grid-size: 22px`，body 双层 linear-gradient 平铺），以衬托玻璃边缘棱光；无其他装饰光。§14.1 的纯白静底作废。
2. **页脚吸底**：body 改 flex 纵向（`min-height: 100dvh`），`.main { flex: 1 0 auto }`——内容不满一屏时页脚贴视口底；内容超长时随滚动出现在末尾。含 `.welcome` 的页：`.main:has(.welcome)` 取消纵向大留白并改用 `min-height: calc(100dvh - var(--nav-h) - 84px)` 的居中单屏。
3. **摄影作品独立详情页**（替代画廊灯箱）：
   - `/photos/[slug]`：标题/日期/地点/相册/相机参数信息 + 正文（markdown 可图可文）；
   - 布局按画面比例：**横图（宽≥高）→ 图片在上、文字与信息在下**；**竖图（宽<高）→ 图左、文字右**（`grid-template-columns: minmax(0,1.5fr) minmax(0,1fr)`）；窄屏（<880px）一律上下叠放；
   - 方向判断构建期完成（内容集合 `image()` 元数据自带 width/height，无需客户端 JS）；
   - 底部「上一篇/下一篇」跨照片导航（按日期倒序，边界隐藏）；
   - 画廊缩略图由「点击弹灯箱」改为「点击进详情页」；删除 `Lightbox.astro`、`scripts/lightbox.ts`、`photo-collection` 内嵌 JSON 与 PhotoCard 的按钮/展示分支（PhotoCard 收敛为带 href 的链接卡，首页预览仍指向 `/photos/`）。
   - 摄影正文仍可自由 Markdown 插图配文（每篇照片 md 的 body 即可放更多图与长文）。

## 16. 玻璃保真修正 v2.2（2026-09-06，用户反馈「参考 LGGC 实现玻璃效果」；冲突处以此节为准）

1. **玻璃可见性根因**：此前 `blur(6px)` 把 22px 网格下 1px 细线全部糊平 → 面板内呈死白，「不透明」。修正为 LGGC 同思路的**低模糊透底** + **厚度光影**组合：
   - `--glass-bg: rgba(255,255,255,.55)`（更透）、`--glass-blur: 3px`（线条穿过面板但被软化 → 透明感成立）、`--glass-sat: 1.35`；
   - 新增 `--glass-inset`（LGGC 对角高光 + 内侧暗边，四段 box-shadow）：`inset 1.5px -1.5px 1px -1px rgba(255,255,255,.9), inset -1.5px 1.5px 1px -1px rgba(255,255,255,.75), inset 0 0 2px rgba(15,23,42,.08), inset 0 0 0 .5px rgba(15,23,42,.05)`；
   - `.glass` 与 `.btn` 的 box-shadow 改为 `var(--glass-inset), var(--glass-shadow)`（外投影保留）；`.sform` 同步；hover/focus 覆盖 box-shadow 的规则（.btn:hover、GlassCard .raise:hover、PhotoCard .photocard:hover）改为 `var(--glass-inset), var(--glass-shadow-lg)`，浮起时不丢厚度光影；
   - `--glass-border` 由 `.07` 微调至 `.08`（与内侧暗边同值协调）。

## 17. 玻璃配方 v3 —— 水珠拟态（2026-09-06，用户弃 LGGC 改以 gitee greyd097/yzrt「纯CSS液态玻璃」为参考；冲突处以此节为准）

1. **光影结构换成 yzrt 水珠对仗式**（光源左上）：
   - 外投加重并带方向：`--glass-shadow` 四层含 `14px 20px 40px -20px rgba(16,24,40,.2)` 右下重投；`--glass-shadow-lg` 更重（hover/浮起）；
   - 内影对仗：`--glass-inset = inset 3px 3px 7px -2px rgba(15,23,42,.1)`（右下内侧暗）+ `inset -3px -3px 7px -2px rgba(255,255,255,.85)`（左上内侧白）；
   - 取消 LGGC 式四段对角细棱与 0.5px 内描边（§16.1 的 --glass-inset 值被替换）。
2. **透度继续上调**：`--glass-bg .38`、`--glass-blur 2px`、`--glass-sat 1.3` —— 背景（网格/内容）必须清晰透过面板（用户硬性要求）。
3. **按钮水滴化**：`.btn` 有机形态圆角（`46% 54% 51% 49% / …`），hover 时形态流动（`border-radius` 随 `--ease-spring` 过渡）；表面左上高光点 `::before` 随 hover 位移（水珠反光）；`.btn--primary` 填充不变。
4. 卡片/面板（`.glass`、`.btn`、`.sform`、photocard/imgshell 玻璃沿）自动继承新内外影；hover 的 box-shadow 覆盖一律为 `var(--glass-inset), var(--glass-shadow-lg)`（§16 保留）。

## 18. 全透定稿 v3.1（2026-09-06，用户：「直接改为全透」「首页按钮改小圆角矩形」；冲突处以此节为准）

1. `--glass-bg: rgba(255,255,255,0)` —— 面板**零填充全透**，背景内容（网格/正文/图片）直接可见；`--glass-blur: 1px`（仅保留“玻璃片”式微软化读感）、`--glass-sat: 1.25`。玻璃观感完全由内外影与描边承担。
2. 按钮撤掉有机水滴形态与高光点：`.btn` 改**小圆角矩形**（`border-radius: var(--radius-s)` = 9px），hover 仅微浮 + 深投影 + 棱光环（§17.3 的有机圆角/::before 高光点作废）。
3. §17 的内外影对仗（右下暗/左上白）、加重方向性外投影、hover inset 保留，全部不变。

## 19. 摄影作品集胶片重构 + series 内容模型（2026-09-06，用户逐点批准）

1. **内容模型**：新增 `series` 内容集合（`src/content/series/*.md`）：`title`(卷名)、`date`、`location?`、`summary?`、`cover: 照片slug`(必填，须属于该卷)、`draft?`；正文=备忘录长文。`photos` md 增可选 `series: <series slug>` 挂靠（不加的照片不出现在胶片，但保留文件不删）。照片自身 body = 该张照片文字。
2. **/photos 主页 = 横向胶卷**：一卷一帧；帧内容=封面图缩略；胶片为灰边横轨（带上下齿孔装饰）；默认选中第一卷。
3. **两段式交互**：点帧=选中（**帧上方浮现时间戳、下方浮现地点**，此时才显示；边缘泛微光，同时页脚玻璃栏染上一层同源柔光）；再点选中帧（或帧上浮现的箭头）进入卷备忘页。键盘可达（Tab 聚焦帧，Enter 同逻辑）。
4. **卷备忘页 `/photos/<series-slug>/`**：页首=备忘录（卷名/日期/地点 + prose 长文）；下方按日期升序排卷内照片：**横版照片独占一行（图后接其正文）**，**竖版照片左图右文**（两栏，<880px 单列）；图片均玻璃相框。删除旧的单张照片页语义与 PhotoCard 组件（首页/他处无引用）。
5. 相册无卷时显示玻璃空态。

## 20. 功能删除与修复记录（2026-09-06，用户指定）

1. **删除站内搜索**：移除 `pages/search`、`scripts/search.ts`、`components/SearchBox.astro`、fuse.js 依赖、导航搜索框与抽屉内搜索、404 搜索框（其第二按钮改为「回到摄影作品集」）；Nav 顶栏恢复「左：站名+栏目」、右侧无工具（汉堡仅 <880px 显示）。
2. **笔记/迷思主页宽度与摄影对齐**：列表卡网格 min 300px（与摄影同基线）。
3. **标签筛选修复**：PostList 过滤改为事件委托 + `style.display` 直控（弃 `hidden` 属性方案），chip 带 `aria-pressed`；空组标题随过滤隐藏。
4. 页脚版权栏无搜索相关内容。

## 21. 摄影集暗房化 v3（2026-09-06，用户逐点批准；冲突处以此节为准，§19 胶片主页 2/3/4 条作废）

1. **暗色页机制**：Base 增 props `dark?: boolean`（body 加 `page-dark`）与 `immersive?: boolean`（body 加 `page-immersive`：隐藏页脚、`main` padding 归零）。`body.page-dark` 在 base.css 全局覆写 token：`--canvas #0b0c10`、`--grid-line rgba(255,255,255,.035)`、`--text-1/2/3` 亮阶、`--accent #ff6b6b`（暗房红）、`--glass-border rgba(255,255,255,.12)`、`--glass-bg rgba(12,13,18,.4)`（面板深色玻璃）、inset 换黑底版；并覆写 `.topbar/.drawer` 为深色玻璃。prism/降级规则不变。
2. **/photos 主页 = 无边框全屏暗房（immersive + dark）**：整屏被当前卷封面完全覆盖（object-fit: cover，`calc(100dvh - var(--nav-h))` 高、无边框无胶片壳）；**一卷一屏**，中央（两侧边条区之外）点击进入该卷备忘页；**左右两侧各露出一条相邻卷封面缩略（半伸出，hover 展开）点击即切换**；键盘 ←/→ 同切换；切换时 0.35s 淡入。底部左侧：时间戳与地点——**白色字 + 红色微光 text-shadow**；中央底部一行淡提示「点击画面进入备忘录 · 两侧底片切换」。单卷时隐藏侧条。
3. **卷备忘页 = dark（非 immersive，保留顶栏/页脚）**：页头/正文/照片区沿用 v2d 备忘结构，dark token 自动生效；页头下加一条红光发丝线（`1px rgba(255,107,107,.45)`）作暗房点缀；照片玻璃相框由 dark `--glass-bg/inset` 呈现。
4. 个人笔记/个人迷思列表卡改桌面双栏大卡（`minmax(min(100%,460px),1fr)`，解决电脑屏过窄；§20.2 的 300px 作废）。
2. **页脚回归玻璃样式**：底部栏为 `.glass` 液态玻璃条（radius-lg、吸底 flex 结构不变），内容=许可注记 + 版权行。
3. 欢迎页两枚入口按钮与摄影卡/详情相框（`photocard`/`imgshell` 10px 玻璃沿）随之获得同套厚度光影与透底效果；hover 棱光环（§14.3）不变。

## 22. 导航滑块跨页滑动 + 摄影集 135 底片化（2026-09-07，用户逐点批准；冲突处以此节为准）

1. **导航水滴滑块 = 真·跨页液态滑动**（§14.4 的「着陆语义」作废）：滑块 `<span>` 带 `transition:persist` —— View Transitions 换页时节点不重建、旧位置与宽度保留 → 新页量测 `.navlink.is-active` 后由 CSS 过渡（`var(--ease-spring)` 0.6s）从旧位弹滑到新栏目。**垂直居中修复**：CSS 组合位移 `transform: translate(var(--sx,0px),-50%)`，JS 只写 `--sx`/width（历史坑：JS 直写 `style.transform = translateX()` 会覆盖 CSS 的 `translateY(-50%)`，滑块沿 `top:50%` 顶边下挂半身 → 偏下、不裹字）。量测：`--sx` 为空（全新加载）才直接落位；布局未就绪逐帧重试（~12 帧）；字体首次生效只在会话首布局校正一次（每次导航校正会把跨页滑动掐成瞬移）；「着陆」脉冲仅真实跨栏位移（|Δx|>2px）触发；resize 150ms 防抖直落。
2. **/photos = 135 底片化暗房**（§21.2 的「整屏 cover 盖满」作废）：照片不再铺满整屏。沉浸舞台（base.css `position:fixed; inset: var(--nav-h) 0 0 0` 不变，勿改回 dvh 高度）内部改 flex 列布局：
   - **底片主体 `.film`（flex:1, 0 auto 高度）**：上/下两条黑色齿孔带（`--perf` 30px，SVG 齿孔 tile 横排，移动端 22px `background-size: auto 100%` 等比缩放；带身 `#14151b`、孔洞 `#030408`）夹住照片区 `.farea`（`inset: var(--perf) 0`）；照片**横向铺满 + cover 裁切，纵向被限制在两条齿孔带之间** —— 顶带贴顶栏之下、底带停在信息栏之上，两侧都不遮挡。底片整体红光泛光（film 双重大半径 box-shadow）。
   - **底部信息栏 `.dock`（flex 末尾独立行，不叠在照片上）**：三栏 grid = 左 时间/地点（白字红光 text-shadow，沿用 §21.1）+ 中 提示行 + 右「N 张」；深色渐变底 + 顶发丝线。<760px 收为两栏（隐藏提示）。
   - **换卷 = 两段式线性动画**（§21.2 的 0.35s 淡入作废）：旧图先沿前进方向线性滑出（140ms ±26px），预加载完成后新图自对侧线性滑入（480ms ±26px→0，opacity 同为线性 keyframes）；**缓存命中也要等旧图滑满 OUT 再换源**，保证先后次序。竞态防护：请求令牌（req 自增，过期 onload 丢弃）+ 单一定时器（每次 render 取消未完成阶段，并先清 keyframes 残留类——类在动画期间盖过内联透明度）。同图（SSR 首帧 / 切回）不动画防闪烁。
   - 相邻卷侧条（半伸出缩略条）移入 `.film` 内：`top:50%` 即照片区垂直中线（不含信息栏），hover 展开、点击/←/→ 切换逻辑不变；单卷隐藏。
3. 卷备忘页 `/photos/<slug>/`（§21.3）与系列内容模型（§19.1）不变。

## 23. 滑块与暗房后的维护说明（2026-09-07）

1. `.slider` 的 `transition:persist` 依赖元素在所有页面**同序出现**（Nav 顶栏全站一致）；若未来有页面不出顶栏，滑块会退化为每页重建——届时 `astro:page-load` 分支会直接落位，功能仍可用但无滑动。
2. `/photos` 里 `.stage` 自身**不要声明 height/position**（base.css 的 `body.page-immersive .stage` 以更高特异性置 `fixed + inset`；组件内再写 height 会参与定高计算，曾致 dvh 塌陷类问题）。改布局只动 flex 子项。

## 24. 列表页单列通栏大卡（2026-09-07，用户选型；冲突处以此节为准，§21.4 桌面双栏作废）

1. **个人笔记 / 个人迷思 / 网站参考列表改单列通栏大卡**：`.pcols`/`.lgrid` 弃 `repeat(auto-fill, minmax(...))`，统一 `grid-template-columns: minmax(0, 1fr)`（一行一张，卡宽 ≈ 容器 ~1100px）；卡间距 `clamp(18px,2.4vw,28px)`。
2. **PostCard（notes/musings）通栏版式**：`.ptop` 行内 标题 ↔ 日期 对顶（baseline 两端、可折行）；摘要 `.ps` 限宽 `min(100%, 76ch)` 保持阅读节奏（字号 1.02rem / 行高 1.8）；标签行在其下。卡内 padding `clamp(24px,3.4vw,38px) clamp(24px,4vw,52px)`。
3. **LinkCard 通栏版式**：`.top` = 左（图标 48px 渐变块 + 标题/域名）↔ 右（日期「收藏」）；说明 `.ln` 同 76ch 限宽；标签行其下。padding 同档。
4. 移动端沿用单列 + 收窄 padding；标签过滤（§20.3）、分组年份与其余不变。

## 25. 滑块鼠标跟随 + 三栏目卡统一基准高（2026-09-07，用户逐点批准；冲突处以此节为准）

1. **Nav 滑块改「液态跟随」**（§22.1 的落位滑动语义仍用于换页，此处改交互）：鼠标在栏目区时滑块吸附最近栏目——pointermove 每帧**现量** offsetLeft/width（实测缓存会因字体加载失效致悬停错位，勿缓存），rAF 指数阻尼驱动（τ≈90ms，≈参考 demo 的 easing.damp）；移除滑块 CSS 位移过渡与「着陆」脉冲（与阻尼互斥）。鼠标离开栏目区滑回激活栏目；点击栏目链接才跳页。首页/404 无激活栏目：悬停仍跟随、空闲隐藏。触屏与 <880px 抽屉导航不启用跟随。换页落位仍靠 document/window 双挂 astro:page-load + MutationObserver 兜底（§22.1）。
2. **暗色页滑块辉光改暗红**：`body.page-dark .slider` 顶部高光径向渐变 `rgba(255,90,80,.17)`、描边 `rgba(255,107,107,.34)`、外层加红光 halo（`0 0 22px -4px rgba(255,70,70,.45)`）——弃白色玻璃高光。
3. **个人迷思 / 网站参考与个人笔记卡片对齐**：PostCard 与 LinkCard 统一 `min-height: 230px`、同款内边距 `clamp(24px,3.4vw,38px) clamp(24px,4vw,52px)`、标签行 `margin-top:auto` 沉底；LinkCard 标题字号同步上调（clamp 1.2–1.4rem）。列宽结构沿用 §24 单列通栏。

## 26. 摄影栏目红色射线氛围（2026-09-07，用户提供参考配方并选择放置层）

1. **背景源**：SideRays（react-bits · DavidHDev/react-bits，MIT）——ogl（轻量 WebGL）全屏三角形 + 片段着色器（volumetric rays 双色/转速/散度/滤色/衰减）。**弃 react 壳**：本站零框架纪律，移植为 `src/components/Rays.astro`（纯 Astro + ogl，着色器逐行保留原作；依赖仅新增 `ogl`）。
2. **配置**：`src/lib/rays-config.ts` 类型 + 组件默认值 = 用户所选配方（speed 2.5 · #f71313 / #b04848 · intensity 2 · spread 3 · origin top-right · tilt 0 · saturation 1.5 · blend 0.75 · falloff 1.3 · opacity 0.95）。页面可通过 `<Rays config={{...}}>` 覆盖。
3. **放置（用户选择：首页叠光 + 备忘页同款）**：
   - `variant="overlay"` —— /photos 首页：`position:fixed; inset:0; z-index:58; mix-blend-mode:screen`（顶栏 60 之下、舞台内容之上）：照片与上/下齿孔带、黑场同时泛红光；底部信息栏 `.dock` 抬 `z-index:59`（文字不被红光干扰）、空态文字同 59。
   - `variant="backdrop"` —— 卷备忘页 `/photos/<slug>/`：`fixed; z-index:-1`，玻璃卡后/正文下透出红光（负 z 子元素位于根背景之上、内容之下；勿置于有 transform/堆叠上下文的祖先内）。
4. **生命周期**：rAF 循环内 `gl.canvas.isConnected` 守卫（VT 换页后旧画布脱离文档即停）；`devicePixelRatio` 上限 2；resize 重设大小与 iResolution；无 IntersectionObserver（摄影页常驻，简化）。
5. 摄影暗房其余设计（§22/§25.2）不变；`redlamp`/film 泛光等 CSS 氛围与射线并存。

## 27. 胶片画廊形态（2026-09-07，用户逐点批准；冲突处以此节为准）

1. **页面形态 page-gallery**：Base 新增 `gallery?: boolean` → `body.page-gallery`：视口锁高无滚动、**页脚保留可见**（§21.2 immersive 的隐藏页脚不适用本页）。base.css：`html:has(body.page-gallery){height:100%}`、body `height:100%; overflow:hidden`；`.main` flex 占满顶栏与页脚之间（`flex:1 1 0; min-height:0; display:flex; column; width:100%` —— main 身兼 .wrap，曾测到非 100% 收缩宽度，须显式 width）、`.wrap{max-width:none; height:100%}`。
2. **/photos 首页 = 胶片画廊**（§21.2/§22.2 整屏 cover、全宽齿孔带版式作废）：`<section class="gallery">` flex 列 = `.arena`（flex:1，居中舞台）+ `.dock` 信息栏（时间/地点红光字、N 张、提示；dock 之下即页脚）。
   - **主体胶片 3:2 片窗**：`.film` aspect-ratio 3/2，宽由 JS `fit()` = `min(62% 舞台宽, 舞台高×1.5×0.92, 1000px)`（resize 防抖 120ms）；居中；10px 圆角黑边 + 红光泛光 + 暗角；上下缘发丝渐变（胶片感，不再占画幅）。常规 3:2 源 `object-fit:cover`，**超宽源（宽高比 >1.55）`object-fit:contain`**（片窗内左右留黑边，如 dsc0007 1.94:1）。
   - **左右槽位常驻「半露按钮 + 灰黑占位」互斥（hidden 切换）**：按钮 190px、3:2、`translate(±58%)` 半伸出、hover 弹性滑入；**首/末卷的占位 = 灰黑渐变底片**（`linear-gradient(150deg,#191a20,#0b0c10 55%,#15161c)` + 低透明齿孔纹 + inset 微光），不可点。⚠ 教训：SSR 必须两槽都渲染、以 hidden 互斥——只渲染「存在的那个」会在翻卷后留下死按钮/缺占位（已踩）。
   - **翻卷不循环**：`go(d)` 越界即 return（首尾由占位暗示）；点击胶片进备忘页；peek 点击 / ←/→（arena 聚焦）翻卷；换卷两段式线性动画同 §22。
   - **Rays overlay 收进 arena 容器**（spec §26 overlay 变体改 absolute inset:0 z20，容器相对定位即可，勿 fixed 全屏——会盖到页脚）。
3. **示例第二卷「郊野 · 七月」**：`src/content/series/field-roll.md` + `src/content/photos/dsc0007.md(.jpg)`（img/ 原件 3599×1852 超宽，验证 contain 与末卷灰黑占位）。系列按日期降序 → 本卷排在 Nikon 卷后。
4. 卷备忘页 `/photos/<slug>/`（§21.3 布局 + §26 backdrop 射线）不变。

## 28. 华文中宋子集嵌入（2026-09-07，用户放行字体文件并指定范围）

1. **子集管线**：`font/STZHONGS.TTF`（12MB 原件）→ `scripts/subset-song.mjs`（subset-font，harfbuzz wasm）按「摄影首页及其分页实际用字」抽字形 → `public/fonts/stzhongsong.woff2`（当前 51KB，0.4%）。新增照片/卷文案后执行 `npm run fonts:subset` 重新生成并提交。devDependencies 增 `subset-font`（构建期工具，例外同 §26 ogl）。
2. **@font-face「Song Web」**（base.css）：src 顺序 local 华文中宋 → local STZhongsong → woff2 —— 系统已装则零下载；未装则拉 51KB 子集；子集外字形沿 `--font-song` 栈逐字回退系统宋体。`font-display: swap`。
3. **应用范围**：`--font-song` 首项改为 "Song Web"（欢迎页站名等既有宋体处自动受益）；`body.page-dark { font-family: var(--font-song) }` —— 摄影作品集首页（画廊）及其分页（卷备忘页）正文/时间戳/标题统一华文中宋书卷感。数字/域名等 mono 覆写不受影响。

## 29. 全站字体切换（2026-09-07，用户提供字体文件；冲突处以此节为准）

1. **正文 = MapleMono（除摄影栏目）**：`font/MapleMono-NF-CN-Medium.ttf`（20.5MB）→ `scripts/subset-maple.mjs` 全站内容字形子集 → `public/fonts/maple-mono.woff2`（199KB）。`@font-face "MapleMono Web"`；`--font-sans` 首项 = "MapleMono Web"。摄影页及其子页除外（`body.page-dark` 已覆写为华文中宋 §28）。
2. **代码 = JetBrains Mono**：用户已转 `JetBrainsMono-Medium.woff2` / `-MediumItalic.woff2`（font/ 原件入仓、public/fonts 直发），同一 family "JetBrains Mono Web" 两个 face（normal/italic）。
3. **注释斜体**：astro.config 切 `markdown.syntaxHighlight: 'prism'`（token 类名稳定），`.token.comment/.prolog/.doctype/.cdata { font-style: italic }` 命中斜体面；`.prose pre code` 必须直击设置 family（UA 对 code 的默认 monospace 会压过继承值——实测注释曾落回 monospace）。附轻量 token 配色。
4. 重新生成命令：`npm run fonts:subset`（song + maple 链式）。

## 30. /photos 长胶卷画廊（2026-09-07，用户逐点批准；冲突处以此节为准，§27 的单帧+半露按钮+渐变占位+ dock 内嵌 meta 作废）

1. **页面 = 一条连续 135 长胶卷**：所有卷封面 3:2 等宽（`--fw`）+ 等间距（`--gap`，帧中心距 = `--step`）排成一条 reel（flex，左=纯灰占位、中间每卷一帧、右=纯灰占位）；**上/下齿孔带贯穿整条**（reel padding-block = `--bh`，绝对定位 band，SVG 孔 tile）。几何变量全挂 `.arena`（reel 与 caption 共同继承；SSR/JS 首帧直落再启用过渡）。
2. **平移翻卷**：视口中心 = 当前卷；`translateX(--tx)`（target = 视口中心 − 当前帧中心），CSS 弹簧过渡 0.62s `cubic-bezier(.22,1.18,.32,1)` —— 非线性平移（实测有轻微过冲）；帧尺寸/画幅全程不变，邻卷仅在左右露出 ~85–160px（peek 由 step 公式控制：step = max(fw+40, W/2+fw/2−peek)）。
3. **元信息上移**：日期居中于当前封面上方、地点居中下方（红光白字，.cap overlay 于 arena，z30 > 射线 20），dock 只剩「N 张」与提示，页脚仍在最下。
4. **首尾占位 = 纯灰色底片**（`.frame--ghost`，solid #adb1b8，不透明、不可点）；翻卷越界即停（不成环）。点击非当前帧 → 平移至它；点击当前帧 → 进备忘页；←/→/Enter 同语义。
5. **射线修复**：Rays overlay 一直渲染但黑色大画布 + 右上光源在画布外、低强度衰减后近乎不可见 → 首页 overlay 单独增强配方 `{intensity:4.5, opacity:1, falloff:0.95}`（实测右上黑场 R~207）；备忘页 backdrop 保持默认弱配方。

## 31. 液态玻璃边缘色差（2026-09-07，参考 FluidGlass 的 chromaticAberration；CSS 近似）

真实折射色差需 WebGL（react-three MeshTransmissionMaterial），纯 CSS 以两层近似：
1. **Nav 水滴滑块**：`.slider::before` 两段 7% 边缘渐变（左 `rgba(255,72,72,.22)` 红 / 右 `rgba(96,176,255,.22)` 青，`mix-blend:screen`）→ 接触栏目文字时呈现折射色散；同时滑块加 `backdrop-filter: blur(2px) saturate(1.35)` 玻璃折射感、底色透降至 .62。
2. **.glass 面板**：box-shadow 追加 ±1px 红/青发散线（`rgba(255,74,74,.13)` / `rgba(96,178,255,.13)`），全程贴边（接触网格/内容的色差）。hover 覆写 shadow 的规则不追加（hover 已有棱光环 §14.3）。

## 32. 射线新配方 + 中文注释斜体（2026-09-07，用户选定；冲突处以此节为准，§30.5 的 overlay 增强配方作废）

1. **SideRays 全栏目统一配方**（Rays.astro DEFAULTS，overlay 与 backdrop 同用；首页不再单独增强）：speed 2.5 · `#ff0000` / `#ffffff` · intensity 1.7 · spread 2 · top-right · tilt 0 · saturation 1.5 · blend 0.75 · falloff 1.6 · opacity 1 —— 白+红双色，右上角实测呈粉白射线（R≈178），远场因 falloff 1.6 衰减较暗属预期。微调入口：`src/components/Rays.astro` DEFAULTS（或页面 `config` 覆盖）。
2. **中文注释 = MapleMono 斜体**：`font/MapleMono-NF-CN-MediumItalic.ttf`（21MB）→ 与常规同字形集子集 → `public/fonts/maple-mono-italic.woff2`（217KB）。`@font-face "MapleMono Italic Web"`（font-style: italic）。新 `--font-comment: "JetBrains Mono Web", "MapleMono Italic Web", ...`；`.token.comment` 等用此栈 —— 按字形逐字回退：英文注释 = JetBrains Italic，**中文字符落到斜体 Maple**（JetBrains woff2 无 CJK）。`npm run fonts:subset` 现产出 song/maple/maple-italic 三件。

## 33. 首页整理 + 液态玻璃圆（2026-09-07，用户逐点指定）

1. **品牌 = PenicillinC3**：`site.config.ts` title 改 PenicillinC3（导航站名/欢迎中央大字/`<title>`/页脚版权随之统一）；删除废弃字段 `intro`/`heroNote`（「写字 · 拍照 · 收藏」副标随 heroNote 一并删除）。站名属「上线占位」已完成项。
2. **页脚仅首页**：Base 按 `Astro.url.pathname === '/'` 渲染 `<Footer/>`——除首页外**所有页面移除最下方栏**（含摄影备忘页；§27「摄影页页脚可见」随用户最新要求作废）。首页页脚删「回到首页」链接（已无他页可回），版权行 = `© {year} PenicillinC3 Via Claude Code`。
3. **欢迎页液态玻璃圆**（参考 FluidGlass lens 的 CSS 近似）：中央站名右上角锚一枚 124px 折射球 `.orb`——radial 高光 + `backdrop-filter: blur(10px) saturate(1.8)` 玻璃折射 + 内外影 + 边缘红/青色差；**小范围跟随鼠标**：pointermove 相对锚点 ±30px 内取 `(pointer−锚)×0.05`，rAF 指数阻尼 τ≈110ms 漂移。⚠ 坐标坑：orb 定位上下文是 `.stack`（relative），锚点必须换算为 stack 相对坐标（`rect − hostRect`）——曾用视口坐标导致整球错位一个容器偏移。

## 34. 首页液态玻璃镜头（2026-09-07，用户选定全真移植；§33.3 的 CSS orb 作废删除）

1. **栈与依赖**：@astrojs/react 3.6 + react 18.3 + three 0.169 + @react-three/fiber 8.17 + @react-three/drei 9.114 + maath 0.10（`--legacy-peer-deps` 安装：drei 的 react-native optional peer 会拉扯 @types/react@19 冲突）。全站唯一框架岛，仅首页加载（独立 chunk，构建期 chunk 体积警告属预期）。
2. **组件 `src/components/LensGlass.tsx`**：FluidGlass（react-bits）思路的独立实现——`MeshTransmissionMaterial`（ior 1.15 / thickness 3.5 / chromaticAberration 0.1 / anisotropy 0.02 / distortion 0.15 / temporalDistortion 0.08）椭球镜头（sphere 压扁 z0.5 → 双凸折射）+ **画布内自绘背景**（浅底平面 + XZ gridHelper 正对相机 + 三枚低饱和色斑）供折射采样。⚠ 镜头折射的是 WebGL 场景内容，**不传输页面 DOM**（与参考 demo 一致）。
3. **跟随（v2 修复“几乎不动”的 bug）**：窗口级 pointermove → **整页归一化坐标**（`(client/innerSize−0.5)×2`，clamp ±1.35）；dest = 指针 ×（视口半宽/半高 − 镜头半径 − 3% 边距）—— 镜头**全画布范围明显跟随**且永不越出；`easing.damp3` τ0.13 / `dampE` 微旋 τ0.2；呼吸 ±1.2%；镜头直径 = min(视口宽,高)×0.5、z 压扁 0.5。曾用容器局部 ×0.16 系数导致位移肉眼不可见（v1 bug）；坐标自检法：useFrame 临时挂 `window.__lensPos`（实测 rest 0 → 左上 (−1.98,−1.04) → 右下 (+1.97,+1.04)）。
4. **DOM**：`.lens-slot` absolute 于 `.stack` 右上（top -11vh / right -6vw，min 46vh/60vw×34vh 封顶 560×420），pointer-events none（不拦页面交互），<900px 隐藏；`client:visible` 水合、data-ready 后淡入 0.7s。调参入口：槽位 CSS、`Lens` 内 s 与 damp、页面传入 ior/thickness/chromaticAberration/follow。

## 35. 首页液态玻璃镜头删除 + React 栈下线（2026-09-07，用户指定；§33.3/§34 作废）

1. **镜头删除**：用户删除首页中央液态玻璃镜头——`index.astro` 移除 `LensGlass` 与 `.lens-slot`（含 <900px 隐藏规则与 `.stack` 的定位上下文），欢迎页回归站名 + tagline + 两枚入口按钮。
2. **React 栈全量下线**：删 `src/components/LensGlass.tsx`；`astro.config.mjs` 移除 `react()` 集成；npm 卸载 `@astrojs/react`/`react`/`react-dom`/`three`/`@react-three/fiber`/`@react-three/drei`/`maath`（package.json 与 lock 同步）。首页构建 chunk 体积警告随之消失。依赖清单回到 `astro` + `ogl`（Rays §26）。
3. 首页不再有框架岛；未来若重做折射镜头，实现与安装注记（含 `--legacy-peer-deps` 原因）保留在本节以上 §34。

## 36. 列表卡片标题去下划线 + 整卡可点（2026-09-07，用户指定）

1. **标题悬停只变色**：PostCard/LinkCard/ProjectCard 的 `.pt a:hover`/`.lt a:hover` 移除 `text-decoration: underline`（更高特异性压过 base.css 的 `a:hover` 下划线）——悬停仅变 `--accent`。
2. **整卡可点（stretched link）**：三卡 `.pcard/.lcard/.prjcard` 加 `position:relative; cursor:pointer`；标题链接 `::after{position:absolute; inset:0}` 铺满整卡 → 点卡片任意处 = 点标题链接（notes/musings 进详情、links/projects 打开外链/仓库，语义与标题一致；Tab 聚焦标题链接即可键盘进入）。ProjectCard「在线演示/源代码」两枚按钮 `.acts` 抬 `position:relative; z-index:1` 保持独立可点。副作用：卡内正文不可拖选（stretched link 通病，接受）。

## 37. 标签筛选两段式显隐 + 滚动条宽度锁定（2026-09-07，用户选型「原位淡出并收合」；§20.3 的即时折叠作废）

1. **两段式显隐**：PostList 过滤 = 不匹配卡片先加 `.glasscard.is-out` 原位淡出 0.2s（GlassCard.astro 提供 `opacity .2s` 过渡与 `.is-out{opacity:0; pointer-events:none}`），淡出完成整批 `display:none` 收合、空年份组随之下沉隐藏；恢复匹配的卡片先回文档流、从透明淡入。每次操作递增世代号作废未到期的折叠定时器——快速连点不互相踩踏。仍事件委托 + style.display 直控（勿回归 hidden 属性方案）。实测依据：旧即时折叠在滚动位置 300 处点 chip，页面总高 1173→~900，滚动被钳回 0 造成跳页。
2. **列宽锁定**：base.css `html { scrollbar-gutter: stable }` —— 长短页/筛选切换时右侧滚动条出现/消失不再改变内容宽度（Windows 经典滚动条下卡片宽度随滚动条切换抖动 ≈ 17px）；`html:has(body.page-gallery) { scrollbar-gutter: auto }`（画廊锁死不滚动，预留槽无意义）。

## 38. 摄影卷版面调整（2026-09-07，用户指定；冲突处以此节为准）

1. **导航字体全栏目一致**：Nav `.topbar` 显式 `font-family: var(--font-sans)`（Maple）——`body.page-dark` 只把正文切为华文中宋，导航站名/栏目/抽屉不再随页面字体变化。摄影页内正文（标题/时间戳/地点/dock）仍华文中宋（§28 不变）。
2. **胶片尺寸再放大**：setGeom 宽限 `W*0.46 → W*0.54`、封顶 `900 → 980`，高余量 `(H−160) → (H−196)`（196 的空间被下方拉远的字幕占用，保证字幕不挤）；帧 3:2 不变，邻卷露出量公式（peek）不变。
3. **日期/地点离胶片更远**：`.cap--top` 距封面上缘 52→76px、`.cap--bottom` 距下缘 26→44px（避开齿孔带、留白呼吸）。
4. **去弹簧动效**：reel 平移过渡 `0.62s cubic-bezier(.22,1.18,.32,1)`（§30.2 有轻微过冲）→ `0.56s cubic-bezier(.22,1,.36,1)` 纯缓出无过冲——「非线性平移」保留，只去掉回弹段。

## 39. 首页站名打字机动效（2026-09-07，用户指定，参考 react-bits TextType）

1. **行为**：欢迎页中央大站名 PenicillinC3 打字机循环 —— 逐字打出（75ms/字）→ 全文停顿 1.5s → 逐字删除（50ms/字）→ 空串停留 260ms → 重打；`_` 下划线光标常显、逐格闪烁（1s 周期对半透明）。调参常量在 `src/pages/index.astro` 模块内 `cfg` 对象。
2. **零框架实现**（React 已下线 §35）：原生 JS 状态机 + CSS `@keyframes caret-blink`。防 SSR 全文闪现 = `<script is:inline>` 解析期先清空文本（reduced-motion 用户不清空）。**宽度恒定防抖动**：先把「完整站名 + 光标」放进隐藏 probe 量出整宽、写到 h1（text-align 居中 + resize 150ms 防抖重测）→ 打字/删除过程中宽度不变，文字从中心向两侧生长（实测 8 帧宽度恒 615px）。无 JS 回退 = 静态全文 + `html:not(.js)` 隐藏光标；`prefers-reduced-motion` = 全文常驻不打字。打字循环以 `h1.isConnected` 守卫，换页离场即止。
3. **aria**：h1 `aria-label` 全名，动态文本与光标 `aria-hidden` —— 读屏器不逐字播报。

## 40. 打字机定格（2026-09-07，用户指定；§39 的删除/循环段作废）

打完一遍后定格：run() 只保留「逐字打出 → 保持全文」，删除、空串停留与无限循环全部移除；全文定格后 `_` 光标继续逐格闪烁（CSS 不变）。cfg 仅剩 type 75ms/字。换页重访（View Transitions 重新执行模块）会再次从空串打一遍，属预期。

## 41. 胶片再放大档位 + 滑块/红光复测（2026-09-07，用户反馈跟进；§38.2 档位作废）

1. **胶片再放大**：宽限 54%→**62%**、封顶 980→**1180px**（H 余量仍 196）。headless 实测：1440×900 → 778→893px 宽；1920×1080 → 980→1176px（H 限）；1280×768 → 691→708px（H 限，纵向窄屏增益有限属预期）。
2. **复测结论（记录在案）**：用户反馈「滑块未对齐 / 红光消失」，headless 于 1280×768 / 1366×768 / 1440×900 / 1920×1080 四种视口 + 首页→/photos View Transitions 路径复测：滑块与激活栏 dx 恒为 0；右上角红光采样 maxR≈165（§32 配方预期 ~178，视口/覆盖差异内），射线未消失。疑用户端旧缓存/旧进程所致 —— 若复现需 DevTools Console 报错佐证。

## 42. 日期/地点字幕放大（2026-09-07，用户指定）

日期 `.ts` 字号 `clamp(0.95rem,2vw,1.35rem)` → `clamp(1.15rem,2.8vw,1.8rem)`；地点 `.loc` `clamp(0.85rem,1.6vw,1.05rem)` → `clamp(1rem,2.4vw,1.4rem)`。字距/红光描边不变；绝对定位只向上/下扩张，不与胶片重叠。

## 43. 胶片帧距收窄（2026-09-07，用户指定）

setGeom 弃用旧 peek 步进公式（gap = W/2−fw/2−peek，peek 80–160），改显式：`corridor = W/2−fw/2`、`peek = min(220, max(150, W*0.12))`、`gap = max(64, corridor−peek)`、`step = fw+gap`。帧距与邻卷露出共用侧廊预算 —— 帧越近邻卷露越多（1440×900：gap 151→101px、邻卷露 122→173px；1920×1080：gap 212→152、露至 220 上限）。

## 44. 空白胶片占位加深（2026-09-07，用户指定）

首尾无作品的纯灰占位帧 `.frame--ghost` 背景 `#adb1b8` → `#72777f`（中灰偏深，融入暗房氛围；§30.4 的纯灰语义不变）。

## 45. 空白胶片占位再加深（2026-09-07，用户指定）

`.frame--ghost` 背景 `#72777f` → `#4f545c`（§44 再加深一档；仍比片窗底色 #0c0d11 亮，占位可辨）。

## 46. 空白胶片改玻璃占位（2026-09-07，用户指定；§44/§45 实色深灰作废）

`.frame--ghost` 由实色改**半透玻璃**：白色斜向 0.10→0.02→0.06 渐变底 + `backdrop-filter: blur(8px) saturate(1.3)` 透出下方暗房黑底与射线红光；描边提亮 `rgba(255,255,255,.14)`、内影上亮下暗对仗 + 红光外晕 `0 0 26px -8px rgba(255,70,70,.25)`。不可点语义不变。

## 47. 玻璃占位去模糊加透（2026-09-07，用户指定）

`.frame--ghost` 移除 `backdrop-filter`（无模糊），白渐变透明度下调（0.10/0.02/0.06 → 0.06/0.015/0.035）、描边 `rgba(255,255,255,.12)`、内影/红光晕微减 —— 面板轮廓仍在，黑底与射线红光更直接透出。

## 48. 玻璃占位边缘提亮（2026-09-07，用户指定）

`.frame--ghost` 描边 `rgba(255,255,255,.12)` → `.3`，上缘内影亮 `.13` → `.24`（下缘暗影同步收 `.25` → `.2`）—— 面板轮廓在透底前提下更清晰。

## 49. 玻璃占位回退（2026-09-07，用户指定「算了改回去吧」）

§46–§48 的玻璃占位方向作废：`.frame--ghost` 回退为 §45 的实色深灰 `#4f545c`（描边 `rgba(255,255,255,.06)`、无阴影）。§46–§48 保留为试错历史。

## 50. 通透玻璃占位回归 + 胶片扩档（2026-09-07，用户指定；§49 实色回退作废）

1. **占位 = 通透玻璃**：§49 的实色深灰再作废，`.frame--ghost` 恢复 §47/§48 配方 —— 无 blur、白渐变 6%→1.5%→3.5% 高透底、描边 `rgba(255,255,255,.3)`、上亮下暗内影 + 红光微晕，黑底/红光直接透出。
2. **胶片再扩一档**：宽限 62%→**66%**、封顶 1180→**1300px**；H 余量 196→**176**（帧上下留白 = 余量/2，字幕上缘距 arena 顶 = 余量/2−76 ≈ 12px，最小安全值）。headless 实测：1440×900 帧 893→936px、1920×1080 1176→1206px、1280×768 708→738px；字幕与胶片间距 38→26px（帧变大吃掉的部分），地点下距 44px 不变。

## 51. 占位描边降淡 + 地点泛黄微光（2026-09-07，用户指定）

1. `.frame--ghost` 描边 `rgba(255,255,255,.3)` → `.17`、上缘内影 `.24` → `.15`（玻璃轮廓更含蓄）。
2. `.loc`（地点字幕）text-shadow 红光 → **泛黄微光**：`0 0 7px rgba(255,190,100,.85), 0 0 16px rgba(255,155,55,.4)`（白光字、胶片灯暖色；日期红光不变）。

## 52. 地点字幕加亮（2026-09-07，用户指定）

`.loc` text-shadow 追加白色核心光 `0 0 3px rgba(255,255,255,.9)`，暖黄双晕增强（10px @ .95 / 22px @ .55）—— 字心更亮、灯晕仍暖。

## 53. 标签筛选占位保留（2026-09-07，用户指定「还是缩小，解决」；§37 的收合方案作废）

§37 选型（淡出后收合、页面变短）不满足需求，改**占位保留**：不匹配卡片加 `.glasscard.is-out` —— `opacity` 0.2s 淡出、`visibility` 延迟 0.2s 转 hidden，但**始终留在文档流占位**；年份组永不折叠、页面高度/卡片位置/滚动条全程不变（实测点 Git：scrollH 恒 1173、卡片 top 267/527/787 不变，被滤卡片 opacity 0 + visibility hidden 原位留空）。移除 is-out 时 `visibility` 立即恢复、`opacity` 淡回（GlassCard 两侧 transition 分别处理延迟方向）。JS 简化为事件委托 + `classList.toggle`，不再有定时器/世代号/display 操作。

---

## §54（2026-09-07）笔记标签筛选：快速淡出 + FLIP 平滑上浮（覆盖 §53 占位保留版与 §37 收合版）

用户最终要求（§53 反馈迭代）：点击 tag 时，**没有此 tag 的帖子快速淡出，有 tag 的帖子快速上浮**填位。

- §37 收合版（切 display 直跳、页面/卡片瞬缩、卡顿）与 §53 占位保留版（筛后残留等高空洞、可见卡无法聚拢）均不再采用。
- 时序：点 tag → 不匹配卡 0.2s 快速淡出（期间**保留占位**，剩余卡不提前乱动）→ 淡完统一 `display:none` 释放空间 → 剩余卡 FLIP 平滑上浮。
- FLIP = First（记录点击时刻各卡文档坐标）→ 一次性切 display → Last（重测）→ invert（反位 `translateY` 视觉停回原位）→ Play（过渡归零滑向新位）。取消/换 tag：回归卡在自身 DOM 位从透明原位淡入，被其挤开的卡同一次 FLIP 反向下滑。
- **全程卡片只平移、不形变**（不再出现「卡片缩小」观感）；页面总高随筛选顺滑收/涨，宽度因 `html scrollbar-gutter: stable`（base.css）不跳。
- 测量用文档坐标（`rect.top + scrollY`），淡出等待期间用户滚动不错位；动画未完又点击 → 自动降级直切（不排队、无交错）；`prefers-reduced-motion` → 纯 display 切换。
- 实现：`PostList.astro`（事件委托 + FLIP 流程）、`GlassCard.astro`（`.is-out` 只留 opacity:0 + pointer-events:none 透明锚点，visibility 延迟占位技巧删除）。

---

## §55（2026-09-07）标签筛选分组锁高：余量沉底，页面总长不缩短（§54 的补充）

§54 上浮填位后页面总高随筛掉的空间收缩（1173→900），用户再次反馈「长度缩短」。空格的填行思路不可行（HTML 折叠连续空格；中文按字换行，行数只由内容长度决定，补字不增行）。最终方案 = **锁高留白沉底**（§54 的动效全部保留）：

- 进入筛选态时量取每个分组 `.pcols` 的未筛选原高并写入 `min-height`（按分组锁，各年份分组互不牵扯）；离场卡照常 `display:none`，剩余卡照常 FLIP 上浮聚拢 —— 但空出的版面全部**沉在分组末尾成为普通留白**，页面总高、滚动条、年份分组位置全程分毫不动。
- 离场释放与锁高在**同一趟布局**里生效（无「先缩短再撑回」的中间闪跳）；取消筛选同一趟解锁 + 回归，被挤开的卡经 FLIP 滑回原位。
- 连点/直切/reduced-motion 分支同样执行锁高（长度稳定与动效无关，是状态而非动画）。
- 实现：`PostList.astro`（`locks` Map：`.pcols` → 原高）。§54 尾部「页面总高随筛选顺滑收/涨」一句就此作废。

---

## §56（2026-09-07）撤销 §55 锁高 —— 回到 §54 形态

用户实际查看 §55 锁高留白沉底后不满意，明确要求「回到改之前的样子」：撤销整段锁高逻辑（`PostList.astro` 移除 `locks` Map 与分组 `min-height` 锁定，代码回到 commit b3c494c 即 §54 行为）—— 筛选后页面总高随筛掉的空间**顺滑收短**（1173→900），余量不再以留白形式压在列表末尾。§55 保留为试错历史（同 §46–§49 惯例），勿再实现锁高或垫字类方案。

---

## §57（2026-09-07）代码内非注释中文改用正体 Maple

用户要求：代码里的非注释中文（字符串/标识符中的汉字）也改用 Maple。此前只有注释走 Maple（斜体，§32 `--font-comment`），非注释代码的 `--font-mono` 链是纯 JetBrains Mono + 系统栈 —— JetBrains 无中文字形，代码中的汉字实际落到系统默认 CJK 字体（宋体/雅黑之类），与正文正体 Maple 观感割裂。

- 方案 = 字链兜底（与注释同一机制）：`--font-mono` 在 JetBrains Mono 之后插入正体 `MapleMono Web`。字形级逐字解析：拉丁/符号仍全部命中 JetBrains（视觉零变化），只有 JetBrains 缺的中文字形落到正体 Maple，代码字符串中文与正文一致。
- 消费方：`.prose pre code`（代码块）、`.prose :not(pre) > code`（行内代码）、`LinkCard .host`（域名字符串，拉丁不受影响）。
- 注释规则不动：`.token.comment/.prolog/.doctype/.cdata` 仍 `--font-comment`（斜体 JetBrains → 斜体 Maple），注释与字符串中文由此分处正/斜两体。
- 实现：`tokens.css` 的 `--font-mono` 链 + 注释更新；产物字体子集照旧 `npm run fonts:subset` 重建。

---

## §58（2026-09-07 晚）首页玻璃小球 —— react-bits FluidGlass 精简移植（覆盖 §35「React 全量下线」部分）

用户当晚要求把 react-bits 的 FluidGlass「玻璃小球」移植到首页。经核实：所贴源码是含 ScrollControls/React Bits 字样/Unsplash 远程图的整页模板、非独立小球；站点依赖未装、无 .glb 模型。路线三选一定为**精简移植**，构图（AskUserQuestion）定为**右上角位小装饰球**（直径≈视口 1/3、轻跟手）。§35「React 栈全量下线、回到 astro+ogl」就此**部分撤销**（仅限此镜头岛所需依赖集）；§34 的实现蓝图与安装注记继续有效。

1. **组件 `src/components/LensBall.tsx`**（全站唯一框架岛，`index.astro` `client:only="react"`，仅首页加载，chunk ~900KB raw 属预期）：机制照 §34 LensGlass + react-bits 原版 FBO 回路 —— `createPortal` 把后台（浅底墙 `#f6f8fc` z-6 + GridHelper 正对相机 opacity.07 + 三枚棱光色斑 CanvasTexture 缓慢漂移）渲入独立 scene → `useFBO` buffer → 主场景整屏 quad 贴出 → 球在前折射同一 buffer。几何 = 程序椭球（sphere 128 段，z 压扁 0.5 → 双凸），**无 .glb**；场景不折射 DOM（同 §34/demo）。
2. **材质/手感**：`MeshTransmissionMaterial` ior 1.15 / thickness 3 / chromaticAberration 0.08 / anisotropy 0.02 / distortion 0.15 / temporalDistortion 0.1 / white（§34 与 react-bits 折中）。跟手沿用 §34 v2 修过的口径：窗口级 pointermove 整页归一化（clamp ±1.35）× 轻幅度（`min(vp)×0.16`），damp3 τ0.13，静止呼吸 ±0.012；reduced-motion 静态落位无呼吸。`window.__lensReady` 首帧置真（headless 断言）。
3. **槽位/工程**：`.lens-slot` fixed 右上（top `nav+5vh`、right 4vw、`min(33vw,360px)` 方槽）、z-index 5、pointer-events none、<900px 隐藏、淡入 0.8s。`astro.config.mjs` 加 `react()` 集成 + `chunkSizeWarningLimit: 1800`（维持「构建 0 警告」验收纪律）；tsconfig 补 jsx react-jsx；安装 `--legacy-peer-deps`（drei/fiber react-native/expo optional peers 冲突，同 §34.1）。版本矩阵（2026-09-07 latest）：react 19.2 / @astrojs/react 6.0 / fiber 9.7 / drei 10.7 / three 0.185 / maath 0.10。

---

## §59（2026-09-07 深夜）玻璃球 v2：全屏吸鼠标 + 折射真实页面（覆盖 §58 角位构图）

用户走查 §58 角位小球后提出四点修改：不要自绘浅底/棱光晕彩；访问即**吸在鼠标上、默认居中**；再小一点；上下移动与鼠标相反（v1 bug：屏幕下移被当作世界 +y，实为 −y）、左右跟手不足。重构为 v2：

1. **构图**：`.lens-slot` 改为全屏 `fixed inset:0` 透明覆盖层（pointer-events none、z 5），球默认居中，指针全页吸附跟随（damp3 τ0.08），幅度 = 球深度处（z15）视口半幅并 clamp 球缘不越视口；直径 ≈ 视口高 27%（`RATIO=0.034`，比角位版小）；<900px 与 prefers-reduced-motion 均隐藏（后者不再静态呈现）。
2. **折射内容 = 真实页面镜像**：球内显示的是鼠标下方真实 DOM 的折射放大。镜像 = **html2canvas 自绘快照**（`scale 2`、裁视口、`ignoreElements` 跳过自身、字体同源可被 canvas 使用），700ms 重拍覆盖打字机/光标变化，纹理贴 z-6 大平面 1:1 映射，RT 采样。
3. **⚠ 曾用 foreignObject+SVG blob 方案，实测现版 Chromium 对 foreignObject-svg 一律判跨域污染**（连无样式纯文本 svg 也 taint，canvas 直接废）→ 弃用，改 html2canvas（新增依赖，仅此岛内用，装于 dependencies）。
4. **GL 报错排除**：drei `useFBO` 默认（MSAA/HalfFloat）在部分 GPU/SwiftShader 触发 `THREE.WebGLState` GL_INVALID_OPERATION 刷屏 → 自建经典 `WebGLRenderTarget`（UnsignedByte + Linear、无 MSAA），headless 全断言零 console 错误。
5. 镜像纹理超采样 `SNAP_SS=2`（上限 4096）；球材质参数：ior 1.15 / thickness 2.2 / chromaticAberration 0.08 / anisotropy 0.02 / distortion 0.12 / temporalDistortion 0.08（§58 材质在更小体积下略减）。几何仍程序椭球（z×0.72 微扁），无 .glb。
6. 验证：headless 12 断言全绿（快照成功 / 居中 / 右+x 下−y 同向 / 左上反向 / 无 console 错误 / 移动与减动效隐藏）。

---

## §60（2026-09-08 凌晨）玻璃球 v3：透明折射修复 + 指针离场 + 再缩小（§59 收尾）

用户真机走查 §59 v2 报四题：球不透明无折射；Alt+Tab 出现许多无意义窗口；要求指针离场球缩没、刚访问默认不在；球仍过大。修复与实测记录：

1. **不透明/无折射根因（drei 源码实证）**：`MeshTransmissionMaterial` 传入自建 `buffer` 后**跳过内部自采样**（`buffer.value === fboMain.texture` 才自渲场景）；v2 把内容全挪进 portal 后主场景为空 → 真机球发白不透明、SwiftShader 全透明。修：**整屏 quad 放回主场景**（贴 buffer.texture，内容 = DOM 镜像、像素与真实页面一致 → 视觉等同透明），MTT 与自采样均有源；portal 镜像平面只负责喂 RT。
2. **canvas 换图纹理不重建（三处实测定位）**：仅 `needsUpdate` 后 GL 纹理不更新（保持首帧旧图）；html2canvas 产物直传 WebGL 全黑（2D 读正常；4×4 手绘 canvas 对照正常）→ **换图必须 `snapTex.dispose()` 强重建**后正常。SwiftShader/真机同路径。canvas 纹理须 `colorSpace = SRGBColorSpace`。
3. **指针离场/入场**：`documentElement mouseleave` + `window pointermove`（pointerIn 状态）驱动可见度 vis 阻尼（τ0.12）；**刚访问默认 vis=0（球不可见）**，首次移动放大 —— 与「吸在鼠标」语义一致；reduced-motion 整层隐藏不变。
4. **尺寸**：直径 27% → **~19% 视口高**（`RATIO 0.034→0.024`，半径 ≈ tan7.5°×5 处 0.126 world）。
5. **快照卫生（Alt+Tab 窗口疑云的对策）**：`inFlight` 防 html2canvas 重叠重绘、`document.visibilityState` 非 visible 暂停 + 回显即补拍、周期 700→1000ms。另 `gl preserveDrawingBuffer: true`（供探针/截图读回，代价极小）。
6. 验证：headless 像素/行为 7 断言全绿（初始隐藏、入场可见、球内 63 色内容折射、离场缩没、回场放大）；球尺寸按构造断言（quad 全屏不透明后 alpha 边缘法失效）。Alt+Tab 现象待用户真机复核（若再现需另查系统级来源）。

---

## §61（2026-09-08）玻璃球 v4：撤整屏镜像盖层 + 按需渲染 + 玻璃参数照用户配方

用户真机走查 §60 v3 报三题：特别卡（打字机动效都被卡没）；首页两枚按钮样式消失（棱光动画静止）；玻璃观感要照给定 lens 配方重调。根因与修复：

1. **盖层是卡顿与按钮 bug 的共同元凶**：§60 为修折射把「整屏镜像 quad」画在最上层 —— 它盖住真实 DOM（按钮/打字机/棱光动画全部藏在镜像下 → 「样式消失」观感），且 html2canvas 每秒 2880px 全页重绘占主线程（打字机被拖卡）。**撤除整屏 quad**，回「透明顶层只画球」：球外画布 alpha=0，真 DOM 永远可见可交互；球折射源 = portal 镜像快照（页面 22px 网格线在全站提供高频内容，空白处也有折射可见度）。
2. **帧率（按需渲染）**：`Canvas frameloop="demand"` —— useFrame 只在「球在动 / 可见度收敛中 / 快照到达(mirrorDirty 补帧)」时 invalidate 续帧；球缩没且静止 = 零渲染。⚠ demand 陷阱：`pointermove`/`mouseleave` 事件不会自带帧 → 处理器内必须 `invalidate()`（否则 vis 衰减冻结、球不跟随）。
3. **快照节流**：仅 `pointerIn` 时周期拍（1200ms），离场停表；入场/回显即补拍；html2canvas 防重叠 + visibility 暂停（同 §60）；SS 2→1.5。打字机首屏完全不被快照拖累（指针未入场前零快照）。
4. **玻璃参数（用户指定 lens 配方）**：ior 1.15 / **thickness 2** / **chromaticAberration 0.05** / **anisotropy 0.01** / transmission 1 / roughness 0 / color #fff；**去掉 distortion/temporalDistortion**（更清透）；球径维持 ~19% 视口高。
5. 验证：headless 10 断言全绿（初始透明且球隐、入场可见+补拍、球投影 86px≈19%、球内 240 色折射、球外透明 DOM 可见、离场缩没、回场放大）。Alt+Tab 窗口疑云仍未定位到代码内来源，需用户再核。

---

## §62（2026-09-08）玻璃球 v5：自定义着色器 + C3 默认位 + 乘法色散（弃 drei MTT）

用户反馈 v4 仍卡、按钮感观问题、色散「不够蓝黄红、有奇怪颜色」、要求畸变仅外圈；明确新交互：默认停在站名 "C3" 右上角轻遮、砍掉移入/移出缩放动画（移出回默认位、移入快速吸附）。

1. **渲染架构重写（卡顿根治）**：弃用 drei `MeshTransmissionMaterial` + portal/RT/useFBO 管线（逐帧重渲贵、色散颜色不可控）→ **单张全屏 quad + 自写 `ShaderMaterial`**：球 = 屏幕坐标圆盘，内容直接采样 DOM 镜像纹理（html2canvas 快照）。无 RT、无逐帧场景重渲；`frameloop="demand"` 静止即零渲染。bundle 体积同步下降（不再引 drei 的 MTT 内部链）。
2. **色散 = 乘法着色环（关键修复）**：先版「加法叠色」在白色页面全被裁剪成白（探针均值≈0 实证）→ 改**乘法**：红 (1.30,.32,.26) / 黄 (1.12,1,.32) / 蓝 (.42,.62,1.18) 三环按距缘距离高斯加权 —— 白底上可读的纯色（探针 red 91 / yel 78 / blue 90），无混色杂绿灰；另加球外薄红/蓝光晕与缘带内逐通道径向错位采样（微色差），畸变仅贴边 24% 内（`uBend≈4px`，中心≈0）。
3. **交互/构图**：默认位 = 站名 `[data-type-name]` rect 右上角（center ≈ right−0.42d, top−0.1d，d=19% 视口高），加载即现（字体就绪 + 打字完成各落位一次）；指针移入快速吸附（τ0.05），移出回默认位（τ0.22）；**删除 vis 缩放动画**；reduced-motion 常驻默认位。
4. **快照节流**：仅 入场/移动（≥450ms 间隔）/停稳回位 260ms 后 触发，SS=1；打字完成 2.4s 后再拍准一版；页面隐藏暂停。静止时零 html2canvas、零渲染。
5. 类型修正：卸载 `@types/html2canvas`（0.5 远古版错配）→ 用 html2canvas 自带类型（dist/types）。验证：headless 10 断言全绿（默认位精确 C3 右上、球外 alpha=0、吸附/回位、红/黄/蓝三环与晕均读数达标）。

---

## §63（2026-09-08）玻璃球 v5.1：畸变回 v4 柔和透镜 + 色散改回物理式色差并拉饱和

用户对 §62 v5 走查：优化全保留；**畸变改回之前**（去掉 v5 外缘弓形弯折，回 v4 整球轻微放大、球缘与外页 1:1 衔接）；**色散染色环不好看**（红/黄/蓝乘法环如贴纸）→ 改回「逐通道采样错位」的物理式色差并**加强幅度/饱和度**：

- 折射：`sp = center + d/uMag`（uMag 1.075 整球放大），无 rim 弓形项；体积微暗、缘内高光保留。
- 色差：R 采样沿径向 **外移** `chPx = uChroma·len²`（缘 4.8px → 中心 0）、B **内移** ×0.85 —— 内容边界出现红/青饱和色差线；随后整体饱和度 `sat = 1.10 + 0.65·smoothstep(0.35,1,len)`（缘带强升）。
- 探针：默认位 C3 ✓、缘带强彩像素 35.6%（maxHue 255）、球外透明、回位 ✓。参数：`CHROMA_PX`（4.8）、`MAG`（1.075）、着色器内 sat 系数。

---

## §64（2026-09-08）玻璃球 v6：回原版 drei MeshTransmissionMaterial + 原版交互（覆盖 §62/§63 自定义着色器）

用户对照 react-bits 原版源码后定调：「用原版的 drei MeshTransmissionMaterial（自写着色器不行）；交互也照搬原版；深色背景别搬；只搬玻璃球」。

1. **材质回原版**：弃 §62 自写 ShaderMaterial → 原版 ModeWrapper 的 MTT 用法：`buffer` + ior 1.15 / thickness 5 / anisotropy 0.01 / chromaticAberration 0.1（原版四项默认）+ color #fff。几何 = 原版 lens 形态：`CylinderGeometry`(r1,h0.42) `rotation-x=π/2` 轴向正对相机；scale 0.15（原版 auto 公式 min(0.15, maxWorld/geoWidth) 宽视口下即 0.15）。
2. **交互照搬原版**：全屏跟手 —— 指针归一化 × 球深度(z15)可视半幅，damp3 τ0.15；无 C3 默认位/无隐藏/无缩放动画（§62 交互约定就此作废）；指针停哪球停哪。
3. **不搬深色背景**：画布透明（alpha），MTT 折射内容 = 本站真实页面 DOM 镜像（html2canvas，1:1 屏幕映射平面 z-6 → RT）—— §60 后修好 dispose 换图坑，v2 当年「发白不透明」即此坑所致，非拓扑问题。
4. **保留的性能基建**：frameloop="demand"（静止零渲染、事件 invalidate 脉冲）；portal 只在镜像刷新时渲一次（相机/内容静止，buffer 无需逐帧重渲）；快照节流同 §61（入场/移动≥450ms/打字完成 2.4s 补拍；SS=1）。
5. 探针（headless）：快照/初始中心/全屏跟手目标（误差 <0.001）/球外透明 全过；球体像素在 SwiftShader 下不可读（MTT 环境限制，同 §60 注记），观感以真机为准。reduced-motion 与 <900px 仍整层隐藏（站点 a11y 政策，非原版行为）。

---

## §66（2026-09-08）v6.1 材质加强 + 首页 3D 站名（drei Text/troika）取代 DOM 打字机

用户真机走查 v6 后：色散/畸变不够、球内文字不居中；并要求首页大字在不删打字机前提下改原版 3D 大字、玻璃观感向原版靠。全部采纳：

1. **MTT 参数加强（§64 基线）**：ior 1.15→1.22、thickness 5→10、anisotropy 0.01→0.02、chromaticAberration 0.1→0.45（真机「不够」）。
2. **球内文字不居中修复**：镜像平面曾放 z=-6 且 scale 1.5× —— 平面超出视口使 RT uv 与屏幕非 1:1（MTT 按 fragCoord 采样，球越偏离中心错位越大）。改 **z=0、scale=vp×1.001**（该深度可视域恰 = vp）→ uv 与屏幕严格 1:1。
3. **3D 站名**：drei `<Text>`（troika SDF）双场景渲染 —— 主场景 z=12 显示 + portal 同款副本作折射源（原版「玻璃折射场景内大字」机理，白页深墨 `#17191f`、字号/位置由 DOM h1 占位 rect 实测换算，letterSpacing 0.04 与 CSS 同步）。玻璃(z15)在字前 —— demo 层级同构。
4. **字体**：troika 不支持 woff2 → `scripts/subset-song.mjs` 增拉丁子集步骤产出 `public/fonts/song-3d.ttf`（17KB，ASCII 32–126），fonts:subset 链同步。
5. **打字机迁入 canvas**（语义同 §39/§40）：fonts.ready 后逐字 75ms 一次定格，光标 `_` 字形 500ms 闪烁（打字中与定格后都闪）；主/portal 两份 Text 同步推进。DOM 旧打字机脚本与 caret CSS 删除；h1 保留为占位（宽屏 + html.js → 文本 `visibility:hidden` 让位 canvas，盒子保留原高 → tagline/按钮布局不动；aria-label/SEO 不丢）。
6. **降级**：prefers-reduced-motion → 全文立即定格、无光标、球隐藏（CSS 不再整层隐藏 slot，3D 名字仍显示）；<900px → slot 隐藏、DOM 名字静态全文（移动端打字机退化静态，已知妥协）；无 JS → DOM 静态全文。快照 ignoreElements 增 `.name`（防球内双影）。
7. 验证：headless 12 断言全绿（打字推进中途 len4→12、光标翻转、名字区深墨字形 86%、快照、玻璃跟手、reduced 定格无光标、移动/无 JS 静态全文）。

---

## §65（2026-09-08）v6 修复：球「看不见」= visible 绑定 ref 不触发重渲

用户真机反馈 v6 完全看不到球。根因：`<mesh visible={mirrorReady.current}>` —— `mirrorReady` 是 ref，快照就绪后赋值**不触发 React 重渲染**，mesh 永远停在初始 `visible=false`（首帧镜像未就绪时的隐藏态），球从未显示。修复：JSX 去掉 visible prop，在 useFrame 每帧直写 `mesh.visible = mirrorReady.current`。修复后 headless 像素探针可读到球（盘内 83% 覆盖、中心不透明、无 console 错误）—— 说明此前「SwiftShader 不渲染 MTT」的判断亦由此 bug 污染，MTT 在本环境渲染正常。教训：**React 属性受 ref 驱动时，勿用 JSX prop 绑定 ref 初值，须 setState 或逐帧直写**。

---

## §67（2026-09-08）v8：首页液态玻璃英雄区 —— react-bits FluidGlass 一比一复刻（覆盖 §66 自造方案）

用户终稿指示：打字效果删除；「原版怎么来这个项目就怎么来，除了深色背景和贴图之外一比一复刻」。

1. **组件 = 原版 FluidGlass lens 模式忠实移植**（`LensBall.tsx`）：Canvas（fov15 z20）+ ScrollControls(pages=1) + LensGlass(ModeWrapper 同构)：portal 场景（白底大平面 + 站名 3D 大字）→ useFBO → 整屏 quad 贴出 → 玻璃 mesh 折射同一 buffer；R3F 画布 pointer 全屏跟手 damp3 τ0.15（画布自身承接事件）；材质 = 原版默认 ior1.15/thickness5/aniso.01/chrom0.1。
2. **除项**：深色背景 → 白平面 #fff（Canvas 同步白底）；贴图（Unsplash IMAGE_URLS/Images）不搬 → 场景内容 = 站名 Typography（song-3d.ttf，device 档位 0.2/0.4/0.6，letterSpacing −0.05，深墨 #17191f —— 白底上原版白字须反色）；打字机删除（§66 打字机/占位 h1/双场景副本/html2canvas DOM 镜像 全部移除，html2canvas 依赖卸载）。
3. **几何**：lens.glb 缺 → 程序 CylinderGeometry(1,1,0.42,128) rotation-x π/2（原版 cylinder 口径，scale auto min(0.15,…)）。
4. **页面**：`.lens-slot` fixed 顶栏以下整层（z5，nav60 之上可点击；画布承接指针）；DOM 静态回退（站名/tagline/双按钮，原 welcome 结构）在 <900px 与无 JS 显示，桌面有 JS 隐藏 —— 移动端与无 JS 保底内容/SEO（h1 语义）。
5. **a11y 增项（原版无）**：prefers-reduced-motion → 镜头静止居中不跟手。
6. 验证：headless 8 断言全绿（首帧、镜头居中、白底+深墨大字像素、画布事件跟手、移动/无 JS 回退）。⚠ preserveDrawingBuffer:true 供读回/截图（勿删，探针依赖）。

---

## §68（2026-09-08 深夜）撤销玻璃球全套 —— 回到打字机初版（§58–§67 留档）

用户在 v8（一比一复刻英雄区）走查后决定**不再添加透明玻璃**，要求回到「没有让我添加这个透明玻璃的初版」。代码整体回滚到玻璃会话前基线（= 打字机首页 §39/§40 + tagline + 双按钮、零框架、依赖 astro+ogl）：

- 删除 `src/components/LensBall.tsx` 与 `public/fonts/song-3d.ttf`（subset-song 脚本同步还原，无 3D 拉丁子集步骤）；`index.astro`/`astro.config.mjs`（react 集成与 vite chunk 项移除）/`tsconfig.json`（jsx 项移除）/`package.json`+lock（卸载 @astrojs/react react react-dom three @react-three/fiber @react-three/drei maath 与 @types/*）/README/CLAUDE.md 全部还原。
- §58–§67 全部实现（含各自的 portal/FBO/镜像/3D 大字/打字机迁移等方案与教训）**留档于本 spec，不再采用**；§65（ref 勿绑 JSX visible prop）与 §60（canvas 换图须 dispose）为通用 three/React 教训，他处可借鉴。远端线上从未含玻璃（未推送），恢复零部署成本。

## §69（2026-09-08）玻璃球回归（方案 B）—— react-bits 官方 FluidGlass lens 模式移植

§68 撤销后，用户以**新版官方组件**（mode=lens/bar/cube + GLB 模型 —— 与 §58–67 移植的旧版 demo 非同代）再次要求把玻璃球放回首页、一比一复刻。经澄清技术事实后用户选定方案 B。本段与 §58–67 历史的本质区别：**官方组件折射的是场景内内容副本，不折射 DOM**（纯白无内容则 MTT 无从折射、球近乎隐身）。

**官方组件事实**（源：D-Mbithi/react-bits commit 86dfdfc，reactbits.dev 现行版本）：
1. 顶层 `scale/ior/thickness/transmission/...` props **不生效** —— 组件 API 只认 `lensProps/barProps/cubeProps`（官方示例页顶层重复值系面板代码产物）。玻璃参数实际默认：scale .25 / ior 1.15 / thickness 2 / CA .05 / aniso .01（docs 面板值）。
2. 光学为**屏幕空间近似实时渲染**，非光追、非烘焙：内容场景每帧离屏渲染进 FBO → 同一纹理 A. 由全屏 quad 铺为屏幕背景、B. 供 MeshTransmissionMaterial 采样折射（uv 偏移 + 模糊 + 通道分离色差，片元级实时）。球与背景**机制上绑定同一 buffer**（MTT 必须吃一张纹理）；球跟手 = maath easing.damp3 τ0.15，z=15。
3. 资源：`lens.glb`（"Cylinder"，直径 2.0 世界单位）/`cube.glb`/`bar.glb` + `figtreeblack.ttf`（本方案未用，bar/cube 模式亦未移植）。

**实现**（src/components/FluidGlass.jsx + src/pages/index.astro）：
- 机制逐行保留官方 Lens 模式（portal→useFBO→quad→MTT→damp3）；仅内容层定制：清屏 **#fff**（官方紫 #5227ff），删 Typography/Images/ScrollControls/NavItems/bar/cube。
- 折射内容 = **本站方格底**：CanvasTexture 2048²、16px/格 1px 发丝线，`tex.repeat` 按视口换算 22px css 格 —— 观感同 tokens.css `--grid-line/--grid-size`（DOM body 方格被 opaque canvas 覆盖，场景网格即页面背景，无缝延续极简白）。
- 层叠：`.glass-scene` fixed inset-0 **z0**、pointer-events none（canvas 及其 R3F 容器 div 重新 auto）→ 球全域跟手；`.main:has(.welcome)` 与首页 footer 提 **z1**；`.welcome` pointer-events none 穿透文字区、`.acts` auto 保按钮；Nav 顶栏 z60 不变。**打字机/tagline/双按钮 DOM 零改动**，球从文字下层穿过（字形间隙/网格区可见折射）。
- 依赖：**React 栈回归（特批，仅此 island）** —— @astrojs/react **v4.4.2**（须配 Astro5/vite6；v6 系 Astro6/vite8 不可用，实测装错即降）、react 19.2.8、three 0.185、@react-three/fiber 9.7、@react-three/drei 10.7、maath 0.10、devDeps @types/react(-dom) 19；astro.config 恢复 `integrations: [react()]`，tsconfig 补 jsx react-jsx。**依赖纪律（CLAUDE §8）更新：React 栈仅限此 island，禁止再加其它 UI 框架**。
- 降级：<900px / prefers-reduced-motion / 无 JS → 不挂载（`FluidGlass.jsx` 内 matchMedia 守卫），页面与 §68 基线白页一致；场景 `aria-hidden`。
- 验证：build 16 页 0 警告；preview 路由 `/`、`/notes/`、`/assets/3d/lens.glb` 200、`/nope-xyz` 404。视觉项由用户真机走查驱动（调参旋钮 = `FluidGlass.jsx` 顶部 `LENS_PROPS` 与 `GRID_*` 常量）。

**§69.1 修正（2026-09-08 走查）：层叠 bug —— 文字被垫底 canvas 盖住**

§69 首版把 `:global(.main:has(.welcome))` 提层 z1，意图让欢迎内容盖过 `.glass-scene`（fixed z0）。实际**失效**：z-index 使 `.main` 成为堆叠上下文，fixed canvas 被收进 main 自身上下文、按其内 z0 画在普通流文字之上 → 首页打字机站名/tagline/按钮全部被不透明 canvas 遮没（用户报「首页的字没了」）。修复：`.main` 不设 z-index/transform（保持根级上下文），改由 **`.welcome` 自身 `position:relative; z-index:1`** 与 canvas 同处根上下文盖过它；`.acts` 在 `.welcome { pointer-events:none }` 下重开 auto。教训：**fixed 后代的堆叠归属最近的有 z-index/transform 祖先，提层必须落在与 fixed 层同级的元素上，或让内容元素自身提层**。

**§69.2 修正（2026-09-08 走查）：折射内容隐形 —— 网格加粗 + 深墨站名水印**

用户报「背景和球的光学性质没了」；走查实际状态 = 纯白页面 + 隐隐跟手的球影（组件与渲染管线正常）。根因：§69 场景网格沿用 DOM 方格 alpha 0.05/1px 发丝线，经「CanvasTexture → FBO 缓冲 → 全屏 quad」两次重采样后淡至不可见 —— 球无内容可折射，光学全无。修复（按用户选定方案）：
1. 网格加粗：线宽 1→2px、alpha 0.05→0.12（DOM 观感被 canvas 覆盖，可独立调 —— 仍类白方格气质）。
2. **NameEcho 站名水印**：portal 场景加 drei `<Text>`（troika）深墨 `#17191f` 大站名 `site.title` —— 球的折射素材，掠过字迹产生弯曲/色差；字号与位置按 DOM `[data-type-name]` h1 实测换算（`perPx = 视深可视高/css高`，2·tan7.5°·(20−z)），字号 1.5× DOM 放大成水印层，letterSpacing .04 与 CSS 同步，resize/fonts.ready 重测。
3. 字体：troika 不吃 woff2 → `subset-song.mjs` 增 ASCII 32–126 truetype 拉丁子集 `public/fonts/song-3d.ttf`（17KB，npm run fonts:subset 链更新）。
4. 构建零警告回归：玻璃 island 单 chunk 1.1MB 触发 vite 500kB 警告 —— astro.config 在 **`vite.build.chunkSizeWarningLimit: 1300`**（须放 vite 段，astro 顶层 build 段不接收 vite 选项）消除；此 chunk 仅首页、勿拆。
教训：**折射内容必须自带可见对比度 —— 发丝级浅网格在两次纹理重采样后不构成可折射信号**。

**§69.3 修正（2026-09-08 走查）：删站名水印、球缩小、打字前后背景一致**

用户走查 §69.2：光学性能已良好，但 ① 深墨站名水印与 DOM 打字机标题重叠难看（1.5× 放大绕字形露边）；② 打字动画阶段与完成后背景颜色不同 —— 根因同 ①：NameEcho 挂在 `document.fonts.ready` 后才测量挂载，打字进行中场景还没画字，打完字水印突然出现 → 背景骤变；③ 球偏大。

修复：**整体删除 NameEcho**（portal 场景回归纯网格折射素材；折射内容自 §69.2 起已含可见网格，水印非必需）；`LENS_PROPS.scale` 0.25→**0.18**（直径 0.5→0.36 世界单位，约屏高 38%→27%）；`subset-song.mjs` 拉丁 truetype 步骤与 `public/fonts/song-3d.ttf` 一并回撤（未来若要做「镂空/异位水印」可经 fonts:subset 再生）。构建 0 警告回归。

另答用户问：打字机与「网页快照喂球」（html2canvas 路线）**冲突** —— 打字 75ms/字，快照需频繁重拍 DOM，CPU 拖垮打字动画（§59–63 已证）；当前官方组件路线**不拍 DOM**、球只折射场景内网格，与 DOM 打字机完全解耦，无冲突。代价：球被 DOM 文字像素盖住处不显示（层叠如此），字迹间隙与网格区仍可见折射。

**§69.4 修正（2026-09-08 走查）：删打字动画、球 .12、背景对齐普通页**

用户终调：① 打字动画的背景（canvas 未就绪前的 DOM 底）与打字后（canvas 0.12 网格）仍不一致 —— 直接**删除打字动画**（§39/§40 首页不再启用），标题静态全文；② 球再缩至 scale **0.12**（直径 0.24 世界 ≈ 屏高 18%）；③ 背景「把个人笔记那个拿过来」—— notes 等普通页背景 = body 原生 CSS 方格（22px、rgba(15,23,42,.05)、1csspx 发丝）。首页此前被 canvas 自绘 0.12/2px 纹理网格盖住，观感与普通页不一。

修复（`src/components/FluidGlass.jsx`）：**折射素材弃 CanvasTexture，改矢量细条几何**（每格 22csspx、线宽 1csspx、alpha 0.05，随视口重建 BufferGeometry）—— 纹理经「纹理→FBO→quad」两次重采样浓度必然失真（§69.2 教训：0.05→近隐、0.12→过重），矢量线直接把 CSS 原生 1px 浓度搬进场景；首页背景自此与 notes 等页**视觉统一**，且 canvas 从首帧即此观感（无 glb 加载完成前的反差时段）。index.astro 打字机相关内联/模块脚本与 caret CSS 全删（含 html.js 挂载、宽度探针、reduced-motion 分支），h1 直接渲染 `site.title`。

**§69.5（2026-09-08）标题场景化 —— DOM 标题做进折射场景本体**

用户终调：① 首页背景仍与上传版（普通页 body 方格 + 无 canvas 叠层）有观感差异 —— 归因：canvas 不透明层上重绘的网格与 CSS 原生渲染永远有细微差，且 DOM 大标题叠在 canvas 之上把球挡得只剩字间隙；② 指示「把首页的标题直接做进背景里来实现球体的光学性能」—— 即官方 demo 同构：标题属折射场景内容，球掠过即折射字迹，不再被 DOM 层遮挡。

实现（`FluidGlass.jsx` + `index.astro`）：
- **SceneTitle**：portal 场景内 troika `<Text>` 渲染 `site.title`（华文中宋 —— `subset-song.mjs` 重新输出 `song-3d.ttf` 拉丁 truetype 子集 17KB；troika 不吃 woff2），字号/位置 = DOM h1 rect 实测换算至 TITLE_Z=3（网格 z0 前、球 z15 后），字号原大 1:1（TITLE_SCALE=1 旋钮），letterSpacing 0.04 与 CSS 同步，resize/fonts.ready 重测。
- **DOM h1 降级为占位**：`.name` `opacity:0` + user-select none —— 盒子保留（welcome 布局/tagline 定位/场景测量基准不破坏），文本仍在 a11y 树与 SEO；标题视觉由场景版承接，背景=普通页方格+标题，与上传版观感一致。
- 网格沿用 §69.4 矢量发丝线（0.05/22px）—— 球在标题与方格上均有折射素材；`TITLE_COLOR #17191f` = tokens `--text-1`。
- 已知取舍：troika SDF 字形与 CSS 原生字形渲染存在细微差异（原大 1:1 下肉眼难辨；若用户在意可切 CanvasTexture 高分辨率光栅化方案）。

**§69.5 补：DOM 标题隐藏的条件保护** —— opacity:0 仅作用于「≥900px + html.js + prefers-reduced-motion:no-preference」（与 FluidGlass 挂载条件完全一致，index.astro 重挂 html.js 标记）；<900px / 减动效 / 无 JS 时 DOM h1 回退可见。盒子始终保留（布局与场景测量基准不变）。

**§69.6（2026-09-08 走查）：tagline 场景化、标题加大、球 .10、背景泛灰根因 = ACES 色调映射**

用户反馈：① 球再缩至 scale **0.10**；② 「记录 · 拍摄 · 思考」tagline 也做进背景（折射素材）；③ 标题加大一档（.name clamp 3–5.6rem → 3.2–6.6rem）；④ 背景「很灰、网格消失」—— 根因：**R3F v9 Canvas 默认 ACES 电影色调映射**，纯白 FBO 底（1.0）被映射成 ~#ddd 灰、0.05 发丝网格压在灰底上近不可见；CSS 页面无此处理故观感断裂。

修复：Canvas 加 **`flat`**（关色调映射，白底与 CSS 页一致，网格恢复可视）；`SceneTitle` 泛化为 **`SceneTexts`**（TEXT_META 两张表：`[data-scene-title]` 与新增 `[data-scene-tagline]`，各自实测换算、字色 = --text-1/--text-2、letterSpacing .04/.02 与 CSS 同步）；DOM tagline 同样 opacity:0 条件占位；`subset-song.mjs` 的 song-3d.ttf 字符集改为「site.config.ts 提取 title+tagline + ASCII」（含中文与「·」，19KB）。教训：**WebGL 场景当纯色/接近白的背景用时必须关色调映射（flat），否则与 CSS 白底永远有色差**。

**§69.7 修正（2026-09-08 走查）：网格与普通页同步 = 1:1 设备像素 CanvasTexture**

用户：首页网格格式与其他页不同步。历史两版皆偏：矢量细条几何（§69.4）低 alpha 边缘被 AA 软化发虚；固定 2048 纹理（§69.2）有重采样失真。正解：**纹理画布尺寸 = 视口设备像素**（css×min(dpr,1.75)），1px 线按 22×dpr 步进绘制，Nearest 采样 —— buffer 像素 = 屏幕像素严格 1:1，无重采样无软化，与 body CSS 原生方格（--grid-line rgba(15,23,42,.05)/--grid-size 22px）观感一致；resize 按当前 dpr 重建纹理，plane 每帧铺满 viewport。

**§69.8 修正（2026-09-08 走查）：网格墨量 = CSS 线宽；球改 window 级全域跟手**

① 网格加载前一致、加载后变淡：§69.7 把线画成 1 **设备像素**宽，而 CSS 的 1px 线 = 1 **CSS 像素** = dpr(≈1.75) 设备像素 —— 墨量只有一半 → 加载后发虚。修复：`ctx.lineWidth = rdpr`（等墨量，纹理仍 1:1 设备像素）。② 悬停「个人笔记/摄影作品集」按钮时球冻结：球吃 canvas 自身 pointer 事件，按钮在 DOM 上层截走事件 → 改为 **window pointermove → 归一化 ref（y↑）**，Lens useFrame 阻尼目标直接读 ref —— 与 canvas 事件完全解耦，全页（含按钮/顶栏上方）都跟手；官方阻尼参数不变。

**§69.9（2026-09-08）切页返回双层标题 —— 根因：ViewTransitions 抹掉首屏 inline 挂的 html 类**

用户从个人笔记页切回主页出现两层标题重叠。无头复现定位：DOM 占位标题本应 `opacity:0`（隐藏规则绑 `html.js`，由首页首屏 `<script is:inline>` 挂载）—— Astro ViewTransitions 历史返回（goBack/popstate）会恢复 `<html>` 的类状态，把 `js` 类抹掉 → 规则失效 → DOM 标题（CSS 原生字形）与场景标题（troika）同屏叠出。另实证：canvas/场景切回后正常单实例（1 canvas），故非旧岛残留。

修复：删除首屏 inline 挂类脚本；改为 **`html.fg-on` 由 FluidGlass island 生命周期挂/摘**（`useEffect` toggle，条件 = JS + ≥900px + 非减动效，即场景文字确实在场才隐藏 DOM；卸载/降级/无 JS 自动回退 DOM 可见）。教训：**经 ViewTransitions 切页的页面，不要依赖首屏 inline script 往 html 上挂类做 CSS 开关** —— 状态化标志应绑在组件/state 生命周期上。验证：无头探针 notes→back 后 `h1Opacity=0`、canvas=1、glass-scene=1。

## §70（2026-09-08）暗色页（摄影作品集）顶栏改毛玻璃

用户：摄影作品集右上角 Rays 红光透不进导航栏，要求该栏目导航栏单独做成毛玻璃。根因：亮色顶栏本为毛玻璃（rgba(255,255,255,.72)+blur14 saturate1.6），而 `body.page-dark .topbar` 覆写为近实心 rgba(9,10,14,.55) 且无 backdrop-filter → 铺满视口的 Rays overlay(z20) 被挡在顶栏(z60)下。修复：暗色顶栏改 rgba(9,10,14,.38) + 同配方 backdrop-filter blur(14px) saturate(1.6)，红光射线晕进导航栏；page-dark 目前仅摄影栏目（画廊+备忘页）使用，故改动恰作用域为摄影作品集。

**§70 补（同日）：光效延伸进导航栏 —— overlay 由 absolute-in-arena 改 fixed 全视口**

§70 首改后用户仍问「右上角光效背景」：像素采样发现导航栏区域红光为 0 —— 根因：`.rays--overlay` 是 absolute 嵌在 `.arena`（顶栏以下的舞台），光效画布止步于导航栏下方，毛玻璃顶栏背后无光可透。修复：overlay 改 `position: fixed; inset: 0`（z20 不变，仍压 nav z60 之下；胶片区观感不变，canvas 高度上扩 ~56px）。headless 几何断言：rays rect = 1440×900 含 nav 带；光晕真容需真机 GPU 走查（SwiftShader 无法验 WebGL 光效）。

**§70 回退（同日）：overlay 定位改 fixed 致入射光消失 —— 已还原 arena-absolute**

真机走查：§70 补（`.rays--overlay` absolute→fixed 全视口）后胶片画廊**入射光背景彻底消失**（重大回归）。机制推断：overlay 依赖 absolute-in-arena 的容器尺寸与 `mix-blend-mode: screen` 合成上下文，fixed 后层级/画布上下文改变破坏了叠光。**已回退**该行 CSS 至原版（含注释警示勿再直接改定位）；§70 首项（暗色顶栏毛玻璃 rgba(9,10,14,.38)+blur）保留 —— 但顶栏区域无光可透的问题仍在（overlay 止步顶栏下方），后续要「光进导航栏」需另走方案（如独立第二层全视口 canvas 或 nav 底缘自发光晕），未再实施。

**§70-3（同日终版）：导航栏透光 = 顶栏内同源径向光层；nav canvas 方案废弃**

§70-2 尝试给导航条带加独立 56px Rays 小画布（z59）——两问题：① Rays 脚本原 querySelector 只绑首个容器（多实例需遍历绑定，已修）；② 小画布极端宽高比下入射光 shader 光晕退化不可用。终版：撤 nav 实例与 CSS，保留「多实例遍历绑定」能力；改在 **`body.page-gallery .topbar::before`** 叠同源红色径向光（`radial-gradient(90% 320% at 100% -20%, rgba(255,92,80,.32), transparent 62%)`，位于 .inner 之下、pointer-events none）——毛玻璃下的透光观感，零 WebGL/合成回归风险。像素验证：顶栏右上 R−B +25.4（红光）、左侧 −6.5（无光，方向正确）。备忘页（backdrop 版 rays 铺全视口）无需此层。

**§70-4（同日）：画廊顶栏右上角近乎半透明** —— bg 改径向渐变（`150% 340% at 100% 0%`，角 α0.06 → 55% 处 0.24 → 0.28），仅 page-gallery 生效（备忘页仍平铺 0.26）；入射光层降至 α0.12/衰减 74%。blur 全栏保留。

**§70-5（同日）：右上角"纯黑"澄清 + 光层自持** —— 顶栏上方(0–56px)背后是纯黑页面背景（arena 入射光自 y56 起），玻璃全透即露黑底，非 bug/缓存。结论：该角落的光必须由顶栏自身光层提供 → 玻璃保留透明渐变（§70-4），`::before` 光层加强（角 0.3 → 42% 处 0.12 → 72% 透明），红晕自持于玻璃内。

**§70-6（同日）：右上角直接全透明（终）** —— 用户「直接改成透明的吧」：删除 ::before 光层；`body.page-gallery .topbar` 背景径向渐变角 α0（顶栏右上完全透出背景，视觉上该处顶栏消失）→ 55% 处 0.2 → 0.26。入射光进导航栏的多轮尝试（fixed overlay / nav 小画布 / 玻璃内光层）全部收敛于此：顶栏上带背后无光的物理事实决定最终形态为纯透。

**§70-7（同日）右上角终版：玻璃内叠入射光晕（用户选定，曾误判 bug/缓存）**

像素实证非 bug：整条顶栏采样均 = body 背景 rgb(11,12,16)——透明暗玻璃在纯黑底上必然呈现黑色（0–56px 带内无任何内容/光）。澄清后用户三选一选定「玻璃内叠入射光晕」：背景保留角 α0 透明渐变，`::before` 光晕自持（radial 150% 380% at 100% -10%，角 rgba(255,104,92,.34) → 38% 处 .14 → 68% 透明），黑底由光点亮、与栏同层可调。调参三值：0.34/38%/68%。

**§70-8（同日）：光与文字间渐变 —— 文字行衬暗** —— ::after 纵向渐变（0→30% 透明、55% α.42、100% α.6）：右上光晕只在顶栏上半显现，导航文字行（中部偏下）背后恢复黑色底；层序 bg < ::before(光) < ::after(文字暗衬) < .inner(文字)。

**§70-8 改（同日）：渐变改横向** —— 用户更正为横向：文字行实测止于 x≈830/1440，暗色自左（α.6）经 45%（.4）至 82% 全透，让出右上光区；此前竖向（下半暗）被否。

## §71（2026-09-08）摄影栏目顶栏 = 玻璃面板材质（§70 全部作废）

用户：摄影作品集页及其子页的导航栏改用「导航栏按钮一样的材质」，三选一确定 = **玻璃面板**（.glass/.btn 语言）。实现（base.css）：清删 §70-6/7/8 的右上角径向渐变与 ::before 光晕/::after 横向渐变三层伪元素；`body.page-dark .topbar`（= photos 画廊 + 备忘子页）统一为玻璃面板配方 —— 半透明深底 `rgba(20,22,29,.58)`（自带明度层次：0–56px 带背后无内容，纯黑玻璃会隐形，§70 教训）+ 上缘内高光 `rgba(255,255,255,.08)`/下缘内影对仗 + 发丝底描边 `rgba(255,255,255,.1)` + 下投影；blur(14) saturate(1.5) 保留（内容滚动透景）。范围天然限 page-dark（仅摄影栏目），其余页面顶栏不动。

## §72（2026-09-08）顶栏真·透光 = 全视口同款 Rays 裁出导航条带

用户（§71 玻璃面板后）：右上光路透不过来、缺玻璃效果。根因不变：顶栏 0–56px 带背后无光。新方案：**`Rays variant="navstrip"`** —— 与 arena 同款着色器的全视口画布（光位/形态同源），`clip-path: inset(0 0 calc(100% - var(--nav-h)) 0)` 只保留顶栏条带，`z 59 < 顶栏 60`，经 §71 毛玻璃 backdrop-blur 透出 = 物理上的光穿玻璃；与 arena overlay（absolute-in-arena）合成互不干扰（§70 教训），复用 §70-2 的多实例遍历绑定。验证：画布 1440×900 在场，顶栏右上 avgR 79 vs 左 50（红光方向正确透出）。

## §74（2026-09-08）指针离开页面 → 球回初始静置点

用户小改：鼠标离开页面（移出视口或失焦）时玻璃球自动回到静置点（§73 标题中心+2px）。实现：静置逻辑抽为 `setIdle()`（§73/§74 共用）；`documentElement.pointerleave` + `window.blur`（含 Alt-Tab 等失焦）→ 重置 moved 标志并 setIdle，球经既有 damp 平滑归位。

**§74-1（同日）：离开判定加坐标兜底** —— 用户反馈「移到导航栏也算移出」。headless 事件实测 pointerleave 悬停顶栏并不触发（rel=null 仅真离屏）；仍加兜底防真机差异：pointerleave 时若 clientX/Y 在视口内且下方有页面元素（elementFromPoint）→ 忽略；越界或 `visibilitychange`/blur 且 hidden → 复位。

**§74-2（同日）：悬停导航栏 = 视为移出（特性，非 bug）** —— 用户澄清此前「移到导航栏也算移出界面」是想要的**特性**（此前 §74-1 的忽略逻辑系误解方向，保留作防误报兜底）：pointermove 落在 `.topbar` 矩形内 → setIdle（球回标题中心静置点）不跟手；移出顶栏回内容区 → 恢复跟手。真离屏/失焦仍回位（§74）。

## §75（2026-09-08）画廊封面字幕支持作品名（workName）

用户：摄影作品集「地点栏」现在可以是作品名。经确认：新增可选字段（不动现有 location）、仅作用于 /photos 画廊封面下方字幕。实现：`series` schema 增可选 `workName`；画廊 `covers` 数据带 `workName`，服务端渲染、roll-data JSON、client `applyMeta`、封面 aria-label 四处统一为 **workName → location → 「未标注地点」** 优先链（opacity 同理：有 workName/location 为 1，否则 0.35）。备忘页不受影响（用户选定范围）。用法：卷 md frontmatter 加一行 `workName: 作品名`。

## §76（2026-09-08）摄影图片压缩提速

用户：封面/内容图片压缩以获得更快加载。调整（仅质量与档位，不动布局）：
- 画廊封面（photos/index getImage）：widths [900,1600]→[640,1000,1600]、quality 88→80（46vw 槽位在小屏走 640/1000，明显省流）。
- 备忘页（photos/[slug]）：去 2400 档 → [900,1600]、quality 86→80（展示宽 ≤1200px，1600 覆盖 1.33× DPR；2× 屏由 1600 上采样，轻微软化可接受，换取显著体积下降）。
实测：最大文件 392KB→264KB，其余档位同比降 40–70%（如 172→48KB、108→28KB）。构建 0 警告（顺带清 `.astro` 陈旧 content 缓存 —— dev 下那条 duplicate id 警告系缓存残留非真实重复文件）。

## §77（2026-09-08）画廊卷序反转：最新在默认位（右），越老越靠左

用户：摄影作品集以最新作品集放默认位置、老作品集依次在左边。实现（photos/index.astro）：`seriesRolls()` 原按日期降序（新→老）；画廊侧 `.reverse()` 成升序 → 胶卷左→右 = 老→新，**最新卷在最右端**；`i` 初始 = `covers.length-1`（默认居中最右=最新），首帧 `setGeom(silent)` 直落在它；服务端初始渲染的日期/作品名字幕与 dock 张数同步取 `covers[n-1]`；灰片占位语义注释更新（左端=没有更老、右端=没有更新）。备忘页不受影响（无前后卷 UI，仅 getStaticPaths 用 seriesRolls，顺序无关）。翻卷/键盘/点击逻辑无需改（基于索引 i 相对移动）。

## §78（2026-09-08）首页加载提速：island 空闲水合 + DPR 降档

用户：首页加载太慢。瓶颈 = 玻璃球 island chunk ~1.1MB(gzip 315KB) 以 `client:load` 与首屏抢主线程（下载/解析/font+glb 请求/WebGL 初始化）。优化：
1. **`client:load` → `client:idle`**：首屏先出 DOM 标题/tagline/按钮与 CSS 背景（与场景版观感一致，§69.4 后二者同为白+方格），空闲后拉取水合并淡入场景版（DOM 标题仍由 html.fg-on 条件隐藏，无闪差）；无 JS/降级路径不变。
2. **Canvas dpr 上限 1.75→1.5**（MAX_DPR 同步，网格纹理 1:1 设备像素约束保持）：像素量约 −26%，GPU 与合成更轻、跟手更稳。
验证（无头）：DCL 时 island chunk 未加载、canvas=0、DOM 标题 opacity=1（立即可读）；约 1.45s 空闲水合完成 canvas=1、DOM 标题转 opacity=0。构建 0 警告。
注：本地 dev 期间多次遇到 vite `504 Outdated Optimize Dep` 与 `.astro` content 缓存 EPERM（装依赖后残留句柄）——清 `.astro` + `node_modules/.vite` 重启 dev 即恢复，属开发环境伪影，不影响构建/线上。

## §81（2026-09-08）备忘页图文交错（![[照片slug]] 标记）

用户：想在卷备忘里让文字与照片交错，md 原生不支持。实现：卷 md 正文中**独占一行**的 `![[照片slug]]` 标记，构建期把该照片卡片（含标题与照片自身说明）就地把插进正文流；其余未标记照片按序自动补在正文之后（沿用底部网格）；**无标记时完全走旧路径**（astro 原生 `<Content/>` + 网格，渲染逐字节等价）。实现要点：`photos/[slug].astro` 用 `createMarkdownProcessor`（@astrojs/markdown-remark，syntaxHighlight prism 与全站一致）按标记切块渲染文字段，`set:html` 注入；抽取 `src/components/ShotCard.astro`（照片卡片样式随组件，横/竖版与 §76/§80 同源）供网格与内联共用；标记引用的 slug 不属本卷 → 抛错点名。验证：临时卷实测 `文字段 → figure(卡片+说明) → 文字段` 顺序精确、无标记卷渲染张数与旧版一致；构建 0 警告。

## §82（2026-09-08）移动端浏览体验优化（笔记/摄影集/迷思）

用户：针对移动设备优化三个板块的浏览体验。体检（390×844 无头实拍 + 几何断言）后修复：
1. **全局内边距修复（影响所有页面）**：`.main` 的 `padding: X 0 Y` 简写把左右内边距设为 0，覆盖 `.wrap` 的 `--gutter`——桌面端列布局看不出，移动端则**全部内容贴屏边**（标题/卡片 0 边距）。改 `padding-block`，横向 gutter 回归（通栏恢复 ~1104px，依旧spec 的 ~1100 大卡）。
2. **筛选标签（笔记页 chips）触控友好**：原 ~28px 高 → 移动端 padding `0.32em/1em → 0.55em/1.15em`、字号 0.9rem（≥38px 视觉高度）。
3. **画廊移动端**：胶片宽 66%→**86%**、上下余量 176→150（字幕上/下移近：76/44 → 54/32px）、邻卷露出量适配窄侧廊（150–220 → 40–70px）、日期/作品名字距收紧（0.22/0.3em → 0.16/0.2em）。
4. **画廊滑动手势**：touch 专用——横向位移 >48px 且横向占优才翻卷（左滑=下一卷）；真滑动会被浏览器先 `pointercancel`，据此抑制随之而来的 click 误入备忘（纯点按不受影响）；上下滑不拦截。
验证：390px 宽实拍两页对照（修复前贴边 → 修复后有 gutter/胶片更大）；构建 0 警告。

## §83（2026-09-08）修复：教程笔记移动端右侧被推出屏外（宽表撑破布局）

用户：笔记页右侧很大一部分被挡住。实证：`/notes/blog-writing-guide/` 等含宽表格的页面在 390px 视口下**文档被撑到 734–770px**（表格单元格内长路径 `<code>` 的 min-content），整页右半外溢——“被挡住”。根因链三层：
1. `.prose table` 为常规表格，长代码单元 min-content ≈730px；
2. `.postpage`（及 `.memo`）是 CSS Grid，子项默认 `min-width:auto` → 网格项被内容顶宽出轨道；
3. **关键**：`.prose` 自带 `margin-inline:auto` 使网格项**取消拉伸（justify-self:auto→stretch 失效）退化为 fit-content**，被内容 min-content 顶宽——`min-width:0` 亦无效（§83 挖出）；bisec 实证：仅内联 `width:100%` 可解。

修复：`.prose.body`/`.prose.memobody` 显式 `width:100%`（+既有 `max-width:none`）；`.postpage`/`.memo` 轨道 `minmax(0,1fr)` 且子项 `min-width:0`（防未来其他宽内容）；`.main` `min-width:0`；`@media ≤760px` 内 `.prose table { display:block; width:100%; overflow-x:auto }` + 单元格 `min-width:8em`（窄屏表格在自身盒子内横向滚动；桌面端保持原满宽观感不受影响）。验证：移动 390 全页 `scrollWidth=390`（另 5 页同验）、表格盒 354 内滚 434；桌面 1440 表格仍 `display:table` 满宽 1104、无内滚。构建 0 警告。

## §84（2026-09-08）修复：移动端下拉栏显示不全（抽屉被顶栏 backdrop-filter 困住）

用户：移动端右上角下拉栏显示不全。实证：`[data-menu]` 盒子仅 390×**42px**（恰为其 padding 高度），5 个链接 y 74→310 全被 `overflow-y:auto` 裁掉，只露一条缝。根因：抽屉虽 `position:fixed`，但**嵌在 `.topbar` 内部**，而顶栏的 `backdrop-filter`（毛玻璃）会创建包含块（同 transform/filter 语义）→ fixed 元素相对 56px 高的顶栏定位，`inset: nav-h 0 0 0` 算出的高度 ≈0。修复：**把 `.drawer` 移出 `</header>`** 成为兄弟节点（fixed 回归视口包含块），并加 `env(safe-area-inset-bottom)` 底部安全区。验证：亮/暗两页抽屉均 390×788 全屏、5 链接完整、无裁切；点击切换/Esc/断点自动收起逻辑不受影响（脚本按 `[data-menu]` 全局查询）。教训：**backdrop-filter/filter/transform 的祖先会让 fixed 后代以它为包含块 —— 全屏浮层不要嵌在毛玻璃容器里**。

## §85（2026-09-08）抽屉展开/收起动画

用户：抽屉做个展开动画。实现（Nav.astro）：`.drawer` 收起态 `opacity:0 + translateY(-10px) + visibility:hidden`，`.is-open` 归位（transform `.3s cubic-bezier(.22,.61,.36,1)`、opacity `.24s`、visibility 过渡延时衔接）；**逐项上浮淡入** —— `.drawer-link` 入场 `translateY(8px)→0`，`is-open` 下按 `nth-child` 递增 `transition-delay` 0.03–0.18s（含第 6 项以后无延迟）；收起不做逐项延迟（整体快速回落）。JS：`openDrawer/closeDrawer` 抽函数（双 rAF 保证初始态先落帧）；关闭经 `transitionend`（滤 target=抽屉本身，避免子项过渡冒泡）后 `hidden=true`，另设 320ms 兜底；Esc/跨断点/点链接收起路径复用；`prefers-reduced-motion` 下过渡全关、直接显隐。验证：开→中途 op0.60/tf-3.6px→终态 op1/390×788/aria true/滚动锁；关→中途 op0.17→hidden/display:none/滚动解锁。

**§86（2026-09-08）抽屉改为内容高度下拉面板** —— 用户：展开不要覆盖整页，栏目多少就下拉多少。`.drawer` 改 `inset: var(--nav-h) 0 auto 0`（只挂顶部、高度自适应）+ `max-height: calc(100dvh - var(--nav-h))` 兜底 + `overflow-y:auto`；下缘加圆角/发丝边/投影收口（玻璃语言一致）；§85 展开动画沿用。验证：390×844 下展开面板 390×**352**（5 项 + 内边距），页面其余区域可见可辨。

## §87（2026-09-08）玻璃球 island 加载失败静默重试兜底

背景：dev 多次出现 vite `504 Outdated Optimize Dep` → `FluidGlass.jsx` 动态导入失败、**island 静默不水合**（球消失而页面其余正常，不易察觉；线上 chunk 加载失败同理）。用户要求加兜底。实现（index.astro 内联脚本，页面级）：监听 `unhandledrejection` 与脚本 `error`（捕获阶段），消息匹配 `FluidGlass|dynamically imported module` → **整页静默 reload 一次**；`sessionStorage.__fgIslandRetry` 去抖防死循环（重试仍失败即放弃）；水合成功（`.glass-scene canvas` 出现）后清除标记，使后续独立故障仍可再试。验证：正常加载 → canvas=1、标记 null、无额外重载；拦截 three/FluidGlass chunk → 标记置 1、**仅重载一次**后停止。

**§88（2026-09-08）根治 dev 反复 504：ogl 排除依赖预打包** —— 「摄影作品集光照背景没了 / 首页玻璃球没了」在本会话**第五次**出现，同一根因：vite 依赖预打包（`node_modules/.vite`）在重装依赖后过期，`ogl`（Rays）与 `FluidGlass` 相关模块返回 `504 Outdated Optimize Dep`，脚本静默不执行、画布不创建；清缓存重启即恢复（属 dev 伪影，构建产物无此问题，§70/§74/§87 均已记录）。根治：`astro.config.mjs` → `vite.optimizeDeps.exclude: ['ogl']`（按源码直供，去掉该预打包条目）。验证：清缓存重启后 `/photos/` 2 画布、`/photos/nikon-roll/` 1、`/` 1，控制台 **0 错误**。若今后再遇同类 504，优先怀疑新装的运行时依赖并把对应包加入该排除表。

## §89（2026-09-08）排查「点击笔记/栏目偶尔无反应」+ 规范化栏目路径

排查（无头全场景实测）：卡片中部/摘要区点击、导航点击、转场进行中连点、弱网（400ms 延迟 200KB/s）点击、连点 5 次——**全部正常导航**，点击链路非功能 bug。但发现两处造成「点了像没反应」的真实因素并修复其一：
1. **301 重定向**：站点内部链接（导航 5 项 + notes/musings 详情回退键）用无尾斜杠 `/notes`，而 GitHub Pages 对 `/notes` 一律 301 → `/notes/`：每次点击多一次网络往返（移动端/慢网尤其明显）、Astro 预取缓存因此失效。**已统一为带尾斜杠规范形式**（§89，7 处）。
2. 点击**当前所在栏目**时 URL 不变、无视觉反馈（正常行为，非 bug；如需反馈另议）。

## §90（2026-09-08）首页加载提速二：MapleUI 极小号子集（字体分片）

测量（4G + 4× CPU 节流，构建产物）：首页传输 617KB，其中**正文 Maple 子集 238KB 是最大单项且阻塞文字**（> 玻璃球 chunk 308KB 的空闲加载）。方案：**字体分片** —— `subset-maple.mjs` 增出 `maple-ui.woff2`（站点框架文案字形：site.config.ts 全部字符串（名称/标语/导航/页脚）+ ASCII + 少量组件级固定文案，共 136 字形 / 41KB），`@font-face "MapleUI Web"` + 置于 `--font-sans` 栈首。首页全部文本命中它 → 238KB 正文子集**不下载**；内容页正文汉字自然逐字回退到 MapleMono Web（渲染无损，仅多一次字体请求）。任何子集遗漏都会安全回退（只损失速度不丢字形）。
结果：首页传输 **617→420KB（−32%）**，字体阻塞项 238→41KB（字体下载 2852ms→680ms），玻璃球就绪 4051→3046ms、DCL 680→624ms（弱网+节流下）。内容页验证：`/notes/` 按需加载 ui+full 两件、代码页再加 JetBrains —— 各取所需无回归。

## §91（2026-09-08）修复：移动端首页页脚「揉成一坨」+ 大标题窄屏溢出

复现（320px 宽 / 360·390px + 系统字体 125%）：① 版权行 `© 2026 PenicillinC3 Via Claude Code` 带 `white-space:nowrap`（36 字符 ≈286–357px）超出玻璃卡（248–318px）57–88px，溢出挤压；② `.name` 的 clamp 下限 3.2rem 在 320px 屏把「PenicillinC3」撑到 ≈324px > 视口，**整页横向可滚**（页脚等内容随之错位——「揉成一坨」的另一半）。
修复：footer 去掉 nowrap、≤560px 改纵向堆叠（`flex-direction:column; align-items:flex-start; gap:6px`）；标题 `clamp(3.2rem,11vw,6.6rem) → clamp(1.9rem,11vw,6.6rem)`（11vw 主导后随屏收缩且不受系统大字体影响；桌面 1440 标题实测 667px 与改前一致）。验证矩阵：320/360/390 × 字体 100%/125% 全部 `docW==vw` 零溢出、页脚两行内完整容纳；桌面无变化。

## §92（2026-09-08）暗色页抽屉激活项改黑色胶囊

用户：手机端摄影作品集页开抽屉，「摄影作品集」激活项是白色底。原因：`.drawer-link.is-active` 用亮色页配方（`rgba(255,255,255,.95→.65)` 径向白玻璃），在暗色抽屉（`#0d0e13`）上形成白色亮块。修复：增 `body.page-dark .drawer-link.is-active` 覆写 —— 近黑半透 `rgba(9,10,14,.55)` + 发丝描边 `rgba(255,255,255,.14)` + 柔和暗投影；文字沿用暗色 token 浅色。验证：390px 实拍 + 计算样式断言（backgroundImage=none、bg=rgba(9,10,14,.55)）；亮色页抽屉不变。

## §93（2026-09-08）修复移动端滑动翻卷失效 —— 浏览器原生手势/拖拽接管

用户：想要手机端左右滑动切换卷。排查发现 §82 已实现该手势但**真机不可用**，事件追踪（CDP 触摸模拟 + 捕获阶段全事件日志）定位两层原因：
1. **浏览器原生接管**：滑动起点落在胶片 `<img>` 上 → Chrome 判定为图片拖拽/手势，发 `pointercancel` 并**把整页导航到 about:blank**（实测 URL 变 about:blank）——页面「失控」。
2. §82 的点击抑制用 `pointercancel` 信号，真机时序下不可靠：滑动被误判成点按跳进备忘、且异常态会吞掉下一次正常轻触。

修复：`.arena { touch-action: none }` + `.arena img { -webkit-user-drag: none; user-select: none }`（画廊本就视口锁高无滚动，无副作用）——横向手势完全交由翻卷逻辑；点击抑制改为**时间窗**（swipe 后 450ms 内的 click 忽略），移除 pointercancel 依赖。
验证（CDP 触摸模拟）：右滑 → 切到更老卷（NIGHT→2023.07.08）、页面不跳转；左滑 → 回到新卷；轻触 → 正常进入备忘；起止边缘（最新卷右端）滑动为无害边界。桌面点击逻辑不受影响。

## §94（2026-09-08）滑动翻卷改「跟手拖动」

用户：希望滑动过程中画面跟手（拖到一半、画面就在一半），而非松手才跳变。实现：touchmove 阶段（横向占优 >8px 起手）设 `reel.style.transition='none'` 并逐帧写内联 `translateX(基准 + 手指位移)`（1:1 跟手；越过首尾边界方向乘 0.35 阻尼）；touchend 恢复 CSS 缓出过渡并清除内联位移 —— 过阈值（48px）调 `go()` 吸附到相邻卷、未过则动画弹回原位；拖动收尾统一置时间窗抑制 click。调试插曲：清变量时漏删一行赋值致 touchmove 每次抛 ReferenceError（严格模式）而静默失效，已修。验证（CDP 触摸）：拖 +120px 跟手 +120px；过阈值翻卷；小拖 30px 跟手 +30、松手弹回、卷不变；双向往返正常。

## §95（2026-09-08）照片按卷分文件夹存放（slug 不变）

用户：把 photos 里的照片按卷分类存储便于管理。实现：照片移入 `src/content/photos/<卷slug>/`（dsc0007→field-roll/、dsc0015/0025→nikon-roll/，`git mv` 保留历史）；`photos` 集合改 **glob loader + `generateId` 取文件名**（不含目录）→ slug 与旧结构逐字一致，`cover:`、`![[照片slug]]`、卷内匹配等**全部引用零改动**；约定照片文件名全站唯一（跨卷不重名），已在写作教程注明。验证：构建 14 页 0 警告、图片全部正常处理；/photos、两卷备忘页 200 且照片数正确（nikon 2 / field 1）、画廊字幕正常。（过程插曲：dev 服务器在迁移中呈 500，清 `.astro` 重启即恢复——内容缓存伪影。）

## §96（2026-09-08）照片 slug 改为「文件夹名/文件名」（跨卷同名照片支持）

用户反馈相机文件名跨卷大量重复，§95 的「slug=纯文件名、全站唯一」不可行。改为 slug = **文件夹名/文件名**（glob loader 默认路径 id，如 `nikon-roll/dsc0025`）：不同卷可有同名照片，唯一性约束放宽为「卷内不重名」。引用随之带卷前缀：`cover: nikon-roll/dsc0025`、正文 `![[field-roll/dsc0007]]`（漏前缀 → 卷内查无此照片、构建报错点名）。不分子目录的照片 slug 即文件名（兼容）。已更新两卷 cover、写作教程（存放约定/图文交错示例/成卷说明）与 CLAUDE 内容层 bullet。验证：构建 0 警告、画廊与两卷备忘页 200、张数与字幕正常。

## §97（2026-09-08）修复首访「字重跳变」（先粗后细）—— CSS 字重对齐字体实际档位

用户：第一次进入时一些字体会加粗、不协调（怀疑与字体压缩有关）。排查：Maple/华文中宋子集**只有 Medium 一档**（font/ 亦无 Bold 原件），但 CSS 里 h1–h4=700、.page-title/.brand=800、.btn/.more=.yr=600、strong/th=700 —— 网页字体加载期间回退系统字（微软雅黑），这些元素渲染**真粗体**；字体就位后落回 Maple Medium 变细 → 首访约 1 秒的「先粗后细」跳变（§90 让 UI 子集秒载后对比更明显）。量化（标题区墨量）：Maple 稳定态 12.16% vs 雅黑 700 回退态 18.33%（+51%）vs 雅黑 500 回退态 11.29%（≈稳定态）。
修复：全部 ≥600 字重归一为 **500**（11 处：base h1–h4/.btn/.page-title、LinkCard/Nav brand/PostList/ProjectCard/SectionHeader、404、首页 .name、画廊 .ts，另加全局 `strong, b, th { font-weight: 500 }`）—— Maple 单档下这些 700/800 本来就不产生任何视觉粗体，500 对**加载完成后的观感零影响**，只把回退期拉到与最终一致。保留 `font-display: swap`（曾试 optional：会让首访永远看不到 Maple，已回退）。附带发现：本机装有 Maple 系统字体，测试机回退态自动命中它——复现用户现象需强制指定雅黑（量化即如此测）。
遗留说明：Maple 单 Medium 档，`**加粗**` 实际不显粗（现状如此）；若需真加粗，需往 font/ 放 Bold TTF 并扩展 subset 脚本。

## §98（2026-09-08）接入 Maple 真粗体（Bold 原件由用户放入 font/）

§97 遗留：字体仅 Medium 一档，`**加粗**`/表头实际不显粗。用户把 `font/MapleMono-NF-CN-Bold.ttf` 放好后接入：
1. `subset-maple.mjs` 增出 `maple-mono-bold.woff2`（251KB，同全站字符集）；
2. **字重分段**：Medium 面声明改 `font-weight: 100 599`，新增 Bold 面 `600 900`（此前 Medium 面写死 100 900，会把 ≥600 请求也吃掉、粗体字形永远用不上——§97 现象的深层原因）；Bold 面 `swap`；
3. 恢复 `strong, b, th { font-weight: 700 }`（含 markdown `**加粗**` 与表头）—— 回退期系统粗体 ≈ 最终真粗体，无字重跳变（与 §97 原则一致）；
4. 其余 §97 归一为 500 的元素**不动**（标题/品牌/按钮等视觉与 §97 后一致）。
**按需加载已验证**：含粗体的教程页加载 bold、无粗体的网站参考页不加载（不下载 = 不付 251KB）；同段内粗体段墨量 14.0% vs 整段 8.1%（+73%，真粗体生效）。

## §99（2026-09-08）修复：摄影封面/内容张冠李戴 —— glob 集合主键是 id 非 slug

用户：摄影作品集封面与内容乱了。排查（临时日志打点）：§95 把 photos 切到 content layer（glob loader）后，**条目主键从 `.slug` 变为 `.id`**，而代码仍读 `.slug` → 全为 `undefined`：① `seriesRolls` 封面对照 `p.slug === cover` 恒 false → 回退「卷内第一张」（Nikon 封面从 dsc0025 变成 dsc0015）；② `imgBySlug`/`photoBySlug` 映射全部撞在 `undefined` 键上、后写覆盖先写 → 每卷所有照片位置都渲染成同一张（Nikon 两处都是 dsc0025）；③ §81 标记正则 `[a-z0-9-]` 也不含 `/`，`![[卷名/文件名]]` 根本不匹配。
修复：7 处改 `p.id`（collections.ts 封面对照与告警、[slug].astro 的三处映射/标记过滤、模板 restPhotos 渲染——最后这处首轮漏改曾致构建崩溃）+ 标记正则放宽为 `[a-z0-9\-/]+`。验证（干净构建 dist 断言）：Nikon = dsc0015+dsc0025 各一、field = dsc0007、画廊封面 郊野→dsc0007 / Nikon→dsc0025 对应正确、字幕正常。教训已写入 CLAUDE 内容层 bullet。
