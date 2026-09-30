# Handoff: Sala de Espera (entrada da Sala de Yoga)

## Visão geral
Esta tela substitui a entrada atual (título, um aviso de ocupação, três botões "Laço / Chapéu / Coque", o código da sala e o botão "Entrar na sala"). Na nova entrada, a pessoa **monta a própria criatura** vendo uma prévia 3D ao vivo, **escolhe um tapete livre** e entra na sala.

- Protótipo: `Sala de Espera.dc.html`. Sirva a pasta (`npx serve .`) e abra o arquivo. Ele usa o mesmo three.js 0.160 da sala e importa `personagens.js`.
- Fidelidade: **alta** para layout, cores, textos, opções e comportamento. A geometria dos acessórios é procedural e provisória, assim como a dos personagens (veja o README, seção 9).
- O que é código de produção: `personagens.js`, que agora tem **cores personalizadas e acessórios**, pode ser usado direto. O `.dc.html` é uma referência: recrie a tela no projeto existente, com os componentes e o roteamento que já estão lá.

## 1. Layout
- Tela dividida em duas colunas com `flex-wrap`:
  - **Palco 3D** à esquerda: `flex: 1 1 560px`, `position: sticky; top: 0`, altura `min(100vh, max(460px, 64vw))`.
  - **Painel** à direita: `flex: 1 1 420px`, `max-width: 540px`, padding de 44/36 px.
- No celular, o palco fica em cima e o painel embaixo.
- Fundo #17130F. Painéis e cartões #211C18, com borda de 1 px #342D27. Campos de texto com fundo #110E0B.
- Texto: #F4EFE8 (principal), #C9C0B5 (secundário), #A59B8F (rótulos), #7D746A (notas).
- Cor de destaque **#19C9A6**. O botão principal usa esse fundo com texto #0D1F1A. No hover, #3FD8B8.
- Fontes: **Manrope** (400–800) e **JetBrains Mono** (numeração e rótulos técnicos).
- Título em 800, com `clamp(28px, 3.2vw, 38px)` e letter-spacing −0,025em.
- Etapas numeradas de 01 a 05. O número fica em mono na cor de destaque e o rótulo em 12 px, peso 700, caixa alta, com letter-spacing de 0,1em.
- Item selecionado:
  - chips: borda #19C9A6 com fundo `rgba(25,201,166,.14)`;
  - bolinhas de cor: anel de 2 px #F4EFE8.

## 2. Palco 3D
- Renderizador com fundo transparente, ACESFilmic, exposição 0,9 e sombras PCFSoft.
- Ambiente: RoomEnvironment via PMREM.
- Luzes:
  - Hemisphere #FFF1E0 / #3A2C22, intensidade 0,7;
  - Directional principal #FFE6C8, intensidade 1,8, na posição (2.5, 4, 3), com sombra de 1024 px;
  - luz de contorno #9FE8D8, intensidade 1,3, na posição (−3, 2.5, −3).
- Chão: tapete de 183 × 61 × 0,6 cm na cor escolhida (rugosidade 0,95, envMapIntensity 0,3), mais um ShadowMaterial com opacidade 0,35.
- **Halo da intenção:** anel no chão com raio de 0,62 a 0,66 m, MeshBasic na cor da intenção, `toneMapped: false`. A opacidade pulsa entre 0,55 e 0,25 (seno de 1,2 rad/s) e a escala varia ±4%.
- Por trás do canvas há um brilho CSS: `radial-gradient(55% 48% at 50% 58%, <cor da intenção com 26% de alfa>, transparente 72%)`, com transição de 0,6 s.
- Câmera:
  - FOV de 32°, na posição (1.4, 1.55, 5.8);
  - alvo y = 0,8 em pé ou 0,55 sentado, com transição suave (lerp de 0,06 por quadro).
- OrbitControls:
  - sem pan, damping de 0,08;
  - distância entre 3 e 7 m, ângulo polar entre 0,9 e 1,5 rad;
  - **autoRotate** com velocidade 0,9, que para ao arrastar e volta 3,5 s depois de soltar.
- **Etiqueta com o nome:** elemento HTML posicionado a cada quadro, projetando a posição da cabeça + 0,5 m. Mostra a bolinha da intenção, o apelido (ou o nome da criatura) e a intenção em mono.
- Sobreposições no palco:
  - no topo, à esquerda: "Aruanã Digital · Sala de espera";
  - no topo, à direita: botão "Me surpreenda", que sorteia todas as opções;
  - embaixo, no centro: seletor "Em pé / Sentada" e o texto "Arraste para girar".
- **Pose:** usa a própria aula de `personagens.js`. O relógio avança até um ponto de parada, sem voltar ao começo.
  - Em pé: começa em classT = 17,5 e para em 21,5 (Montanha).
  - Sentada: começa em 0,5 e para em 7,5 (Respiração sentada).
  - Assim a troca entre as duas é uma transição natural de 2,4 s.
- **Troca de criatura sem travar:**
  1. monta a criatura nova fora da cena;
  2. chama `renderer.compileAsync`, com um limite de **250 ms** (`Promise.race`);
  3. só então troca pela antiga e libera as geometrias dela;
  4. entra com uma animação de escala de 0,94 para 1 (ease-out cúbico, cerca de 200 ms).
  - A **primeira** montagem é sempre síncrona.
  - Um contador de versão (token) descarta montagens que ficaram velhas porque a pessoa já trocou de novo.
- **Miniaturas das criaturas:**
  - geradas uma vez, em `requestIdleCallback`, num WebGLRenderer separado de 200 px;
  - câmera em (0.55, 1.5, 1.75), olhando para (0, 1.24, 0), na pose Montanha;
  - viram **blob URL**. Não use data URL dentro de `background-image` inline, porque o `;` quebra o estilo.

## 3. Opções
| Etapa | Opção | Valores |
|---|---|---|
| 01 Criatura | `style` | Gota `gotaAzul`, Pêssego `gotaPessego`, Broto `broto`, Origami `origami`, Noite `roxo`, Faísca `cinza`. A professora fica fora. |
| 02 Cores | Roupa (`tint`) | Original (null), Sálvia #8FB39A, Terracota #D08A64, Lavanda #B3A3DC, Areia #E3C9A2, Oceano #4F8FB3, Carvão #4A4540 |
| | Tapete (`mat`) | Musgo #8FA58A, Barro #C47A5A, Linho #D9C3A0, Canela #A86B56, Oliva #7F8A5E (as mesmas cores dos tapetes da sala) |
| 03 Acessórios | Na cabeça (`acc.head`) | nada, `laco`, `chapeu` (palha #D8B777 com fita na cor escolhida), `coque`, `faixa`, `coroa` (de flores), `fone` |
| | No rosto e no pescoço (`acc.face`) | nada, `oculos` (redondos, grafite), `echarpe`, `colar` (de contas) |
| | Cor dos acessórios (`acc.color`) | Coral #E8604C, Mostarda #F2C14E, Anil #3F7FBF, Menta #19C9A6, Creme #F6EFE4, Grafite #2E2A28 |
| 04 Presença | Apelido (`nick`) | opcional, até 16 caracteres. Se ficar vazio, aparece o nome da criatura. |
| | Intenção (`intent`) | Calma #7FB8E0, Foco #F0B14A, Gratidão #EF8FB1, Leveza #8FD19E. Cada uma vira um halo no tapete, que os outros veem. |
| 05 Entrar | Código da sala | só minúsculas, números e hífen. O padrão é `publica`. |
| | Tapete (`spot`) | índice de 0 a 5: fileira da frente (0–2) e do fundo (3–5), da esquerda para a direita. |

Valores iniciais: Pêssego, cor original, Musgo, laço, nada no rosto, Coral, Calma, em pé, tapete 4 (fundo, no meio).

## 4. Escolha do tapete
- O mapa mostra o tapete da professora em cima e a grade de 3 × 2 tapetes embaixo.
- **Ocupado:** fundo #3A322B com a miniatura da criatura de quem está nele. Fica desabilitado, com o título "Ocupado".
- **Livre:** borda tracejada #4A4138 e o texto "Livre". No hover, a borda fica na cor de destaque. Clicar escolhe o tapete.
- **Seu tapete:** preenchido com a cor de tapete escolhida e o texto "VOCÊ". O nome do lugar aparece acima do mapa, por exemplo "Fundo, no meio".
- Se o tapete salvo estiver ocupado, a pessoa fica com o tapete 4. Se o 4 também estiver ocupado, fica com o primeiro livre.
- **Sala cheia (6 pessoas):** a pessoa entra em pé, perto da porta, e continua vendo e ouvindo tudo.
- **Corrida entre duas pessoas:** o servidor é quem decide. Se o tapete for pego enquanto a pessoa ainda está na tela, marque-o como ocupado e mova a pessoa para o livre mais próximo. Esse aviso já está no texto da tela.
- No protótipo, a ocupação é simulada pela opção `pessoasNaSala`, no painel de ajustes. Os tapetes são ocupados nesta ordem: [1, 3, 5, 0, 4, 2].

## 5. Aviso de ocupação (cartão no topo)
- As miniaturas de quem está na sala aparecem sobrepostas, com −8 px de margem.
- Textos:
  - 0 pessoas: "**A sala está vazia.** Você será a primeira pessoa a entrar."
  - 1 a 5 pessoas: "**N pessoas já estão na sala.** A aula começa quando a professora chegar ao tapete."
  - 6 pessoas: "**Os seis tapetes estão ocupados.** Você entra em pé, perto da porta."

## 6. Dados e integração com a sala real
### Perfil da criatura
Vai salvo no localStorage com a chave `aruana-avatar` e é enviado ao servidor ao entrar:
```json
{
  "style": "gotaPessego",
  "tint": 13666916,
  "acc": { "head": "laco", "face": null, "color": 15228492 },
  "mat": "#8fa58a",
  "intent": "calma",
  "nick": "Maré",
  "ui": { "creature": 1, "tint": 0, "mat": 0, "head": 1, "face": 0, "acc": 0, "intent": 0, "nick": "Maré", "code": "publica", "pose": "pe", "spot": 4 }
}
```
- `tint` e `acc.color` são inteiros hexadecimais (o formato do THREE). Quando a cor é a original, vai `null`.
- `ui` guarda os índices das escolhas, para a tela voltar como a pessoa deixou. Não precisa ir para o servidor.
- A mensagem de entrada deve levar `{ style, tint, acc, mat, intent, nick, spot }`. O servidor devolve o `spot` confirmado.

### `personagens.js` (mudanças, todas compatíveis com o uso anterior)
- Cada placement agora aceita, além do que já tinha:
  - `tint` (número): troca a cor do corpo e da parte de baixo. Braços e pernas escurecem 8% e 26%, e as partes cinza da Faísca continuam como estão;
  - `acc: { head, face, color }`: coloca os acessórios.
- `createCast` agora devolve também `chars`. Cada item tem `head`, `neck`, `spine` etc., o que serve para prender a etiqueta do nome.
- Os acessórios se ajustam a cada cabeça: o código mede o formato dela lançando raios (topo, largura na altura dos olhos, frente e costas). Assim o mesmo chapéu serve em todos os tipos de cabeça (gota, broto, origami e redonda).

### Na sala (`Sala de Yoga Tropical.dc.html`)
- **Já está no protótipo:** a sala lê `aruana-avatar` e coloca a criatura do visitante no tapete do fundo, no meio, em (0, 2.35), virada para o norte.
- **Falta fazer na sala real:**
  1. **Colocar cada participante no `spot` escolhido.** As posições dos tapetes são x ∈ {−2.3, 0, 2.3} e z ∈ {−0.2, 2.1}. A criatura fica em z do tapete + 0,25, com rot = π. Os 5 alunos fixos do protótipo passam a ser participantes reais, ou só preenchem os tapetes vazios quando a sala está cheia de bots.
  2. **Pintar o tapete** de cada participante com a cor `mat` dele.
  3. **Halo da intenção** em volta de cada tapete ocupado: o mesmo anel do palco, só que como um retângulo arredondado de cerca de 2,0 × 0,8 m, na cor da intenção, pulsando devagar. Nas atmosferas Entardecer e Chuva ele fica mais visível, e no Dia pode ter opacidade menor, cerca de 0,35.
  4. **Etiqueta com o apelido** acima da criatura: HTML projetado ou sprite. Mostre só quando a câmera estiver a menos de 4 m ou quando o cursor passar por cima, para não poluir a vista.
  5. **Sala cheia:** a pessoa fica em pé perto da porta, em cerca de (3.2, 0, 3.2), e pode usar todas as posições de câmera.
- O botão "Entrar como {nome}" salva o perfil e abre a sala. No protótipo, é um link para `Sala de Yoga Tropical.dc.html`.

## 7. Acessibilidade e celular
- Cada bolinha de cor tem `title` com o nome da cor. No projeto real, use também `aria-label` e `aria-pressed`.
- Os tapetes ocupados são `disabled`.
- Alvos de toque com no mínimo 36 px. Nos chips, use 44 px de altura no celular.
- No celular: use pixel ratio de no máximo 2, gere as miniaturas no tempo livre do navegador e pause o `requestAnimationFrame` quando a aba estiver escondida (`document.hidden`).
