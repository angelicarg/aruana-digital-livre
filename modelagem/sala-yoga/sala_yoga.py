"""Sala de yoga em vidro ao por do sol, construida para ser navegada em 360 graus.

Direcao de arte fica com a Angelica: cada decisao visual e uma constante nomeada
no topo, entao ajustar e trocar numero, nao remodelar.

Uso:
    blender --background --python sala_yoga.py

Renderiza uma vista por angulo definido em VISTAS, para conferir a sala girando.
Passe --exportar para gravar tambem o .glb.
"""
import bpy, math, random, sys, os
from mathutils import Vector

random.seed(7)  # mesma paisagem a cada render, para comparar versoes

# ---------------------------------------------------------------- AJUSTES ---
# Sala dimensionada para caber gente circulando: 3 tapetes de 0,72 x 1,95 no
# centro deixam ~1,2 m de passagem de cada lado e 2 m ate a parede de fundo.
SALA = {"larg": 9.0, "prof": 7.5, "alt": 3.2}
PORTA = {"larg": 1.1, "alt": 2.15, "desloc": -2.6}   # desloc = posicao em x
SOL = {"elevacao": 4.0, "rotacao": -35.0, "forca": 2.2}
LUZ_INTERNA = {"forca": 70.0, "quantidade": 3, "cor": (1.0, 0.80, 0.60)}
MONTANHAS = {"raio": 42, "altura": 19, "quantidade": 14}
TAPETES = 3
QUADROS = 2
RENDER = {"larg": 900, "alt": 560, "amostras": 48}

# Cada vista e (nome, posicao da camera, para onde olha). Todas na altura dos
# olhos de quem esta em pe, porque e assim que a sala sera percorrida.
OLHOS = 1.6
VISTAS = [
    ("paisagem", (-2.2, -2.6, OLHOS), (0.6, 4.0, 1.2)),
    ("porta", (1.8, 1.6, OLHOS), (-2.4, -3.7, 1.3)),
    ("canto_servico", (-2.8, 1.2, OLHOS), (3.2, -3.5, 1.2)),
    ("geral", (3.4, -2.9, OLHOS + 0.3), (-1.5, 2.2, 1.0)),
]

# ------------------------------------------------------------------ CENA ---
bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene
col = bpy.context.collection
L, P, A = SALA["larg"], SALA["prof"], SALA["alt"]


def material(nome, cor, rugosidade=0.5, metal=0.0, transmissao=0.0, emissao=None):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*cor, 1)
    p.inputs["Roughness"].default_value = rugosidade
    p.inputs["Metallic"].default_value = metal
    if "Transmission Weight" in p.inputs:
        p.inputs["Transmission Weight"].default_value = transmissao
    if emissao:
        p.inputs["Emission Color"].default_value = (*emissao[0], 1)
        p.inputs["Emission Strength"].default_value = emissao[1]
    return m


def caixa(nome, tam, loc, mat, rot=None):
    """primitive_cube_add(size=1) tem aresta 1, entao a escala E o tamanho final."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = nome
    o.scale = Vector(tam)
    bpy.ops.object.transform_apply(scale=True)
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


# --------------------------------------------------------------- MATERIAIS ---
madeira = material("madeira", (0.42, 0.27, 0.15), 0.42)
madeira_esc = material("madeira_escura", (0.20, 0.13, 0.08), 0.5)
vidro = material("vidro", (0.80, 0.90, 0.88), 0.06, transmissao=0.92)
esquadria = material("esquadria", (0.06, 0.07, 0.07), 0.35, metal=0.85)
parede = material("parede", (0.72, 0.68, 0.62), 0.8)
rocha = material("rocha", (0.13, 0.12, 0.13), 0.9)
grama = material("grama", (0.10, 0.16, 0.09), 0.95)
folha = material("folha", (0.09, 0.28, 0.12), 0.7)
vaso_mat = material("vaso", (0.35, 0.28, 0.23), 0.8)
metal_fosco = material("metal_fosco", (0.35, 0.35, 0.37), 0.35, metal=0.9)
tela = material("tela", (0.015, 0.02, 0.03), 0.08, emissao=((0.06, 0.11, 0.15), 0.35))

# ------------------------------------------------------------------- CEU ---
mundo = bpy.data.worlds.new("ceu")
cena.world = mundo
mundo.use_nodes = True
nt = mundo.node_tree
nt.nodes.clear()
saida_w = nt.nodes.new("ShaderNodeOutputWorld")
fundo = nt.nodes.new("ShaderNodeBackground")
ceu = nt.nodes.new("ShaderNodeTexSky")
ceu.sky_type = "MULTIPLE_SCATTERING"
ceu.sun_elevation = math.radians(SOL["elevacao"])
ceu.sun_rotation = math.radians(SOL["rotacao"])
ceu.altitude = 900
ceu.air_density = 1.6
ceu.aerosol_density = 3.0
fundo.inputs["Strength"].default_value = 0.55
nt.links.new(ceu.outputs["Color"], fundo.inputs["Color"])
nt.links.new(fundo.outputs["Background"], saida_w.inputs["Surface"])

lz = bpy.data.lights.new("sol", type="SUN")
lz.energy = SOL["forca"]
lz.angle = math.radians(2.5)
lz.color = (1.0, 0.72, 0.45)
sol = bpy.data.objects.new("sol", lz)
col.objects.link(sol)
sol.rotation_euler = (math.radians(90 - SOL["elevacao"]), 0, math.radians(SOL["rotacao"]))

# ---------------------------------------------------- TERRENO E MONTANHAS ---
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.02))
bpy.context.object.name = "terreno"
bpy.context.object.data.materials.append(grama)

for i in range(MONTANHAS["quantidade"]):
    ang = (i / MONTANHAS["quantidade"]) * math.tau + random.uniform(-0.25, 0.25)
    dist = MONTANHAS["raio"] * random.uniform(0.75, 1.25)
    alt = MONTANHAS["altura"] * random.uniform(0.55, 1.3)
    bpy.ops.mesh.primitive_cone_add(
        vertices=random.choice([5, 6, 7]),
        radius1=alt * random.uniform(0.7, 1.1),
        depth=alt,
        location=(math.cos(ang) * dist, math.sin(ang) * dist, alt / 2 - 1),
    )
    m = bpy.context.object
    m.name = f"montanha_{i}"
    m.rotation_euler.z = random.uniform(0, math.tau)
    # Cone limpo le como piramide. O ruido quebra a silhueta e devolve montanha.
    bpy.ops.object.modifier_add(type="SUBSURF")
    m.modifiers["Subdivision"].levels = 2
    m.modifiers["Subdivision"].subdivision_type = "SIMPLE"
    tex = bpy.data.textures.new(f"ruido_{i}", type="CLOUDS")
    tex.noise_scale = random.uniform(3.5, 7.0)
    d = m.modifiers.new(f"desl_{i}", type="DISPLACE")
    d.texture = tex
    d.strength = alt * random.uniform(0.18, 0.34)
    m.scale = (random.uniform(0.8, 1.4), random.uniform(0.8, 1.4), 1.0)
    bpy.ops.object.shade_flat()
    m.data.materials.append(rocha)

# ------------------------------------------------------------------ SALA ---
caixa("piso", (L, P, 0.12), (0, 0, -0.06), madeira)
caixa("teto", (L, P, 0.10), (0, 0, A), material("teto", (0.58, 0.56, 0.53), 0.9))

# Tres faces em vidro; a quarta (fundo, -Y) e solida e recebe porta e quadros.
caixa("vidro_frente", (L, 0.04, A), (0, P / 2, A / 2), vidro)
caixa("vidro_esq", (0.04, P, A), (-L / 2, 0, A / 2), vidro)
caixa("vidro_dir", (0.04, P, A), (L / 2, 0, A / 2), vidro)

for x in (-L / 2, -L / 6, L / 6, L / 2):
    caixa(f"mont_frente_{x:.1f}", (0.09, 0.09, A), (x, P / 2, A / 2), esquadria)
for y in (-P / 2, 0, P / 2):
    for x in (-L / 2, L / 2):
        caixa(f"mont_lat_{x:.0f}_{y:.0f}", (0.09, 0.09, A), (x, y, A / 2), esquadria)

# Parede de fundo, construida em tres pedacos para abrir o vao da porta em vez
# de recortar geometria: mais simples de ajustar e sem risco de furo na malha.
pl, pa, px = PORTA["larg"], PORTA["alt"], PORTA["desloc"]
esq_larg = (px - pl / 2) + L / 2
dir_larg = L / 2 - (px + pl / 2)
caixa("parede_fundo_esq", (esq_larg, 0.14, A), (-L / 2 + esq_larg / 2, -P / 2, A / 2), parede)
caixa("parede_fundo_dir", (dir_larg, 0.14, A), (L / 2 - dir_larg / 2, -P / 2, A / 2), parede)
caixa("parede_fundo_verga", (pl, 0.14, A - pa), (px, -P / 2, pa + (A - pa) / 2), parede)

# Porta entreaberta: parada no batente le como parede pintada.
# A origem vai para a borda da dobradica antes de girar: assim a porta abre a
# partir do batente, como porta de verdade.
dobradica_x = px - pl / 2
porta = caixa("porta", (pl - 0.04, 0.05, pa - 0.03), (px, -P / 2 + 0.02, pa / 2), madeira_esc)
bpy.context.scene.cursor.location = (dobradica_x, -P / 2 + 0.02, pa / 2)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
porta.rotation_euler = (0, 0, math.radians(-34))
bpy.context.scene.cursor.location = (0, 0, 0)

# Macaneta acompanha a folha: filha da porta, herda a rotacao.
mac = caixa("macaneta", (0.05, 0.13, 0.05), (px + pl / 2 - 0.16, -P / 2 + 0.12, 1.05), metal_fosco)
mac.parent = porta
mac.matrix_parent_inverse = porta.matrix_world.inverted()

# Quadros. Se houver imagem em arte/quadro_N.png ela vira a tela; senao, entra um
# painel liso na cor da sala. O padrao procedural saiu: num painel plano ele lia
# como veio de madeira, nao como mandala.
PASTA_ARTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "arte")
QUADRO = {"larg": 0.80, "alt": 1.20, "borda": 0.06}  # 2:3 retrato

for i in range(QUADROS):
    # Agrupados na direita da parede: a esquerda e da porta, o meio e do aparador.
    qx = 2.85 + i * 1.10
    ql, qa, qb = QUADRO["larg"], QUADRO["alt"], QUADRO["borda"]
    caixa(f"quadro_moldura_{i}", (ql + qb * 2, 0.05, qa + qb * 2), (qx, -P / 2 + 0.09, 1.85), madeira_esc)

    mat_q = bpy.data.materials.new(f"quadro_arte_{i}")
    mat_q.use_nodes = True
    ntq = mat_q.node_tree
    bsdf = ntq.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.85

    caminho = os.path.join(PASTA_ARTE, f"quadro_{i + 1}.png")
    if os.path.exists(caminho):
        img = ntq.nodes.new("ShaderNodeTexImage")
        img.image = bpy.data.images.load(caminho)
        ntq.links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (0.55, 0.44, 0.33, 1)

    tela_q = caixa(f"quadro_arte_{i}", (ql, 0.02, qa), (qx, -P / 2 + 0.13, 1.85), mat_q)
    # UV escrita pela posicao do vertice, nao por cube_project: aquele usa o maior
    # lado como referencia, entao entregava a imagem espelhada e cortada nas
    # laterais. Aqui x vira u e z vira v, e o arquivo ocupa o painel inteiro.
    malha = tela_q.data
    uv = malha.uv_layers.active
    # Normaliza pela caixa envolvente da propria malha: caixa() deixa os vertices
    # em coordenada de mundo, entao supor centro na origem jogaria a UV para fora
    # da faixa 0-1 e a imagem se repetiria dentro da moldura.
    xs = [v.co.x for v in malha.vertices]
    zs = [v.co.z for v in malha.vertices]
    x0, x1 = min(xs), max(xs)
    z0, z1 = min(zs), max(zs)
    for laco in malha.loops:
        v = malha.vertices[laco.vertex_index].co
        # u invertido: a face que olha para dentro da sala e a de -Y, e vista de
        # la o x cresce para a esquerda. Sem inverter, o texto sai espelhado.
        uv.data[laco.index].uv = (1 - (v.x - x0) / (x1 - x0), (v.z - z0) / (z1 - z0))

# ------------------------------------------------------- MOVEL E SERVICO ---
# Aparador com TV, encostado na parede de fundo do lado oposto a porta.
ap_x = 1.4
caixa("aparador_tampo", (2.4, 0.5, 0.06), (ap_x, -P / 2 + 0.4, 0.72), madeira_esc)
for dx in (-1.05, 1.05):
    caixa(f"aparador_pe_{dx:.0f}", (0.08, 0.44, 0.7), (ap_x + dx, -P / 2 + 0.4, 0.35), metal_fosco)
caixa("tv_moldura", (1.36, 0.06, 0.81), (ap_x, -P / 2 + 0.28, 1.18), metal_fosco)
caixa("tv", (1.28, 0.02, 0.73), (ap_x, -P / 2 + 0.24, 1.18), tela)
caixa("tv_base", (0.35, 0.2, 0.05), (ap_x, -P / 2 + 0.4, 0.78), metal_fosco)

# Canto de cha, na quina oposta a porta.
ch_x, ch_y = L / 2 - 0.45, -P / 2 + 1.9
caixa("bancada", (0.55, 1.7, 0.06), (ch_x, ch_y, 0.9), madeira)
for dy in (-0.75, 0.75):
    caixa(f"bancada_pe_{dy:.0f}", (0.5, 0.07, 0.88), (ch_x, ch_y + dy, 0.44), metal_fosco)
caixa("maquina_corpo", (0.34, 0.34, 0.42), (ch_x, ch_y - 0.5, 1.14), metal_fosco)
caixa("maquina_bico", (0.1, 0.1, 0.12), (ch_x - 0.14, ch_y - 0.5, 0.99), metal_fosco)
for k in range(3):
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.045, depth=0.09,
                                        location=(ch_x, ch_y + 0.15 + k * 0.14, 0.975))
    bpy.context.object.data.materials.append(parede)

# ---------------------------------------------------------------- TAPETES ---
cores = [(0.15, 0.42, 0.35), (0.55, 0.34, 0.22), (0.28, 0.30, 0.38)]
for i in range(TAPETES):
    x = (i - (TAPETES - 1) / 2) * 1.35
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0.6, 0.025))
    t = bpy.context.object
    t.name = f"tapete_{i}"
    t.scale = (0.72, 1.95, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type="BEVEL")
    t.modifiers["Bevel"].width = 0.02
    t.modifiers["Bevel"].segments = 3
    t.data.materials.append(material(f"tapete_{i}", cores[i % len(cores)], 0.85))

# ---------------------------------------------------------------- PLANTAS ---
# Cactos. A folha era o unico formato vegetal que sobrevivia a geometria simples;
# o cacto e melhor ainda, porque a forma dificil vira a facil: um cilindro de
# poucos lados com sombreamento suave ja le como as costelas do cacto. E a flor
# da o unico ponto de cor saturada da sala.
PLANTAS = ((-L / 2 + 0.9, P / 2 - 0.9), (L / 2 - 0.9, P / 2 - 0.9), (L / 2 - 0.9, 0.6))
COSTELAS = 10  # lados do cilindro; poucos de proposito, sao as costelas
CORES_FLOR = ((0.86, 0.20, 0.42), (0.95, 0.72, 0.18), (0.90, 0.35, 0.25))

verde_cacto = material("cacto", (0.20, 0.36, 0.19), 0.75)
terra_mat = material("terra", (0.10, 0.07, 0.05), 0.95)
flores_mat = [material(f"flor_{i}", c, 0.55) for i, c in enumerate(CORES_FLOR)]


def coluna(nome, base, raio, altura, mat):
    """Tronco de cacto: cilindro facetado com a ponta arredondada."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=COSTELAS, radius=raio, depth=altura,
        location=(base[0], base[1], base[2] + altura / 2),
    )
    c = bpy.context.object
    c.name = nome
    bpy.ops.object.shade_smooth()
    c.data.materials.append(mat)

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=COSTELAS, ring_count=6, radius=raio,
        location=(base[0], base[1], base[2] + altura),
    )
    t = bpy.context.object
    t.name = f"{nome}_topo"
    t.scale = (1, 1, 0.75)
    bpy.ops.object.shade_smooth()
    t.data.materials.append(mat)
    return c


def flor(nome, loc, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=0.075, location=loc)
    f = bpy.context.object
    f.name = nome
    f.scale = (1, 1, 0.55)   # achatada, como flor de cacto assentada no corpo
    bpy.ops.object.shade_smooth()
    f.data.materials.append(mat)


for i, (x, y) in enumerate(PLANTAS):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.26, depth=0.44, location=(x, y, 0.22))
    bpy.context.object.name = f"vaso_{i}"
    bpy.context.object.data.materials.append(vaso_mat)
    caixa(f"terra_{i}", (0.44, 0.44, 0.04), (x, y, 0.43), terra_mat)

    alt = 0.95 + (i % 3) * 0.28
    coluna(f"cacto_{i}", (x, y, 0.42), 0.17, alt, verde_cacto)
    flor(f"flor_topo_{i}", (x, y, 0.42 + alt + 0.10), flores_mat[i % len(flores_mat)])

    # Bracos: cotovelo esferico, um trecho horizontal e um vertical. E o desenho
    # de saguaro que todo mundo reconhece, e sai de tres primitivas.
    for lado, altura_braco in ((1, 0.52), (-1, 0.40)):
        if i == 1 and lado == -1:
            continue  # um dos cactos fica so com um braco, para nao ficarem iguais
        cot = (x + lado * 0.30, y, 0.42 + alt * (0.45 + 0.1 * lado))
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=COSTELAS, radius=0.085, depth=0.34,
            location=(x + lado * 0.16, y, cot[2]),
            rotation=(0, math.radians(90), 0),
        )
        b = bpy.context.object
        b.name = f"cacto_{i}_ombro_{lado}"
        bpy.ops.object.shade_smooth()
        b.data.materials.append(verde_cacto)

        bpy.ops.mesh.primitive_uv_sphere_add(segments=COSTELAS, ring_count=6, radius=0.085, location=cot)
        bpy.context.object.name = f"cacto_{i}_cotovelo_{lado}"
        bpy.ops.object.shade_smooth()
        bpy.context.object.data.materials.append(verde_cacto)

        coluna(f"cacto_{i}_braco_{lado}", (cot[0], cot[1], cot[2]), 0.085, altura_braco, verde_cacto)
        if lado == 1:
            flor(f"flor_braco_{i}", (cot[0], cot[1], cot[2] + altura_braco + 0.06),
                 flores_mat[(i + 1) % len(flores_mat)])

# ------------------------------------------------------------ LUZ INTERNA ---
for i in range(LUZ_INTERNA["quantidade"]):
    fx = (i - (LUZ_INTERNA["quantidade"] - 1) / 2) * (L / 3)
    ld = bpy.data.lights.new(f"luminaria_{i}", type="AREA")
    ld.energy = LUZ_INTERNA["forca"]
    ld.color = LUZ_INTERNA["cor"]
    ld.shape = "DISK"
    ld.size = 0.8
    lo = bpy.data.objects.new(f"luminaria_{i}", ld)
    col.objects.link(lo)
    lo.location = (fx, -P / 8, A - 0.35)
    lo.rotation_euler = (math.radians(180), 0, 0)
    # Luz sem fonte visivel le como truque: o corpo da luminaria fica a vista.
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.06,
                                        location=(fx, -P / 8, A - 0.28))
    bpy.context.object.data.materials.append(
        material(f"lum_corpo_{i}", (0.9, 0.75, 0.55), 0.4, emissao=((1.0, 0.82, 0.62), 3.0)))

ld2 = bpy.data.lights.new("preenchimento", type="AREA")
ld2.energy = 26.0
ld2.color = (1.0, 0.86, 0.72)
ld2.size = 3.0
lo2 = bpy.data.objects.new("preenchimento", ld2)
col.objects.link(lo2)
lo2.location = (0, -P / 2 + 0.4, A - 0.7)
lo2.rotation_euler = (math.radians(115), 0, 0)

# ----------------------------------------------------------------- RENDER ---
cd = bpy.data.cameras.new("cam")
cd.lens = 24          # sala fechada pede grande angular para caber o ambiente
cam = bpy.data.objects.new("cam", cd)
col.objects.link(cam)
cena.camera = cam

cena.render.engine = "CYCLES"
cena.cycles.device = "CPU"
cena.cycles.samples = RENDER["amostras"]
cena.cycles.use_denoising = True
cena.cycles.max_bounces = 8
cena.cycles.transmission_bounces = 6
cena.render.resolution_x = RENDER["larg"]
cena.render.resolution_y = RENDER["alt"]
cena.render.image_settings.file_format = "PNG"
cena.view_settings.look = "AgX - Medium High Contrast"
cena.view_settings.exposure = -0.2

BASE = os.path.dirname(os.path.abspath(__file__))
# --exportar pula os renders: gerar o .glb nao precisa das 4 vistas, e elas
# custam quase 4 minutos.
for nome, pos, alvo in ([] if "--exportar" in sys.argv else VISTAS):
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    cena.render.filepath = os.path.join(BASE, f"sala_{nome}.png")
    bpy.ops.render.render(write_still=True)
    print(f"VISTA_OK {nome}")

if "--exportar" in sys.argv:
    for o in bpy.data.objects:
        o.select_set(o.type == "MESH")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(BASE, "sala-yoga.glb"),
        export_format="GLB",
        use_selection=True,
    )
    print("GLB_OK")

print("RENDER_FEITO")
