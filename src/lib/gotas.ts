import * as THREE from "three";

/**
 * Gotas escorrendo no vidro.
 *
 * É a parte que vende "estou dentro olhando para fora" — a chuva do lado de
 * fora prova que chove, a gota no vidro prova que **há um vidro**.
 *
 * ## Por que posição de mundo, e não UV
 *
 * O pano de vidro são três caixas do Blender, e caixa não tem UV confiável: a
 * mesma imagem estica diferente em cada face (é a armadilha que já obrigou o
 * `uv_metrico()` no script da sala). Aqui a coordenada da gota sai da **posição
 * de mundo** projetada em dois eixos:
 *
 * - vertical: a altura, direto;
 * - horizontal: a projeção na tangente do pano, `cross(cima, normal)`.
 *
 * Com isso as três faces compartilham a mesma escala em metros de graça, e a
 * gota do vidro da esquerda tem o mesmo tamanho da do vidro da frente sem que
 * ninguém precise acertar UV nenhuma. O preço é uma guarda: a caixa tem topo e
 * base horizontais, onde a tangente degenera — ali a máscara é zerada pelo
 * `verticalidade`.
 *
 * ## Duas camadas, e só uma é movimento
 *
 * - **paradas**: o embaçado de condensação, gotinhas que ficam onde estão;
 * - **correndo**: as que descem deixando rastro.
 *
 * A separação não é estética, é acessibilidade: sob movimento reduzido
 * `uEscorrer` vai a zero e **só as paradas continuam**. O vidro continua
 * molhado, nada se desloca. Mesma tese de [[movimento_reduzido]]: cortar o que
 * desloca, não o que muda de valor.
 */

const COMUM = /* glsl */ `
  uniform float uTempo;
  uniform float uIntensidade;  // 0 a 1, acompanha a troca de clima
  uniform float uEscorrer;     // 0 sob movimento reduzido
  varying vec3 vPosGota;
  varying vec3 vNorGota;

  float hashGota(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  /** Devolve (deslocamento.x, deslocamento.y, mascara). O deslocamento e a
   *  direcao do centro da gota, usada depois para inclinar a normal — e a
   *  inclinacao que faz o sol acender a borda e a gota virar volume em vez de
   *  mancha. */
  /** Condensacao: as que ficam. Duas oitavas de propriedade — chuva real nao
   *  tem gota de tamanho unico, e uma grade so de gota media le como textura
   *  salpicada, que foi exatamente o erro da primeira versao. */
  vec3 umaCamadaParada(vec2 p, float corte, float raioBase) {
    vec2 cel = floor(p);
    vec2 f = fract(p);
    float r = hashGota(cel);
    vec2 centro = vec2(0.22 + hashGota(cel + 11.3) * 0.56,
                       0.22 + hashGota(cel + 23.7) * 0.56);
    // O raio varia com o proprio sorteio: gota grande e rara, pequena e comum.
    float raio = raioBase * (0.45 + r * 0.85);
    vec2 d = f - centro;
    // step no lugar de if: nem toda celula tem gota, e ramo em shader custa
    // mais que a multiplicacao que ele evitaria.
    float m = smoothstep(raio, raio * 0.35, length(d)) * step(corte, r);
    return vec3(d * m, m);
  }

  vec3 gotasParadas(vec2 p) {
    // Poucas grandes, muitas pequenas. O corte alto na primeira e o que impede
    // o vidro de virar chapa de bolinhas.
    vec3 grandes = umaCamadaParada(p, 0.74, 0.20);
    vec3 miudas = umaCamadaParada(p * 2.7 + 31.4, 0.52, 0.16);
    vec3 g = grandes.z > miudas.z * 0.62 ? grandes : miudas * vec3(1.0, 1.0, 0.62);
    return g;
  }

  vec3 gotasCorrendo(vec2 p, float t) {
    float col = floor(p.x);
    float fx = fract(p.x);
    float r = hashGota(vec2(col, 3.7));

    // Nem toda coluna tem gota descendo. Uma por coluna em todas as colunas e o
    // que fazia a chuva no vidro parecer cortina em vez de gota solta.
    float colAtiva = step(0.55, hashGota(vec2(col, 91.2)));

    // Cada coluna desce com velocidade e fase propria. Uma velocidade so faz o
    // pano inteiro andar junto, que le como textura rolando e nao como chuva.
    float vel = 0.55 + r * 0.95;
    // Somar o tempo faz o padrao descer: a feicao de yy constante exige p.y
    // menor conforme t cresce.
    float yy = p.y * 0.42 + t * vel * 0.42 + r * 27.1;
    float linha = floor(yy);
    float fy = fract(yy);
    float r2 = hashGota(vec2(col, linha));

    float existe = step(0.42, r2) * colAtiva;
    float cx = 0.25 + r2 * 0.5;
    float raio = 0.07 + r2 * 0.10;

    // A cabeca fica baixa na celula (0,30), nao no meio: os 70% que sobram
    // acima sao o rastro. Com a cabeca em 0,72 o rastro tinha 9 cm, curto
    // demais para ler como rastro — lia como respingo.
    // Achatar o eixo vertical alonga a gota na direcao da queda: gota que
    // escorre nao e redonda.
    vec2 d = vec2(fx - cx, (fy - 0.30) * 0.55);
    float cabeca = smoothstep(raio, raio * 0.3, length(d));

    // Rastro: fica ACIMA da cabeca, porque e por onde ela ja passou. Estreita
    // e some subindo, e nunca chega ao brilho da cabeca.
    float rastro =
      smoothstep(0.026, 0.004, abs(fx - cx)) *
      smoothstep(1.0, 0.30, fy) *
      step(0.30, fy) * 0.55;

    float m = max(cabeca, rastro) * existe;
    return vec3(d * cabeca * existe, m);
  }
`;

const VERTICE_POS = /* glsl */ `
  vPosGota = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const VERTICE_NOR = /* glsl */ `
  vNorGota = normalize(mat3(modelMatrix) * objectNormal);
`;

/** Densidade: células por metro. A 5,2 a célula tem ~19 cm, e a gota grande
 *  fica com ~3 cm — perto do tamanho de uma gota de verdade num vidro. */
const ESCALA = 5.2;

const FRAGMENTO_MASCARA = /* glsl */ `
  vec3 gGota = vec3(0.0);
  // Ramo por uniform, nao por fragmento: ou o pano inteiro esta seco ou nao
  // esta, entao a decisao e a mesma para todos os fragmentos do grupo e a GPU
  // nao paga divergencia. Ao por do sol — que e o clima padrao — isso pula tres
  // camadas de hash em cada pixel de vidro na tela.
  if (uIntensidade > 0.002) {
    vec3 n = normalize(vNorGota);
    // A caixa do vidro tem topo e base horizontais, onde cross(cima, n)
    // degenera. Zerar ali e mais barato que tratar o caso.
    float verticalidade = smoothstep(0.55, 0.85, 1.0 - abs(n.y));
    vec3 tangente = normalize(cross(vec3(0.0, 1.0, 0.0), n) + vec3(1e-5));
    vec2 p = vec2(dot(vPosGota, tangente), vPosGota.y) * ${ESCALA.toFixed(1)};

    vec3 paradas = gotasParadas(p);
    vec3 correndo = gotasCorrendo(p, uTempo) * uEscorrer;
    // max e nao soma: onde as duas coincidem, somar estoura a mascara e vira
    // um borrao branco em vez de duas gotas.
    gGota = paradas.z > correndo.z ? paradas : correndo;
    gGota.z *= uIntensidade * verticalidade;
  }
`;

/** Inclina a normal na direcao do centro da gota. E o que faz o sol baixo
 *  acender a borda: sem isso a gota e uma mancha clara, com isso e volume. */
const FRAGMENTO_NORMAL = /* glsl */ `
  normal = normalize(normal + vec3(gGota.xy, 0.0) * 2.6 * gGota.z);
`;

/** Onde a gota esta, o vidro deixa de ser quase invisivel: agua espalha luz.
 *  Subir a opacidade e o que separa a gota do fundo — mexer so na cor nao
 *  aparece num material de opacidade 0,16. */
const FRAGMENTO_COR = /* glsl */ `
  diffuseColor.a = min(1.0, diffuseColor.a + gGota.z * 0.42);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.90, 0.93), gGota.z * 0.35);
`;

export type UniformesGota = {
  uTempo: { value: number };
  uIntensidade: { value: number };
  uEscorrer: { value: number };
};

/**
 * Devolve uma cópia do material do vidro com as gotas embutidas, e os uniforms
 * para a cena avançar por quadro.
 *
 * Cópia, e não o material original: `useGLTF` guarda a cena em cache entre
 * montagens da rota, e remendar o material de lá deixaria o remendo grudado no
 * cache — na segunda entrada na sala o `onBeforeCompile` empilharia em cima de
 * si mesmo.
 */
export function vidroComGotas(base: THREE.Material): {
  material: THREE.Material;
  uniformes: UniformesGota;
} {
  const material = base.clone();
  const uniformes: UniformesGota = {
    uTempo: { value: 0 },
    uIntensidade: { value: 0 },
    uEscorrer: { value: 1 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vPosGota;\nvarying vec3 vNorGota;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + VERTICE_POS)
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n" + VERTICE_NOR);

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + COMUM)
      // A mascara e calculada aqui e usada duas vezes depois: `color_fragment`
      // vem antes de `normal_fragment_begin` no encadeamento do three, e as
      // duas rodam dentro do mesmo main(), entao a variavel atravessa.
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + FRAGMENTO_MASCARA + FRAGMENTO_COR)
      .replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\n" + FRAGMENTO_NORMAL,
      );
  };

  // Sem isto o three reaproveita o programa ja compilado do material de origem
  // e o onBeforeCompile nunca roda.
  material.customProgramCacheKey = () => "vidro-com-gotas";
  material.needsUpdate = true;

  return { material, uniformes };
}
