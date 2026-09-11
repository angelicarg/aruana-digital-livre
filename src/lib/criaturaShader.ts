import * as THREE from "three";

/**
 * O remendo de shader das criaturas e do professor.
 *
 * Faz duas coisas que o material padrão não faz, e as duas existem porque os
 * modelos vêm gerados por IA, sem esqueleto e com a cor assada na textura:
 *
 * 1. **Dobra o pescoço** — gira o que está acima de uma altura em torno de um
 *    pivô, com o peso subindo suave numa faixa, então o capuz/cabeça dobra em
 *    vez de rasgar. Serve para giro pequeno (até ~25°).
 * 2. **Troca a cor do corpo** — leva para outra matiz só os texels dentro de
 *    uma janela de matiz (o azul do corpo), preservando claro e escuro. É o que
 *    permite **uma malha só servir a todo mundo**, com um tom por pessoa: a
 *    cabeça creme e o emblema branco ficam de fora por não serem azuis.
 *
 * Sem isto, duas pessoas que escolhem a mesma criatura seriam idênticas — e a
 * cor é identidade aqui: o nome de quem fala no chat usa a mesma cor do corpo.
 */

/** Janela de matiz tratada como "corpo" (o azul do modelo), em volta de 0..1. */
const JANELA = { de: 0.5, ate: 0.74 };

export type UniformesCriatura = {
  uGiro: { value: number };
  uInclina: { value: number };
  uPescoco: { value: number };
  uFaixa: { value: number };
  uMatiz: { value: number };
  uSatura: { value: number };
  uLuz: { value: number };
  uTroca: { value: number };
  uSaturacao: { value: number };
  uClareia: { value: number };
};

const GLSL_VERTEX = /* glsl */ `
uniform float uGiro;
uniform float uInclina;
uniform float uPescoco;
uniform float uFaixa;
mat3 dobraPescoco(float y) {
  float w = smoothstep(uPescoco - uFaixa, uPescoco + uFaixa, y);
  float a = uGiro * w;
  float b = uInclina * w;
  mat3 inclina = mat3(1.0, 0.0, 0.0,  0.0, cos(b), sin(b),  0.0, -sin(b), cos(b));
  mat3 gira = mat3(cos(a), 0.0, -sin(a),  0.0, 1.0, 0.0,  sin(a), 0.0, cos(a));
  return gira * inclina;
}
`;

const GLSL_FRAGMENT = /* glsl */ `
uniform float uMatiz;
uniform float uSatura;
uniform float uLuz;
uniform float uTroca;
uniform float uSaturacao;
uniform float uClareia;
vec3 paraHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 paraRgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

function trechoTroca(janela: { de: number; ate: number }) {
  return /* glsl */ `
  if (uTroca > 0.001) {
    vec3 hsv = paraHsv(diffuseColor.rgb);
    float dentro = smoothstep(${janela.de.toFixed(3)} - 0.04, ${janela.de.toFixed(3)} + 0.03, hsv.x)
                 * (1.0 - smoothstep(${janela.ate.toFixed(3)} - 0.03, ${janela.ate.toFixed(3)} + 0.04, hsv.x))
                 * smoothstep(0.09, 0.17, hsv.y);
    vec3 trocada = paraRgb(vec3(uMatiz, clamp(hsv.y * uSatura, 0.0, 1.0), clamp(hsv.z * uLuz, 0.0, 1.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, trocada, dentro * uTroca);
  }
  float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, uSaturacao);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), uClareia);
  `;
}

/**
 * Instala o remendo nos materiais e devolve os uniforms que a cena move por
 * quadro. Os materiais precisam ser **clonados por pessoa**: o cache do
 * `useGLTF` é compartilhado, e um uniform mexido aqui vazaria para todo mundo.
 */
export function vestirCriatura(
  materiais: THREE.Material[],
  opcoes: {
    /** Altura do pivô e largura da faixa de dobra, em metros do modelo. */
    pescoco?: { altura: number; faixa: number };
    /** Matiz alvo (0..1) e os fatores de saturação e claridade sobre o original. */
    cor?: { matiz: number; satura: number; luz: number };
    /** Ajuste geral de cor, usado pelo professor para suavizar o rosa. */
    ajuste?: { saturacao: number; clareia: number };
    /** Chave do programa: materiais com remendos diferentes não podem dividir
     *  o mesmo programa compilado. */
    chave: string;
  },
): UniformesCriatura {
  const u: UniformesCriatura = {
    uGiro: { value: 0 },
    uInclina: { value: 0 },
    uPescoco: { value: opcoes.pescoco?.altura ?? 1e9 },
    uFaixa: { value: opcoes.pescoco?.faixa ?? 1 },
    uMatiz: { value: opcoes.cor?.matiz ?? 0 },
    uSatura: { value: opcoes.cor?.satura ?? 1 },
    uLuz: { value: opcoes.cor?.luz ?? 1 },
    uTroca: { value: opcoes.cor ? 1 : 0 },
    uSaturacao: { value: opcoes.ajuste?.saturacao ?? 1 },
    uClareia: { value: opcoes.ajuste?.clareia ?? 0 },
  };

  for (const m of materiais) {
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${GLSL_VERTEX}`)
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nobjectNormal = dobraPescoco(position.y) * objectNormal;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec3 pivoPescoco = vec3(0.0, uPescoco, 0.0);
          transformed = dobraPescoco(position.y) * (transformed - pivoPescoco) + pivoPescoco;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${GLSL_FRAGMENT}`)
        .replace("#include <map_fragment>", `#include <map_fragment>\n${trechoTroca(JANELA)}`);
    };
    m.customProgramCacheKey = () => opcoes.chave;
  }

  return u;
}
