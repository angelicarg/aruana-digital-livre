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
