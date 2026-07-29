# BRAND.md — Regras permanentes da marca Aruanã Digital

Estas regras valem para o site, as redes sociais, as peças de marketing e qualquer
material publicado em nome da Aruanã Digital. Decididas em 26/07/2026; este arquivo
é a referência canônica — qualquer peça que conflite com ele está errada.

## Regras permanentes

1. **Nunca** publicar depoimento, nome de cliente ou resultado numérico de terceiro
   que não seja real e autorizado por escrito.
2. **Nunca** apresentar os projetos de demonstração como clientes. O rótulo padrão é:
   *"Projeto de demonstração — empresa fictícia, software real."*
3. **Nunca** publicar estatística sem fonte verificável e citada.
4. **Nunca** regenerar o logo por IA — usar sempre o arquivo master, colado.
   Versões antigas circularam com a assinatura corrompida ("EDUCAÇÃD"); por isso o
   logo atual não tem dizeres e o nome vai sempre em texto real ao lado do símbolo.
5. **Nunca** expor pessoas da equipe nominalmente: a empresa fala pelo **Aru** em
   todas as redes. É permitido citar a equipe de forma genérica ("nossa equipe tem
   especialistas em acessibilidade", "análise feita por especialistas"), sem nome,
   sem foto e sem cargo que identifique alguém.
6. **Nunca** usar a Aruanã (nem "agência web" como segmento) como exemplo ilustrativo
   dentro de conteúdo educativo. A oferta entra no final, claramente separada do
   conteúdo (separador + bloco próprio).
7. Acessibilidade não é item opcional de orçamento — é o padrão, e o próprio site é
   a primeira prova disso.

## Quem é o Aru

O Aru é o porta-voz da marca (regra 5). Até 28/07/2026 nada disto estava escrito, e
cada ferramenta inventava um Aru diferente — esta seção existe para que qualquer
pessoa ou IA produza o mesmo personagem.

**Quem ele é:** personagem masculino, jovem adulto. Entende de tecnologia e gosta de
explicar, mas não é técnico arrogante nem vendedor animado.

**Como ele fala:** como um vizinho prestativo que por acaso entende de internet.
Confiança tranquila em vez de empolgação. Explica sem fazer ninguém se sentir burro.
Não promete milagre, não usa superlativo, não pressiona.

**O que ele nunca é:** eufórico, sarcástico, condescendente, "vendedor". O público é
dono de pequeno negócio que já foi enrolado por agência — o Aru precisa soar
confiável, não animado.

Descrição canônica para ferramentas de IA (usar sempre esta, em inglês):

> Warm, grounded and genuinely helpful. Speaks to the viewer like a friendly neighbour
> who happens to understand technology — never salesy, never condescending, never
> hyped. Quiet confidence instead of excitement: small smiles between phrases, calm
> nods, attentive eye contact. Patient and clear, the kind of character who explains
> something without ever making you feel behind.

Evitar as palavras *excited*, *energetic* e *enthusiastic* no prompt: elas produzem
gesticulação larga e sorriso permanente, que é o cacoete de mascote de propaganda.

**Aparência:** vem sempre dos arquivos oficiais em
`https://aruanadigital.com/marca/` (apontando, joia, de frente). **Nunca descrever o
Aru por texto** para gerar imagem — sai um personagem diferente a cada vez. Novas
poses partem dessas referências.

**Voz:** a **voz clonada do Aru no Runable**. Oficial desde 29/07/2026.

Substituiu o `en-US-BrianMultilingualNeural` (edge-tts), que tinha sido escolhido em
28/07/2026 entre cinco amostras. Motivo da troca: o Brian é **monocórdio** — mantém o
mesmo tom do início ao fim, e a clonagem entrega variação de entonação, que é o que
faz o Aru soar como alguém explicando em vez de um leitor automático.

Impressão digital para conferência, medida em 29/07/2026 sobre um clipe real
(F0 por autocorrelação, 764 quadros vozeados):

| Voz | F0 mediana |
|---|---|
| Aru oficial (clone do Runable) | **216 Hz** |
| Brian (aposentado) | 142 Hz |

Se um clipe novo vier fora da faixa dos ~216 Hz, o gerador trocou a voz sozinho e a
peça não pode ir ao ar. Trocar de voz é decisão de marca, não conveniência técnica.

`scripts/gerar-voz.py` continua no repositório, mas gera a voz **antiga**. Não usar
para peça publicada sem decisão explícita.

**Símbolo "A" verde:** faz parte do figurino do Aru — aparece no moletom e, nas
imagens de referência, também nos tênis. **Decidido em 29/07/2026: fica.** Não é
preciso pedir para o modelo omiti-lo (e não adiantava: enquanto está na referência,
ele volta em toda geração). Poses novas devem mantê-lo.

## Logo

- Master atual: exportado em 26/07/2026, símbolo do peixe sem dizeres, fundo
  transparente. No repositório: `src/assets/aruana-logo.png` (derivado do master),
  ícones em `public/` (favicon.png, favicon.ico, logo192.png, logo512.png).
- O nome "Aruanã Digital" é sempre renderizado em texto real (ver
  `src/components/AruanaLogo.tsx`), nunca embutido em imagem.
- A marca segue multicolorida por enquanto; a versão chapada de uma cor
  (favicon pequeno, marca d'água, impressão) é uma pendência aberta.
- O símbolo "A" verde (moletom e tênis do Aru) **não é logo nem marca secundária**:
  é figurino do personagem. Decidido em 29/07/2026 que fica, e o kit não precisa ser
  refeito. Como não é elemento de marca, não se aplica a peça, documento ou assinatura
  — só ao Aru.

## Estatísticas com fonte já validadas

- IBGE, Censo 2022 (divulgação 23/05/2025): 14,4 milhões de brasileiros com
  alguma deficiência (7,3% da população de 2+ anos); 27,5% entre pessoas de 70+;
  45,4% das pessoas com deficiência têm 60+; deficiência visual é a mais
  frequente (7,9 milhões).
- Lei 13.146/2015 (LBI), art. 63 e §1º (símbolo de acessibilidade em destaque);
  art. 88 (tipificação penal da discriminação).
- ABNT NBR 17225 — Acessibilidade digital, publicada em 11/03/2025, alinhada ao
  WCAG 2.2.

## Google Perfil da Empresa

- Pedir avaliação **somente a clientes reais** (a todos eles, sem filtrar por
  satisfação). Nunca pedir avaliação a quem não foi cliente — viola a política do
  Google e arrisca o perfil.
