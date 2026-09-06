// @ts-check
import { defineConfig } from 'astro/config';

// 主页仓 = PenicillinC3.github.io → 站点根路径部署（base '/'）
export default defineConfig({
  site: 'https://penicillinc3.github.io',
  base: '/',
  // 无框架集成：液态玻璃镜头（spec §34）已于 §35 删除，React 栈全部移除，
  // 全站回归零框架（仅有 ogl 一个 WebGL 运行时依赖，用于 Rays）
  markdown: {
    // prism：token 类名稳定（token.comment 等），spec §29.2 注释斜体字体依赖它
    syntaxHighlight: 'prism',
  },
  devToolbar: {
    enabled: false, // 隐藏底部 Astro 开发工具栏（仅影响本地 dev）
  },
});
