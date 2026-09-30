# Iluminação — guia passo a passo para o Claude Code

O arquivo **`iluminacao.js`** tem o código pronto e isolado de toda a luz da cena (three.js r160). Funciona junto com `exterior.js`: um cuida da luz, o outro de céu, névoa, água e chuva. Os dois recebem o mesmo nome de atmosfera.

## Integração
```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLighting } from './iluminacao.js';
import { createExterior } from './exterior.js';

const luz = createLighting(THREE, scene, renderer, { RoomEnvironment, altar: { x: -4.75, y: 0.42, z: -1 } });
const ext = createExterior(THREE, scene, renderer, { floorTex });
luz.registerMaterials([...materiaisDaSala, ...ext.materials]);
luz.setShadeMaterial(mRattan);           // material das cúpulas dos pendentes
luz.onThunder = (atraso) => tocarTrovao(atraso);

function setAtmosfera(id) { luz.setMood(id); ext.setMood(id); }

// no loop:
luz.update(dt, clock.elapsedTime);
ext.update(dt, clock.elapsedTime);
renderer.render(scene, camera);
```
**Remova do projeto atual:** as luzes redondas brancas do teto, qualquer AmbientLight e outras luzes direcionais. Com tone mapping ACES, luz sobrando deixa a cena lavada.

## As 6 camadas de luz, e para que serve cada uma
| # | Luz | Papel | Sombra? |
|---|---|---|---|
| 1 | **Tone mapping ACES + sRGB** | Deixa o vidro e o céu claros sem estourar, e dá contraste de filme | – |
| 2 | **RoomEnvironment (IBL)** | Reflexos suaves em madeira, bronze e no vinil dos personagens | – |
| 3 | **HemisphereLight** | Luz do céu entrando pelo vidro: azulada de cima, terrosa de baixo | não |
| 4 | **DirectionalLight "Sol"** | Luz principal, faixas de sol no piso, sombras | **sim, a única** |
| 5 | **3 PointLights nos pendentes** | Poças de luz quente sobre os tapetes à noite | não |
| 6 | **3 PointLights nas velas** | Brilho alaranjado tremulando no altar | não |

Só o sol projeta sombra, de propósito: cada luz com sombra custa uma renderização extra da cena.

## Valores por atmosfera
| Parâmetro | Dia tropical | Entardecer | Chuva e trovões |
|---|---|---|---|
| Hemisfério: céu | #DFEEFF | #FFC9A0 | #B4BEC4 |
| Hemisfério: chão | #8A7A5A | #4A3A2A | #3D3A34 |
| Hemisfério: intensidade | 1,10 | 0,50 | 0,65 (+4 no relâmpago) |
| Sol: cor | #FFF1DC | #FFA45C | #D6DEE6 |
| Sol: intensidade | 3,0 | 2,6 | 0,5 |
| Sol: posição (x, y, z) | (9, 8, −12) | (16, 3,4, −6), **baixo** | (4, 14, −8), alto e fraco |
| Pendentes (PointLight) | 0 (apagados) | 6 | 4 |
| Lâmpada (emissive) | 0 | 2,2 | 1,6 |
| Cúpula de rattan (emissive) | 0 | 0,35 | 0,25 |
| Velas | 0,3 | 1,2 | 1,0 |
| Exposição | 1,00 | 1,05 | 0,95 (+0,7 no relâmpago) |
| envMapIntensity (materiais) | 0,45 | 0,18 | 0,25 |

### Por que esses números
- **Posição do sol.** Com `z` negativo o sol fica atrás da lagoa (norte), então entra pelo vidro e desenha as sombras dos montantes no piso, na direção dos tapetes. No entardecer ele fica baixo (y = 3,4) e vindo do leste-norte: a luz atravessa a sala na horizontal e ilumina o rosto da professora de lado.
- **Entardecer.** O hemisfério cai para 0,5 e o envMap para 0,18. É isso que faz a luz quente dos pendentes e das velas "ganhar" do céu. Se o envMap ficar alto, a sala continua com cara de dia.
- **Chuva.** Sol fraco (0,5), sem sombra marcada. Os pendentes ficam acesos em 4, porque dentro de casa fica escuro quando chove. A névoa curta (12–200 m) do `exterior.js` completa o clima.
- **Cúpula emissiva.** Sem isso o rattan fica preto contra a lâmpada acesa. Um brilho de 0,25 a 0,35 simula a luz passando pela trama.

## Sombras do sol
- Mapa de 2048 × 2048, PCFSoft.
- Área da câmera de sombra: ±14 m. Cobre a sala (10 × 8 m), o deck e os dois coqueiros que emolduram a vista. **Não aumente**: com área maior a sombra fica borrada e serrilhada.
- `bias −0.0004` e `normalBias 0.03` evitam listras no piso (acne) e sombra descolada dos pés dos personagens.
- Quem **projeta** sombra (`castShadow`): paredes, montantes, móveis, almofadas, plantas internas, personagens, coqueiros e árvores a menos de 40 m.
- Quem **recebe** sombra (`receiveShadow`): piso, deck, tapetes, terreno e água.
- Os tapetes **não** projetam sombra (são finos demais e gerariam artefato).

## Velas
- Chama: esfera de 1,2 cm esticada 2,2× na vertical, `MeshBasicMaterial` #FFC070. Fica sempre acesa, independente da luz.
- 5 velas e só 3 luzes (uma a cada duas velas). Cada luz: #FF9A4A, alcance 4 m, decaimento 2 (físico).
- Tremulação: `0.85 + 0.15·sin(9t) + 0.08·sin(23t)`. São dois senos fora de fase, o que parece orgânico e não pisca como um `Math.random()`.

## Relâmpago
Curva do clarão em segundos, a partir do disparo:

| Tempo | Brilho |
|---|---|
| 0 – 0,08 | 1 |
| 0,08 – 0,16 | 0,15 |
| 0,16 – 0,26 | 0,8 |
| 0,26 – 0,70 | decai de 0,5 até 0 |

O clarão duplo é o que faz parecer um relâmpago de verdade. Ele soma `+4 × brilho` ao hemisfério e `+0,7 × brilho` à exposição. O som do trovão vem 0,4 a 2 s depois (a luz chega antes do som); `onThunder(atraso)` avisa quando tocar. O intervalo entre relâmpagos é de 7 a 17 s.

## Celular e óculos de RV
- **Médio:** sombra em 1024 e `setPixelRatio(1)`.
- **Leve:** desligue `castShadow` do sol e use um **lightmap** feito no Blender (bake de Cycles só da luz do dia) no piso e nas paredes. Mantenha as PointLights, que são baratas sem sombra.
- Na RV, mantenha a exposição 0,1 mais baixa: as lentes dos óculos realçam os brancos.

## Se for fazer bake no Blender
1. Monte a sala com as mesmas posições de luz: Sun com força ~4 e ângulo de 2°, e as cores da tabela.
2. Faça o bake em Cycles, 512 amostras, **só Diffuse → Direct + Indirect**, 2K para piso e paredes e 1K para o resto.
3. Exporte um lightmap por atmosfera (dia / entardecer / chuva) ou só o do dia e tinja os outros em tempo real.
4. No three.js: `material.lightMap = tex; material.lightMapIntensity = 1`. Nesse caso, diminua o hemisfério pela metade.

## Checklist de aceite
- [ ] **Dia:** faixas de sol com as sombras dos montantes no piso; os pendentes ficam apagados.
- [ ] **Entardecer:** céu laranja, luz quente e rasante; três poças de luz sobre os tapetes; o altar brilha.
- [ ] **Chuva:** sala acinzentada e aconchegante, pendentes acesos, relâmpago com clarão duplo e trovão atrasado.
- [ ] Nenhuma área estourada de branco no vidro, em nenhuma atmosfera.
- [ ] Sem listras de sombra no piso nem sombra descolada dos pés dos personagens.
- [ ] As velas tremulam o tempo todo, inclusive no dia (fraco).
