// 红色射线氛围层配置（spec §26）：与 SideRays（react-bits）Props 对齐。
// 默认值即用户为摄影集选取的配方；页面可覆盖部分字段。
export interface RaysConfig {
  speed: number;
  rayColor1: string;
  rayColor2: string;
  intensity: number;
  spread: number;
  origin: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  tilt: number;
  saturation: number;
  blend: number;
  falloff: number;
  opacity: number;
}
