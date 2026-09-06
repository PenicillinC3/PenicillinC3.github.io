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
