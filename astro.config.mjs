// @ts-check
import { defineConfig } from 'astro/config';

// 建仓时把 USERNAME 替换为 GitHub 用户名（主页仓 = <用户名>.github.io → base 根路径）
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/',
  markdown: {
    // prism：token 类名稳定（token.comment 等），spec §29.2 注释斜体字体依赖它
    syntaxHighlight: 'prism',
  },
  devToolbar: {
    enabled: false, // 隐藏底部 Astro 开发工具栏（仅影响本地 dev）
  },
});
