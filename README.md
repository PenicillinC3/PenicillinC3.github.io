# PenicillinC3 的个人博客

Apple 液态玻璃风格的静态个人站点。包含我的一些思考见解，学习心得，摄影作品展示，个人项目等内容。

内容全部是 Markdown 文件，推送到 GitHub 即自动构建部署到 GitHub Pages。

技术：Astro 5 · TypeScript · 纯 CSS（React 仅首页玻璃球一个 island，spec §69 特批；其余零框架）。设计依据见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。

## 本地开发

本项目由Claude Code搭配Deepseek-v4-flash-0731协助开发。

```bash
npm install     # 首次
npm run dev     # 开发服务器（热更新），Ctrl+C 退出
npm run build   # 构建到 dist/
npm run preview # 本地预览构建产物
```

## 日常更新

参见博客个人笔记中的**本站内容写作与发布教程**。

## 部署（GitHub Pages）

已上线：仓库 `PenicillinC3/PenicillinC3.github.io`。

每次推送 `main`，Actions（`.github/workflows/deploy.yml`）自动 `astro build` 并发布到 Pages，无需任何手动步骤。

*详细内容请参见博客个人笔记中的更新与删除网页教程*

## 目录速览

```
src/
  site.config.ts     站点元信息（改这里换名字）
  content.config.ts  内容 schema（校验规则）
  content/           全部内容（.md + 照片）
  styles/            tokens.css（主题值）/ base.css（玻璃基元）
  components/layouts/lib/          UI 与逻辑
  pages/             各路由页面
```

## 内容许可

本博客遵循 CC BY-NC 4.0 协议。
