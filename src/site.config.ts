export const site = {
  title: 'PenicillinC3',
  tagline: '记录 · 拍摄 · 思考',
  footerNote: '本博客内容遵循 CC BY-NC 4.0 许可。',
  /* §89：栏目路径一律用带尾斜杠的规范形式（与构建产物/GitHub Pages 的
     `/notes/` 一致）—— 用 `/notes` 会被 Pages 301 重定向到 `/notes/`，
     每次点击多一次往返（移动端尤其明显，易被感知为「点了没反应」），
     预取缓存也因此失效 */
  nav: [
    { label: '个人笔记', href: '/notes/' },
    { label: '摄影作品集', href: '/photos/' },
    { label: '个人迷思', href: '/musings/' },
    { label: '网站参考', href: '/links/' },
    { label: '项目集', href: '/projects/' },
  ],
} as const;
