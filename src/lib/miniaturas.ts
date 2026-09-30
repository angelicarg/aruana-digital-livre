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

  // Da cintura para cima: é o rosto e o acessório que distinguem uma criatura.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0.35, 1.36, 1.1);
  camera.lookAt(0, 1.16, 0);

  try {
    for (const estilo of estilos) {
      const avatar = createAvatar(THREE, { style: estilo });
      avatar.applyPose("emPe");
      cena.add(avatar.group);
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
