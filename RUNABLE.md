# RUNABLE.md — Como operar o Runable sem perder o Aru

Guia de uso do [Runable](https://runable.com) na produção da Aruanã. Levantado em
29/07/2026 a partir da documentação oficial (`docs.runable.com`). Ler junto com o
`BRAND.md` — as regras de marca valem aqui inteiras, e algumas delas existem
justamente porque gerador de vídeo tende a violá-las sozinho.

## O que o Runable é, e o que ele não é

- **Não tem API pública, webhook nem MCP.** Verificado na documentação completa. É
  operado à mão, na interface web. Automação externa não é possível.
- **A voz clonada do Aru vive lá** e funciona — mas só em operações de áudio.
- Ele **não** substitui o `BRAND.md`: nada sai publicado sem passar pela régua.

**Divisão de trabalho:** a Angélica opera o Runable (gera imagem, vídeo e locução);
o Claude Code prepara o roteiro e os comandos, e faz a finalização (montagem em
FFmpeg, legenda, revisão de marca, entrega).

## Regra de ouro: o Aru nunca nasce no Runable

A geração de imagem por texto do Runable **não aceita imagem de referência** — a
documentação não descreve esse recurso em nenhuma página. Ou seja, pedir "gere o Aru"
lá produz um personagem novo a cada vez, exatamente o que o `BRAND.md` proíbe:

> **Nunca descrever o Aru por texto** para gerar imagem — sai um personagem diferente
> a cada vez. Novas poses partem dessas referências.

Portanto: **o Aru entra pronto no Runable, como imagem.** O Runable só o *anima*.

O caminho que preserva a identidade é o **image-to-video**: a imagem enviada vira o
**primeiro quadro** do vídeo. Se o quadro 1 é o Aru oficial, o vídeo começa
necessariamente com o Aru certo — a consistência deixa de depender de sorte.

### Qual arquivo enviar (importa mais do que parece)

| Origem | Serve como primeiro quadro? |
| --- | --- |
| `public/marca/aru-*.png` | **Não** — fundo transparente (RGBA). Gerador de vídeo não entende alpha e devolve fundo preto ou sujeira. |
| `midia/cenas/*.png` | **Sim** — RGB 768×1360 (≈9:16), cena fechada, sem alpha. |

As referências oficiais em `aruanadigital.com/marca/` continuam sendo a fonte da
aparência, mas são recortes. Para vídeo, use uma cena já aprovada de `midia/cenas/`,
ou peça uma composição nova aqui antes de subir.

## Travando a consistência: Memory

O Runable tem **Memory** — preferências e assets presos à conta, que persistem entre
conversas. Aceita texto (até 5.000 caracteres por entrada) **e imagens com legenda**.
É lá que o Aru e as regras devem morar, para não serem repetidos a cada prompt.

Alternativa mais forte, se a Memory se mostrar frouxa: **Skill customizada**. Aceita
upload de um ZIP com `SKILL.md` na raiz (frontmatter YAML com `name` e `description`,
até 50 MB, podendo levar assets junto), e passa a ser invocada digitando `/`. Se
chegarmos nesse ponto, o `SKILL.md` é escrito aqui no repo e você só sobe o ZIP.

## O caminho do áudio

> **Corrigido em 29/07/2026 pela prática.** A seção abaixo dizia que a voz clonada não
> chegava ao vídeo. **Está errado.** Um clipe gerado no Runable (`aru_padaria_talking_final.mp4`,
> 1080×1916, 20 s) saiu com o Aru falando **na voz clonada e com lip-sync**. A
> documentação deles não descreve esse caminho — a ferramenta faz mais do que documenta.
> Portanto: **é possível gerar vídeo falado, com a voz certa, em uma operação só.**
>
> O que segue continua valendo como o caminho alternativo, para clipe mudo com locução
> por cima, e como registro do que a documentação afirma.

**Segundo a documentação**, a voz clonada não poderia ser aplicada a um vídeo:

- **Voice cloning:** "Cloned voices work with speech operations only" — text-to-speech,
  diálogo e voice swap. Vídeo não está na lista.
- **Voice swap:** não aceita vídeo. A própria documentação manda *"extract the audio
  first, swap the voice, then recombine in an external editor"*.
- **Dubbing:** aceita vídeo e faz lip-sync, **mas** "you cannot control which voice is
  used" — a voz é escolhida por eles. Serve para traduzir, não para aplicar o Aru.
- **Edit a video:** "You cannot edit audio separately."

O "editor externo" que a documentação deles pede é o FFmpeg aqui no repo
(`scripts/montar-video.sh`), que já é o fluxo do reel de acessibilidade.

**Caminho A — vídeo falado (o que está em uso).** Uma operação só: o Runable gera o
clipe com o Aru falando, na voz clonada, com lip-sync. É o que produziu o vídeo do TAB
em 29/07/2026. A legenda é queimada aqui depois.

**Caminho B — vídeo mudo + locução por cima.** Para quando o Aru não deve falar para a
câmera (narração em off sobre b-roll, ou reaproveitamento de clipe):

1. No Runable: gerar o vídeo **com áudio desligado** (metade dos créditos).
2. No Runable: gerar a locução em TTS com a voz clonada, e baixar o MP3.
3. Aqui: FFmpeg junta vídeo + locução, aplica legenda e entrega.

**Ordem de produção (decidida em 29/07/2026):** o **áudio manda**. Gera-se o vídeo
falado primeiro e a imagem de apoio vem depois, acompanhando o que o áudio pede — não
o contrário. Isso evita o que aconteceu no primeiro teste, em que a duração do clipe
foi decidida antes do texto e o texto não coube.

## Fluxo de produção — a ordem que funciona

Definida em 29/07/2026, depois da primeira produção completa. **O áudio manda.** A ordem
existe para que a parte cara (vídeo) só rode uma vez, sobre material já aprovado.

1. **Aqui (Claude Code):** roteiro e contexto. Texto na régua do `BRAND.md` e do
   `MARKETING.md`, com o mapa de planos. Custo zero, itera à vontade.
2. **Runable:** gerar **o áudio** a partir desse texto, na voz clonada do Aru. É a peça
   que define a duração de tudo o que vem depois.
3. **Runable:** gerar **as cenas em imagem**. Imagem é a operação barata — é aqui que se
   erra de graça.
4. **Aqui:** conferir a consistência das cenas contra as referências oficiais antes de
   qualquer vídeo. Uma cena reprovada custa uma imagem; um vídeo reprovado custa muito
   mais.
5. **Runable:** juntar áudio + cena aprovada em **vídeo falado**, pedindo comunicação
   natural, expressões suaves e a legenda embutida.
6. **Aqui:** revisão final contra o checklist do `MARKETING.md` §7 e entrega.

O passo 4 é o que segura o custo. Pular direto de 3 para 5 foi o que encareceu a
primeira produção.

### Linguagem para o passo 5

O `BRAND.md` veta `excited`, `energetic` e `enthusiastic` — produzem gesticulação larga e
sorriso permanente. O primeiro teste saiu exatamente assim. O que pedir no lugar:

```text
Natural, conversational delivery. Soft, restrained facial expressions — small smiles
between phrases, calm nods, attentive eye contact. Quiet confidence, not excitement.
No wide grinning, no big arm gestures. Burn in Brazilian Portuguese subtitles.
```

**A legenda pode sair do próprio Runable.** Usada assim na peça do TAB, e serve. A
alternativa continua sendo queimar aqui com `scripts/montar-video.sh --legendas`, que dá
controle fino de sincronia e custo zero — vale quando a legenda do Runable dessincronizar
ou quebrar linha em lugar ruim.

## Erros que custam crédito

- Deixar o **áudio ligado** sem precisar — dobra o custo e a voz sorteada é inútil.
- Subir o PNG **transparente** como primeiro quadro — fundo preto, geração perdida.
- Descrever a aparência do Aru no prompt de image-to-video — a documentação é explícita:
  *"Focus on motion, not on what the image looks like (the AI already has the image)."*
  Descrever aparência briga com o primeiro quadro e distorce o personagem.
- Usar as palavras `excited`, `energetic`, `enthusiastic` (regra do `BRAND.md`):
  produzem gesticulação larga e sorriso permanente, cacoete de mascote de propaganda.
- Pedir vídeo antes de validar consistência em imagem — vídeo é a operação cara.
- **Gerar em 16:9 pretendendo 9:16.** Medido em 29/07/2026: um clipe 1912×1084 cortado
  ao centro para 9:16 sobra com **610 px de largura**. Para virar reel 1080×1920 isso é
  um upscale de 77% e a imagem amolece. Gerar nativo em 9:16 custa o mesmo e entrega a
  largura inteira. Sempre declarar o aspect ratio no prompt.
- **Deixar o Aru de boca aberta "falando" num clipe do Caminho B.** Aí não há lip-sync:
  a locução entra depois e não casa com a boca. No Caminho B, pedir boca fechada e
  sorriso pequeno. No Caminho A (vídeo falado) isso não se aplica — a boca acompanha a
  fala de verdade.
- **Aceitar a voz que vier.** Conferir sempre: a voz oficial do Aru tem F0 mediana de
  ~216 Hz (`BRAND.md`). Se o clipe sair fora dessa faixa, o gerador trocou a voz e a
  peça não pode ir ao ar.

---

# Comandos prontos para colar

Colar **um bloco por vez**, na ordem. Estão em inglês de propósito: o agente e os
modelos de imagem/vídeo respondem com mais precisão nessa língua. O texto da locução
continua em português.

## Bloco 1 — Carregar a Memory (uma vez só)

Antes de colar, anexe as três imagens de `public/marca/`: `aru-frente-v1.png`,
`aru-apontando-v1.png` e `aru-joia-v1.png`.

```text
Save the following to memory as permanent brand defaults.

BRAND: Aruanã Digital. Colors: green #00C57A, deep green #019852, navy #0A2A44,
deep navy #041B33, cloud #F5F7FA. Display font Sora, body font Inter.

MASCOT: The three attached images are the official reference for "Aru", the brand's
only spokesperson. Aru is a young adult male character.

HARD RULES — never break these:
1. Never generate, redraw or reinterpret Aru from a text description. Aru only ever
   enters a job as an uploaded image. If a job needs Aru and no image is attached,
   stop and ask me for one.
2. Never generate, redraw or recolor the Aruanã logo. It is always a pasted file.
3. Never invent statistics, testimonials, client names or review quotes.
4. Never name a person. The company speaks only through Aru.

TONE for any narration or copy: warm, grounded and genuinely helpful. Speaks to the
viewer like a friendly neighbour who happens to understand technology — never salesy,
never condescending, never hyped. Quiet confidence instead of excitement. Never use
the words "excited", "energetic" or "enthusiastic".

LANGUAGE: all narration and on-screen copy in Brazilian Portuguese (pt-BR).

Confirm what you stored.
```

## Bloco 2 — Teste de consistência (barato, faça este primeiro)

Anexe **uma cena** de `midia/cenas/` (ex.: `v2-para-camera.png`) — nunca o PNG
transparente.

```text
Image-to-video from the attached image.

Use the attached image as the first frame, unchanged. Do not restyle, redraw or
reinterpret the character — keep face, hoodie, colors and proportions exactly as they
are in the source image.

Motion only: a slow, subtle breathing motion and one calm nod. Very gentle camera
push-in, no more than 5%. Nothing else moves.

Settings: 9:16 aspect ratio, 5 seconds, audio OFF (muted).
```

O que olhar no resultado, nesta ordem:

1. O rosto continua o mesmo do quadro 1, ou "derreteu" ao longo do clipe?
2. O moletom manteve a cor e o símbolo "A" verde?
3. As mãos se mantiveram inteiras? (é onde gerador falha primeiro)
4. O fundo ficou estável?

Se passar, repita com movimento maior (**Bloco 2b**) para achar o limite:

```text
Same image, same rules — first frame unchanged, no restyling.

Motion only: the character raises one hand and gestures toward the right side of the
frame, then lowers it. Calm, small movement. Camera static.

Settings: 9:16, 5 seconds, audio OFF.
```

O ponto em que o Aru começa a se deformar é o **teto de movimento** por clipe. Anote —
o roteiro vai ser escrito respeitando esse teto.

## Bloco 3 — Locução com a voz clonada

Troque o nome entre aspas pelo nome exato que você deu à voz ao cloná-la, e o texto
pelo trecho do roteiro.

```text
Using my cloned voice "NOME-DA-VOZ", read the following text aloud in Brazilian
Portuguese. Calm, unhurried pace. Do not add music or sound effects. Return the audio
file for download.

TEXTO:
[trecho do roteiro aqui]
```

Baixe o MP3 e me mande junto com os clipes — a montagem final é aqui.

## Bloco 4 — Diagnóstico, se algo sair errado

```text
The character in the output does not match the attached reference. Do not try again
yet. First tell me: did you use the attached image as the literal first frame, or did
you regenerate the character? Which model ran this job, and what did it cost?
```

Perguntar antes de repetir evita queimar crédito repetindo o mesmo erro.
