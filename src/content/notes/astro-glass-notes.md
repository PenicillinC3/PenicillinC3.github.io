---
title: 用纯 CSS 还原 Apple 液态玻璃
date: 2026-09-01
tags: [CSS, 设计系统]
summary: 液态玻璃不是图片特效，而是一套可复刻的视觉规则：半透明、背景模糊提饱和、高光描边。
---
液态玻璃（Liquid Glass）在 Web 上完全可以用纯 CSS 还原。

## 三个关键层

1. **半透明面板** —— 背景色带 alpha 通道；
2. **折射素材** —— 背后必须有流动的彩色光斑，玻璃才有可模糊的东西；
3. **高光描边** —— 1px 半透明白边框加顶部渐变模拟玻璃反光。

```css
.glass {
  background: linear-gradient(180deg, var(--glass-hl), transparent 34%),
    var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid var(--glass-border);
}
```

## 别忘了降级

不支持 `backdrop-filter` 的浏览器要回退到近实心面板；`prefers-reduced-motion` 用户要停掉光斑动画。
