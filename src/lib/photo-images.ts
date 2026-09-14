import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

// §101：照片展示图的 getImage 参数集中于此。这些参数会参与构建期产物 URL 的生成
// （`/_astro/<name>.<hash>_<width>.webp`），**照片页、画廊与首页预取清单必须用同一套**
// —— 否则预取的图与页面实际请求的图不是同一个文件（白预取、进度条虚报）。
// 改这里 = 同时改三处；改完务必重跑 `npm run build` 并核对 dist 里 webp 文件名集合。
//
// §76：压缩 —— 去掉 2400 档（展示宽 ≤1200px，1600 已覆盖 1.33x DPR，2x 场景由
//   1600 上采样可接受），quality 86→80

/** 卷备忘页正文里的照片（横/竖混排大图） */
export const memoImage = (src: ImageMetadata) =>
  getImage({
    src,
    widths: [900, 1600],
    sizes: '(min-width: 900px) min(88vw, 1200px), 100vw',
    format: 'webp',
    quality: 80,
  });

/** 胶片画廊的卷封面（视口中心那张，视口内只露一张多一点） */
export const coverImage = (src: ImageMetadata) =>
  getImage({
    src,
    widths: [640, 1000, 1600],
    sizes: '(min-width: 900px) 46vw, 90vw',
    format: 'webp',
    quality: 80,
  });

// §101 修正：Astro 5 的响应式档位在 `srcSet.values`（`{ url, descriptor }[]`），
// **`attributes.srcset` 根本不存在** —— 此前两处调用点照旧写法取值，恒为 undefined，
// 于是 `<img>` 只带 src + 一个孤零零的 sizes：照片全程不响应式（各设备都下同一档），
// 而多出来的档位构建完就躺在 dist 里没人引用。凡渲染 `<img srcset>` 一律走这里。
type ImgResult = { srcSet: { values: Array<{ url: string; descriptor?: string }> } };

/** 取 getImage 结果的 srcset 串（`url 900w, url2 1600w`） */
export const srcsetOf = (g: ImgResult) =>
  g.srcSet.values.map((v) => `${v.url} ${v.descriptor ?? ''}`.trim()).join(', ');
