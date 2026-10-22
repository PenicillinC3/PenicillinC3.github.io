/* eslint-disable react/no-unknown-property */
/**
 * 加载页玻璃球舞台（spec §102 / §107）—— react-bits FluidGlass 官方 Lens 的移植，
 * 2026-10-22 起**只服务进站加载页的退场**：首页的球与场景文字已删除，
 * 站名改由 TechText（Canvas 2D）承担（§107）。
 *
 * 机制逐行保留官方原版：
 *   ① 折射内容先进 FBO：portal 场景（网格底 + 加载页底板）每帧离屏渲染；
 *   ② 同一张 buffer 纹理同时给「全屏 quad 铺底」与球的
 *      MeshTransmissionMaterial 采样 —— 球折射的 = 它背后屏幕正在显示的；
 *   ③ 球的位置 / 尺寸 / 光学全部由加载页写全局量驱动（见 LoadingBall）。
 *
 * 现在这个 island 只在首页挂载（`client:idle`），等待加载页的 `__lensBall`
 * 信号；没有加载页（同会话二次进入 / 历史返回 / 内页直达）时它整场静默，
 * 不画球、不跟手、不留任何 DOM 副作用。
 *
 * 模型：public/assets/3d/lens.glb（"Cylinder"，直径 2.0 世界单位）。
 * 玻璃参数：ior 1.15 / thickness 2 / chromaticAberration .05 / anisotropy .01。
 */
import * as THREE from 'three';
import { memo, useEffect, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, useFBO, useGLTF } from '@react-three/drei';

/* 玻璃球材质参数（§107 起只有加载页那颗球用） */
const LENS_PROPS = {
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
const MAX_DPR = 1.5; // 与 Canvas dpr 上限一致（§78 降至 1.5）

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

/* §107：场景文字（标题 / tagline）已删除 —— 站名改由 TechText 在 DOM 层画，
   球只折射网格与加载页底板。song-3d.ttf 因此不再需要。 */

/* 玻璃球本体 + 离屏管线（官方 ModeWrapper，机制原样；Lens 专用） */
/* §102 加载页那颗球 —— 与首页那颗是**两个独立的 mesh**（用户明确要求）。
   整段生命周期由加载页写的全局量驱动，本组件不做任何自己的决策：
     window.__lensBall    true = 这颗在场（首页那颗整体让位）
     window.__lensScale   尺寸（scale，由半径像素换算）
     window.__lensZ       球心 z（球大时后推，别把相机吞进去）
     window.__lensOptics  光学强度（褪光学那段 1 → 0）
   只在 __lensBall 为 true 时可见；关掉即整体消失，不留任何状态给首页那颗。 */
const LoadingBall = memo(function LoadingBall({ buffer, geo }) {
  const mesh = useRef();
  const mat = useRef();
  useFrame(() => {
    const on = window.__lensBall === true;
    const sc = typeof window.__lensScale === 'number' ? window.__lensScale : 0;
    if (mesh.current) {
      mesh.current.visible = on && sc > 0.0005;
      if (on) {
        mesh.current.position.set(0, 0, typeof window.__lensZ === 'number' ? window.__lensZ : 15);
        mesh.current.scale.setScalar(sc);
      }
    }
    const m = mat.current;
    if (!m) return;
    const opt = typeof window.__lensOptics === 'number' ? window.__lensOptics : 1;
    const tgt = {
      ior: 1 + (LENS_PROPS.ior - 1) * opt,
      thickness: LENS_PROPS.thickness * opt,
      chromaticAberration: LENS_PROPS.chromaticAberration * opt,
      anisotropy: LENS_PROPS.anisotropy * opt,
    };
    for (const k in tgt) if (k in m) m[k] = tgt[k];
    const u = m.uniforms;
    if (u) {
      if (u.ior) u.ior.value = tgt.ior;
      if (u.thickness) u.thickness.value = tgt.thickness;
      if (u.chromaticAberration) u.chromaticAberration.value = tgt.chromaticAberration;
      if (u.anisotropy) u.anisotropy.value = tgt.anisotropy;
    }
  });
  return (
    <mesh ref={mesh} rotation-x={Math.PI / 2} geometry={geo} visible={false}>
      <MeshTransmissionMaterial
        ref={mat}
        buffer={buffer.texture}
        ior={LENS_PROPS.ior}
        thickness={LENS_PROPS.thickness}
        anisotropy={LENS_PROPS.anisotropy}
        chromaticAberration={LENS_PROPS.chromaticAberration}
      />
    </mesh>
  );
});

const Lens = memo(function Lens() {
  const { nodes } = useGLTF('/assets/3d/lens.glb');
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const framesRef = useRef(0);
  /* §102 中心镂空 —— ⚠ **不要用 onBeforeCompile 往 MeshTransmissionMaterial 里注入 discard**。
     试过并已回退：球会发黑 / 炸开。原因是那个材质由 drei 深度定制（多趟渲染 +
     屏幕空间折射），注入片元丢弃会破坏它的渲染管线；更糟的是补丁**是永久的**。
     「中间露出完整首页」由两条不改 shader 的途径达成：
       ① 光学衰减到中性（ior→1、thickness→0、色差→0）→ 球在视觉上变清；
       ② 加载层的 mask 中心本就是透明核心（宽羽化）→ 镂空由 DOM 侧负责。
     若将来确实需要几何镂空：换一个车削好的**环形几何**，而不是改 shader。 */

  /* ── 进站过渡接口（spec §102 / §107）─────────────────────────────────
     加载页是普通内联脚本，这里是 React island，两者没有现成通道。用**只读全局量**
     通信：useFrame 本来就按帧跑，读全局天然同步、不会错过事件。
     首页没有加载页时这些量都不存在 → LoadingBall 整颗不可见，本组件静默。

       window.__plPending   加载页在场（LoadingBall 先藏起来，scale = 0）
       window.__lensScale   加载页在驱动球的大小时写这里（数值）
       window.__lensZ       球心 z（球大时后推，别把相机吞进去）
       window.__lensOptics  光学强度（褪光学那段 1 → 0）
       window.__lensBall    true = 加载球在场
       window.__ballReady   本组件写：折射管线已出帧，球可用
     ─────────────────────────────────────────────────────────────────── */
  useFrame((state) => {
    const { gl, camera } = state;

    // 后台渲染折射场景 → buffer（LoadingBall 采样它）。
    // 加载页把 __lensScene 从 0 推到 1：底板淡出 → 球里由加载页换成网格。
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    gl.setClearColor(0xffffff, 1); // 官方紫底 #5227ff → 定制白底

    // 折射管线确实出过帧了 —— 加载页等这个信号才放行（§102）
    if (++framesRef.current === 3) window.__ballReady = true;
  });

  return (
    <>
      {createPortal(
        <>
          <Backdrop />
          {/* §102：加载页底板，盖在最前；过渡时淡出，球里就由加载页换成网格 */}
          <LoadingPlate />
        </>,
        scene,
      )}
      {/* 全屏 quad：把 buffer（= 折射内容）铺回屏幕当背景 */}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      {/* §107：只剩加载页那颗球（首页那颗已删除） */}
      <LoadingBall buffer={buffer} geo={nodes.Cylinder?.geometry} />
    </>
  );
});

/* §102 加载页「底板」—— 过渡期球要折的是**加载页**，不是首页场景。
   加载页是 DOM，而球的 shader 只采样自己的离屏 buffer（§69：折射场景副本、不折射 DOM），
   所以由加载页那一侧把自身版面画成一张 canvas 交过来（window.__plPlate），这里当一张
   平面放进场景、盖在网格前面（z=5，网格 z=0 之前）。
   过渡时按 window.__lensScene 0→1 淡出 → 球里的内容就由「加载页」变成网格。
   这张 canvas 只在过渡开始时画一次：那时进度恒为 100%，画面是静止的。 */
const PLATE_Z = 5;   // 底板平面所在深度（网格 z0 与 3D 文字 z3 之前、球 z15 之后）

/* §102 背景挖洞：底板中央开一个圆洞，洞里透出底板**后面的场景**（Backdrop 网格）。
   走 alphaMap —— meshBasicMaterial 原生支持，不动 shader、不动球的几何。
   ⚠ 圆必须把宽高比烘进图里：alphaMap 的 UV 铺满整块底板，而底板是按视口宽高铺的，
   所以屏幕上的正圆在 UV 空间是椭圆 —— 直接画圆会得到一圈随窗口比例拉伸的洞。 */
const HOLE_TEX_W = 512;
function makeHoleAlpha(holePx) {
  const w = HOLE_TEX_W;
  const h = Math.max(2, Math.round((HOLE_TEX_W * window.innerHeight) / window.innerWidth));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';                     // 白 = 不透明（alphaMap 取绿通道）
  ctx.fillRect(0, 0, w, h);
  const r = (holePx * w) / window.innerWidth; // 屏幕像素 → texel
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  g.addColorStop(0, '#000');
  g.addColorStop(0.88, '#000');
  g.addColorStop(1, '#fff');                  // 留一点羽化，硬边会看到台阶
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function LoadingPlate() {
  const mesh = useRef();
  const mat = useRef();
  const texRef = useRef(null);
  const holeRef = useRef({ px: -1, tex: null });   // { 上次的洞径屏幕像素, alpha 纹理 }

  useFrame((state) => {
    const { viewport, camera } = state;
    // ⚠ 必须用**本平面所在深度**的视口，不能用 useThree 的 viewport（那是 z=0 处的）。
    // 透视下越靠近相机可视世界范围越小：z=0 高 5.27，z=5 只有 3.95（0.75 倍）。
    // 拿 z=0 的尺寸去铺 z=5 的平面 → 大 1.333 倍，交班瞬间整页「莫名放大」。
    const vp = viewport.getCurrentViewport(camera, [0, 0, PLATE_Z]);
    const src = window.__plPlate;
    // ⚠ 判据必须是「**还是不是同一张 canvas**」，不能是「有没有纹理」。
    //   旧写法 `if (src && !texRef.current)` 只在第一次建纹理：dev-ball 的动画是循环
    //   重播的，reset() 会把 __plPlate 换成新烘的一张，纹理却仍指着第一张 ——
    //   改了字距/模糊再重播，屏幕纹丝不动（实测差异 0 像素，而 __plPlate 已确实换了）。
    if (src && (!texRef.current || texRef.current.image !== src)) {
      const t = new THREE.CanvasTexture(src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;   // 非 2 次幂尺寸 → 不能上 mipmap
      t.generateMipmaps = false;
      if (texRef.current) texRef.current.dispose();   // 换新前释放旧的，别漏显存
      texRef.current = t;
      if (mat.current) { mat.current.map = t; mat.current.needsUpdate = true; }
    }
    // 圆洞：洞径由外部给（window.__lensHolePx，屏幕像素），随玻璃球半径变化。
    // 只在变化超过 1px 时重建纹理 —— 拖滑块时每帧重建会一直分配显存。
    const holePx = typeof window.__lensHolePx === 'number' ? window.__lensHolePx : 0;
    if (mat.current) {
      if (holePx > 1) {
        if (!holeRef.current.tex || Math.abs(holeRef.current.px - holePx) > 1) {
          if (holeRef.current.tex) holeRef.current.tex.dispose();
          holeRef.current = { px: holePx, tex: new THREE.CanvasTexture(makeHoleAlpha(holePx)) };
          mat.current.alphaMap = holeRef.current.tex;
          mat.current.needsUpdate = true;
        }
      } else if (mat.current.alphaMap) {
        mat.current.alphaMap = null;            // 归零即回到实心底板
        mat.current.needsUpdate = true;
      }
    }
    if (mesh.current) mesh.current.scale.set(vp.width, vp.height, 1);
    if (mat.current && mesh.current) {
      const s = typeof window.__lensScene === 'number' ? window.__lensScene : 0;
      mat.current.opacity = 1 - s;
      mesh.current.visible = !!texRef.current && s < 0.995;
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0, PLATE_Z]} visible={false}>
      <planeGeometry />
      <meshBasicMaterial ref={mat} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* 折射内容：1:1 像素 CanvasTexture 方格铺满视口（z=0 平面，与球同相机）。
   纹理同步创建于首帧（§69.11：曾用 effect 异步 setState → 首帧 mesh 未挂载，
   useFrame 里 mesh.current.scale 抛错，网格从未画出 —— 像素探针实证加载后
   全白）；resize 按当前 dpr 重建。buffer 像素与屏幕 1:1，与 body CSS 同观感。 */
function Backdrop() {
  const mesh = useRef();
  const [tex, setTex] = useState(() => makeGridTexture()); // 同步：首帧即有

  useEffect(() => {
    const build = () => {
      setTex((old) => {
        old?.dispose();
        return makeGridTexture();
      });
    };
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
    if (mesh.current) mesh.current.scale.set(vp.width, vp.height, 1);
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
  // §107：首页不再有可跟手的球。这个 island 只剩「加载页退场舞台」一个职责：
  //   窄屏 / 减动效时整场不挂载，并明确告诉加载页（__ballNA）不必等球。
  useEffect(() => {
    const small = matchMedia('(max-width: 899px)');
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const upd = () => {
      const on = !small.matches && !rm.matches;
      setOk(on);
      window.__ballDecided = true;
      window.__ballNA = !on;
      // 加载页在场：球先藏起来（scale 0），等它的过渡把 scale 推上去。
      if (window.__plPending && typeof window.__lensScale !== 'number') window.__lensScale = 0;
    };
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
      flat /* §69.6：关 ACES 色调映射 —— 纯白 FBO 底经 ACES 变灰(#ddd)且
               压没 0.05 发丝网格；flat 后白底与 CSS 页面一致 */
      dpr={[1, 1.5]} /* §78：上限 1.75→1.5 —— 3/4 像素量，观感几乎无差、帧更稳 */
      camera={{ position: [0, 0, 20], fov: 15 }}
      gl={{ alpha: true, powerPreference: 'high-performance' }}
    >
      <Lens />
    </Canvas>
  );
}
