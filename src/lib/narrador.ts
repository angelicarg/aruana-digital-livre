/**
 * Narração da sessão pela voz do próprio sistema (Web Speech API).
 *
 * Sem arquivo de áudio, sem serviço externo e funciona offline. É também o que
 * permite fazer a sessão de olhos fechados — e, para quem não enxerga a tela, é
 * a diferença entre a experiência existir e não existir.
 */

export function temNarrador() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Cadência de instrutor, não de leitor de tela: mais lenta e um pouco mais grave
// que o padrão. Acima disto a voz atropela a respiração que ela está guiando.
const RITMO = 0.85;
const TOM = 0.92;
const VOLUME = 0.85;

/** A voz em português mais adequada disponível no aparelho. */
function escolherVoz(vozes: SpeechSynthesisVoice[]) {
  return (
    vozes.find((v) => v.lang === "pt-BR" && v.localService) ??
    vozes.find((v) => v.lang === "pt-BR") ??
    vozes.find((v) => v.lang.startsWith("pt")) ??
    null
  );
}

export class Narrador {
  private voz: SpeechSynthesisVoice | null = null;
  private sintese: SpeechSynthesis | null =
    typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

  constructor() {
    if (!this.sintese) return;
    // getVoices costuma vir vazia na primeira chamada: o navegador carrega a
    // lista de forma assíncrona e avisa por evento. Ler só uma vez deixaria a
    // narração na voz padrão em inglês.
    const carregar = () => {
      this.voz = escolherVoz(this.sintese!.getVoices());
    };
    carregar();
    this.sintese.addEventListener?.("voiceschanged", carregar);
  }

  falar(texto: string) {
    if (!this.sintese || !texto) return;
    // Cancela o que estiver na fila: a fala anterior pertence a uma fase que já
    // passou, e enfileirar faria a narração atrasar mais a cada ciclo.
    this.sintese.cancel();

    const fala = new SpeechSynthesisUtterance(texto);
    if (this.voz) fala.voice = this.voz;
    fala.lang = this.voz?.lang ?? "pt-BR";
    fala.rate = RITMO;
    fala.pitch = TOM;
    fala.volume = VOLUME;
    this.sintese.speak(fala);
  }

  calar() {
    this.sintese?.cancel();
  }
}

/** Quanto tempo a fase precisa ter para a instrução inteira caber falada.
 *  Abaixo disso só o nome — instrução cortada no meio atrapalha mais que ajuda. */
export const SEGUNDOS_PARA_INSTRUCAO = 6;
