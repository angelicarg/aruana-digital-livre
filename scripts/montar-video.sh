#!/usr/bin/env bash
#
# montar-video.sh — monta uma peça final a partir dos clipes gerados no Kling.
#
# Junta os clipes na ordem, normaliza áudio, aplica o logo master (BRAND.md: o logo
# NUNCA é gerado por IA, sempre colado do arquivo), queima legendas e exporta nos
# formatos pedidos. Roda 100% local no FFmpeg — não consome crédito do Kling.
#
# Uso:
#   scripts/montar-video.sh --entrada midia/reel-aru --nome reel-aru
#
# Exemplo completo (Aru falando + b-roll, áudio contínuo por cima):
#   scripts/montar-video.sh \
#     --entrada midia/reel-aru \
#     --nome reel-aru \
#     --audio-mestre midia/reel-aru/01-aru-fala.mp4 \
#     --transicao 0.3 \
#     --logo \
#     --legendas midia/reel-aru/legendas.srt \
#     --formatos 9:16,1:1
#
# Os clipes são lidos em ordem alfabética — nomeie-os 01-, 02-, 03-...
#
set -euo pipefail

# ---------------------------------------------------------------- padrões
ENTRADA=""
NOME=""
SAIDA="midia/saida"
FORMATOS="9:16"
AUDIO_MESTRE=""
TRANSICAO="0"
LOGO=""
LOGO_POS="br"
LOGO_LARGURA="12"     # % da largura do vídeo
LEGENDAS=""
FPS="30"
CRF="18"
LUFS="-16"            # alvo de loudness (padrão de redes sociais)
REENQUADRE="crop"     # crop = corta as bordas | pad = adiciona barras
LOGO_PADRAO="src/assets/aruana-logo.png"

msg()  { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[1;32m✔\033[0m %s\n' "$*"; }

# Aritmética de ponto flutuante via awk — o Git Bash do Windows não traz `bc`,
# e a ausência dele fazia o crossfade ser ignorado em silêncio.
calc()  { awk -v a="$1" -v b="$2" "BEGIN{printf \"%.4f\", $3}"; }
maior() { awk -v a="$1" -v b="$2" 'BEGIN{exit !(a>b)}'; }

# ---------------------------------------------------------------- argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --entrada)      ENTRADA="$2"; shift 2 ;;
    --nome)         NOME="$2"; shift 2 ;;
    --saida)        SAIDA="$2"; shift 2 ;;
    --formatos)     FORMATOS="$2"; shift 2 ;;
    --audio-mestre) AUDIO_MESTRE="$2"; shift 2 ;;
    --transicao)    TRANSICAO="$2"; shift 2 ;;
    --logo)         # aceita "--logo" sozinho ou "--logo caminho.png"
                    if [[ $# -ge 2 && "$2" != --* ]]; then LOGO="$2"; shift 2
                    else LOGO="$LOGO_PADRAO"; shift 1; fi ;;
    --logo-pos)     LOGO_POS="$2"; shift 2 ;;
    --logo-largura) LOGO_LARGURA="$2"; shift 2 ;;
    --legendas)     LEGENDAS="$2"; shift 2 ;;
    --fps)          FPS="$2"; shift 2 ;;
    --crf)          CRF="$2"; shift 2 ;;
    --lufs)         LUFS="$2"; shift 2 ;;
    --reenquadre)   REENQUADRE="$2"; shift 2 ;;
    -h|--ajuda)     sed -n '2,30p' "$0"; exit 0 ;;
    *)              erro "opção desconhecida: $1  (use --ajuda)" ;;
  esac
done

[[ -n "$ENTRADA" ]] || erro "informe --entrada <pasta com os clipes>"
[[ -n "$NOME"    ]] || erro "informe --nome <slug da peça>"
[[ -d "$ENTRADA" ]] || erro "pasta não encontrada: $ENTRADA"
command -v ffmpeg  >/dev/null || erro "ffmpeg não encontrado no PATH"
command -v ffprobe >/dev/null || erro "ffprobe não encontrado no PATH"
[[ -z "$LOGO" || -f "$LOGO" ]] || erro "logo não encontrado: $LOGO"
[[ -z "$LEGENDAS" || -f "$LEGENDAS" ]] || erro "legendas não encontradas: $LEGENDAS"
[[ -z "$AUDIO_MESTRE" || -f "$AUDIO_MESTRE" ]] || erro "áudio mestre não encontrado: $AUDIO_MESTRE"

# ---------------------------------------------------------------- clipes
mapfile -t CLIPES < <(find "$ENTRADA" -maxdepth 1 -type f \
  \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.webm' -o -iname '*.mkv' \) | sort)
N=${#CLIPES[@]}
(( N > 0 )) || erro "nenhum clipe de vídeo encontrado em $ENTRADA"

msg "$N clipe(s) encontrado(s):"
for c in "${CLIPES[@]}"; do printf '   • %s\n' "$(basename "$c")"; done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# resolução de trabalho = a do primeiro clipe (evita reescalar à toa)
LARG=$(ffprobe -v error -select_streams v:0 -show_entries stream=width  -of csv=p=0 "${CLIPES[0]}")
ALT=$( ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${CLIPES[0]}")
msg "resolução de trabalho: ${LARG}x${ALT} @ ${FPS}fps"

# ------------------------------------------------------- 1) normalizar clipes
# Uniformiza codec, fps, resolução, pixel format e SAR. Fundamental: um clipe SEM
# faixa de áudio quebra o concat quando os outros têm — aqui todo clipe sai com
# áudio, silencioso se preciso. É exatamente o caso "Aru falando + b-roll mudo".
msg "normalizando clipes…"
i=0
for c in "${CLIPES[@]}"; do
  TEM_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$c" | head -1)
  if [[ -n "$TEM_AUDIO" ]]; then
    ffmpeg -v error -y -i "$c" \
      -vf "scale=${LARG}:${ALT}:force_original_aspect_ratio=decrease,pad=${LARG}:${ALT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS}" \
      -c:v libx264 -crf "$CRF" -preset medium -pix_fmt yuv420p \
      -c:a aac -b:a 192k -ar 48000 -ac 2 \
      "$TMP/norm-$(printf '%03d' $i).mp4"
  else
    printf '   (sem áudio, inserindo silêncio) %s\n' "$(basename "$c")"
    ffmpeg -v error -y -i "$c" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
      -vf "scale=${LARG}:${ALT}:force_original_aspect_ratio=decrease,pad=${LARG}:${ALT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS}" \
      -c:v libx264 -crf "$CRF" -preset medium -pix_fmt yuv420p \
      -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest \
      "$TMP/norm-$(printf '%03d' $i).mp4"
  fi
  i=$((i+1))
done

mapfile -t NORM < <(find "$TMP" -maxdepth 1 -name 'norm-*.mp4' | sort)

# ------------------------------------------------------- 2) emendar
if maior "$TRANSICAO" 0 && (( N > 1 )); then
  msg "emendando com crossfade de ${TRANSICAO}s…"
  DURS=(); for f in "${NORM[@]}"; do
    DURS+=("$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")")
  done
  ARGS=(); for f in "${NORM[@]}"; do ARGS+=(-i "$f"); done

  # xfade encadeado: cada offset é o acumulado menos a duração da transição
  FILTRO=""; ACC="${DURS[0]}"; ATUAL_V="[0:v]"; ATUAL_A="[0:a]"
  for ((k=1; k<N; k++)); do
    OFF=$(calc "$ACC" "$TRANSICAO" 'a-b')
    FILTRO+="${ATUAL_V}[${k}:v]xfade=transition=fade:duration=${TRANSICAO}:offset=${OFF}[vx${k}];"
    FILTRO+="${ATUAL_A}[${k}:a]acrossfade=d=${TRANSICAO}[ax${k}];"
    ATUAL_V="[vx${k}]"; ATUAL_A="[ax${k}]"
    ACC=$(calc "$ACC" "$TRANSICAO" "a+${DURS[$k]}-b")
  done
  FILTRO+="${ATUAL_V}format=yuv420p[vout];${ATUAL_A}anull[aout]"
  ffmpeg -v error -y "${ARGS[@]}" -filter_complex "$FILTRO" \
    -map '[vout]' -map '[aout]' \
    -c:v libx264 -crf "$CRF" -preset medium -c:a aac -b:a 192k \
    "$TMP/emendado.mp4"
else
  msg "emendando com corte seco…"
  : > "$TMP/lista.txt"
  for f in "${NORM[@]}"; do printf "file '%s'\n" "$(basename "$f")" >> "$TMP/lista.txt"; done
  ( cd "$TMP" && ffmpeg -v error -y -f concat -safe 0 -i lista.txt -c copy emendado.mp4 )
fi

# ------------------------------------------------------- 3) áudio
# --audio-mestre: usa UMA faixa contínua (ex.: o clipe em que o Aru fala) por cima
# de toda a montagem, deixando o b-roll mudo por baixo. É o J-cut clássico, e é o
# que mantém a voz consistente — cada geração do Kling produz um timbre um pouco
# diferente, então o ideal é gerar a fala inteira de uma vez e reaproveitá-la.
ATUAL="$TMP/emendado.mp4"
if [[ -n "$AUDIO_MESTRE" ]]; then
  msg "aplicando áudio mestre: $(basename "$AUDIO_MESTRE")"
  ffmpeg -v error -y -i "$ATUAL" -i "$AUDIO_MESTRE" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 \
    "$TMP/com-audio.mp4"
  ATUAL="$TMP/com-audio.mp4"
fi

# O loudnorm reamostra internamente para 192 kHz; sem o aresample explícito o AAC
# sai em 96 kHz mono, fora do padrão das redes sociais (48 kHz estéreo).
msg "normalizando loudness para ${LUFS} LUFS…"
ffmpeg -v error -y -i "$ATUAL" \
  -af "loudnorm=I=${LUFS}:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 "$TMP/audio-ok.mp4"
ATUAL="$TMP/audio-ok.mp4"

# ------------------------------------------------------- 4) logo e legendas
# Filtros de arquivo (subtitles/movie) engasgam com caminho do Windows por causa
# do "C:" — por isso tudo é copiado para o TMP e referenciado por nome simples.
if [[ -n "$LOGO" ]]; then
  msg "aplicando logo master ($LOGO_POS, ${LOGO_LARGURA}% da largura)…"
  cp "$LOGO" "$TMP/logo.png"
  M=$(( LARG * 4 / 100 ))                     # margem de 4%
  LW=$(( LARG * LOGO_LARGURA / 100 ))
  case "$LOGO_POS" in
    br) POS="W-w-${M}:H-h-${M}" ;;
    bl) POS="${M}:H-h-${M}"     ;;
    tr) POS="W-w-${M}:${M}"     ;;
    tl) POS="${M}:${M}"         ;;
    *)  erro "--logo-pos inválido: $LOGO_POS (use br|bl|tr|tl)" ;;
  esac
  cp "$ATUAL" "$TMP/pre-logo.mp4"
  ( cd "$TMP" && ffmpeg -v error -y -i pre-logo.mp4 -i logo.png \
      -filter_complex "[1:v]scale=${LW}:-1[lg];[0:v][lg]overlay=${POS}:format=auto[v]" \
      -map '[v]' -map 0:a -c:v libx264 -crf "$CRF" -preset medium -c:a copy com-logo.mp4 )
  ATUAL="$TMP/com-logo.mp4"
fi

if [[ -n "$LEGENDAS" ]]; then
  msg "queimando legendas…"
  cp "$LEGENDAS" "$TMP/leg.srt"
  cp "$ATUAL" "$TMP/pre-leg.mp4"
  ESTILO="FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=60"
  ( cd "$TMP" && ffmpeg -v error -y -i pre-leg.mp4 \
      -vf "subtitles=leg.srt:force_style='${ESTILO}'" \
      -c:v libx264 -crf "$CRF" -preset medium -c:a copy com-leg.mp4 )
  ATUAL="$TMP/com-leg.mp4"
fi

# ------------------------------------------------------- 5) exportar formatos
mkdir -p "$SAIDA"
msg "exportando…"
IFS=',' read -ra LISTA <<< "$FORMATOS"
for F in "${LISTA[@]}"; do
  F="$(echo "$F" | tr -d ' ')"
  case "$F" in
    9:16) OW=1080; OH=1920 ;;
    1:1)  OW=1080; OH=1080 ;;
    16:9) OW=1920; OH=1080 ;;
    4:5)  OW=1080; OH=1350 ;;
    *)    erro "formato não suportado: $F (use 9:16, 1:1, 16:9 ou 4:5)" ;;
  esac
  DEST="$SAIDA/${NOME}-${F/:/x}.mp4"
  if [[ "$REENQUADRE" == "pad" ]]; then
    VF="scale=${OW}:${OH}:force_original_aspect_ratio=decrease,pad=${OW}:${OH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
  else
    VF="scale=${OW}:${OH}:force_original_aspect_ratio=increase,crop=${OW}:${OH},setsar=1"
  fi
  ffmpeg -v error -y -i "$ATUAL" -vf "$VF" \
    -c:v libx264 -crf "$CRF" -preset medium -pix_fmt yuv420p \
    -c:a aac -b:a 192k -movflags +faststart "$DEST"
  TAM=$(du -h "$DEST" | cut -f1)
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DEST")
  ok "$DEST  (${OW}x${OH}, ${TAM}, $(printf '%.1f' "$DUR")s)"
done

# capa para thumbnail / preview
ffmpeg -v error -y -i "$ATUAL" -vframes 1 -q:v 2 "$SAIDA/${NOME}-capa.jpg"
ok "$SAIDA/${NOME}-capa.jpg"

msg "pronto."
