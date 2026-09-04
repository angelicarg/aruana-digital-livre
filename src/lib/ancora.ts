import type { MouseEvent } from "react";

// O router roda com `scrollRestoration: true`, que põe o histórico em modo
// "manual" — isso desliga a rolagem nativa de fragmento do navegador. Sem este
// handler, todo `<a href="#secao">` muda a URL e não sai do lugar.
//
// Usa `window.scrollTo` em vez de `scrollIntoView` de propósito: o primeiro é
// puro cálculo e roda mesmo com a aba em segundo plano, enquanto o segundo
// depende de layout desenhado e vira no-op em aba oculta — o que torna o
// comportamento impossível de verificar automatizado.
export function irParaAncora(id: string) {
  return (evento: MouseEvent<HTMLAnchorElement>) => {
    const alvo = document.getElementById(id);
    if (!alvo) return;

    evento.preventDefault();

    // `scroll-margin-top` do alvo é quem afasta o título do cabeçalho fixo.
    const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0;
    const topo = alvo.getBoundingClientRect().top + window.scrollY - margem;

    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: topo, behavior: semAnimacao ? "auto" : "smooth" });

    // Rolar não move o foco: sem isto, quem usa teclado ou leitor de tela
    // continua no link e o atalho "pular para o conteúdo" não pula nada
    // (WCAG 2.4.1). `preventScroll` evita que o foco brigue com a animação.
    if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1");
    alvo.focus({ preventScroll: true });

    // Mantém a URL compartilhável sem empilhar entrada no histórico a cada clique.
    history.replaceState(null, "", `#${id}`);
  };
}
