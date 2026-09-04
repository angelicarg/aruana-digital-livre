import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/** Comandos de andar vindos da interface (botões de toque). O teclado é lido
 *  direto no listener; isto existe para o celular, que não tem tecla.
 *  Objeto mutável de propósito: é lido a cada quadro, e passar por estado do
 *  React causaria uma re-renderização por frame. */
export const controleSala = { frente: 0, lado: 0 };

// A sala tem 9 x 7,5 m. O passeio para meio metro das paredes: encostar o olho
// no vidro atravessa o plano e mostra o lado de fora da geometria.
const LIMITE = { x: 4.0, z: 3.2 };
const ALTURA_OLHOS = 1.6;
const VELOCIDADE = 2.2; // m/s — passo de caminhada tranquila
const PITCH_MAX = Math.PI / 3;

// Blender é Z para cima, glTF é Y para cima: o exportador converte (x, y, z) em
// (x, z, -y). Estas posições vêm das luminárias do script e já estão convertidas.
const LUMINARIAS: [number, number, number][] = [
  [-3, 2.85, 0.94],
  [0, 2.85, 0.94],
  [3, 2.85, 0.94],
];

// O sol está baixo e do lado do vidro (-Z), que é para onde a paisagem aparece.
const SOL: [number, number, number] = [-26, 3.2, -38];

const CIMA = new THREE.Vector3(0, 1, 0);

type EventoIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** O aparelho tem sensor de orientação? Chamar só depois de montado: no servidor
 *  não existe `window`.
 *
 *  A presença de `DeviceOrientationEvent` não basta — o Chrome de desktop também
 *  a expõe, e lá o botão apareceria sem fazer nada. O ponteiro grosso é o que
 *  separa aparelho de mão de computador com mouse. */
export function temGiroscopio() {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Pede acesso ao sensor. Precisa ser chamada de dentro do gesto do usuário:
 *  desde o iOS 13 o Safari só abre o aviso do sistema durante o toque, e uma
 *  chamada fora dele é negada sem nada aparecer na tela. */
export async function pedirGiroscopio(): Promise<boolean> {
  const Evento = window.DeviceOrientationEvent as EventoIOS | undefined;
  if (!Evento) return false;
  if (typeof Evento.requestPermission !== "function") return true; // Android: livre
  try {
    return (await Evento.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Orientação do aparelho para quatérnio, no referencial da cena.
 *  A conversão é a do antigo DeviceOrientationControls do three: os ângulos do
 *  sensor têm o zero apontando para o chão, e a tela pode estar girada. */
const ZEE = new THREE.Vector3(0, 0, 1);
const EULER = new THREE.Euler();
const Q0 = new THREE.Quaternion();
const Q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // -90° em X
const Q_DESVIO = new THREE.Quaternion();

function orientacaoParaQuaternio(
  destino: THREE.Quaternion,
  alfa: number,
  beta: number,
  gama: number,
  tela: number,
) {
  EULER.set(beta, alfa, -gama, "YXZ");
  destino.setFromEuler(EULER);
  destino.multiply(Q1);
  destino.multiply(Q0.setFromAxisAngle(ZEE, -tela));
}

function Sala() {
  const { scene } = useGLTF("/modelos/sala-yoga.glb", "/draco/");

  const pronta = useMemo(() => {
    const copia = scene.clone(true);
    copia.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      malha.castShadow = false;
      malha.receiveShadow = false;

      const mat = malha.material as THREE.MeshPhysicalMaterial;
      // O vidro veio com transmissão de verdade, que obriga o three a renderizar
      // a cena de novo num buffer a cada quadro. Num celular isso derruba o
      // quadro pela metade, e para uma janela a transparência simples é
      // indistinguível — atrás dela há paisagem, não refração de interesse.
      if (mat?.transmission > 0) {
        mat.transmission = 0;
        mat.transparent = true;
        mat.opacity = 0.16;
        mat.depthWrite = false;
      }
    });
    return copia;
  }, [scene]);

  return <primitive object={pronta} />;
}

/** Olhar e andar em primeira pessoa. Controle orbital não serve aqui: ele gira
 *  em torno de um ponto e deixa o visitante sair pela parede. */
function Navegacao({ giroscopio }: { giroscopio: boolean }) {
  const { camera, gl } = useThree();
  const giro = useRef({ yaw: 0, pitch: 0 });
  const teclas = useRef(new Set<string>());
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const sensor = useRef<{ alfa: number; beta: number; gama: number } | null>(null);
  const desvioTela = useRef(0);

  useEffect(() => {
    camera.position.set(0, ALTURA_OLHOS, 1.2);
    camera.rotation.order = "YXZ";

    const tela = gl.domElement;
    tela.style.touchAction = "none";

    const pegar = (e: PointerEvent) => {
      arrasto.current = { x: e.clientX, y: e.clientY };
      tela.setPointerCapture(e.pointerId);
    };
    const mover = (e: PointerEvent) => {
      const a = arrasto.current;
      if (!a) return;
      // Sinal somando, não subtraindo: o arrasto agarra a cena e puxa, como no
      // controle orbital e no mapa. Subtraindo dava mira de jogo em primeira
      // pessoa — arrastar para a direita olhava para a direita —, que é o
      // contrário do que a mão espera aqui.
      giro.current.yaw += (e.clientX - a.x) * 0.0045;
      giro.current.pitch += (e.clientY - a.y) * 0.0045;
      giro.current.pitch = THREE.MathUtils.clamp(giro.current.pitch, -PITCH_MAX, PITCH_MAX);
      arrasto.current = { x: e.clientX, y: e.clientY };
    };
    const soltar = (e: PointerEvent) => {
      arrasto.current = null;
      if (tela.hasPointerCapture(e.pointerId)) tela.releasePointerCapture(e.pointerId);
    };

    // Setas rolariam a página e W/A/S/D digitariam em qualquer campo. Como a
    // experiência ocupa a tela inteira e não tem campo de texto, prender no
    // window é seguro — e é o que faz o teclado funcionar sem exigir um clique
    // antes, que é o que trava quem navega só por teclado.
    const NAVEGACAO = new Set([
      "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d",
    ]);
    const desce = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!NAVEGACAO.has(k)) return;
      e.preventDefault();
      teclas.current.add(k);
    };
    const sobe = (e: KeyboardEvent) => teclas.current.delete(e.key.toLowerCase());
    const limpar = () => teclas.current.clear();

    tela.addEventListener("pointerdown", pegar);
    tela.addEventListener("pointermove", mover);
    tela.addEventListener("pointerup", soltar);
    tela.addEventListener("pointercancel", soltar);
    window.addEventListener("keydown", desce);
    window.addEventListener("keyup", sobe);
    window.addEventListener("blur", limpar);

    return () => {
      tela.removeEventListener("pointerdown", pegar);
      tela.removeEventListener("pointermove", mover);
      tela.removeEventListener("pointerup", soltar);
      tela.removeEventListener("pointercancel", soltar);
      window.removeEventListener("keydown", desce);
      window.removeEventListener("keyup", sobe);
      window.removeEventListener("blur", limpar);
    };
  }, [camera, gl]);

  // Sensor de orientação. Só escuta quando ligado: o evento dispara dezenas de
  // vezes por segundo e consome bateria mesmo sem ninguém usar.
  useEffect(() => {
    if (!giroscopio) {
      sensor.current = null;
      return;
    }

    const aoGirar = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      sensor.current = {
        alfa: THREE.MathUtils.degToRad(e.alpha),
        beta: THREE.MathUtils.degToRad(e.beta),
        gama: THREE.MathUtils.degToRad(e.gamma),
      };
    };
    const aoVirarTela = () => {
      const ang = window.screen?.orientation?.angle ?? 0;
      desvioTela.current = THREE.MathUtils.degToRad(ang);
    };

    aoVirarTela();
    window.addEventListener("deviceorientation", aoGirar);
    window.screen?.orientation?.addEventListener("change", aoVirarTela);
    return () => {
      window.removeEventListener("deviceorientation", aoGirar);
      window.screen?.orientation?.removeEventListener("change", aoVirarTela);
    };
  }, [giroscopio]);

  useFrame((_, delta) => {
    const t = teclas.current;
    const frente =
      (t.has("w") || t.has("arrowup") ? 1 : 0) -
      (t.has("s") || t.has("arrowdown") ? 1 : 0) +
      controleSala.frente;
    const lado =
      (t.has("d") || t.has("arrowright") ? 1 : 0) -
      (t.has("a") || t.has("arrowleft") ? 1 : 0) +
      controleSala.lado;

    const s = sensor.current;
    if (giroscopio && s) {
      // O sensor manda; o arrasto vira ajuste fino por cima dele. Sem somar o
      // desvio, quem começa de costas para a paisagem precisaria girar o corpo
      // para achá-la, e ninguém faz isso sentado.
      orientacaoParaQuaternio(camera.quaternion, s.alfa, s.beta, s.gama, desvioTela.current);
      camera.quaternion.premultiply(Q_DESVIO.setFromAxisAngle(CIMA, giro.current.yaw));
    } else {
      camera.rotation.set(giro.current.pitch, giro.current.yaw, 0);
    }

    if (frente || lado) {
      // Anda no plano do chão, na direção em que a câmera realmente olha —
      // lida do quatérnio, não do estado do arrasto, porque com o giroscópio
      // ligado quem define o rumo é o aparelho. Zerar o Y impede decolar
      // quando se olha para cima.
      const passo = Math.min(delta, 0.05) * VELOCIDADE;
      const paraFrente = camera.getWorldDirection(new THREE.Vector3());
      paraFrente.y = 0;
      if (paraFrente.lengthSq() > 1e-6) {
        paraFrente.normalize();
        const paraLado = new THREE.Vector3().crossVectors(paraFrente, CIMA).normalize();
        const soma = paraFrente.multiplyScalar(frente).add(paraLado.multiplyScalar(lado));
        if (soma.lengthSq() > 0) camera.position.addScaledVector(soma.normalize(), passo);
      }

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -LIMITE.x, LIMITE.x);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -LIMITE.z, LIMITE.z);
      camera.position.y = ALTURA_OLHOS;
    }
  });

  return null;
}

export function CenaSala({ giroscopio }: { giroscopio: boolean }) {
  return (
    <>
      <Sky sunPosition={SOL} turbidity={6} rayleigh={3.4} mieCoefficient={0.005} mieDirectionalG={0.8} />
      {/* A névoa dá profundidade às montanhas, que sem ela ficam recortadas e
          chapadas contra o céu. Começa longe: dentro da sala não deve aparecer. */}
      <fog attach="fog" args={["#c98d5e", 30, 190]} />

      {/* O sol do Blender não vem no .glb — mundo e luzes ficam fora do formato.
          Estas reproduzem a iluminação do render: sol baixo e quente entrando
          pelo vidro, mais as três luminárias do teto. */}
      <directionalLight position={SOL} intensity={3.4} color="#ffa860" />
      <hemisphereLight args={["#bcd4f0", "#6b4a2e", 0.7]} />
      <ambientLight intensity={0.35} />

      {LUMINARIAS.map((p, i) => (
        <pointLight key={i} position={p} intensity={9} distance={9} decay={2} color="#ffcc99" />
      ))}

      {/* Iluminação por imagem, gerada em memória. É o que faz a madeira e o
          metal responderem como material em vez de cor lisa — sem ela a sala
          fica com o aspecto chapado que o render do Blender não tem. Nada de
          CDN: os refletores são geometria, e o mapa é montado no próprio
          navegador. */}
      <Environment resolution={128}>
        <Lightformer intensity={2.4} position={[-6, 2, -9]} scale={[14, 5, 1]} color="#ffb271" />
        <Lightformer intensity={1.1} position={[0, 6, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} color="#cfe0f5" />
        <Lightformer intensity={0.7} position={[7, 1.5, 4]} scale={[8, 4, 1]} color="#8fa9c4" />
      </Environment>

      <Sala />
      <Navegacao giroscopio={giroscopio} />
    </>
  );
}

useGLTF.preload("/modelos/sala-yoga.glb", "/draco/");
