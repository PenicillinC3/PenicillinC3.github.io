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

/* 玻璃球材质参数（官方 docs 面板默认 scale .25；§69.3→.18、§69.4→.12、
   §69.6→.10 —— 直径 0.5→0.36→0.24→0.20 世界单位，约屏高 18%→15%） */
const LENS_PROPS = {
  scale: 0.10,
  ior: 1.15,
  thickness: 2,
  chromaticAberration: 0.05,
  anisotropy: 0.01,
};

/* 折射内容：方格 = 与 body CSS 原生渲染 1:1 的 CanvasTexture（§69.7）。
   历史：矢量细条几何（§69.4）低 alpha 下边缘被 AA 软化、观感与 CSS 页不
   同步；固定 2048 纹理（§69.2）发丝经「纹理→FBO→quad」重采样失真是另一
   极端。正解：纹理尺寸 = 视口设备像素（css×dpr），1px 设备线按 22×dpr 步进
   直接画 —— buffer 像素 = 屏幕像素 1:1，无任何重采样/软化，与 CSS 原生
   一致（rgba(15,23,42,.05)，tokens --grid-line/--grid-size）。 */
const GRID_RGBA = 'rgba(15, 23, 42, 0.08)'; // §69.10：用户调深（原 0.05 与 body 一致）
const GRID_CSS_PX = 22;
const MAX_DPR = 1.75; // 与 Canvas dpr 上限一致
const CAM_Z = 20;
const FOV = 15;
const worldHeightAt = (z) => 2 * Math.tan((FOV * Math.PI) / 360) * (CAM_Z - z);

function makeGridTexture() {
  const rdpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(window.innerWidth * rdpr) + 1);
  c.height = Math.max(1, Math.ceil(window.innerHeight * rdpr) + 1);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = GRID_RGBA;
  // §69.8：线宽 = rdpr 设备像素（CSS 1px 线 = 1 css px = dpr 个设备像素；
  //   此前固定 1 设备像素 = 只有 CSS 一半墨量 → 加载后网格发虚不显）
  ctx.lineWidth = rdpr;
  ctx.beginPath();
  const step = GRID_CSS_PX * rdpr; // 设备像素步进 = 22 css px
  for (let x = 0.5; x <= c.width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
  }
  for (let y = 0.5; y <= c.height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* —— 场景文字（标题 + tagline，spec §69.5/§69.6）—— 首页标题与「记录 · 拍摄 ·
   思考」tagline 都做进折射场景本体：球掠过即折射字迹（官方 demo 同构）；
   DOM 侧同名元素以 opacity:0 保留盒子与语义（布局/居中测量不破坏，屏幕
   阅读器可读）。位置/字号按各 DOM 元素 rect 实测换算到 TEXT_Z 平面（与网格
   同缓冲、球 z15 在字前）；字号 = DOM 计算值 × 各自 SCALE（微调钮）；
   字色对应 --text-1/--text-2；troika 吃 ttf → song-3d.ttf（ASCII + tagline
   中文字形子集）。 */
const TEXT_Z = 3; // 网格(z0)前、球(z15)后
const TEXT_META = [
  { sel: '[data-scene-title]', color: '#17191f', ls: 0.04, scale: 1 }, // --text-1
  { sel: '[data-scene-tagline]', color: '#565d6e', ls: 0.02, scale: 1 }, // --text-2
];

function SceneTexts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const measure = () => {
      const cssH = window.innerHeight;
      const perPx = worldHeightAt(TEXT_Z) / cssH; // 每 css px 的世界单位
      const out = [];
      for (const m of TEXT_META) {
        const el = document.querySelector(m.sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cssFS = parseFloat(getComputedStyle(el).fontSize);
        if (!cssFS || !r.height) continue;
        out.push({
          ...m,
          text: el.textContent ?? '',
          y: (cssH / 2 - (r.top + r.height / 2)) * perPx, // 屏幕 y↓ → 世界 y↑
          fs: cssFS * m.scale * perPx,
        });
      }
      setItems(out);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return items.map((it) =>
    it.text ? (
      <Text
        key={it.sel}
        position={[0, it.y, TEXT_Z]}
        fontSize={it.fs}
        color={it.color}
        font="/fonts/song-3d.ttf"
        letterSpacing={it.ls}
        anchorX="center"
        anchorY="middle"
      >
        {it.text}
      </Text>
    ) : null,
  );
}

/* 玻璃球本体 + 离屏管线（官方 ModeWrapper，机制原样；Lens 专用）。
   follow = { current: {x,y} } 归一化指针（§69.8：window 级 pointermove 写入，
   不再依赖 canvas 自身事件 —— 悬停按钮等 DOM 上层元素时球仍全域跟手） */
const Lens = memo(function Lens({ follow }) {
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
    const { gl, viewport, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    const destX = (follow.current.x * v.width) / 2;
    const destY = (follow.current.y * v.height) / 2;
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
          <SceneTexts />
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

/* 折射内容：1:1 像素 CanvasTexture 方格铺满视口（z=0 平面，与球同相机）。
   纹理尺寸随视口重建（resize 时按当前 dpr 重画）；mesh 每帧按 viewport
   铺平 —— buffer 像素与屏幕 1:1，网格与 body CSS 原生渲染观感一致。 */
function Backdrop() {
  const mesh = useRef();
  const [tex, setTex] = useState(null);
  useEffect(() => {
    const build = () => {
      const t = makeGridTexture();
      setTex((old) => {
        old?.dispose();
        return t;
      });
    };
    build();
    window.addEventListener('resize', build);
    return () => {
      window.removeEventListener('resize', build);
      setTex((old) => {
        old?.dispose();
        return null;
      });
    };
  }, []);

  useFrame((state) => {
    const { viewport: vp } = state;
    mesh.current.scale.set(vp.width, vp.height, 1);
  });

  if (!tex) return null;
  return (
    <mesh ref={mesh}>
      <planeGeometry />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function FluidGlass() {
  const [ok, setOk] = useState(false);
  // §69.8：全页指针（window 级）→ 归一化 [-1,1]（y↑），与 canvas 事件解耦；
  //   悬停按钮/导航等 DOM 上层元素时球仍跟手
  const pt = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      pt.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pt.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

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

  // §69.9：html.fg-on 随 island 生命周期挂/摘 —— 它是「DOM 标题隐藏」的唯一开关。
  //   不能用首屏 inline script 挂类：Astro ViewTransitions 历史返回会恢复
  //   <html> 类状态、把该类抹掉 → 双层标题（bug 实证）。
  useEffect(() => {
    document.documentElement.classList.toggle('fg-on', ok);
    return () => document.documentElement.classList.remove('fg-on');
  }, [ok]);

  if (!ok) return null;

  return (
    <Canvas
      flat /* §69.6：关 ACES 色调映射 —— 纯白 FBO 底经 ACES 变灰(#ddd)且
               压没 0.05 发丝网格；flat 后白底与 CSS 页面一致 */
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 20], fov: 15 }}
      gl={{ alpha: true, powerPreference: 'high-performance' }}
    >
      <Lens follow={pt} />
    </Canvas>
  );
}
