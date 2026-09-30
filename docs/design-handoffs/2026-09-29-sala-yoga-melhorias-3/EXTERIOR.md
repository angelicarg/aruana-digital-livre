# Parte externa — guia passo a passo para o Claude Code

O arquivo **`exterior.js`** é o código pronto e isolado da paisagem (three.js r160, sem dependências além do THREE). Dá para usar direto ou portar trecho a trecho. Este guia explica cada parte, o porquê de cada número, e como ajustar.

## Integração em 4 linhas
```js
import { createExterior } from './exterior.js';
const ext = createExterior(THREE, scene, renderer, { floorTex }); // floorTex = textura do piso interno (opcional)
ext.setMood('dia');                  // 'dia' | 'entardecer' | 'chuva'
// no loop de animação:
ext.update(dt, clock.elapsedTime);
```
- **Remova do projeto atual:** montanhas em forma de cone, plano de chão verde, plantas grandes externas, céu antigo.
- Sol, hemisfério, exposição e relâmpagos continuam no código da sala (tabela de atmosferas no `README.md`). `ext.setMood` cuida só de céu, névoa, água e chuva.
- `ext.materials` → aplique `envMapIntensity` da atmosfera (0,45 / 0,18 / 0,25) junto com os materiais internos.

## Sistema de coordenadas
- 1 unidade = 1 m, Y para cima. Sala em x ∈ [−5, 5], z ∈ [−4, 4], piso em y = 0.
- **Vidro norte em z = −4** → tudo o que importa na vista fica em **−Z**.
- Câmera: `near 0.05`, **`far 600`** (a esfera do céu tem raio 400; com far menor, o céu some).

## Ordem de montagem (como no arquivo)
1. **Deck** — plano 12 × 2,5 m em (1, −0,02, −5,25), mesma textura de tábuas do piso, tom #B59478.
2. **Céu** — `SphereGeometry(400, 32, 20)`, `BackSide`, `fog: false`, cor por vértice. Gradiente: horizonte → topo com `k = clamp(y/400 × 2,2)` e curva `k^0,7` (topo chega rápido, horizonte fica largo). Uma cópia do céu vai numa `envScene` separada para gerar o reflexo da água via `PMREMGenerator.fromScene`.
3. **Terreno** — um único `PlaneGeometry(760, 760, 240, 240)` centrado em (15, 0, −40). Cada vértice recebe altura `hOf(x,z)` e cor por vértice (sem texturas, leve e bonito ao longe).
4. **Água** — `CircleGeometry(1,128)` escalado para 65,6 × 40,4 m em y = −0,15. Material Standard, rugosidade 0,06, metalness 0,15, `bumpMap` de elipses (ondulação) que desliza no `update`.
5. **Coqueiros → árvores de copa → mata instanciada.**
6. **Chuva.**

## A função de altura `hOf(x, z)` — o coração da paisagem
Tudo gira em torno de `e = eOf(x,z)`, a distância elíptica ao centro da lagoa (15, −50) com raios 65 × 40:

| Faixa de `e` | O que é | Altura |
|---|---|---|
| e < 1 | Lagoa | desce até −4 m no centro |
| 1 – 1,14 | Praia (~5 m de largura) | ~0 |
| 1,14 – 1,7 | Gramado ondulado | 0 a ~3 m |
| 1,7 – 3,4 | Pé → topo das montanhas | sobe até 30–60 m |

- `n` = soma de 4 senos (ruído barato e determinístico). `ridge` cria cristas.
- `room = smoothstep(20, 70, distância até a sala)` **achata tudo perto da sala** — é o que garante vista aberta.
- **Ajustes comuns:**
  - Montanhas mais altas → aumente `30 + 14*n + 18*ridge`.
  - Montanhas mais longe → aumente `1.7` e `3.4`.
  - Lagoa maior/menor → `RX`, `RZ`. Mover → `LX`, `LZ`.
  - Praia mais larga → troque `1.14` (cor e altura) por 1,2.

## Cores do terreno (por altura)
Areia molhada #B9A47C (sob a água) → areia #E6D5AE → grama #7C9A5A → mata #4A6A3F (h 2–18 m) → pedra #8B8A80 (h 16–32 m) → topo #A8A69C (h > 36 m). A variável `w` (senos de alta frequência) quebra as faixas para não parecerem curvas de nível.

## Vegetação — regras de posicionamento
- **Zona proibida `clear(x,z)`:** nada entre x −7…8 e z −7…6 (sala + deck + frente do vidro).
- **Coqueiros (26 + 2):** sorteados no anel da praia (e 1,04–1,16), até 70 m. **Até 25 m da sala: 3,5–5,5 m de altura**; mais longe: 5–9 m (senão as copas próximas ficam acima da janela). Dois fixos emolduram a vista: (−6, −8,5) h 4,2 e (9, −6,5) h 5. Tronco = `TubeGeometry` numa curva com leve inclinação; 11 folhas = plano 0,9 × 3,4 deformado (formato de pena + arco + dobra em V), girando em volta do topo.
- **Árvores de copa (34):** no gramado (e > 1,2, h < 12), escala 0,9–1,7. **Fora de um cone de ±20° bem à frente da sala** (`|atan2(x,−z)| > 0.35`) — mantém a lagoa livre. Copa = 6 esferas levemente deformadas; 4 tons de verde.
- **Mata distante (320):** um único `InstancedMesh` nas encostas baixas (h 3–20 m), a mais de 110 m. Verde escuro HSL(0,27–0,32; 0,3; 0,12–0,17). Parece floresta densa por 1 draw call.
- Sombras: só coqueiros e árvores a < 40 m projetam sombra.
- **Não** há plantas grandes do lado de fora (pedido da cliente).

## Chuva
6000 `LineSegments` de 0,5 m, #D4DCE0, opacidade 0,4, velocidade 13–19 m/s, num volume de 55 × 45 × 22 m ao redor da sala. O `spawn` refaz a posição se cair dentro da sala (x ±5,4; z ±4,4). `frustumCulled = false` porque a geometria muda todo quadro.

## Desempenho
- ~60 mil triângulos no terreno, 1 draw call de mata. Total externo ≈ 150 draw calls (cada coqueiro são 12 meshes).
- **No celular:** reduza o terreno para 160 × 160 segmentos, `RN` da chuva para 2500, e junte as folhas de cada coqueiro com `BufferGeometryUtils.mergeGeometries` (vira 2 draw calls por coqueiro).

## Se preferir fazer no Blender
Dá para gerar a mesma paisagem no Blender e exportar GLB:
1. Plano 760 m, subdividido 240×; modificador *Displace* com uma imagem de altura exportada de `hOf` (ou esculpir usando o screenshot como guia).
2. Cor por vértice (ou textura 2K pintada) seguindo a tabela de cores acima.
3. Coqueiros e árvores como *Geometry Nodes* / *Scatter* com as mesmas regras de zona proibida.
4. Exportar com compressão Draco; manter a água e a chuva em three.js (precisam animar e refletir o céu).

## Checklist de aceite
- [ ] Da câmera "Sentado no tapete", a lagoa aparece de ponta a ponta pelo vidro norte, sem árvore na frente.
- [ ] Montanhas no fundo com topos em pedra, envoltas em névoa.
- [ ] Faixa de areia clara visível entre o deck e a água.
- [ ] Copas dos coqueiros próximos aparecem inteiras na janela.
- [ ] Nas 3 atmosferas, a água muda de cor e reflete o céu.
- [ ] Na chuva: riscos só do lado de fora, água ondulando mais rápido.
