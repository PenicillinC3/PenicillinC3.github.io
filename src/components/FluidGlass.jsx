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
 *   - 折射内容 = 与普通页一致的矢量发丝方格（§69.4：22px/0.05 细条几何，
 *     非 CanvasTexture —— 纹理重采样浓度失真已证 §69.2）+ **场景大标题
 *     SceneTitle**（§69.5：标题做进折射场景本体、球掠过即折射字迹，官方 demo
 *     同构；DOM h1 仅 opacity:0 占位）。
 *   - bar/cube 模式、ScrollControls、NavItems、Typography、Images 均未移植。
 *   - <900px 或 prefers-reduced-motion：不挂载（页面回退纯 DOM 欢迎页）。
 *
 * 模型：public/assets/3d/lens.glb（"Cylinder"，直径 2.0 世界单位）。
 * 玻璃参数：官方 docs 面板默认 scale .25 / ior 1.15 / thickness 2 /
 * chromaticAberration .05 / anisotropy .01（调这里即可微调观感）。
 */
import * as THREE from 'three';
import { memo, useEffect, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Text, useFBO, useGLTF } from '@react-three/drei';
import { easing } from 'maath';
import { site } from '../site.config';

/* 玻璃球材质参数（官方 docs 面板默认 scale .25；§69.3→.18、§69.4→.12
   用户逐次走查缩小 —— 直径 0.5→0.36→0.24 世界单位，约屏高 27%→18%） */
const LENS_PROPS = {
  scale: 0.12,
  ior: 1.15,
  thickness: 2,
  chromaticAberration: 0.05,
  anisotropy: 0.01,
};

/* 折射内容：矢量发丝方格（§69.4）—— 与 body 背景同观感（22px、
   rgba(15,23,42,0.05) 1csspx 线，即 notes 等普通页的背景）。不用 CanvasTexture
   的理由：发丝纹理经「纹理 → FBO → 全屏 quad」重采样后浓度失真（§69.2 教训，
   0.05 变不可见 / 0.12 又比普通页重）→ 改为每帧按视口重建的细条几何，浓度
   与 CSS 原生 1px 线一致，首页背景与其余页面视觉统一。 */
const GRID_COLOR = 0x0f172a; // rgb(15,23,42)，同 tokens --grid-line
const GRID_ALPHA = 0.05;
const GRID_CSS_PX = 22;
const CAM_Z = 20;
const FOV = 15;
const worldHeightAt = (z) => 2 * Math.tan((FOV * Math.PI) / 360) * (CAM_Z - z);

/* —— 场景大标题（spec §69.5）—— 首页标题做进折射场景本体：
   球掠过标题即折射字迹（官方 demo 同构）；DOM 侧 h1 以 opacity:0 保留盒子
   与语义（布局/居中测量不破坏，屏幕阅读器可读）。位置与字号按 DOM h1
   rect 实测换算到 TITLE_Z 平面（与网格同缓冲、球 z15 在字前）；字号 = DOM
   计算值原大（TITLE_SCALE 微调钮），troika 吃 ttf → song-3d.ttf。 */
const TITLE_Z = 3; // 网格(z0)前、球(z15)后
const TITLE_SCALE = 1; // 相对 DOM 标题字号倍数（视觉微调）
const TITLE_COLOR = '#17191f'; // = tokens --text-1，与原本 DOM 标题同色

function SceneTitle() {
  const [geo, setGeo] = useState({ y: 0, fs: 0 });
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('[data-scene-title]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cssFS = parseFloat(getComputedStyle(el).fontSize);
      if (!cssFS || !r.height) return;
      const cssH = window.innerHeight;
      const perPx = worldHeightAt(TITLE_Z) / cssH; // 每 css px 的世界单位
      const y = (cssH / 2 - (r.top + r.height / 2)) * perPx; // 屏幕 y↓ → 世界 y↑
      setGeo({ y, fs: cssFS * TITLE_SCALE * perPx });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  if (!geo.fs) return null;
  return (
    <Text
      position={[0, geo.y, TITLE_Z]}
      fontSize={geo.fs}
      color={TITLE_COLOR}
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
          <SceneTitle />
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

/* 折射内容：矢量发丝方格，铺满视口（z=0 平面，与球 z15 同相机）。
   视口尺寸/窗口变化时重建几何 —— 每格 22csspx、线宽 1csspx。 */
function Backdrop() {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    const build = () => {
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const worldH = worldHeightAt(0); // z=0 平面可视高
      const perPx = worldH / cssH; // 每 css px 的世界单位（纵横一致）
      const cell = GRID_CSS_PX * perPx;
      const hw = perPx / 2; // 1csspx 线宽的一半
      const halfH = worldH / 2;
      const halfW = (cssW / 2) * perPx;
      const v = [];
      // 一根竖线 = 两端点外扩 hw 的细条（两三角形）
      const bar = (x0, y0, x1, y1) => {
        v.push(
          x0 - hw, y0, 0, x0 + hw, y0, 0, x1 + hw, y1, 0,
          x0 - hw, y0, 0, x1 + hw, y1, 0, x1 - hw, y1, 0,
        );
      };
      for (let x = -halfW; x <= halfW + 1e-6; x += cell) bar(x, -halfH, x, halfH);
      for (let y = -halfH; y <= halfH + 1e-6; y += cell) bar(-halfW, y, halfW, y);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      setGeo((old) => {
        old?.dispose();
        return g;
      });
    };
    build();
    window.addEventListener('resize', build);
    return () => {
      window.removeEventListener('resize', build);
      setGeo((old) => {
        old?.dispose();
        return null;
      });
    };
  }, []);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial
        color={GRID_COLOR}
        transparent
        opacity={GRID_ALPHA}
        depthWrite={false}
        toneMapped={false}
      />
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
