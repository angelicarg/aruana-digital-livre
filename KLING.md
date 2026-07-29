# KLING.md — Guia de uso do conector Kling AI

Referência para gerar imagens e vídeos com o conector Kling AI (MCP). Levantado e
verificado em 28/07/2026. Complementa o `BRAND.md`: **as regras de marca valem para
tudo que sair daqui** — ver a seção "Restrições de marca" no final.

## Estado da conta (verificado em 28/07/2026)

- Autenticação: OAuth, userId `97954429`.
- Plano: **VIP / Standard**. Saldo no levantamento: 517 créditos.
- Créditos de assinatura **não acumulam** entre ciclos; pacotes avulsos valem 2 anos.

## ⚠️ Os defaults do conector são caros

`kling-video-v3_0` e `kling-video-v3_0_omni` vêm com **`resolution` default = `4k`**
(~30 créditos/segundo). Uma chamada sem parâmetros explícitos = **~150 créditos por
clipe de 5 s**, quase um terço de um saldo típico.

**Regra: nunca submeter vídeo sem `resolution` e `duration` explícitos.**

`kling-video-v2_6` tem `enable_audio` default **`true`** — outro custo silencioso.

## Custo: como saber de verdade

A resposta de submissão traz o campo **`creditsConsumed`** com o custo exato do job.
Verificado empiricamente: um job reportou `creditsConsumed: 8.0` e o saldo caiu de
517 para 509. **Esse campo é a fonte de verdade** — as tabelas abaixo são estimativa
de terceiros para planejamento antecipado.

### Custos medidos

| Job | Configuração | Créditos |
|---|---|---|
| `text_to_image` / `kling-image-v3_0_omni` | 1k, 9:16, imageCount=1 | **1** |
| `text_to_image` / `gemini-3.1-flash-image` | 0.5k, 1:1, imageCount=1 | **8** |
| `text_to_image` / `gpt-image-2` | 1k, quality=medium, 9:16 | **8** |
| `text_to_image` / `gemini-3-pro-image` | 1k, 9:16, image_count=1 | **20** |
| `image_to_image` / `kling-image-v3_0_omni` | 1k, 9:16, 1 ref | **1** |
| `text_to_video` / `kling-video-v3_0_turbo` | 5 s, 720p, sem áudio | **40** (8 cr/s) |
| `image_to_video` / `kling-video-v3_0` | 5 s, 720p, **com áudio**, first+tail | **45** (9 cr/s) |

Duas surpresas úteis:
- O turbo **não é o mais barato por segundo**. Sem áudio ele custa 8 cr/s, enquanto o
  `v3_0` completo — com áudio nativo e `tail_image` — sai a 9 cr/s. A vantagem do turbo
  é velocidade, não preço.
- **Job que falha é estornado.** Uma geração `FAIL` devolveu os 15 créditos (conferido
  no saldo). Experimentar custa menos do que parece.

**A 1 crédito por imagem no `kling-image-v3_0_omni` @1k, iterar cena é praticamente
livre** — vinte tentativas custam menos que meio clipe de vídeo. É a alavanca principal
para chegar ao enquadramento certo antes de animar.

Comparativo com o mesmo prompt (28/07/2026): **`gpt-image-2` teve a melhor aderência
à instrução** — foi o único a respeitar "personagem de costas, rosto não
identificável", e renderizou texto correto. `gemini-3-pro-image` fez a foto mais
bonita mas desobedeceu ao enquadramento, por 2,5× o preço. `kling-image-v3_0_omni`
errou o texto ("SEÛ") mas entregou composição utilizável por **1 crédito** — é o
modelo de exploração.

Atenção ao nome do modelo: em `text_to_image` é `gpt-image-2` (com hífen); em
`image_to_image` é `gpt-image2`.

### Estimativas para planejamento (série Kling 3.0, fontes de terceiros)

| Configuração | Custo/segundo | Clipe de 5 s |
|---|---|---|
| 720p, sem áudio | 6 | ~30 |
| 1080p, sem áudio | 8 | ~40 |
| 720p, áudio nativo | 9 | ~45 |
| 1080p, áudio nativo | 12 | ~60 |
| **4K (o default!)** | **30** | **~150** |

`imageCount` **multiplica** o custo. `imageCount=4` em 4K ≈ 600 créditos.

## Catálogo

### Vídeo (`text_to_video` e `image_to_video`)

| Modelo | Para quê | Duração | Resolução | Áudio | Refs |
|---|---|---|---|---|---|
| `kling-video-v3_0_turbo` | **Melhor custo-benefício**; 1ª escolha para imagem única → vídeo | 3–15 s | 720p/1080p | ❌ | 1 (`first_image`) |
| `kling-video-v3_0` | Áudio nativo, consistência, multi-shot | 3–15 s | 720p/1080p/4k | ✅ | `first_image` + `tail_image` |
| `kling-video-v3_0_omni` | **Multi-imagem** (7 refs), personagem falando, áudio nativo | 3–15 s | 720p/1080p/4k | ✅ | 7 |
| `kling-video-o1` | Consistência excepcional, instrução multimodal | 3–10 s | 720p/1080p | ❌ | 7 |
| `kling-video-v2_6` | Geração anterior | **só 5 ou 10 s** | 720p/1080p | ✅ (default `true`) | first + tail |

`prefer_multi_shots` (só em `v3_0` e `v3_0_omni`): `true` autoriza cortes entre planos
(narrativa de 10–15 s); `false` força plano único contínuo (produto girando, animação).
Default `false`, **exceto** em `kling-video-v3_0` image→video, onde vem `true`.

### Imagem (`text_to_image` e `image_to_image`)

| Modelo | Ponto forte | Resolução | Refs |
|---|---|---|---|
| `kling-image-v3_0_omni` | Default; 2K/4K nativo; **`story_mode`** = série de imagens diferentes (storyboard) | 1k/2k/4k | 10 |
| `gemini-3-pro-image` | **Melhor para texto dentro da imagem** e cenas complexas | 1k/2k/4k (obrigatório) | 2 |
| `gemini-3.1-flash-image` | Mais barato; aceita **`0.5k`** e ratios extremos (8:1, 4:1 — banners) | 0.5k–4k | 10 |
| `gpt-image2` | `quality` (low/medium/high) separado da resolução | 1k/2k/4k | 10 |
| `kling-image-o1` | Edição de detalhe precisa, transferência de estilo fiel | 1k/2k | 10 |
| `kling-image-v3_0` | Consistência com multi-referência | 1k/2k | 10 |
| `kling-image-v2_1` | Aderência ao prompt; slots subject/scene/style | 1k/2k | ver abaixo |

`kling-image-v2_1` em image→image é o único com regras próprias: usa slots nomeados
(`subject_image_N`, `scene_image`, `style_image`), exige **mínimo de 2 referências no
total**, e cada `subject_image_N` precisa vir **pareado com `raw_subject_image_N`
apontando para a mesma URL**.

## Fluxo de produção que economiza créditos

**Princípio: nunca iterar prompt em vídeo.** Imagem custa uma fração.

1. **Roteiro/storyboard em texto** — custo zero, decide plano a plano.
2. **Frames-chave em imagem barata** — `gemini-3.1-flash-image` @ `1k`, ou
   `kling-image-v3_0_omni` com `story_mode=true` para a sequência inteira de uma vez.
   Iterar aqui até composição e identidade visual estarem certas.
3. **Teste de movimento em 720p** — `kling-video-v3_0_turbo`, 5 s (~30 créditos).
4. **Só o take aprovado sobe de qualidade** — 1080p (~40); 4K apenas em peça hero.

Isso troca um erro de 150 créditos por um de ~5.

Outras alavancas:
- **Áudio nativo custa +50%** — mas é obrigatório quando o Aru fala (ver seção abaixo).
  Em clipe de b-roll, sem fala, gerar **sem áudio** e montar o som na edição.
- **Duração é linear.** Três clipes de 5 s custam o mesmo que um de 15 s, dão três
  enquadramentos e editam muito melhor — **exceto em clipe falado**, onde o clipe longo
  é preferível (ver abaixo).
- **720p basta** para Stories/Reels vistos no celular.
- **Reaproveitar URLs**: URLs devolvidas por tarefas Kling anteriores servem direto como
  input de outra geração, sem re-upload.

## Antes de gerar: a peça precisa mesmo de IA?

Na maioria dos casos, **não**. Post de carrossel, card de estatística, peça com
headline — tudo isso é **composição**, não geração: o Aru vem dos assets oficiais e
o texto é desenhado em fonte real. `scripts/gerar-pecas.py` faz isso a partir de um
JSON.

| | Peça gerada por IA | Peça composta |
|---|---|---|
| Texto | erra acento ("SEÛ SITE") | perfeito, fonte real |
| Personagem | varia a cada geração | idêntico, é o mesmo arquivo |
| Custo | 8–20 créditos por tentativa | **zero** |
| Corrigir uma vírgula | regerar tudo | editar o JSON e rodar |
| Logo | proibido gerar (BRAND.md 4) | colado do master |

Um carrossel de 6 cards custa **zero créditos**. A geração fica reservada para o
que composição não faz: cenas fotográficas novas, poses inéditas do Aru e vídeo.

### Assets oficiais

`public/marca/` é a fonte única de verdade, publicada em
`https://aruanadigital.com/marca/` — o manifesto `assets.json` lista URLs, dimensões
e regras de uso. Serve para o Cowork, para os modelos Gemini/GPT (que aceitam URL
externa) e para qualquer ferramenta futura. Nome sempre versionado (`-v1`), porque
substituir um arquivo mantendo o nome deixa o CDN servindo a versão antiga.

`midia/` é a pasta de trabalho — fora do Git, para rascunho e material bruto.

## Peças acima de 15 s: encadeamento

15 s é o teto nativo (`v3_0`, `v3_0_omni`, `v3_0_turbo`). Acima disso, encadeia-se —
e há duas formas, com resultados bem diferentes:

**Deriva acumulada (evitar):** gerar o clipe 1, extrair seu último frame, usar como
início do clipe 2, e assim por diante. Cada geração parte de um frame já comprimido:
a cor desbota e o personagem muda sutilmente. No quinto clipe o Aru não é mais o mesmo.

**Frames-chave ancorados (preferir):** gerar **todos os frames-chave como imagens**
primeiro — `kling-image-v3_0_omni` com `story_mode=true` produz a série inteira de uma
vez, consistente entre si. Depois cada clipe usa `first_image` = frame N e
`tail_image` = frame N+1. O modelo só resolve o movimento entre dois pontos definidos
por você. Zero deriva, e é o controle mais preciso disponível.

Ressalva: `tail_image` existe em `kling-video-v3_0` e `v2_6`, **não** no `v3_0_omni` —
ou seja, não vale para clipe falado (ver abaixo).

| Vídeo final | 720p mudo | 1080p mudo |
|---|---|---|
| 15 s (3 clipes) | ~90 | ~120 |
| 30 s (6 clipes) | ~180 | ~240 |
| 60 s (12 clipes) | ~360 | ~480 |

## Peças com o Aru falando

O Aru só fala se o áudio vier junto da geração — não existe como "adicionar a fala
depois", porque o movimento da boca é gerado com o áudio. Isso impõe restrições:

- **Modelo obrigatório: `kling-video-v3_0_omni`**, que é o único descrito como
  *voice-driven characters* com saída de áudio nativa. Com `enable_audio=true`.
- **`v3_0_omni` não tem `tail_image`.** A técnica de frames-chave ancorados
  (first+tail) **não se aplica a clipe falado** — a consistência do Aru tem de vir das
  imagens de referência (`image_1`..`image_7`), citadas no prompt como `图片1`, `图片2`.
- **`v2_6` desliga o áudio quando há `tail_image`** — combinação impossível.
- **Manter `resolution` fora de `4k`**: o default do omni é `4k`, e com áudio isso fica
  proibitivo. Usar `1080p`.

### Como fazer o Aru falar (fluxo definitivo)

Nenhum gerador de vídeo produz voz utilizável para a marca. O caminho que funciona tem
três etapas, e a voz **nunca** vem do gerador:

1. **Locução** — gerada localmente com `edge-tts` (grátis, sem conta, sem limite). Só
   existe uma voz masculina nativa em pt-BR, `pt-BR-AntonioNeural`; `rate` e `pitch`
   ajustam idade e ritmo. As multilíngues `en-US-AndrewMultilingualNeural` e
   `en-US-BrianMultilingualNeural` também falam português e têm timbres alternativos.

   ```python
   import asyncio, edge_tts
   asyncio.run(edge_tts.Communicate(
       "texto", "pt-BR-AntonioNeural", rate="+8%", pitch="+18Hz").save("voz.mp3"))
   ```

   Requer `pip install edge-tts` e `typing_extensions` atualizado (o Python 3.9 desta
   máquina quebra o import com a versão antiga).

2. **Lip-sync** — recurso **Avatar** do site do Kling (não existe no conector MCP).
   Recebe uma imagem e um arquivo de áudio, e devolve o personagem falando. **Ele
   reproduz o áudio sem alterar** — correlação medida de 0,9994 entre entrada e saída.
   Não é clonagem de voz nem TTS: só sincroniza a boca com o que você deu.

   Custa 80 créditos por geração. A imagem precisa ter o **rosto grande, frontal e
   desobstruído** — provavelmente roda detecção facial, e cena em plano médio falha.
   Queima uma legenda automática ilegível e a marca d'água; ambas saem com crop na pós.

3. **Montagem** — `scripts/montar-video.sh`, custo zero.

### A voz não é controlável — testado em 28/07/2026

**Conclusão fechada: não use áudio nativo do Kling.** Um clipe gerado com o prompt
pedindo explicitamente *"voz masculina, jovem adulta, tom médio, calorosa, sotaque
brasileiro neutro"* voltou com voz **aguda e em português europeu ou espanhol**. O
prompt não controla nem o idioma, nem o sotaque, nem o registro — só existe o
interruptor `enable_audio`, e a voz é sorteada a cada geração.

O Veo tem a mesma limitação, e recusa entrada de áudio por escrito ("não consigo usar
entrada de áudio para geração de vídeo no momento").

Consequência prática: **gerar sempre com `enable_audio=false`**. Além de evitar voz
inutilizável, economiza 33% — 6 créditos/segundo contra 9 com áudio. Voz vem de fora
(gravada ou TTS dedicado) e entra na montagem com `--audio-mestre`, onde é a mesma
para sempre e o texto é seu.

Se um clipe já foi gerado com áudio ruim, **não regere** — basta remover a faixa na
montagem, custo zero.

### O risco de consistência de voz (histórico)

Cada geração produz a voz do zero, então **dois clipes falados podem sair com timbres
diferentes** — grave para uma marca cujo porta-voz é sempre o mesmo personagem. A
mitigação inverte a regra dos clipes curtos:

> **Gere toda a fala de uma peça em um único clipe longo** (10–15 s), e use clipes
> curtos e mudos de b-roll para variar a imagem. Na montagem, o áudio do clipe falado
> roda por cima do b-roll (J-cut) — `--audio-mestre` no script faz exatamente isso.

Isso dá voz uniforme, corta custo (o áudio caro é gerado uma vez) e ainda entrega
variedade visual. **Antes da primeira produção real, gerar um clipe falado curto e
avaliar se o timbre e o português servem** — é a única forma de saber.

### Custo de uma peça falada

Áudio nativo: 9 créditos/s em 720p, 12 em 1080p.

| Peça | Composição | Créditos |
|---|---|---|
| Reel 20 s | 1 fala 12 s @1080p+áudio (144) + 2 b-roll 4 s @720p mudo (48) | ~192 |
| Reel 30 s | 1 fala 15 s @1080p+áudio (180) + 3 b-roll 5 s @720p mudo (90) | ~270 |
| Reel 30 s *tudo falado* | 6 clipes 5 s @1080p+áudio | ~360 |

Orçar **1,5× a 2×** — refação sempre acontece.

## Pós-produção: `scripts/montar-video.sh`

Montagem, transições, cor, logo, legendas e exportação saem do **FFmpeg local**
(8.1.2 full build, já instalado) — **custo zero, ilimitado**. Créditos só na geração.

```bash
scripts/montar-video.sh --entrada midia/reel-aru --nome reel-aru \
  --audio-mestre midia/reel-aru/01-aru-fala.mp4 \
  --transicao 0.4 --logo --legendas midia/reel-aru/legendas.srt \
  --formatos 9:16,1:1
```

Clipes são lidos em ordem alfabética — nomeie `01-`, `02-`, `03-`. O script normaliza
tudo (fps, resolução, SAR), emenda com corte seco ou crossfade, aplica o áudio mestre,
normaliza loudness a −16 LUFS, cola o **logo master** (nunca gerado por IA — BRAND.md
regra 4), queima legendas e exporta em 9:16 / 1:1 / 16:9 / 4:5 + capa JPG.

Duas armadilhas que o script já resolve, descobertas testando:
- **Clipe sem faixa de áudio quebra o `concat`.** Como o fluxo mistura fala (com áudio)
  e b-roll (mudo), o script insere silêncio nos mudos antes de emendar.
- **`loudnorm` reamostra para 192 kHz** e o AAC saía em 96 kHz mono. O script força
  48 kHz estéreo, que é o padrão das redes.
- (No Windows, `bc` não existe no Git Bash — a aritmética do crossfade usa `awk`.)

### O que o FFmpeg não faz

| Necessidade | Situação |
|---|---|
| Locução em PT-BR controlada | Não temos. O áudio nativo do Kling é a única fonte de fala. |
| Trilha musical | Precisa vir de biblioteca licenciada. |
| Upscale de vídeo | FFmpeg só redimensiona. Gere já na resolução final. |
| Canva / Adobe | Conectores existem mas exigem autorização nas configurações do claude.ai. |

## Precisão de comando

Não existe campo de prompt negativo. Descreva o que **deve** aparecer, nunca o que não
deve ("sem distorção" tende a produzir distorção).

**Hierarquia de controle, do mais forte ao mais fraco:**

1. **`first_image` + `tail_image`** (`v3_0`, `v2_6`) — define literalmente o primeiro e o
   último frame; o modelo só resolve o meio. É o controle mais preciso disponível.
   No `v2_6`, `tail_image` exige `resolution=1080p` e desativa áudio.
2. **Imagem de referência** — `image_to_video` sempre bate `text_to_video` em
   previsibilidade.
3. **Referências indexadas** — em `o1` e `v3_0_omni` passe até 7 imagens e chame-as no
   prompt como **`图片1`, `图片2`…** (sintaxe literal, em chinês). Ex.: *"图片1 caminha
   pelo ambiente de 图片2"*. Idem no `image_to_image` dos modelos Kling, até 10 refs.
4. **`prefer_multi_shots`** — corta ou não entre planos.
5. **O prompt** — o controle mais fraco; não deve carregar o peso da precisão.

### O prompt não tem memória

Cada geração parte do zero. **Toda instrução de marca precisa ser repetida por inteiro,
em todo prompt** — o que você não disser volta ao default do modelo. Um prompt que
esqueceu de dizer "notebook prateado liso, sem marca" recebeu de volta um notebook com
o logo da Apple, mesmo depois de quatro gerações seguidas terem saído limpas.

Repetir sempre: superfícies sem marca nem logotipo · roupas e tênis sem estampa · a cor
exata do personagem ("preserve o verde-água da pele").

### Descreva geometria, não emoção

"Preocupado" o modelo ignora. **"Sobrancelhas bem franzidas para baixo, boca fechada e
torta para um lado, queixo recolhido"** ele executa — e foi assim que o Aru deixou de
sorrir pela primeira vez. Vale para tudo: descreva a posição do corpo, não o sentimento.

### Cuidado com a luz colorindo o personagem

Pedir "luz fria da tela no rosto" deixou o Aru azul-petróleo, quebrando a continuidade
com as outras cenas. Ao pedir luz colorida, diga também qual é a luz **principal** e
que a cor do personagem deve ser preservada.

**Estrutura de prompt** (uma frase por bloco, nessa ordem):

> Sujeito + aparência → ação única → ambiente → luz → lente → movimento de câmera → estilo

Exemplo: *"Uma xícara de café sobre balcão de madeira clara, vapor subindo lentamente.
Cozinha ao fundo, desfocada. Luz natural lateral da manhã. Lente 50 mm, profundidade de
campo rasa. A câmera faz um leve dolly-in. Estilo cinematográfico, cores quentes."*

Regras que mais elevam a taxa de acerto:
- **Uma ação principal por clipe.** Duas ou três ações em 5 s = movimento confuso.
- **Nomear o movimento de câmera com termo técnico** — *dolly-in, pan, tilt-up, orbit*.
  "Plano fixo, sem movimento de câmera" é um comando forte e muitas vezes o melhor.
- **Especificar velocidade** ("lentamente", "sutil") — o default tende a ser mais rápido
  do que se quer em peça de marca.
- **Nunca pedir texto ao modelo de vídeo.** Modelo de vídeo deforma letra. Texto entra na
  edição, ou como imagem gerada por `gemini-3-pro-image`.
- **Aspect ratio na origem**, não no corte: `9:16` Reels/Stories, `1:1` feed,
  `16:9` site/YouTube.

## Operacional

- **Imagens locais:** os modelos **Kling** só aceitam URL vinda de `file_upload` —
  caminho local ou URL externa são rejeitados. Os modelos **Gemini/GPT** aceitam URL
  pública. Specs: PNG/JPG, <4K, ≤30 MB, proporção não mais larga que 1:2.
- **Duas URLs no resultado:** `url` (com marca d'água) e **`urlWithoutWatermark`** —
  usar sempre a segunda.
- **URLs expiram em 24 h.** Baixar imediatamente ao concluir.
- **Geração é assíncrona:** a chamada devolve `generationId` na hora; consultar
  `query_tasks` até `COMPLETED`. Uma imagem 0.5k levou ~11 s.

## Restrições de marca (ver `BRAND.md`)

- **O logo nunca entra no prompt** (regra 4 do BRAND.md: nunca regenerar o logo por IA).
  Ele entra como overlay do arquivo master na edição. Foi uma assinatura corrompida
  ("EDUCAÇÃD") gerada por IA que originou a regra.
- **O Aru é o porta-voz da marca** (regra 5). Para o Aru sair idêntico entre peças, usar
  `kling-video-v3_0_omni` ou `kling-video-o1` com imagens canônicas do Aru como
  referência — **nunca** `text_to_video`, que produz um personagem diferente a cada
  geração. Vale manter um kit fixo de referência do Aru (frente, perfil, corpo inteiro,
  expressões) e reutilizá-lo sempre.
- **Nenhuma pessoa da equipe nominalmente**, nem foto que identifique alguém (regra 5).
- **Projetos de demonstração sempre rotulados** (regra 2): *"Projeto de demonstração —
  empresa fictícia, software real"* — e esse rótulo é texto de edição, não texto gerado.
