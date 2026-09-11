"""Apaga o rosto repetido nas costas: olhos (cabeça) e emblema (peito).

    blender --background --python costas_limpar.py -- MODELO.glb SAIDA.glb PASTA_DEBUG

Só mexe em texel usado **apenas** por face que olha para trás (a frente olha
para -Y). Olho = ponto bem mais escuro que a vizinhança na cabeça; emblema =
amarelo no peito. Os dois viram a cor média em volta, sem eles.
"""
import bpy, sys, os
import numpy as np

src, saida, pasta = sys.argv[-3:]
os.makedirs(pasta, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=src)

ob = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
me = ob.data
nm = ob.matrix_world.to_3x3().inverted().transposed()
img = bpy.data.images["Image_0"]
W, H = img.size
uv = me.uv_layers.active.data
zs = [(ob.matrix_world @ v.co).z for v in me.vertices]
z0, altura = min(zs), max(zs) - min(zs)

# Faixas em fração da altura, medidas no render de frente: olhos a ~0,62,
# emblema a ~0,375, pescoço a ~0,46.
CABECA = (0.48, 1.0)
PEITO = (0.25, 0.48)

frente = np.zeros((H, W), bool)
cabeca = np.zeros((H, W), bool)
peito = np.zeros((H, W), bool)
# Todo texel de qualquer outra parte do corpo. Na textura os pedaços da cabeça
# encostam nos das pernas: sem esta máscara, alargar a cabeça invadia a borda
# deles e salpicava as pernas de verde-claro.
outros = np.zeros((H, W), bool)


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
    n = (nm @ p.normal).normalized()
    pts = [(uv[li].uv.x * W, uv[li].uv.y * H) for li in p.loop_indices]
    if n.y < -0.3:
        alvos = [frente]
    elif n.y > 0.2:
        zc = ((ob.matrix_world @ p.center).z - z0) / altura
        alvos = [m for m, (a, b) in ((cabeca, CABECA), (peito, PEITO)) if a <= zc <= b]
    else:
        alvos = []
    if not any(a is cabeca for a in alvos):
        alvos.append(outros)
    for alvo in alvos:
        for k in range(1, len(pts) - 1):
            rasterizar(alvo, (pts[0], pts[k], pts[k + 1]))

cabeca &= ~frente
peito &= ~frente


def caixa(a, r):
    for ax in (0, 1):
        a = np.moveaxis(a, ax, 0)
        p = np.concatenate([np.repeat(a[:1], r + 1, 0), a, np.repeat(a[-1:], r, 0)], 0)
        c = np.cumsum(p, 0, dtype=np.float64)
        a = (c[2 * r + 1:] - c[: -2 * r - 1]) / (2 * r + 1)
        a = np.moveaxis(a, 0, ax)
    return a


def suave(a, r):
    return caixa(caixa(caixa(a, r), r), r)


def media_sem(rgb, peso, r):
    """Média local só dos texels com peso — a região limpa, sem o defeito."""
    num = suave(rgb * peso[..., None], r)
    den = suave(peso.astype(np.float64), r)[..., None]
    return num / np.maximum(den, 1e-6)


def dilatar(m, r):
    return caixa(m.astype(np.float64), r) > 1e-6


px = np.array(img.pixels[:], dtype=np.float64).reshape(H, W, 4)
rgb = px[..., :3].copy()
luma = rgb @ np.array([0.2126, 0.7152, 0.0722])

# Olhos: bem mais escuros que a vizinhança, dentro da cabeça de trás.
viz = media_sem(rgb, cabeca, 12) @ np.array([0.2126, 0.7152, 0.0722])
olho = dilatar(cabeca & (luma < viz - 0.08), 3) & cabeca

# Emblema: o amarelo do peito de trás.
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
amarelo = (r_ > 0.7) & (g_ > 0.6) & (b_ < r_ - 0.25)
emblema = dilatar(peito & amarelo, 4) & peito

for defeito, regiao in ((olho, cabeca), (emblema, peito)):
    limpo = media_sem(rgb, regiao & ~defeito, 14)
    rgb[defeito] = limpo[defeito]

# Segunda passada, só na cabeça de trás: a primeira deixava pontinhos claros
# onde estavam os olhos. Ali o fundo é um degradê liso, então qualquer texel
# que destoe da vizinhança — claro ou escuro — vira a média dela. A máscara
# cresce 2 px para pegar a borda dos triângulos, e a frente segue protegida.
cab = dilatar(cabeca, 2) & ~frente & ~outros | cabeca
restos = 0
for _ in range(2):
    viz = media_sem(rgb, cab, 8)
    fora = cab & (np.abs(rgb - viz).max(-1) > 0.04)
    limpo = media_sem(rgb, cab & ~fora, 8)
    rgb[fora] = limpo[fora]
    restos += fora.sum()

print("LIMPEZA texels olho=%d emblema=%d restos=%d" % (olho.sum(), emblema.sum(), restos))

px[..., :3] = rgb
dbg = px.copy()
dbg[olho, :3] = [1, 0, 1]
dbg[emblema, :3] = [0, 1, 1]
for nome, dados in (("limpeza_marcada.png", dbg), ("textura_limpa.png", px)):
    out = bpy.data.images.new(nome, W, H, alpha=True)
    out.pixels = dados.astype(np.float32).ravel()
    out.filepath_raw = os.path.join(pasta, nome)
    out.file_format = "PNG"
    out.save()

# A imagem importada vem embutida, e o exportador reaproveita os bytes
# embutidos originais em vez do buffer editado: a limpeza sumia no .glb. Uma
# imagem nova, carregada do PNG limpo, no lugar da antiga no material.
nova = bpy.data.images.load(os.path.join(pasta, "textura_limpa.png"))
trocas = 0
for m in me.materials:
    for nd in m.node_tree.nodes:
        if nd.type == "TEX_IMAGE" and nd.image == img:
            nd.image = nova
            trocas += 1
print("LIMPEZA nos trocados=%d" % trocas)
bpy.ops.export_scene.gltf(filepath=saida, export_format="GLB")
print("LIMPEZA_OK")
