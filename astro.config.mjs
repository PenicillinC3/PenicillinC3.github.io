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
  // §100：链接点击「像没反应」的根治 —— 客户端路由点击后要先取回目标页 HTML
  // 才换页，这段等待期 URL 不变、页面不动。Astro 预取默认只在 hover（悬停 80ms）
  // 时触发，移动端没有 hover = 完全不预取 → 点一下干等一整轮网络往返。
  // 改为 viewport：链接进入视口 300ms 即预取（触屏同样生效），点击时命中缓存
  // 立刻换页；关键入口（导航/首页两枚按钮）另在标签上写 data-astro-prefetch="load"
  // 于页面加载即预取。慢连接（saveData/2G）Astro 自动跳过，不占流量。
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  markdown: {
    // prism：token 类名稳定（token.comment 等），spec §29.2 注释斜体字体依赖它
    syntaxHighlight: 'prism',
  },
  devToolbar: {
    enabled: false, // 隐藏底部 Astro 开发工具栏（仅影响本地 dev）
  },
  vite: {
    // §88：ogl 排除出依赖预打包 —— 多次出现「504 Outdated Optimize Dep」致
    // Rays/玻璃球模块加载失败、光效画布不创建（重装依赖后尤甚）。直接按源码
    // 提供可根治该 dev 环境问题（不影响构建产物）
    optimizeDeps: { exclude: ['ogl'] },
    build: {
      // §69 玻璃球 island（three/fiber/drei/react）单 chunk ~1.1MB（gzip 315KB），
      // 仅首页加载；上限抬到 1300 消除 vite 默认 500kB 警告（非框架散包，勿拆）
      chunkSizeWarningLimit: 1300,
    },
  },
});
