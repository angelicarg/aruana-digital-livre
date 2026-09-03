"""Recorta os quadros da cena gerada e os endireita.

Recorte retangular nao serve: na imagem os quadros estao em perspectiva, e um
corte reto sai trapezoidal. Aqui cada quadro e definido pelos quatro cantos do
papel e remapeado para um retangulo 2:3, que e a proporcao do painel na sala.
"""
import numpy as np
from PIL import Image

SAIDA = (768, 1152)  # 2:3, mesma proporcao do painel em sala_yoga.py

# (nome, [sup-esq, sup-dir, inf-dir, inf-esq]) em pixels da imagem original
QUADROS = [
    ("quadro_1", [(1634, 500), (1810, 491), (1807, 802), (1632, 807)]),   # Harmonia
    ("quadro_2", [(2007, 449), (2291, 419), (2291, 838), (2005, 821)]),   # Enso
]


def coeficientes(destino, origem):
    """Coeficientes da transformacao projetiva que o PIL espera (destino -> origem)."""
    m = []
    for (xd, yd), (xo, yo) in zip(destino, origem):
        m.append([xd, yd, 1, 0, 0, 0, -xo * xd, -xo * yd])
        m.append([0, 0, 0, xd, yd, 1, -yo * xd, -yo * yd])
    A = np.array(m, dtype=float)
    B = np.array(origem, dtype=float).reshape(8)
    return np.linalg.solve(A.T @ A, A.T @ B)


def normalizar(im):
    """Devolve o papel ao branco. A cena ja tinha luz quente embutida, e o Blender
    ilumina de novo — sem isto o quadro escurece duas vezes."""
    a = np.asarray(im, dtype=float)
    for c in range(3):
        canal = a[:, :, c]
        alto = np.percentile(canal, 99.0)
        baixo = np.percentile(canal, 1.0)
        a[:, :, c] = np.clip((canal - baixo) * 255.0 / max(alto - baixo, 1e-6), 0, 255)
    return Image.fromarray(a.astype("uint8"))


origem_img = Image.open("origem.jpg")
L, A = SAIDA
destino = [(0, 0), (L, 0), (L, A), (0, A)]

# Sobra de moldura nas bordas: os cantos foram lidos a olho e erram alguns pixels
# para fora. Recuar 3% resolve sem exigir precisao impossivel na leitura.
RECUO = 0.03

for nome, cantos in QUADROS:
    c = coeficientes(destino, cantos)
    plano = origem_img.transform(SAIDA, Image.PERSPECTIVE, c, Image.BICUBIC)
    mx, my = int(L * RECUO), int(A * RECUO)
    plano = plano.crop((mx, my, L - mx, A - my)).resize(SAIDA, Image.BICUBIC)
    normalizar(plano).save(f"{nome}.png")
    print(f"{nome}.png")
