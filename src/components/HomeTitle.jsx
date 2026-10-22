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

const SONG_STACK = '"Song Web", "华文中宋", "STZhongsong", "Songti SC", "SimSun", serif';

export default function HomeTitle() {
  const onReady = useCallback(() => {
    document.documentElement.classList.add('tt-on');
  }, []);

  useEffect(() => () => document.documentElement.classList.remove('tt-on'), []);

  return (
    <div className="title-stage">
      <h1 className="name" aria-label={site.title}>{site.title}</h1>
      <div className="tech-layer" aria-hidden="true">
        {/* §107：线框/选中框/specks 全部跟随文字色（currentColor = --text-1），
            不再用蓝色 accent；sweep 关闭 —— 只有鼠标在标题上时才动。 */}
        <TechText
          text={site.title}
          fontFamily={SONG_STACK}
          fontWeight={500}
          fontSize={200}
          letterSpacing={0.04}
          align="center"
          sweep={false}
          onReady={onReady}
        />
      </div>
    </div>
  );
}
