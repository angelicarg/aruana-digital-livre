import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles, Stars, MeshReflectorMaterial } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { createXRStore, XR } from "@react-three/xr";
import * as THREE from "three";
import { Volume2, VolumeX, Glasses, ArrowLeft, MessageCircle, Maximize, Minimize } from "lucide-react";

const WHATSAPP_NUMBER = "5534992086611";
const BREATH_PERIOD = 8; // segundos por ciclo inspira+expira, compartilhado entre 3D e overlay

function whatsappHref(context: string) {
  const message = `Olá! Testei a Sala de Yoga em RV da Aruanã Digital e quero saber mais. (${context})`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const Route = createFileRoute("/experiencias/sala-yoga")({
  head: () => ({
    meta: [
      { title: "Sala de Yoga em RV — Aruanã Digital" },
      {
        name: "description",
        content: "Protótipo de ambiente 3D imersivo para relaxamento e yoga guiada, navegável no navegador com ou sem headset de RV.",
      },
      // Protótipo em teste — tirar o noindex quando a experiência estiver pronta para divulgação.
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SalaYogaPage,
});

const xrStore = createXRStore();

// Frequências solfeggio — usadas em música de meditação/bem-estar, soam bem em qualquer combinação.
const CHIME_NOTES = [396.0, 417.0, 528.0, 639.0, 741.0];

function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          colorTop: { value: new THREE.Color("#0A2E29") },
          colorHorizon: { value: new THREE.Color("#051826") },
          colorBottom: { value: new THREE.Color("#010509") },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 colorTop;
          uniform vec3 colorHorizon;
          uniform vec3 colorBottom;
          varying vec3 vWorldPosition;
          void main() {
            float y = normalize(vWorldPosition).y;
            vec3 lower = mix(colorBottom, colorHorizon, smoothstep(-1.0, 0.05, y));
            vec3 sky = mix(lower, colorTop, smoothstep(0.05, 1.0, y));
            gl_FragColor = vec4(sky, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[80, 32, 32]} />
    </mesh>
  );
}

// Gera uma textura de nebulosa em canvas (gradiente radial + manchas orgânicas) — 100% procedural, sem imagem externa.
function createNebulaTexture(hue: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const cx = size / 2;
  const cy = size / 2;
  const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  base.addColorStop(0, `hsla(${hue}, 85%, 65%, 0.5)`);
  base.addColorStop(0.45, `hsla(${hue}, 80%, 55%, 0.22)`);
  base.addColorStop(1, `hsla(${hue}, 70%, 40%, 0)`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 7; i++) {
    const bx = cx + (Math.random() - 0.5) * size * 0.55;
    const by = cy + (Math.random() - 0.5) * size * 0.55;
    const r = size * (0.1 + Math.random() * 0.16);
    const blobHue = hue + (Math.random() * 30 - 15);
    const blob = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    blob.addColorStop(0, `hsla(${blobHue}, 85%, 70%, 0.32)`);
    blob.addColorStop(1, `hsla(${blobHue}, 80%, 50%, 0)`);
    ctx.fillStyle = blob;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function NebulaField() {
  const textures = useMemo(() => [createNebulaTexture(300), createNebulaTexture(185), createNebulaTexture(40)], []);

  const placements = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = 0.25 + Math.random() * 0.6; // evita o zênite/nadir puro, espalha ao redor do horizonte
      const r = 55 + Math.random() * 15;
      const pos: [number, number, number] = [
        r * Math.sin(phi * Math.PI) * Math.cos(theta),
        r * Math.cos(phi * Math.PI),
        r * Math.sin(phi * Math.PI) * Math.sin(theta),
      ];
      return { pos, scale: 20 + Math.random() * 24, tex: i % 3 };
    });
  }, []);

  return (
    <>
      {placements.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.scale, p.scale, 1]}>
          <spriteMaterial map={textures[p.tex]} transparent depthWrite={false} opacity={0.85} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  );
}

function ReflectiveFloor() {
  return (
    <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3.6, 64]} />
      <MeshReflectorMaterial
        blur={[120, 40]}
        resolution={1024}
        mixBlur={0.6}
        mixStrength={18}
        roughness={0.4}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#052E28"
        metalness={0.5}
      />
    </mesh>
  );
}

function BreathOrb() {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const wave = Math.sin((t / BREATH_PERIOD) * Math.PI * 2); // -1..1
      const s = 0.55 + (wave * 0.5 + 0.5) * 0.35; // 0.55..0.9
      ref.current.scale.setScalar(s);
      ref.current.rotation.y = t * 0.15;
    }
    if (materialRef.current) {
      // aura de energia — deriva lenta de matiz entre teal, azul e violeta suave (não passa por vermelho/verde puro, mantém o clima zen)
      const hue = 0.42 + (Math.sin(t * 0.05) * 0.5 + 0.5) * 0.16;
      materialRef.current.emissive.setHSL(hue, 0.65, 0.5);
      materialRef.current.color.setHSL(hue, 0.5, 0.62);
    }
  });
  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial ref={materialRef} emissiveIntensity={0.9} roughness={0.25} metalness={0.1} />
    </mesh>
  );
}

function SacredRing() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.z = clock.getElapsedTime() * 0.05;
  });
  const ringRotations = [0, Math.PI / 3, (2 * Math.PI) / 3];
  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {ringRotations.map((rot, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, rot]}>
          <torusGeometry args={[1.6, 0.008, 8, 96]} />
          <meshStandardMaterial
            color="#7CF0D8"
            emissive="#00CCA7"
            emissiveIntensity={1.4}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function Wisp({ position, onChime }: { position: [number, number, number]; onChime: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseY = position[1];
  const phase = useMemo(() => position[0] * 1.7, [position]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = baseY + Math.sin(clock.getElapsedTime() + phase) * 0.18;
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onChime();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.4 : 1}
    >
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color="#DFFFF6" emissive="#7CF0D8" emissiveIntensity={hovered ? 2 : 1.2} />
    </mesh>
  );
}

const WISP_POSITIONS: [number, number, number][] = [
  [-2.4, 0.3, -1.2],
  [2.1, 0.8, -1.6],
  [-1.6, 1.1, 1.8],
  [1.8, 0.2, 1.4],
  [0, 1.6, -2.4],
];

function DriftingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.02;
  });
  return <group ref={ref}>{children}</group>;
}

function Scene({ onChime }: { onChime: (freq: number) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#00CCA7", "#041B33", 0.6]} />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#7CF0D8" />
      <fog attach="fog" args={["#062A24", 9, 42]} />

      <SkyDome />
      <NebulaField />
      <Stars radius={60} depth={50} count={2500} factor={4} saturation={0} fade speed={0.4} />
      <ReflectiveFloor />
      <BreathOrb />
      <SacredRing />

      {WISP_POSITIONS.map((pos, i) => (
        <Wisp key={i} position={pos} onChime={() => onChime(CHIME_NOTES[i % CHIME_NOTES.length])} />
      ))}

      <DriftingGroup>
        <Sparkles count={90} scale={[9, 3.5, 9]} size={3} speed={0.25} color="#7CF0D8" />
      </DriftingGroup>

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={11}
        maxPolarAngle={Math.PI / 1.9}
        autoRotate
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.7} mipmapBlur />
      </EffectComposer>
    </>
  );
}

const DRONE_MAX_GAIN = 0.7; // ganho real quando o slider está em 100%

function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const [volume, setVolumeState] = useState(0.4);
  const lastVolumeRef = useRef(0.4);

  const ensureContext = () => {
    if (ctxRef.current) return ctxRef.current;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    return ctx;
  };

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const ensureDrone = () => {
    const ctx = ensureContext();
    if (droneGainRef.current) return { ctx, gain: droneGainRef.current };

    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 110;
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 110 * 1.5;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    droneGainRef.current = gain;
    return { ctx, gain };
  };

  const setVolume = (v: number) => {
    const { ctx, gain } = ensureDrone();
    if (ctx.state === "suspended") ctx.resume();
    gain.gain.setTargetAtTime(v * DRONE_MAX_GAIN, ctx.currentTime, 0.15);
    setVolumeState(v);
    if (v > 0) lastVolumeRef.current = v;
  };

  const toggleMute = () => setVolume(volume > 0 ? 0 : lastVolumeRef.current || 0.4);

  const playChime = (freq: number) => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.7);
  };

  return { volume, setVolume, toggleMute, playChime };
}

function BreathingGuide() {
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p === "in" ? "out" : "in")), (BREATH_PERIOD / 2) * 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      <div
        className="h-20 w-20 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm sm:h-24 sm:w-24"
        style={{ animation: `breathe ${BREATH_PERIOD}s ease-in-out infinite` }}
      />
      <span className="text-sm font-medium tracking-wide text-white/80">
        {phase === "in" ? "Inspire..." : "Expire..."}
      </span>
    </div>
  );
}

function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [ref]);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      ref.current?.requestFullscreen().catch(() => {});
    }
  };

  return { isFullscreen, toggle };
}

function SalaYogaPage() {
  const [mounted, setMounted] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  const { volume, setVolume, toggleMute, playChime } = useAmbientAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  useEffect(() => {
    setMounted(true);
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden bg-[#041B33]">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(0.8); }
          50% { transform: scale(1.35); }
        }
      `}</style>

      {mounted && (
        <Canvas camera={{ position: [0, 1.4, 6.5], fov: 55 }} dpr={[1, 2]}>
          <XR store={xrStore}>
            <Suspense fallback={null}>
              <Scene onChime={playChime} />
            </Suspense>
          </XR>
        </Canvas>
      )}

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <a
            href="/"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Início
          </a>
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
              <button
                onClick={toggleMute}
                aria-label={volume > 0 ? "Silenciar som ambiente" : "Ativar som ambiente"}
                className="text-white/90"
              >
                {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Volume do som ambiente"
                className="h-1 w-20 accent-[#00CCA7]"
              />
            </div>
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/90 backdrop-blur-sm transition hover:bg-black/50"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            {xrSupported && (
              <button
                onClick={() => xrStore.enterVR()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#00CCA7] px-3 py-1.5 text-xs font-semibold text-[#041B33] transition hover:brightness-105"
              >
                <Glasses className="h-3.5 w-3.5" /> Entrar em RV
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-none flex flex-col items-center gap-4 pb-2">
          <BreathingGuide />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-sm font-semibold tracking-wide text-white/90 sm:text-base">
            Sala de Yoga &amp; Relaxamento — protótipo Aruanã Digital
          </h1>
          <p className="max-w-md text-xs text-white/60">
            Arraste para olhar ao redor e clique nos pontos de luz para tocar um sino. Funciona em qualquer
            aparelho — com headset, é imersão completa.
          </p>
          <a
            href={whatsappHref("Sala de Yoga - protótipo RV")}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Quero isso para minha empresa
          </a>
        </div>
      </div>
    </div>
  );
}
