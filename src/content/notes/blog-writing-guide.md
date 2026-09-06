---
title: 本站内容写作与发布教程
date: 2026-09-07
tags: [站务]
summary: 从落笔到上线全流程：选栏目、填 frontmatter、挂照片卷、构建验收、推送自动发布。
---

本站一切内容都是 Markdown 文件。新内容的通用流程只有四步：**选栏目 → 放对文件 → `npm run build` 看绿灯 → `git push`**，之后 GitHub Actions 自动构建部署，约两分钟上线。

## 五个栏目放什么

| 栏目 | 文件目录 | 适合内容 |
| --- | --- | --- |
| 个人笔记 `/notes` | `src/content/notes/` | 技术笔记、教程、速查（有标签与顶部过滤） |
| 个人迷思 `/musings` | `src/content/musings/` | 想法、随笔、长文 |
| 网站参考 `/links` | `src/content/links/` | 外链收藏，一句话评注（卡片即链接） |
| 项目集 `/projects` | `src/content/projects/` | 作品/项目卡片，附链接或仓库 |
| 摄影作品 `/photos` + 胶卷 `/photos/卷slug` | `src/content/photos/` + `series/` | 照片与成卷故事（见下文「照片与胶卷」） |

每个栏目目录里都有一个 `_xxx-template.md.example` 模板：把它复制一份改名，照着注释改即可。

## 三分钟上手：发一篇新笔记

1. 复制模板建新文件（文件名 = 网址，**英文 kebab-case**，不带日期）：
   ```bash
   cp src/content/notes/_notes-template.md.example src/content/notes/my-new-note.md
   ```
2. 改 frontmatter（两个 `---` 之间）与正文：
   ```yaml
   ---
   title: 一篇新笔记
   date: 2026-09-07
   summary: 一句话点题（可省，省了自动取正文开头 150 字）
   tags: [CSS, 工具]   # 可省；中文无需引号，逗号分隔
   # draft: true      # 草稿模式，见下文「草稿先行」
   ---
   ```
3. 预览确认、构建验收、推送上线：
   ```bash
   npm run dev        # http://localhost:4321 热更新预览（Ctrl+C 退出）
   npm run build      # 验收：0 error / 0 warning
   git add src/content/notes/my-new-note.md
   git commit -m "feat: 新增笔记 一篇新笔记"
   git push           # Actions 自动构建部署，约 2 分钟
   ```

## 命名与位置规则（踩过坑的教训）

- **文件名 = 网址**：`my-new-note.md` → `/notes/my-new-note/`。不要中文、空格、大写。
- **日期只写进 frontmatter**，文件名永远不带日期（移动文件即可改排序）。
- **`_` 开头的文件会被构建完全忽略**（模板靠 `.example` 后缀排除也一样）——调试临时文件也别用 `_` 开头，会静默消失不报错。
- 列表按 `date` 倒序、按年份分组；同一天内的新文件会排在该年最前。

## frontmatter 字段速查

所有栏目共有：`title`（必填）、`date`（必填，`YYYY-MM-DD`，**裸日期即可、勿加引号**——写错格式会在构建时报错拦截）、`summary?`、`draft?`。

| 栏目 | 特有字段 | 说明 |
| --- | --- | --- |
| notes | `tags: []` | 显示在详情页与卡片，并参与笔记页顶部的标签过滤 |
| links | `url`（必填） | 外链地址，卡片整张可点跳转 |
| projects | `tech: []`（必填）；`url` 与 `repo` 至少其一 | `repo` 支持 `https://`、`ssh://`、`git@host:path` 三种写法 |
| photos | `image`（必填）、`alt`（必填）；`location? series? album? camera?` | 见下文「照片与胶卷」 |
| series | `cover`（必填）；`location?` | `cover` = 卷内某张照片的文件名（slug） |

## 正文排版（本页就是活示例）

详情页顶部的大标题来自 frontmatter 的 `title`，所以**正文从 `##` 开始写**，别再写 `#`。支持 GFM：**加粗**、*斜体*、~~删除线~~、`行内代码`、[链接](https://example.com)、无序/有序列表、引用、分割线、表格（`---` 三行式即出样式）。

代码块走 prism 高亮（语言标记 `ts`/`bash`/`css`/`yaml` 均可），注释自动斜体：英文注释是 JetBrains 斜体，中文字符逐字落到斜体 Maple —— 别改回 shiki：

```ts
// English comments get JetBrains italic; 中文注释逐字走斜体 Maple
const hello = '你好，世界';
```

**插图**：外链图 `![说明](https://… )` 直出；本地图片放**与本文同目录**、正文相对路径引用（`![说明](./img-name.png)`），构建期自动压缩转 webp 并加指纹，原图不进站点。SVG 直发不优化。真实照片一律走 photos 管线，别往文字目录塞大图。

## 照片与胶卷

照片文件与其说明 `.md` **同名同目录**（`harbor-sunset.jpg` ↔ `harbor-sunset.md`）：

```yaml
---
title: 码头日落
date: 2026-09-01
image: ./harbor-sunset.jpg
alt: 描述图片内容（无障碍必填，空则构建失败）
location: 上海 · 外滩   # 可省
camera:
  body: Nikon D90
  lens: 35mm f/1.8
  f: f/8
  ss: 1/250s
  iso: ISO 100
# series: nikon-roll   # 写上即挂进该卷（见下）
---
```

- 正文可留空。`camera` 是已采集但备忘页暂未展示的预留元数据，可省。
- **成卷**：新建 `src/content/series/<卷slug>.md`，frontmatter 里 `cover: <卷内照片slug>` 指定封面；给卷内照片 md 加上 `series: <卷slug>`，照片即自动按拍摄日期排进本卷。胶片画廊上显示的日期与地点字幕取的是**封面照片**的 `date`/`location`。
- 卷的标题、故事正文写在 series md 里，支持全部 Markdown 排版与同目录插图（横幅整行 / 竖幅左图右文靠图片自身比例自然排布），渲染在照片区之前。
- 不挂卷的照片保留文件、不进胶片画廊。

## 草稿先行

`draft: true` 的内容在 `npm run dev` 本地预览**可见**、`npm run build` 正式构建**自动排除**。想写一半先存着：挂上 draft 提交也无妨；满意后删掉那一行或改成 `false` 再推，即发布。

## 验收与发布

- `npm run build` 是唯一验收标准：**0 error / 0 warning** 才算过。frontmatter 写错（缺字段、日期格式错、图片找不到）会在构建期报错并指出文件 —— 这是特性，修好即可，不用怀疑流程。
- **新增中文文案后跑一次 `npm run fonts:subset`**：站名/正文用的是嵌入的 Song + Maple 字集子集，新汉字（尤其生僻字）不在子集里会静默回退系统字体；子集脚本会把新字补进 woff2。
- 推送后想确认上线：`curl -s -o /dev/null -w "%{http_code}" https://penicillinc3.github.io/notes/my-new-note/`，看到 `200` 即成功（`/nope-xyz` 之类的假路径应是 `404`）。

## 常见报错对照

| 构建报错（节选） | 原因 | 处理 |
| --- | --- | --- |
| `date 需为 YYYY-MM-DD` | frontmatter 日期格式不对 | 改成 `2026-09-07` 这种裸日期 |
| `alt 必填` | 照片 md 缺 `alt` | 补一句图片内容描述 |
| `photos 的 url 与 repo 至少提供一个` | projects 条目两者皆空 | 至少填 `url` 或 `repo` 之一 |
| `repo 需为 http(s)://、ssh:// 或 git@host:path 形式` | repo 写法不规范 | 按提示三种格式写 |
| 图片相关报错 | `image: ./xxx.jpg` 指向的文件不存在或不同名 | 检查照片与 md 是否同名同目录 |

## 小坑速记

1. 文件名即网址：英文 kebab-case、不带日期、**不以 `_` 开头**。
2. 日期裸写 `YYYY-MM-DD`，别加引号，也别写进文件名。
3. 正文别写 `#` 一级标题 —— 页面大标题由 frontmatter 提供。
4. 模板 `.example` 后缀的文件不会被收集，别删别改；新增内容复制模板而不是手写。
5. 改了 CSS/组件样式后务必 `npm run build` 零警告再提交。
