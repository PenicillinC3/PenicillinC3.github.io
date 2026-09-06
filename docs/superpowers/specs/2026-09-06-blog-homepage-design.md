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
