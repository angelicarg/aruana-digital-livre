#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
gerar-voz.py — gera a locução do Aru na voz oficial da marca.

A voz é um ativo de marca: nenhum gerador de vídeo produz voz controlável (o Kling
sorteia a cada geração, o Veo também e recusa áudio de entrada), então a locução
nasce aqui e entra no vídeo depois — via Avatar do Kling, para lip-sync, ou via
--audio-mestre do montar-video.sh, para narração em off. Ver KLING.md.

Uso:
    python scripts/gerar-voz.py "Tire a mão do mouse." reel-tab
    python scripts/gerar-voz.py --arquivo roteiro.txt reel-tab

Sai em midia/vozes/<nome>.mp3 e .wav (o WAV serve para o FFmpeg sem reencode).
"""
import asyncio
import os
import subprocess
import sys

import edge_tts

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "midia", "vozes")

# Voz oficial do Aru — escolhida em 28/07/2026 comparando cinco amostras.
# Brian é uma voz multilíngue treinada em inglês que fala português; foi a que
# soou mais próxima do personagem. As personalidades que a Microsoft declara para
# ela — approachable, casual, sincere — batem com a definição do Aru.
# Só existe uma voz masculina nativa em pt-BR (AntonioNeural) e ela soou mais velha.
VOZ = "en-US-BrianMultilingualNeural"
RATE = "+5%"
PITCH = "+10Hz"


async def sintetizar(texto, destino):
    await edge_tts.Communicate(texto, VOZ, rate=RATE, pitch=PITCH).save(destino)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)

    if args[0] == "--arquivo":
        if len(args) < 3:
            sys.exit("uso: gerar-voz.py --arquivo <roteiro.txt> <nome>")
        texto = open(args[1], encoding="utf-8").read().strip()
        nome = args[2]
    else:
        if len(args) < 2:
            sys.exit("uso: gerar-voz.py \"<texto>\" <nome>")
        texto, nome = args[0], args[1]

    os.makedirs(SAIDA, exist_ok=True)
    mp3 = os.path.join(SAIDA, f"{nome}.mp3")
    asyncio.run(sintetizar(texto, mp3))

    # WAV 48 kHz mono: formato que o montar-video.sh e o Avatar consomem sem atrito
    wav = os.path.join(SAIDA, f"{nome}.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3,
                    "-ar", "48000", "-ac", "1", wav], check=True)

    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration", "-of", "csv=p=0", wav],
                         capture_output=True, text=True).stdout.strip()
    print(f"  {mp3}")
    print(f"  {wav}  ({float(dur):.1f}s)")
    print(f"voz: {VOZ}  rate={RATE}  pitch={PITCH}")


if __name__ == "__main__":
    main()
