#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
gerar-pecas.py — compõe peças de carrossel da Aruanã Digital.

Nada aqui é gerado por IA: o Aru vem dos assets oficiais e o texto é
desenhado em fonte real (Sora + Inter). Isso garante o que a geração por
imagem não garante — tipografia correta com acento, personagem idêntico
entre cards e custo zero por revisão. Ver KLING.md e BRAND.md.

Uso:
    python scripts/gerar-pecas.py midia/carrosseis/acessibilidade.json

Campos aceitos por card (todos opcionais menos `titulo`):
    layout      "lateral" (Aru à esquerda) | "inferior" (Aru no topo) | "texto"
    aru         nome do arquivo em midia/aru/web/
    aru_altura  fração da altura do card (padrão 0.74)
    aru_ancora  [x_rel, y_rel] do canto do personagem
    kicker      linha curta em caixa alta, verde, acima do título
    titulo      obrigatório; Sora Bold
    subtitulo   parágrafo em Inter Regular
    destaque    parágrafo em Inter Bold branco (a frase de impacto)
    bullets     lista de strings, cada uma com marcador verde
    fonte       crédito da estatística — BRAND.md regra 3
    url         chamada final, em verde
    rodape      texto no pé do card, precedido de linha divisória
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTES = os.path.join(RAIZ, "midia", "fontes")
# midia/ está fora do Git (pasta de trabalho); public/marca/ é versionado e
# publicado. Num clone limpo, os assets vêm de lá.
ASSETS = os.path.join(RAIZ, "midia", "aru", "web")
if not os.path.isdir(ASSETS):
    ASSETS = os.path.join(RAIZ, "public", "marca")

AJUDA_FONTES = """
Fontes da marca não encontradas em midia/fontes/.
Sora e Inter são OFL (Google Fonts); baixe com:

  mkdir -p midia/fontes
  curl -sL -o midia/fontes/Sora.ttf \\
    "https://github.com/google/fonts/raw/main/ofl/sora/Sora%5Bwght%5D.ttf"
  curl -sL -o midia/fontes/Inter.ttf \\
    "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
"""

# Paleta da marca — espelha as variáveis de src/styles.css
NAVY_DEEP = (4, 27, 51)
VERDE_ESCURO = (8, 58, 48)
VERDE_CLARO = (63, 211, 155)
BRANCO = (255, 255, 255)
CINZA = (199, 211, 208)
CINZA_FRACO = (138, 156, 152)
LINHA = (48, 72, 92)

LARG, ALT = 1080, 1350
MARGEM = 80


def fonte(familia, peso, tamanho):
    """Sora e Inter são fontes variáveis — um arquivo, todos os pesos."""
    f = ImageFont.truetype(os.path.join(FONTES, f"{familia}.ttf"), tamanho)
    try:
        f.set_variation_by_name(peso)
    except Exception:
        pass  # fonte estática: o peso já está embutido
    return f


def fundo_gradiente(cx=0.42, cy=0.38, intensidade=1.0):
    """Glow radial esverdeado sobre navy. intensidade=0 dá navy chapado."""
    y, x = np.mgrid[0:ALT, 0:LARG].astype(np.float32)
    d = np.sqrt(((x / LARG - cx) * 1.15) ** 2 + ((y / ALT - cy) * 0.95) ** 2)
    t = np.clip(d / 0.78, 0, 1)[..., None]
    centro = np.array(NAVY_DEEP, np.float32) + (
        np.array(VERDE_ESCURO, np.float32) - np.array(NAVY_DEEP, np.float32)
    ) * intensidade
    borda = np.array(NAVY_DEEP, np.float32)
    return Image.fromarray((centro * (1 - t) + borda * t).astype(np.uint8), "RGB")


def texto_tracked(d, xy, txt, f, fill, tracking=0):
    """PIL não tem entrelinhamento; desenha caractere a caractere."""
    x, y = xy
    if not tracking:
        d.text((x, y), txt, font=f, fill=fill)
        return
    for ch in txt:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking


def quebrar(d, txt, f, larg_max):
    linhas, atual = [], ""
    for palavra in txt.split():
        teste = f"{atual} {palavra}".strip()
        if d.textlength(teste, font=f) <= larg_max or not atual:
            atual = teste
        else:
            linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


def colar_aru(base, nome, altura_rel, ancora):
    im = Image.open(os.path.join(ASSETS, nome)).convert("RGBA")
    h = int(ALT * altura_rel)
    w = round(im.size[0] * h / im.size[1])
    im = im.resize((w, h), Image.LANCZOS)
    x = int(LARG * ancora[0]) - (w // 2 if ancora[0] > 0.5 else 0)
    base.alpha_composite(im, (x, int(ALT * ancora[1])))


def cabecalho(base, d, indice, total):
    """Símbolo + nome em texto real — BRAND.md: o nome nunca vai embutido na
    imagem, vai sempre ao lado do símbolo. Sobre fundo escuro usa-se a versão
    monocromática clara, porque no master o corpo do peixe é espaço negativo e
    desaparece."""
    x = MARGEM
    marca = os.path.join(RAIZ, "public", "marca", "logo-mono-claro-v1.png")
    if os.path.isfile(marca):
        lg = Image.open(marca).convert("RGBA")
        h = 52
        lg = lg.resize((round(lg.size[0] * h / lg.size[1]), h), Image.LANCZOS)
        base.alpha_composite(lg, (x, 72))
        x += lg.size[0] + 22
    texto_tracked(d, (x, 86), "ARUANÃ DIGITAL",
                  fonte("Inter", "SemiBold", 25), VERDE_CLARO, tracking=5.5)
    f = fonte("Inter", "Bold", 25)
    rot = f"{indice}/{total}"
    d.text((LARG - MARGEM - d.textlength(rot, font=f), 86), rot, font=f, fill=BRANCO)


def rodape(d, card):
    """Linha divisória + crédito no pé — usado quando a fonte é longa."""
    if not card.get("rodape"):
        return
    y = ALT - MARGEM - 62
    d.line([(MARGEM, y), (LARG - MARGEM, y)], fill=LINHA, width=2)
    d.text((MARGEM, y + 22), card["rodape"], font=fonte("Inter", "Regular", 24),
           fill=CINZA_FRACO)


def bloco_texto(d, card, x, y, larg, desenhar=True):
    """Kicker → título → subtítulo → destaque → bullets → fonte → URL.

    Com desenhar=False apenas percorre o layout e devolve a altura — é assim
    que os layouts centralizados sabem onde começar.
    """
    y0 = y
    if card.get("kicker"):
        if desenhar:
            texto_tracked(d, (x, y), card["kicker"].upper(),
                          fonte("Inter", "SemiBold", 27), VERDE_CLARO, tracking=4.5)
        y += 62

    ft = fonte("Sora", "Bold", card.get("tamanho_titulo", 74))
    for linha in quebrar(d, card["titulo"], ft, larg):
        if desenhar:
            d.text((x, y), linha, font=ft, fill=BRANCO)
        y += int(ft.size * 1.16)
    y += 22

    if card.get("subtitulo"):
        fs = fonte("Inter", "Regular", 34)
        for linha in quebrar(d, card["subtitulo"], fs, larg):
            if desenhar:
                d.text((x, y), linha, font=fs, fill=CINZA)
            y += int(fs.size * 1.38)
        y += 16

    if card.get("destaque"):
        fd = fonte("Inter", "Bold", 34)
        for linha in quebrar(d, card["destaque"], fd, larg):
            if desenhar:
                d.text((x, y), linha, font=fd, fill=BRANCO)
            y += int(fd.size * 1.38)
        y += 16

    for item in card.get("bullets", []):
        fb = fonte("Inter", "Bold", 38)
        if desenhar:
            d.rounded_rectangle([x, y + 13, x + 26, y + 39], radius=7, fill=VERDE_CLARO)
            d.text((x + 54, y), item, font=fb, fill=BRANCO)
        y += 76

    # BRAND.md regra 3: estatística exige fonte verificável E citada na arte
    if card.get("fonte"):
        if desenhar:
            d.text((x, y), f"Fonte: {card['fonte']}",
                   font=fonte("Inter", "Regular", 24), fill=CINZA_FRACO)
        y += 52

    if card.get("url"):
        if desenhar:
            d.text((x, y), card["url"], font=fonte("Inter", "Bold", 34), fill=VERDE_CLARO)
        y += 52
    return y - y0 if not desenhar else y


def montar(card, indice, total):
    layout = card.get("layout", "texto")
    glow = card.get("centro_glow", (0.42, 0.38))
    intensidade = card.get("glow", 1.0 if layout != "texto" else 0.45)
    base = fundo_gradiente(glow[0], glow[1], intensidade).convert("RGBA")

    if layout == "lateral":
        colar_aru(base, card["aru"], card.get("aru_altura", 0.74),
                  card.get("aru_ancora", (0.02, 0.14)))
        d = ImageDraw.Draw(base)
        cabecalho(base, d, indice, total)
        x, larg = int(LARG * 0.46), int(LARG * 0.46)
        h = bloco_texto(d, card, x, 0, larg, desenhar=False)
        y = int(ALT * 0.13) + max((ALT - MARGEM - int(ALT * 0.13) - h) // 2, 0)
        bloco_texto(d, card, x, y, larg)

    elif layout == "inferior":
        colar_aru(base, card["aru"], card.get("aru_altura", 0.72),
                  card.get("aru_ancora", (0.52, 0.03)))
        d = ImageDraw.Draw(base)
        cabecalho(base, d, indice, total)
        # véu escuro para o texto não competir com o personagem
        alt_veu = int(ALT * 0.42)
        veu = Image.new("RGBA", (LARG, alt_veu), (0, 0, 0, 0))
        g = np.linspace(0, 190, alt_veu).astype(np.uint8)
        veu.putalpha(Image.fromarray(np.repeat(g[:, None], LARG, axis=1), "L"))
        base.alpha_composite(veu, (0, ALT - alt_veu))
        d = ImageDraw.Draw(base)
        bloco_texto(d, card, MARGEM, int(ALT * 0.63), LARG - 2 * MARGEM)

    else:  # texto puro — miolo informativo do carrossel
        d = ImageDraw.Draw(base)
        cabecalho(base, d, indice, total)
        larg = LARG - 2 * MARGEM
        h = bloco_texto(d, card, MARGEM, 0, larg, desenhar=False)
        topo, base_util = int(ALT * 0.16), ALT - MARGEM - (110 if card.get("rodape") else 0)
        y = topo + max((base_util - topo - h) // 2, 0)
        bloco_texto(d, card, MARGEM, y, larg)

    d = ImageDraw.Draw(base)
    rodape(d, card)
    return base.convert("RGB")


def main():
    if len(sys.argv) < 2:
        sys.exit("uso: python scripts/gerar-pecas.py <arquivo.json>")
    for f in ("Sora.ttf", "Inter.ttf"):
        if not os.path.isfile(os.path.join(FONTES, f)):
            sys.exit(AJUDA_FONTES)
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    cards = spec["cards"]
    saida = os.path.join(os.path.dirname(sys.argv[1]), spec["nome"])
    os.makedirs(saida, exist_ok=True)

    for i, card in enumerate(cards, 1):
        dest = os.path.join(saida, f"{spec['nome']}-{i:02d}.png")
        montar(card, i, len(cards)).save(dest, optimize=True)
        print(f"  {dest}  ({os.path.getsize(dest)//1024} KB)")
    print(f"{len(cards)} peça(s) em {saida}")


if __name__ == "__main__":
    main()
