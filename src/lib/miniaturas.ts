import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createAvatar } from "@/lib/personagensCast";

/**
 * Uma miniatura de cada criatura para a Sala de Espera, na pose de pé e com a
 * cor original.
 *
 * Geradas **uma vez**, num renderizador próprio de 200 px que morre ao
 * terminar — não são imagens guardadas no repositório porque o desenho é
 * procedural, e uma imagem fixa divergiria dele na primeira mudança. Cada uma
 * vira um `blob:` URL: data URL dentro de `background-image` inline quebra no
 * `;`. Quem chama devolve os URLs com `URL.revokeObjectURL`.
 */

const TAMANHO = 200;

/** Cede o quadro ao navegador entre uma criatura e outra, para a página não
 *  travar enquanto as seis são desenhadas. */
const respirar = () => new Promise<void>((ok) => setTimeout(ok, 0));

export async function gerarMiniaturas(estilos: readonly string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const canvas = document.createElement("canvas");
  const gl = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    // `toBlob` lê depois do quadro; sem isto o buffer já foi limpo.
    preserveDrawingBuffer: true,
  });
  gl.setPixelRatio(1);
  gl.setSize(TAMANHO, TAMANHO, false);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.8;

  const pmrem = new THREE.PMREMGenerator(gl);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const cena = new THREE.Scene();
  cena.environment = ambiente;
  cena.add(new THREE.HemisphereLight(0xfff1e0, 0x3a2c22, 0.5));
  const sol = new THREE.DirectionalLight(0xffe6c8, 1.4);
  sol.position.set(2.5, 4, 3);
  cena.add(sol);
  const contorno = new THREE.DirectionalLight(0x9fe8d8, 1.3);
  contorno.position.set(-3, 2.5, -3);
  cena.add(contorno);

  // Do peito para cima: é o rosto e o acessório que distinguem uma criatura.
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20);
  /** Altura, em metros, do trecho que cabe no quadro. */
  const TRECHO = 0.85;
  const distancia = TRECHO / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

  try {
    for (const estilo of estilos) {
      const avatar = createAvatar(THREE, { style: estilo });
      avatar.applyPose("emPe");
      cena.add(avatar.group);
      // Enquadra pelo topo real de cada criatura (chifre, folhas, chapéu têm
      // alturas diferentes) e pelo centro dela em X, para não sair cortada
      // nem fora do meio.
      const caixa = new THREE.Box3().setFromObject(avatar.group);
      const centroX = (caixa.min.x + caixa.max.x) / 2;
      const alvoY = caixa.max.y - TRECHO / 2 + 0.06;
      camera.position.set(centroX + distancia * 0.3, alvoY + 0.05, distancia * 0.95);
      camera.lookAt(centroX, alvoY, 0);
      gl.render(cena, camera);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (blob) urls.set(estilo, URL.createObjectURL(blob));
      cena.remove(avatar.group);
      avatar.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      await respirar();
    }
  } finally {
    ambiente.dispose();
    pmrem.dispose();
    gl.dispose();
    gl.forceContextLoss();
  }
  return urls;
}
