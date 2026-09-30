# Handoff: Sala de Yoga Tropical (Aruanã Digital)

## Visão geral
Esta é a nova proposta visual para a sala 3D de yoga e relaxamento que já está no ar (aruanadigital.com/experiencia). O que muda:
- a arquitetura da sala, os materiais e a iluminação;
- a paisagem do lado de fora (lagoa, praia, montanhas);
- três atmosferas: dia, entardecer e chuva com trovões;
- seis personagens animados que fazem uma aula guiada;
- novas posições de câmera.

A interface atual (painel "Como usar", respirações 4-7-8, Quadrada e 5-5, botão RV etc.) **continua a mesma**. Esta entrega trata só da cena 3D.

## Sobre os arquivos
`Sala de Yoga Tropical.dc.html` é uma **referência de design feita em HTML com three.js 0.160**. É um protótipo que mostra o visual e o comportamento esperados, não um código de produção para copiar direto. A tarefa é **recriar essa cena no projeto existente**, seguindo a estrutura, o carregamento de modelos, o modo RV e os controles que já estão lá.

- Para abrir: sirva a pasta em um servidor local (por exemplo `npx serve .`) e abra o `.dc.html`. O arquivo `support.js` é só o runtime do protótipo; não leve ele para o projeto.
- **Toda a cena está no método `build()`** da classe `Component`, dentro do `.dc.html`. Esse trecho é three.js puro e pode ser portado quase 1:1.
- **`personagens.js`** é um módulo ES independente, que só depende do THREE: `createCast(THREE, placements) → { group, update(classT, clock) }`. Pode ser usado direto.

## Fidelidade
**Alta fidelidade** para medidas, cores, materiais, iluminação, câmera e movimento. A geometria de plantas, estátua e personagens é procedural (feita em código) e provisória. O ideal é substituir por modelos do Blender em GLB (veja "Próximos passos").

Escala: **1 unidade = 1 metro**. O eixo Y aponta para cima. A vista principal (lagoa) fica ao **norte (−Z)**.

---

## 1. Sala
- Tamanho: 10 m (X, de −5 a 5) × 8 m (Z, de −4 a 4) × 3,2 m de pé-direito. Piso em y = 0.
- **Paredes norte (z = −4) e leste (x = 5):** vidro do piso ao teto. O vidro é um MeshPhysical #DFEEE8 com opacidade 0,08 e depthWrite desligado. Montantes de 6 × 8 cm a cada 2 m, com perfis de topo e base em bronze escuro #2B2723 (metalness 0,4, rugosidade 0,5).
- **Parede oeste (x = −5.1):** sólida, com o altar no centro (z = −1).
- **Parede sul (z = 4.1):** sólida, com porta de 0,9 × 2,1 m em x = 3,45 e estante em x = −3.
- **Teto:** fundo #E9DFCF com ripas de madeira de 4,5 × 7 cm a cada 25 cm, no sentido norte–sul, feitas com InstancedMesh (40 ripas). As luzes redondas brancas da versão atual **saem**.
- **Rodapé:** madeira #B98D62 de 8 cm.

## 2. Materiais (MeshStandardMaterial, a não ser quando indicado)
| Uso | Cor | Rugosidade / outros |
|---|---|---|
| Piso de carvalho (textura de tábuas de 18 cm, 1024², repete a cada 2,88 m) | #C9A27A | 0,55 |
| Paredes de reboco de cal (textura de pintas sutis) | #EFE6D8 | 0,95 |
| Ripas, estante | #B98D62 | 0,7 |
| Altar, porta | #5A3D2B | 0,6 |
| Tapetes | #8FA58A, #C47A5A, #D9C3A0, #A86B56, #7F8A5E, #D9C3A0; tapete da professora #C9A27A | 0,9 |
| Rattan (pendentes, cestos) | #C9A06A (textura de trançado) | 0,85 |
| Cortiça (blocos) | #B88A5A | 0,95 |
| Bronze (estátua) | #8A7355 | metalness 0,6, rugosidade 0,45 |
| Vaso de barro | #B86B4B | 0,9 |
| Folhas | #3D6E3F, #2F5A34, #4A7A44, #355F33 | 0,65, dupla face (DoubleSide) |

O ambiente (environment) vem de um RoomEnvironment passado pelo PMREM. O `envMapIntensity` muda com a atmosfera (veja a seção 5).

## 3. Objetos (tamanho real)
- **Tapete:** 183 × 61 × 0,6 cm, cantos com raio de 5 cm (ExtrudeGeometry de um retângulo arredondado). São 6 tapetes em duas fileiras: z = −0,2 e z = 2,1, com x = −2,3, 0 e 2,3. Todos voltados para o norte. O tapete da professora fica em (0, −2,75).
- **Zafu (almofada redonda):** Ø 38 × 13 cm, feita com Lathe. Fica na ponta sul de cada tapete.
- **Bolster (almofada longa):** Ø 22 × 64 cm, feita com Capsule. **Blocos:** 23 × 15 × 8 cm.
- **Altar:** mesa de 140 × 45 × 42 cm. Estátua de bronze estilizada com cerca de 40 cm. Cinco velas de Ø 7 cm, com 10, 15 e 20 cm de altura, com chama emissiva e PointLight #FF9A4A tremulando. Incenso. Disco de rattan de Ø 1 m na parede, atrás. Uma planta alta de cada lado.
- **Pendentes:** três cúpulas de rattan de Ø 56 cm, a y = 2,6, em x = −2,3, 0 e 2,3, z = 0,95. Cada uma tem uma PointLight #FFCF99 com distância de 7 m.
- **Estante:** 160 × 35 × 90 cm, com três prateleiras, tapetes enrolados, uma pilha de blocos, um cesto e uma planta pequena.
- **Plantas internas:** costela-de-adão em vaso de barro e bananeira em cesto, uma em cada canto, com 1,2 a 1,9 m de altura.

## 4. Exterior
- Deck de 12 × 2,5 m logo ao norte do vidro.
- **Terreno em heightfield:** PlaneGeometry de 760 m com 240² segmentos e cores por vértice. As alturas vêm da função `hOf(x, z)` do código.
- **Lagoa:** elipse com centro em (15, −50) e raios de 65 × 40 m. Água #3F8A8C, rugosidade 0,06, com bumpMap de ondulação que desliza devagar. O envMap da água é o **próprio céu** passado pelo PMREM, recalculado a cada troca de atmosfera.
- **Praia:** faixa de areia #E6D5AE de cerca de 5 m entre o deck e a água (1,0 < e < 1,14 na elipse).
- **Montanhas:** sobem a partir de uns 90 m, com 30 a 60 m de altura. As encostas vão do verde #4A6A3F para pedra #8B8A80 e o topo é #A8A69C.
- **Árvores:** 26 coqueiros ao longo da praia (3,5 a 5,5 m quando estão a menos de 25 m da sala) e 34 árvores de copa redonda no gramado. Há também 320 árvores em InstancedMesh nas encostas distantes, a mais de 110 m. **Não há plantas grandes do lado de fora.**
- **Céu:** esfera de 400 m com gradiente por vértice. Névoa linear com a mesma cor do horizonte.

## 5. Atmosferas (seletor 1a / 1b / 1c)
| | 1a Dia tropical | 1b Entardecer | 1c Chuva e trovões |
|---|---|---|---|
| Céu (topo → horizonte) | #8FC3D9 → #E6EFE6 | #4A5D7A → #F3B37A | #5B646C → #9AA2A4 |
| Névoa (cor, início–fim) | #DCE8E2, 60–420 m | #E0A987, 50–380 m | #959D9F, 12–200 m |
| Sol (Directional) | #FFF1DC, intensidade 3,0, posição (9, 8, −12) | #FFA45C, 2,6, posição (16, 3.4, −6) | #D6DEE6, 0,5, posição (4, 14, −8) |
| Hemisfério (céu / chão, intensidade) | #DFEEFF / #8A7A5A, 1,1 | #FFC9A0 / #4A3A2A, 0,5 | #B4BEC4 / #3D3A34, 0,65 |
| Pendentes (PointLight) | 0 | 6 | 4 |
| Velas | 0,3 | 1,2 | 1,0 |
| Exposição / envMapIntensity | 1,0 / 0,45 | 1,05 / 0,18 | 0,95 / 0,25 |
| Água | #3F8A8C | #3D5F6E | #4D6264 |

Configuração do renderizador: ACESFilmic, sRGB, sombras PCFSoft com mapa de 2048 px. A câmera de sombra do sol cobre ±14 m. Bias −0.0004, normalBias 0.03.

**Chuva (1c):**
- Cerca de 6 mil LineSegments de 0,5 m (#D4DCE0, opacidade 0,4), caindo a 13–19 m/s num volume de 55 × 45 × 22 m. Nenhuma gota cai dentro da sala.
- **Relâmpago** a cada 7–17 s. A curva de brilho tem dois clarões: 1 → 0,15 → 0,8 → decai até 0 em 0,7 s. Ela soma +4 à intensidade do hemisfério e +0,7 à exposição.
- **Som** com WebAudio, só depois de um clique do usuário. A chuva é ruído branco com passa-banda de 1,1 kHz e ganho 0,14. O trovão é ruído marrom com passa-baixa de 900 → 140 Hz e envelope de 4,5 s, tocando de 0,4 a 2 s depois do clarão.
- Nessa atmosfera aparece o botão "Som ligado / Som desligado".

## 6. Câmera
- FOV de 50°. OrbitControls com damping 0,08, rotateSpeed −0,35 (arrastar funciona como "olhar em volta") e sem pan.
- A câmera fica presa dentro da sala: x entre ±4,7, z entre ±3,7 e y entre 0,3 e 3,0.
- A transição entre posições dura 1,1 s, com easing cúbico in-out.

| Posição | Onde fica | Para onde olha |
|---|---|---|
| Entrada (inicial) | (3.6, 2.05, 3.7) | (−0.8, 0.7, −2.3) |
| Sentado no tapete | (0, 0.95, 2.75) | (0, 1.0, −4) |
| Altar | (−2.4, 1.3, −0.4) | (−4.8, 0.8, −1) |
| Visão geral | (4.3, 2.4, 3.6) | (−1.2, 0.5, −1) |
| Professor | (0.9, 1.35, −0.7) | (0, 0.8, −2.85) |

## 7. Personagens (`personagens.js`)
Os personagens foram criados pela cliente para **evitar estereótipos humanos**. As silhuetas são uma interpretação mais realista dos desenhos de referência.

- **Professora (rosa, de capuz):** fica em (0, −2.85), de frente para a turma. Tem túnica com faixa na cintura, emblema de dois anéis no peito e rosto claro dentro do capuz.
- **Alunos**, virados para o norte (rot = π):
  - gota azul em (−2.3, 0.05)
  - broto em (0, 0.05)
  - gota pêssego em (2.3, 0.05)
  - origami em (−2.3, 2.35), com faces chapadas
  - roxo em (2.3, 2.35)
- O tapete do meio, no fundo, fica **livre para o visitante**. Existe também o estilo `cinza` (cinza com roupa laranja), que não está sendo usado.
- **Rig:** raiz na pelve, espinha, pescoço, cabeça, ombro e cotovelo de cada lado, quadril com ordem de rotação YXZ e joelho de cada lado. Altura de 1,55 a 1,7 m.
- **Material:** MeshPhysical com sheen 0,5 e clearcoat 0,22, para parecer vinil macio.
- **Aula** em ciclo de 48 s, com transição de 2,4 s (smoothstep) entre posturas: Respiração sentada (8 s) → Braços ao alto (5) → Respiração sentada (4) → Montanha (5) → Saudação ao alto (5) → Árvore (8) → Montanha (3) → Estrela (6) → Montanha (4).
- Os alunos seguem a professora com um atraso de 0,5 s + 0,18 s × índice.
- Movimentos contínuos: respiração (escala da espinha com seno de 1,2 rad/s) e balanço leve da cabeça.
- A interface mostra o nome da postura atual e tem o botão "Pausar aula / Continuar aula".
- **Integração sugerida:** ligar `classT` ao cronômetro da sessão de respiração que já existe (4-7-8 etc.), para que a professora conduza junto com a narração.

## 8. Vídeo de referência
O botão **"Gravar vídeo do tour (35 s)"**, abaixo da cena, grava o canvas com MediaRecorder. A câmera percorre Entrada, Professor e Tapete no dia, Visão geral e Altar no entardecer, e Tapete e Entrada na chuva. No fim, o arquivo `sala-de-yoga-tour.mp4` (ou `.webm`) é baixado.

## 9. Próximos passos (para ficar mais realista)
1. Esculpir os personagens no Blender, montar o esqueleto (rig) e exportar em GLB com as animações (uma por postura), usando as proporções e cores deste arquivo.
2. Substituir a estátua, as almofadas e as plantas por GLB com compressão Draco.
3. No celular: fazer o bake da luz num lightmap de 1K, usar texturas KTX2 de 1K, ficar em até ~150 mil triângulos e menos de 100 draw calls. Unir as folhas em InstancedMesh.
4. No celular, mostrar o painel "Como usar" só na primeira visita.

## 10. Sala de espera (nova)
A entrada da sala foi redesenhada: a pessoa monta a própria criatura (cor, acessórios, apelido, intenção) e escolhe um tapete livre. A especificação completa está em **`SALA_DE_ESPERA.md`**, e o protótipo em `Sala de Espera.dc.html`.

## Arquivos
- `Sala de Espera.dc.html` + `SALA_DE_ESPERA.md`: a tela de entrada e a integração com a sala.
- `Sala de Yoga Tropical.dc.html`: a cena completa (método `build()`), as atmosferas (`setMood()`), o áudio (`audio()`, `thunder()`), a câmera (`goCam()`) e a gravação de vídeo (`recordVideo()`).
- `personagens.js`: os personagens, a animação da aula e, agora, as cores personalizadas (`tint`) e os acessórios (`acc`).
- `support.js`: runtime do protótipo, necessário só para abrir o HTML.
- `referencias/`: capturas de tela da vista da entrada e da professora na postura da árvore.
