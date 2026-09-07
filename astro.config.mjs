// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// 主页仓 = PenicillinC3.github.io → 站点根路径部署（base '/'）
export default defineConfig({
  site: 'https://penicillinc3.github.io',
  base: '/',
  // React 栈：spec §69 首页玻璃球特批（react-bits FluidGlass 官方移植，仅首页一个
  // island）。§34 液态玻璃镜头 §35 已删、§68 全撤 —— §69 与历史不同：官方组件
  // 机制、不折射 DOM。其余页面仍零框架（ogl 供 Rays）。
  integrations: [react()],
  markdown: {
    // prism：token 类名稳定（token.comment 等），spec §29.2 注释斜体字体依赖它
    syntaxHighlight: 'prism',
  },
  devToolbar: {
    enabled: false, // 隐藏底部 Astro 开发工具栏（仅影响本地 dev）
  },
  vite: {
    build: {
      // §69 玻璃球 island（three/fiber/drei/react）单 chunk ~1.1MB（gzip 315KB），
      // 仅首页加载；上限抬到 1300 消除 vite 默认 500kB 警告（非框架散包，勿拆）
      chunkSizeWarningLimit: 1300,
    },
  },
});
