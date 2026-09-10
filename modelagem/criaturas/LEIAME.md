# Criaturas da sala de yoga — fonte dos modelos

Três seres, duas posturas cada. O `.glb` publicado sai daqui; sem estes
arquivos os modelos não podem mais ser alterados.

## Gerar

    blender --background --python criaturas.py               # 2 vistas em PNG
    blender --background --python criaturas.py -- --exportar # grava criaturas.glb

Blender portátil:
`Documents/blender-portatil/Blender Foundation/Blender 5.2/blender.exe`

## Otimizar para a web

    npx @gltf-transform/cli optimize criaturas.glb criaturas-web.glb \
      --texture-compress webp --texture-size 512 --compress draco --simplify false --join false

**`--join false` é obrigatório**: o site escolhe a criatura e a postura pelo
nome do nó (`angular_em_pe`, `broto_sentado`, …). Unir malhas por material
apagaria esses nomes e não haveria como saber qual corpo mostrar. É o mesmo
motivo da árvore, em `modelagem/sala-yoga/LEIAME.md`.

## As duas decisões que definem o script

**Metaball, não primitiva.** Esferas empilhadas leem como esferas empilhadas
porque não há continuidade entre elas — foi o defeito da primeira versão, feita
em primitivas do three.js direto no código. Metaball funde: o braço nasce do
tronco e a mão nasce do braço.

**Duas malhas estáticas por criatura, não um esqueleto.** A sala precisa de
exatamente duas poses, e nunca há transição animada entre elas: quem senta viaja
de câmera e o corpo troca fora de vista. Modelar as duas é muito mais barato que
montar esqueleto e pesar vértice, e na tela dá no mesmo.

## Armadilhas que custaram render

**`radius` de metaball é influência, não superfície.** A casca aparece por volta
de metade dele. Pondo o tamanho visível direto no `radius`, o primeiro render
saiu com os membros como bolas soltas em volta do tronco — exatamente o defeito
que o metaball existia para evitar. Daí a constante `INFLUENCIA`.

**Cabeça dentro do metaball vira ombro.** Com influência alta o bastante para
fundir os membros, a cabeça funde junto e a criatura vira um domo sem pescoço. A
cabeça é peça separada nas três.

**Braço colado ao tronco vira calombo.** Precisa de afastamento generoso para
ainda protuberar depois da fusão.

⚠️ **`transform_apply(scale=True)` aplica posição e rotação junto.** Os três
padrões do operador são `True`. Sem `location=False, rotation=False`, a origem do
objeto vai para (0,0,0) e qualquer rotação aplicada depois gira a peça em torno
do **centro do mundo**, não do próprio eixo. Foi o que arrancou as folhas do
broto e empurrou os olhos para fora do rosto. O sintoma parecia "geometria
solta", e a causa era origem — duas coisas que não se parecem.

## O que ainda falta

As posturas **sentadas** ainda leem como poça: as pernas cruzadas espalham em
vez de dobrar. É a próxima passada.

O `.glb` ainda não foi exportado nem ligado ao site — as criaturas em produção
continuam sendo as primitivas de `src/components/Avatares.tsx`.
