# Professor e planta — modelos gerados por IA

`public/modelos/professor-em-pe.glb`, `professor-sentado.glb` e `planta.glb`
vieram do **Copilot 3D**, gerados pela Angelica em 10/09/2026. Não há script do
Blender por trás: a fonte é o `.glb` original.

## Onde estão os originais

`Documents/aruana-3d-fontes/` — fora do repositório de propósito: são ~6,5 MB
cada, e o repo é público e clonado a cada deploy. Sem eles o modelo publicado
não pode ser regerado com outra qualidade; guardar cópia se trocar de máquina.

## Otimizar

Diferente da sala, aqui **a geometria precisa ser simplificada**: o Copilot
entrega ~145 mil triângulos por figura, e uma figura de 1 m na sala pede ~15 mil.

    npx @gltf-transform/cli optimize ORIGINAL.glb SAIDA.glb \
      --texture-compress webp --texture-size 512 --compress draco \
      --simplify true --simplify-ratio 0.1 --simplify-error 0.002 --join false

De ~6,5 MB para ~135 KB cada, sem perda visível (conferido por render antes e
depois).

## O que o código assume

Nada de posição vem do arquivo: `useModeloNoChao` mede a caixa, põe os pés em
y = 0 e escala pela altura pedida. Um modelo novo entra trocando o arquivo; a
altura é constante em `PROFESSOR` / `PLANTA`.

A dobra do pescoço (`PROFESSOR.pescoco`) é em **fração da altura** do modelo:
0,56 com faixa 0,07, medido nos renders (queixo a ~0,59, emblema a ~0,5 nas
duas poses). Trocar o modelo do professor exige conferir essas frações.
