/* eslint-disable react/no-unknown-property */
/**
 * 首页玻璃球 —— react-bits FluidGlass.jsx 官方移植（D-Mbithi/react-bits
 * commit 86dfdfc 的 Lens 模式，方案 B，spec §69）。
 *
 * 机制逐行保留官方原版（这是「一比一」的承诺部分）：
 *   ① 折射内容先进 FBO：portal 场景（本站网格底）每帧离屏渲染；
 *   ② 同一张 buffer 纹理同时给「全屏 quad 铺底」与球的
 *      MeshTransmissionMaterial 采样 —— 球折射的 = 它背后屏幕正在显示的，
 *      所见即所折射（自洽，无镜像偏移）；
 *   ③ 球跟手：maath easing.damp3 阻尼吸附 pointer，z=15 贴相机近处。
 *
 * 定制点（仅「内容」层，不改机制）：
 *   - 官方紫底 #5227ff / 白字 "React Bits" / 5 张 Unsplash 照片 —— 全删；
 *     清屏改白 0xffffff。
 *   - 折射内容 = 本站背景方格（22px；§69.2 线宽/浓度已加粗至可见——
 *     0.05/1px 经纹理重采样后隐形）+ 深墨站名水印 NameEcho（troika Text，
 *     位置/字号按 DOM h1 实测换算，1.5× 放大，见下）。
 *   - bar/cube 模式、ScrollControls、NavItems、Typography、Images 均未移植。
 *   - <900px 或 prefers-reduced-motion：不挂载（页面回退纯 DOM 欢迎页）。
 *
 * 模型：public/assets/3d/lens.glb（"Cylinder"，直径 2.0 世界单位）。
 * 玻璃参数：官方 docs 面板默认 scale .25 / ior 1.15 / thickness 2 /
 * chromaticAberration .05 / anisotropy .01（调这里即可微调观感）。
 */
import * as THREE from 'three';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Text, useFBO, useGLTF } from '@react-three/drei';
import { easing } from 'maath';
import { site } from '../site.config';

/* 玻璃球材质参数（官方 docs 面板默认值） */
const LENS_PROPS = {
  scale: 0.25,
  ior: 1.15,
  thickness: 2,
  chromaticAberration: 0.05,
  anisotropy: 0.01,
};

/* 折射内容：本站背景方格（观感同 tokens.css --grid-line / --grid-size）。
   注意（§69.2）：alpha 0.05 的 1px 发丝线在「纹理 → 缓冲 → 全屏 quad」的
   两次重采样后被压到肉眼不可见（页面看似纯白、球无物可折射）——故线宽加粗
   至 2px、alpha 提到 0.12，方格成为球的可视折射源。 */
const GRID_CSS_PX = 22; // 单元格 22px
const GRID_TEX_PX = 2048; // 纹理边长像素
const GRID_CELL_TEX = 16; // 每格 16px → 每张纹理 128 格
const GRID_LINE = 'rgba(15, 23, 42, 0.12)';

function makeGridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = GRID_TEX_PX;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 1; x <= GRID_TEX_PX; x += GRID_CELL_TEX) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GRID_TEX_PX);
  }
  for (let y = 1; y <= GRID_TEX_PX; y += GRID_CELL_TEX) {
    ctx.moveTo(0, y);
    ctx.lineTo(GRID_TEX_PX, y);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* 场景站名水印（spec §69）：深墨 3D 文本铺在缓冲场景里作球的折射素材 ——
   球掠过字迹时弯曲/色差最明显。位置与字号按 DOM h1 实测换算：相机 fov15
   距 z=20，某深度 z 的可见高度 = 2·tan(7.5°)·(20−z)，据此把 CSS 像素映射到
   世界坐标；字号取 DOM 站名的 ECHO_SCALE 倍（稍大一圈，从 DOM 字形边缘
   露出来构成水印层）。troika 只吃 ttf → public/fonts/song-3d.ttf（§69）。 */
const CAM_Z = 20;
const FOV = 15;
const ECHO_Z = 3; // 字在网格(z0)前、球(z15)后
const ECHO_SCALE = 1.5; // 相对 DOM 站名的放大倍数
const ECHO_COLOR = '#17191f'; // 深墨（白页深字，高对比折射源）

const worldHeightAt = (z) => 2 * Math.tan((FOV * Math.PI) / 360) * (CAM_Z - z);

function NameEcho() {
  const [geo, setGeo] = useState({ y: 0, fs: 0 });
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('[data-type-name]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cssFS = parseFloat(getComputedStyle(el).fontSize);
      if (!cssFS || !r.height) return;
      const cssH = window.innerHeight;
      const perPx = worldHeightAt(ECHO_Z) / cssH; // 每 css px 的世界单位
      const y = (cssH / 2 - (r.top + r.height / 2)) * perPx; // 屏幕 y↓ → 世界 y↑
      setGeo({ y, fs: cssFS * ECHO_SCALE * perPx });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  if (!geo.fs) return null;
  return (
    <Text
      position={[0, geo.y, ECHO_Z]}
      fontSize={geo.fs}
      color={ECHO_COLOR}
      font="/fonts/song-3d.ttf"
      letterSpacing={0.04} /* 与 CSS .name letter-spacing .04em 同步 */
      anchorX="center"
      anchorY="middle"
    >
      {site.title}
    </Text>
  );
}

/* 玻璃球本体 + 离屏管线（官方 ModeWrapper，机制原样；Lens 专用） */
const Lens = memo(function Lens() {
  const ref = useRef();
  const { nodes } = useGLTF('/assets/3d/lens.glb');
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);
  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = LENS_PROPS;

  useEffect(() => {
    // 官方同款：量模型宽度（scale 为 null 时按视口宽自适应，此处固定 .25 不走该分支）
    const geo = nodes.Cylinder?.geometry;
    geo?.computeBoundingBox();
    geoWidthRef.current = geo ? geo.boundingBox.max.x - geo.boundingBox.min.x || 1 : 1;
  }, [nodes]);

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    const destX = (pointer.x * v.width) / 2;
    const destY = (pointer.y * v.height) / 2;
    // 跟手阻尼（官方阻尼系数 0.15）
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);

    if (scale == null) {
      const maxWorld = viewport.width * 0.9;
      const desired = maxWorld / geoWidthRef.current;
      ref.current.scale.setScalar(Math.min(0.15, desired));
    }

    // 后台渲染折射场景 → buffer
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    gl.setClearColor(0xffffff, 1); // 官方紫底 #5227ff → 定制白底
  });

  return (
    <>
      {createPortal(
        <>
          <Backdrop />
          <NameEcho />
        </>,
        scene,
      )}
      {/* 全屏 quad：把 buffer（= 折射内容）铺回屏幕当背景 */}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      {/* 玻璃球本体：几何来自 lens.glb，材质吃同一张 buffer */}
      <mesh
        ref={ref}
        scale={scale ?? 0.15}
        rotation-x={Math.PI / 2}
        geometry={nodes.Cylinder?.geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior ?? 1.15}
          thickness={thickness ?? 5}
          anisotropy={anisotropy ?? 0.01}
          chromaticAberration={chromaticAberration ?? 0.1}
          {...extraMat}
        />
      </mesh>
    </>
  );
});

/* 折射内容：铺满视口的方格底（每帧按视口尺寸铺平 + 按 22px 换算纹理平铺数） */
function Backdrop() {
  const mesh = useRef();
  const tex = useMemo(() => makeGridTexture(), []);
  const cellsPerTex = GRID_TEX_PX / GRID_CELL_TEX; // 每张纹理含多少格

  useFrame((state) => {
    const { viewport: vp, size } = state;
    mesh.current.scale.set(vp.width, vp.height, 1);
    // 格宽 css 22px → 平铺张数 = 视口尺寸 / (22px × 每张格数)
    const tx = size.width / (GRID_CSS_PX * cellsPerTex);
    const ty = size.height / (GRID_CSS_PX * cellsPerTex);
    tex.repeat.set(tx, ty);
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function FluidGlass() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const small = matchMedia('(max-width: 899px)');
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const upd = () => setOk(!small.matches && !rm.matches);
    upd();
    small.addEventListener?.('change', upd);
    rm.addEventListener?.('change', upd);
    return () => {
      small.removeEventListener?.('change', upd);
      rm.removeEventListener?.('change', upd);
    };
  }, []);

  if (!ok) return null;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 20], fov: 15 }}
      gl={{ alpha: true, powerPreference: 'high-performance' }}
    >
      <Lens />
    </Canvas>
  );
}
