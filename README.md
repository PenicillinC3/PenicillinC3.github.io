# Vibe 个人博客

Apple 液态玻璃风格的静态个人站点。内容全部是 Markdown 文件，推送到 GitHub 即自动构建部署到 GitHub Pages。

技术：Astro 5 · TypeScript · 纯 CSS（React 仅首页玻璃球一个 island，spec §69 特批；其余零框架）。设计依据见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。

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
- 摄影可成「卷」：卷文放 `src/content/series/<卷slug>.md`，frontmatter 里 `cover: <卷内照片slug>` 选封面（须属于该卷）；照片 md 加 `series: <卷slug>` 即挂靠该卷、照片随卷展示，不挂靠的照片保留文件、不进胶片。

## 改外观

- 站点名/标语/简介/导航/页脚注：`src/site.config.ts`
- 颜色/圆角/阴影/光斑全部主题值：`src/styles/tokens.css`（亮暗两套）
- 玻璃面板/按钮/排版基元：`src/styles/base.css`

## 部署（GitHub Pages）

已上线：仓库 `PenicillinC3/PenicillinC3.github.io`。每次推送 `main`，Actions（`.github/workflows/deploy.yml`）自动 `astro build` 并发布到 Pages，无需任何手动步骤。

## 目录速览

```
src/
  site.config.ts     站点元信息（改这里换名字）
  content.config.ts  内容 schema（校验规则）
  content/           全部内容（.md + 照片）
  styles/            tokens.css（主题值）/ base.css（玻璃基元）
  components/  layouts/  lib/          UI 与逻辑
  pages/             各路由页面
```

## 内容许可

正文默认 CC BY-NC 4.0（见 `src/site.config.ts` 的 `footerNote`，可自行修改）。
