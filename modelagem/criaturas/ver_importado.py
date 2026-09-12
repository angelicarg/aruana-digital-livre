"""Render rapido de um .glb de fora, so para conferir o que veio.

    blender --background --python ver_importado.py -- CAMINHO.glb
"""
import bpy, sys, os, math

caminho = sys.argv[-1]
BASE = os.path.dirname(os.path.abspath(__file__))

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=caminho)

alvos = [o for o in bpy.context.scene.objects if o.type == "MESH"]
minz = min(min((o.matrix_world @ v.co).z for v in o.data.vertices) for o in alvos)
maxz = max(max((o.matrix_world @ v.co).z for v in o.data.vertices) for o in alvos)
altura = maxz - minz
print("ALTURA %.3f  MALHAS %d" % (altura, len(alvos)))
for o in alvos:
    o.location.z -= minz

bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
ch = bpy.context.object
m = bpy.data.materials.new("estudio")
m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.84, 0.83, 0.8, 1)
ch.data.materials.append(m)

bpy.ops.object.light_add(type="AREA", location=(altura * 2, -altura * 2.4, altura * 2.6))
bpy.context.object.data.energy = altura * altura * 900
bpy.context.object.data.size = altura * 2
bpy.context.object.rotation_euler = (0.8, 0, 0.7)

cena = bpy.context.scene
cena.render.engine = "CYCLES"
cena.cycles.samples = 40
cena.render.resolution_x = 900
cena.render.resolution_y = 700
cena.world.use_nodes = True
cena.world.node_tree.nodes["Background"].inputs[0].default_value = (0.86, 0.87, 0.88, 1)

for nome, ang in (("frente", 0.0), ("lado", 1.15)):
    d = altura * 2.1
    bpy.ops.object.camera_add(
        location=(math.sin(ang) * d, -math.cos(ang) * d, altura * 0.62),
        rotation=(1.42, 0, ang),
    )
    cena.camera = bpy.context.object
    cena.render.filepath = os.path.join(BASE, "importado_" + nome + ".png")
    bpy.ops.render.render(write_still=True)
    print("VISTA_OK " + nome)
