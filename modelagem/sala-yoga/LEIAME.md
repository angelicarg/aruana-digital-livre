# Sala de yoga — fonte do modelo

O `.glb` publicado em `aruana-digital-novo/public/modelos/sala-yoga.glb` é
gerado daqui. Sem estes arquivos o modelo não pode mais ser alterado.

## Gerar

    blender --background --python sala_yoga.py              # 4 vistas em PNG
    blender --background --python sala_yoga.py -- --exportar # grava sala-yoga.glb

Blender portátil: `Documents/blender-portatil/Blender Foundation/Blender 5.2/blender.exe`

## Otimizar para a web

    npx @gltf-transform/cli optimize sala-yoga.glb sala-yoga-web.glb \
      --texture-compress webp --texture-size 512 --compress draco --simplify false

A árvore sai em `arvore.glb` separado e usa **`--join false`**:

    npx @gltf-transform/cli optimize arvore.glb arvore-web.glb       --texture-compress webp --texture-size 512 --compress draco --simplify false --join false

⚠️ **Na sala, cada tapete precisa de cor própria.** O `optimize` padrão funde
materiais idênticos e junta as malhas que passam a dividir material: com duas
fileiras e cores repetidas, 7 tapetes saíram como 3 nós e o site — que acha cada
tapete pelo nome — perdeu os lugares. O script agora se recusa a exportar com
cor repetida. Conferir depois de otimizar: `tapete_0` a `tapete_N` precisam
estar todos no `.glb` publicado.

Os dois detalhes da árvore são obrigatórios, não preferência. `join` funde malhas por
material e apagaria os nós `copa_0..N`, que o balanço ao vento procura pelo nome.
E se a árvore ficasse dentro do glb da sala, o passo `palette` fundiria a cor da
copa com montanha e cacto — animar aquele material faria a montanha balançar.

Separada custa 12 KB e mantém as 7 copas. Junto e sem `join` custaria 277 KB com
90 chamadas de desenho, contra os 203 KB e 12 de hoje.

## Quadros

`arte/quadro_1.png` e `arte/quadro_2.png` entram automaticamente nas molduras.
Formato: retrato 2:3. Qualquer arquivo novo com esse nome é usado no render
seguinte, sem mexer no script.

`arte/recortar.py` extraiu os dois de `arte/origem.jpg` por transformação de
perspectiva — a arte tinha sido gerada dentro de um cenário, em ângulo.

## Direção de arte

Toda decisão visual é uma constante nomeada no topo de `sala_yoga.py`:
dimensões, sol, luz interna, montanhas, tapetes, quadros e as 4 câmeras.
Ajustar é trocar número, não remodelar.
