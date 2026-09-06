// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// 建仓时把 USERNAME 替换为 GitHub 用户名（主页仓 = <用户名>.github.io → base 根路径）
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/',
  integrations: [
    // 首页液态玻璃镜头（spec §34）：React+Three 全真折射，仅此一处框架岛
    react(),
  ],
  markdown: {
    // prism：token 类名稳定（token.comment 等），spec §29.2 注释斜体字体依赖它
    syntaxHighlight: 'prism',
  },
  devToolbar: {
    enabled: false, // 隐藏底部 Astro 开发工具栏（仅影响本地 dev）
  },
});
