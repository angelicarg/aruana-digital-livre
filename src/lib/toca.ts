// Ponto único da campanha da Toca da Madalena: subir TOCA_PORTAS_ABERTAS a cada revelação.
// Um ambiente fechado não leva nome nem imagem no HTML (ver TocaPortas), para não estragar o mistério.
export const TOCA_PORTAS_ABERTAS: number = 1; // 0 a 6
export const TOCA_MADALENA_REVELADA: boolean = false;

export const TOCAS = [
  { slug: "tempo", nome: "Sala do Tempo", linha: "Foco e redação. A lanterna acende quando você senta.", pista: "Tem uma lanterna e uma ampulheta." },
  { slug: "biblioteca", nome: "Biblioteca", linha: "Leituras e redações do Inep para estudar de perto.", pista: "Cheira a livro antigo." },
  { slug: "questoes", nome: "Casa das Questões", linha: "Questões do ENEM, uma de cada vez.", pista: "Tem uma ponte de corda." },
  { slug: "refugio", nome: "Meu Refúgio", linha: "Seu plano até o dia da prova.", pista: "Um mural cheio de bilhetes." },
  { slug: "jardim", nome: "Jardim", linha: "Pausa sem culpa, à beira da lagoa.", pista: "Dá para ouvir água correndo." },
  { slug: "pico", nome: "Pico das Conquistas", linha: "O caminho que você já fez.", pista: "Fica lá no alto." },
] as const;

export const portaAberta = (i: number) => i < TOCA_PORTAS_ABERTAS;

export function contagemPortas() {
  if (TOCA_PORTAS_ABERTAS === 0) return "Todos os ambientes fechados";
  if (TOCA_PORTAS_ABERTAS >= 6) return "Seis ambientes abertos";
  return `${TOCA_PORTAS_ABERTAS} de 6 ambientes abertos`;
}
