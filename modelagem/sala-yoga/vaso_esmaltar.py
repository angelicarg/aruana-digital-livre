"""Troca a terracota do vaso da planta por cerâmica esmaltada colorida.

    blender --background --python vaso_esmaltar.py -- ENTRADA.glb SAIDA.glb PASTA_DEBUG

O vaso passou a ser o ponto de cor saturada da sala, papel que era das flores
dos cactos. Por isso o matiz aqui é o **mesmo** das flores: as criaturas e os
tapetes foram calibrados para não competir com aquela magenta, e trocar o matiz
obrigaria a recalibrar tudo de novo.

Só o croma muda: cada texel mantém a **luminância** que a terracota tinha e
recebe o matiz do esmalte. Isso não é preciosismo, é o que faz a cor aparecer.

⚠️ **Não multiplique a cor do esmalte pelo sombreamento.** Foi a primeira
tentativa e o vaso saiu rosa pastel. O albedo da terracota tem luma ~0,20 e o
magenta das flores tem 0,36: posto direto, o canal vermelho estoura em 1,0
enquanto verde e azul continuam subindo, e a cor caminha para o branco. Cor
saturada só se sustenta sob luz se o albedo não satura — por isso o esmalte
entra **rebaixado** à luma que o barro tinha, e a sala continua expondo o vaso
exatamente como expunha antes.

Por isso também não há realce de contraste aqui: a textura é quase chapada
(luma de 0,11 a 0,23) e a luz vem da cena, então abrir contraste no albedo só
amplificaria as costuras de UV — elas viravam trincos claros no vaso rosa. O
brilho de esmalte é rugosidade, que é material, e não cor.
"""
import bpy, sys, os
import numpy as np

# Magenta das flores de cacto (CORES_FLOR[0] em sala_yoga.py), em linear.
# Alternativas do mesmo conjunto, se ela quiser trocar: amarelo
# (0.95, 0.72, 0.18) ou laranja (0.90, 0.35, 0.25). Qualquer matiz fora desse
# conjunto pede conferir as cores das criaturas em lib/presenca.ts.
ESMALTE = (0.86, 0.20, 0.42)
# Fração da altura do modelo até onde vai o vaso. Medida no render de frente:
# a borda fica a ~0,384 e a primeira folha começa acima dela.
VASO_TOPO = 0.42
# Luminância do esmalte em relação à da terracota. 1,0 = o vaso reflete tanta
# luz quanto antes e nada na sala muda de exposição. Acima de 1,0 ele avança
# como ponto de cor, ao custo de saturação: em ~1,7 o vermelho encosta em 1,0 e
# a magenta começa a virar rosa.
BRILHO = 1.0

src, saida, pasta = sys.argv[-3:]
os.makedirs(pasta, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=src)

ob = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
me = ob.data
img = bpy.data.images["Image_0"]   # o outro mapa não é cor base: ver LEIAME
W, H = img.size
uv = me.uv_layers.active.data
zs = [(ob.matrix_world @ v.co).z for v in me.vertices]
z0, altura = min(zs), max(zs) - min(zs)

baixo = np.zeros((H, W), bool)   # texels de face abaixo da borda do vaso
folha = np.zeros((H, W), bool)   # texels de qualquer face acima dela


def rasterizar(alvo, pts):
    (ax, ay), (bx, by), (cx, cy) = pts
    x0, x1 = int(max(0, min(ax, bx, cx))), int(min(W - 1, max(ax, bx, cx)) + 1)
    y0, y1 = int(max(0, min(ay, by, cy))), int(min(H - 1, max(ay, by, cy)) + 1)
    if x1 <= x0 or y1 <= y0:
        return
    xs, ys = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(d) < 1e-12:
        return
    l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
    l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
    alvo[y0:y1, x0:x1] |= (l1 >= -0.02) & (l2 >= -0.02) & (1 - l1 - l2 >= -0.02)


for p in me.polygons:
    zc = ((ob.matrix_world @ p.center).z - z0) / altura
    alvo = baixo if zc <= VASO_TOPO else folha
    pts = [(uv[li].uv.x * W, uv[li].uv.y * H) for li in p.loop_indices]
    for k in range(1, len(pts) - 1):
        rasterizar(alvo, (pts[0], pts[k], pts[k + 1]))

px = np.array(img.pixels[:], dtype=np.float64).reshape(H, W, 4)
rgb = px[..., :3].copy()
LUMA = np.array([0.2126, 0.7152, 0.0722])
luma = rgb @ LUMA

# A faixa de altura sozinha não basta: na textura os pedaços do vaso encostam
# nos das folhas, e a borda dos triângulos vaza de um para o outro. O barro é
# avermelhado e a folha é esverdeada, então exigir vermelho acima do verde
# separa os dois onde a geometria não separa.
barro = rgb[..., 0] > rgb[..., 1] + 0.02
vaso = baixo & ~folha & barro

if vaso.sum() < 1000:
    raise SystemExit("ESMALTE_FALHOU poucos texels de vaso: %d" % vaso.sum())

esmalte = np.array(ESMALTE)
# O esmalte rebaixado à luma de cada texel: mantém o matiz e a saturação da cor
# escolhida e herda a variação que o barro tinha.
alvo = esmalte / (esmalte @ LUMA)
rgb[vaso] = np.clip((luma[vaso] * BRILHO)[:, None] * alvo, 0.0, 1.0)

estourados = int((rgb[vaso].max(-1) >= 1.0).sum())
print("ESMALTE texels vaso=%d folha=%d luma=%.3f pico=%s estourados=%d"
      % (vaso.sum(), folha.sum(), luma[vaso].mean(),
         np.round(rgb[vaso].max(0), 3), estourados))

px[..., :3] = rgb
marcada = px.copy()
marcada[vaso, :3] = [0, 1, 1]
for nome, dados in (("vaso_marcado.png", marcada), ("textura_esmaltada.png", px)):
    out = bpy.data.images.new(nome, W, H, alpha=True)
    out.pixels = dados.astype(np.float32).ravel()
    out.filepath_raw = os.path.join(pasta, nome)
    out.file_format = "PNG"
    out.save()

# O exportador reaproveita os bytes embutidos da textura original em vez do
# buffer editado — a mesma armadilha de costas_limpar.py. Imagem nova, carregada
# do PNG, no lugar da antiga no material.
nova = bpy.data.images.load(os.path.join(pasta, "textura_esmaltada.png"))
trocas = 0
for m in me.materials:
    for nd in m.node_tree.nodes:
        if nd.type == "TEX_IMAGE" and nd.image == img:
            nd.image = nova
            trocas += 1
print("ESMALTE nos trocados=%d" % trocas)
bpy.ops.export_scene.gltf(filepath=saida, export_format="GLB")
print("ESMALTE_OK")
