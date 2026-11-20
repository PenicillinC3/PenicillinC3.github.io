/**
 * 首页站名（spec §107）：DOM h1 保语义与无 JS 回退，TechText 画布负责视觉。
 *
 * - TechText 首帧画完才给 <html> 挂 `tt-on` → CSS 交叉淡出 h1、淡入画布；
 *   没 JS / island 加载失败时 `tt-on` 不存在，h1 照常可见。
 * - `accentColor` 必须传字面色值：Canvas fillStyle 不解析 CSS 变量。
 * - 卸载时摘掉 `tt-on`（ViewTransitions 换页会复用 <html>，不摘会残留）。
 */
import { useCallback, useEffect } from 'react';

import TechText from './TechText.jsx';
import { site } from '../site.config';

// §111：站名与全站展示衬线体同栈 —— 拉丁走 Anthropic Serif，中文（理论上不会出现）
// 落到思源宋体。**顺序即规则**：浏览器逐字回退，Anthropic 没有汉字。
// ⚠ 名字必须与 base.css 里 @font-face 的 family 完全一致，否则 Canvas 静默回退。
const TITLE_STACK =
  '"Anthropic Serif Web", "Source Han Serif Web", "Source Han Serif SC", "Noto Serif SC", serif';

export default function HomeTitle() {
  const onReady = useCallback(() => {
    document.documentElement.classList.add('tt-on');
  }, []);

  useEffect(() => () => document.documentElement.classList.remove('tt-on'), []);

  return (
    <div className="tech-layer" aria-hidden="true">
      <TechText
        text={site.title}
        fontFamily={TITLE_STACK}
        fontWeight={400}
        fontSize={200}
        letterSpacing={0.02}
        align="center"
        pad={36}
        sweep={false}
        idleChar="C"
        onReady={onReady}
      />
    </div>
  );
}
