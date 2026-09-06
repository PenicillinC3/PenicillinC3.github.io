// 首页液态玻璃镜头（spec §34）——FluidGlass（react-bits）的独立移植：
// MeshTransmissionMaterial 全真折射 + easing.damp 指针阻尼跟随。
// 与 demo 一致：镜头折射的是 WebGL 画布内自绘背景（淡底 + 色斑 + 细网格），
// 不传输页面 DOM；页面其余部分由透明画布露出。
// 指针跟随为窗口级事件、映射到容器相对坐标（小范围阻尼漂移），组件不拦点击。
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { easing } from 'maath';

interface LensGlassProps {
  /** 折射参数（对应 lensProps） */
  ior?: number;
  thickness?: number;
  chromaticAberration?: number;
  anisotropy?: number;
  /** 指针活动范围（相对容器尺寸的倍数） */
  follow?: number;
}

/** 镜头背后的场景：浅底 + 低饱和色斑 + 细网格 —— 供折射采样 */
function Backdrop() {
  const { viewport } = useThree();
  const vw = viewport.width;
  const vh = viewport.height;
  return (
    <group>
      <mesh position={[0, 0, -9]} scale={[vw * 1.4, vh * 1.4, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#eef1f7" toneMapped={false} />
      </mesh>
      {/* 细网格（XZ grid 转正对相机） */}
      <gridHelper args={[vw * 3, 30, '#d9dfea', '#e6ebf3']} position={[0, 0, -8]} rotation-x={Math.PI / 2} />
      {/* 色斑：折射时有可辨识的彩色畸变 */}
      <mesh position={[-vw * 0.24, vh * 0.16, -7.5]}>
        <circleGeometry args={[vw * 0.15, 64]} />
        <meshBasicMaterial color="#ffd9bd" />
      </mesh>
      <mesh position={[vw * 0.26, -vh * 0.14, -7.5]}>
        <circleGeometry args={[vw * 0.13, 64]} />
        <meshBasicMaterial color="#c9d9ff" />
      </mesh>
      <mesh position={[-vw * 0.08, -vh * 0.34, -7.5]}>
        <circleGeometry args={[vw * 0.08, 64]} />
        <meshBasicMaterial color="#d8efd2" />
      </mesh>
    </group>
  );
}

/** 液态镜头：椭球折射体，全画布范围跟随指针（线性映射 + 边距钳制） */
function Lens({
  ior, thickness, chromaticAberration, anisotropy, follow, ptr,
}: Required<Omit<LensGlassProps, 'follow'>> & { follow: number; ptr: React.MutableRefObject<{ x: number; y: number }> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const s = Math.min(viewport.width, viewport.height) * 0.5;
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.012;
    m.scale.set(s * breathe, s * breathe, s * breathe * 0.5); // 前后压扁 → 双凸面折射
    // 指针线性映射：镜头在画布范围内移动（±(视口半宽 − 镜头半径 − 边距)），
    // 明显跟随且永不越出画布
    const radius = (s * breathe) / 2;
    const maxX = viewport.width / 2 - radius - viewport.width * 0.03;
    const maxY = viewport.height / 2 - radius - viewport.height * 0.03;
    const destX = Math.max(-maxX, Math.min(maxX, ptr.current.x * maxX * follow));
    const destY = Math.max(-maxY, Math.min(maxY, ptr.current.y * maxY * follow));
    easing.damp3(m.position, [destX, destY, 0], 0.13, delta);
    easing.dampE(m.rotation, [0, ptr.current.x * 0.08, ptr.current.y * 0.06], 0.2, delta);
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 96, 64]} />
      <MeshTransmissionMaterial
        ior={ior}
        thickness={thickness}
        chromaticAberration={chromaticAberration}
        anisotropy={anisotropy}
        transmission={1}
        roughness={0}
        samples={6}
        resolution={512}
        distortion={0.15}
        distortionScale={0.4}
        temporalDistortion={0.08}
        color="#ffffff"
      />
    </mesh>
  );
}

export default function LensGlass(props: LensGlassProps) {
  const cfg = {
    ior: props.ior ?? 1.15,
    thickness: props.thickness ?? 3.5,
    chromaticAberration: props.chromaticAberration ?? 0.1,
    anisotropy: props.anisotropy ?? 0.02,
    follow: props.follow ?? 1,
  };
  const wrap = useRef<HTMLDivElement>(null);
  const ptr = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  // 窗口级指针 → 整页归一化坐标（-1..1，超出页缘再放宽到 ±1.35）
  // 镜头全画布范围跟随，指针停哪里镜头就追到哪
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const nx = ((e.clientX / window.innerWidth) - 0.5) * 2;
      const ny = ((e.clientY / window.innerHeight) - 0.5) * 2;
      ptr.current.x = Math.max(-1.35, Math.min(1.35, nx));
      ptr.current.y = Math.max(-1.35, Math.min(1.35, ny));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const t = window.setTimeout(() => setReady(true), 80); // 等布局稳定再淡入
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div ref={wrap} className="lensglass" data-ready={ready ? '' : undefined} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 15 }}
        gl={{ alpha: true, antialias: true, toneMapping: 0 /* NoToneMapping */ }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 6, 8]} intensity={1.1} />
        <Backdrop />
        <Lens {...cfg} ptr={ptr} />
      </Canvas>
      <style>{`
        .lensglass { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.7s ease; }
        .lensglass[data-ready] { opacity: 1; }
        .lensglass canvas { display: block; }
      `}</style>
    </div>
  );
}
