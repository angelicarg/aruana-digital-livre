"""Mede e fotografa um .glb de fora (frente e perfil, câmera ortográfica).

    blender --background --python inspecionar_glb.py -- CAMINHO.glb PASTA_SAIDA NOME
"""
import bpy, sys, os, math
from mathutils import Vector

caminho, pasta, nome = sys.argv[-3:]
os.makedirs(pasta, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=caminho)

malhas = [o for o in bpy.context.scene.objects if o.type == "MESH"]
tris = 0
for o in malhas:
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)

pts = [o.matrix_world @ v.co for o in malhas for v in o.data.vertices]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
tam = mx - mn
centro = (mn + mx) / 2

raizes = [o for o in bpy.context.scene.objects if o.parent is None]
for o in raizes:
    o.location.x -= centro.x
    o.location.y -= centro.y
    o.location.z -= mn.z

print("STAT arquivo=%s" % os.path.basename(caminho))
print("STAT malhas=%d triangulos=%d" % (len(malhas), tris))
print("STAT tamanho x=%.3f y=%.3f z(altura)=%.3f" % (tam.x, tam.y, tam.z))
print("STAT objetos=%s" % ", ".join("%s(%s)" % (o.name, o.type) for o in bpy.context.scene.objects))
print("STAT materiais=%s" % ", ".join(m.name for m in bpy.data.materials))
print("STAT imagens=%s" % ", ".join("%s %dx%d" % (i.name, i.size[0], i.size[1]) for i in bpy.data.images))
print("STAT animacoes=%d armaduras=%d" % (len(bpy.data.actions), sum(o.type == "ARMATURE" for o in bpy.context.scene.objects)))

bpy.ops.mesh.primitive_plane_add(size=max(tam) * 8, location=(0, 0, 0))
chao = bpy.context.object
m = bpy.data.materials.new("estudio")
m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.84, 0.83, 0.8, 1)
chao.data.materials.append(m)

h = max(tam)
bpy.ops.object.light_add(type="AREA", location=(h * 1.6, -h * 2.2, h * 2.4))
luz = bpy.context.object
luz.data.energy = h * h * 700
luz.data.size = h * 2
luz.rotation_euler = (0.8, 0, 0.6)

cena = bpy.context.scene
cena.render.engine = "CYCLES"
cena.cycles.samples = 32
cena.render.resolution_x = 700
cena.render.resolution_y = 700
cena.world.use_nodes = True
cena.world.node_tree.nodes["Background"].inputs[0].default_value = (0.86, 0.87, 0.88, 1)
cena.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8

for vista, ang in (("frente", 0.0), ("perfil", math.pi / 2), ("costas", math.pi)):
    d = h * 4
    bpy.ops.object.camera_add(
        location=(math.sin(ang) * d, -math.cos(ang) * d, tam.z / 2),
        rotation=(math.pi / 2, 0, ang),
    )
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = h * 1.25
    cena.camera = cam
    cena.render.filepath = os.path.join(pasta, "%s_%s.png" % (nome, vista))
    bpy.ops.render.render(write_still=True)
    print("VISTA_OK %s" % vista)
