"""Diagnóstico do rosto nas costas: onde as faces de trás caem na textura.

    blender --background --python costas_diagnostico.py -- MODELO.glb PASTA
"""
import bpy, sys, os
import numpy as np

src, pasta = sys.argv[-2:]
os.makedirs(pasta, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=src)

ob = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
me = ob.data
nm = ob.matrix_world.to_3x3().inverted().transposed()

print("DIAG materiais por face:", {i: 0 for i in range(len(me.materials))})
contagem = {}
for p in me.polygons:
    contagem[p.material_index] = contagem.get(p.material_index, 0) + 1
for i, n in contagem.items():
    m = me.materials[i]
    imgs = [nd.image.name for nd in m.node_tree.nodes if nd.type == "TEX_IMAGE" and nd.image] if m and m.use_nodes else []
    print("DIAG material %d %s faces=%d imagens=%s" % (i, m.name if m else None, n, imgs))

img = bpy.data.images["Image_0"]
W, H = img.size
uv = me.uv_layers.active.data
zs = [(ob.matrix_world @ v.co).z for v in me.vertices]
z0, z1 = min(zs), max(zs)

frente = np.zeros((H, W), bool)
costas = np.zeros((H, W), bool)


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
    dentro = (l1 >= -0.02) & (l2 >= -0.02) & (1 - l1 - l2 >= -0.02)
    alvo[y0:y1, x0:x1] |= dentro


for p in me.polygons:
    n = (nm @ p.normal).normalized()
    if abs(n.y) < 0.3:
        continue
    pts = [(uv[li].uv.x * W, uv[li].uv.y * H) for li in p.loop_indices]
    for k in range(1, len(pts) - 1):
        # A frente olha para -Y (a câmera da inspeção fica em -Y e vê o rosto).
        rasterizar(costas if n.y > 0 else frente, (pts[0], pts[k], pts[k + 1]))

sobrepoe = (frente & costas).sum()
print("DIAG texels frente=%d costas=%d compartilhados=%d (%.1f%% das costas)"
      % (frente.sum(), costas.sum(), sobrepoe, 100 * sobrepoe / max(1, costas.sum())))

px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
sobre = px.copy()
sobre[costas & ~frente, :3] = sobre[costas & ~frente, :3] * 0.4 + np.array([1, 0, 0]) * 0.6
sobre[frente & ~costas, :3] = sobre[frente & ~costas, :3] * 0.4 + np.array([0, 0, 1]) * 0.6
sobre[frente & costas, :3] = np.array([1, 1, 0])
out = bpy.data.images.new("diag", W, H, alpha=True)
out.pixels = sobre.ravel()
out.filepath_raw = os.path.join(pasta, "diag_mascaras.png")
out.file_format = "PNG"
out.save()
orig = bpy.data.images.new("orig", W, H, alpha=True)
orig.pixels = px.ravel()
orig.filepath_raw = os.path.join(pasta, "diag_textura.png")
orig.file_format = "PNG"
orig.save()
print("DIAG_OK")
