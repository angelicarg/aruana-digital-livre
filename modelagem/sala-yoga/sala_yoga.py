"""Sala de yoga tropical, construida para ser navegada em 360 graus.

Direcao de arte fica com a Angelica: cada decisao visual e uma constante nomeada
no topo, entao ajustar e trocar numero, nao remodelar.

Uso:
    blender --background --python sala_yoga.py

Renderiza uma vista por angulo definido em VISTAS, para conferir a sala girando.
Passe --exportar para gravar tambem o .glb.

Refeita em 28/09/2026 a partir do protótipo "Sala de Yoga Tropical" (Claude
Design): vidro só a norte e a leste, altar a oeste, porta e estante a sul,
teto de ripas com pendentes de rattan. As posições abaixo vêm do protótipo
(coordenadas web, Y para cima) convertidas para Blender (Z para cima) por
x_blender = x_web, y_blender = -z_web, z_blender = y_web.
"""
import bpy, math, random, sys, os
from mathutils import Vector

random.seed(7)  # mesma paisagem a cada render, para comparar versoes

# ---------------------------------------------------------------- AJUSTES ---
SALA = {"larg": 10.0, "prof": 8.0, "alt": 3.2}
# Vidro a norte (+Y) e a leste (+X); oeste (-X) e sul (-Y) sao solidas — altar a
# oeste, porta perto do canto leste e estante do lado oeste da parede sul.
PORTA = {"larg": 0.9, "alt": 2.1, "desloc": 3.45}   # desloc = posicao em x
ESTANTE = {"larg": 1.6, "prof": 0.35, "alt": 0.9, "desloc_x": -3.0}
ALTAR = {"mesa_larg": 1.4, "mesa_prof": 0.45, "mesa_alt": 0.42, "x": -4.72, "y": 1.0}
SOL = {"elevacao": 4.0, "rotacao": -35.0, "forca": 2.2}
# Pendentes de rattan (substituem as luzes redondas brancas): 3, a 2,6 m do
# piso, no mesmo x dos corredores entre tapetes.
LUZ_INTERNA = {"quantidade": 3, "altura": 2.6, "raio": 0.28}
# 2 fileiras retas (não mais intercaladas), 3 tapetes cada, como no protótipo:
# x em -2,3/0/2,3, fileiras a 2,3 m de distância uma da outra.
TAPETES = {"frente": 3, "tras": 3, "passo": 2.3, "larg": 0.61, "comp": 1.83,
           "y_frente": 0.2, "entre_fileiras": 2.3}
QUADROS = 2
RENDER = {"larg": 900, "alt": 560, "amostras": 48}

# Vistas do protótipo (entrada, tapete, altar, geral, professor), já convertidas
# para coordenadas de Blender.
OLHOS = 1.6
VISTAS = [
    ("entrada", (3.6, -3.7, 2.05), (-0.8, 2.3, 0.7)),
    ("tapete", (0.0, -2.75, 0.95), (0.0, 4.0, 1.0)),
    ("altar", (-2.4, 0.4, 1.3), (-4.8, 1.0, 0.8)),
    ("geral", (4.3, -3.6, 2.4), (-1.2, 1.0, 0.5)),
    ("professor", (0.9, 0.7, 1.35), (0.0, 2.85, 0.8)),
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


PASTA_TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "texturas")


def material_texturizado(nome, prefixo):
    """Material PBR de verdade: cor, relevo e rugosidade vindos de imagem.

    O `material()` acima devolve cor chapada — bom para vidro e metal, ruim para
    piso e parede, que sao as superficies onde o olho procura textura. As tres
    imagens (cor/normal/arm) vem do Poly Haven, todas CC0.

    O mapa `arm` traz oclusao, rugosidade e metal empacotados em R/G/B; o
    exportador glTF reconhece esse padrao e grava as tres num arquivo so.
    """
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    base = os.path.join(PASTA_TEX, prefixo)

    cor = nt.nodes.new("ShaderNodeTexImage")
    cor.image = bpy.data.images.load(f"{base}_cor.jpg")
    nt.links.new(cor.outputs["Color"], p.inputs["Base Color"])

    nor = nt.nodes.new("ShaderNodeTexImage")
    nor.image = bpy.data.images.load(f"{base}_normal.jpg")
    nor.image.colorspace_settings.name = "Non-Color"
    mapa_n = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(nor.outputs["Color"], mapa_n.inputs["Color"])
    nt.links.new(mapa_n.outputs["Normal"], p.inputs["Normal"])

    arm = nt.nodes.new("ShaderNodeTexImage")
    arm.image = bpy.data.images.load(f"{base}_arm.jpg")
    arm.image.colorspace_settings.name = "Non-Color"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(arm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], p.inputs["Metallic"])
    return m


def material_com_relevo(nome, cor, prefixo, rugosidade=0.85, forca_relevo=1.0):
    """Cor chapada escolhida a mao + relevo e rugosidade vindos de textura.

    O mapa de cor aqui e um MODULADOR em tons de cinza oscilando perto do branco
    (linear ~0,55 a 1,0): ele so escurece o vao entre os fios, e a cor de cada
    tapete entra multiplicando por cima. Assim a trama aparece sem que um
    baseColorTexture colorido passe por cima da direcao de arte.

    `forca_relevo` compensa o pipeline reduzir a textura para 512 px.
    """
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    base = os.path.join(PASTA_TEX, prefixo)

    modulador = nt.nodes.new("ShaderNodeTexImage")
    modulador.image = bpy.data.images.load(f"{base}_cor.jpg")
    mult = nt.nodes.new("ShaderNodeMix")
    mult.data_type = "RGBA"
    mult.blend_type = "MULTIPLY"
    mult.inputs["Factor"].default_value = 1.0
    nt.links.new(modulador.outputs["Color"], mult.inputs[6])
    mult.inputs[7].default_value = (*cor, 1)
    nt.links.new(mult.outputs[2], p.inputs["Base Color"])

    nor = nt.nodes.new("ShaderNodeTexImage")
    nor.image = bpy.data.images.load(f"{base}_normal.jpg")
    nor.image.colorspace_settings.name = "Non-Color"
    mapa_n = nt.nodes.new("ShaderNodeNormalMap")
    mapa_n.inputs["Strength"].default_value = forca_relevo
    nt.links.new(nor.outputs["Color"], mapa_n.inputs["Color"])
    nt.links.new(mapa_n.outputs["Normal"], p.inputs["Normal"])

    arm = nt.nodes.new("ShaderNodeTexImage")
    arm.image = bpy.data.images.load(f"{base}_arm.jpg")
    arm.image.colorspace_settings.name = "Non-Color"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(arm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    return m


def uv_metrico(obj, metros=1.0):
    """Reprojeta as UVs em escala de mundo, repetindo a textura a cada N metros.

    O cubo do Blender estica a imagem inteira em cada face: sem isto, um piso de
    9 m recebe uma unica repeticao e sai borrado. Fica gravado nas UVs, entao nao
    depende de extensao do glTF para funcionar no navegador.
    """
    ativo = bpy.context.view_layer.objects.active
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=metros)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.objects.active = ativo


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
# #5A3D2B — altar e porta.
madeira_esc = material("madeira_escura", (0.353, 0.239, 0.169), 0.6)
vidro = material("vidro", (0.80, 0.90, 0.88), 0.06, transmissao=0.92)
esquadria = material("esquadria", (0.169, 0.153, 0.137), 0.5, metal=0.4)  # #2B2723
parede = material("parede", (0.72, 0.68, 0.62), 0.8)
# Piso e parede de fundo sao as duas maiores superficies em campo de visao —
# recebem textura de verdade; o resto segue em cor chapada, que basta.
piso_mat = material_texturizado("piso_madeira", "piso")
parede_mat = material_texturizado("parede_reboco", "parede")
# Ripas do teto e estante: madeira mel #B98D62.
ripa_teto = material("ripa_teto", (0.725, 0.553, 0.384), 0.7)
teto_mat = material("teto", (0.914, 0.875, 0.812), 0.95)  # #E9DFCF
rattan = material("rattan", (0.788, 0.627, 0.416), 0.85)  # #C9A06A
cortica = material("cortica", (0.722, 0.541, 0.353), 0.95)  # #B88A5A
bronze = material("bronze", (0.541, 0.451, 0.333), 0.45, metal=0.6)  # #8A7355
vaso_terra = material("vaso_terra", (0.722, 0.420, 0.294), 0.9)  # #B86B4B
vela_cera = material("vela_cera", (0.95, 0.91, 0.82), 0.4)
vela_chama = material("vela_chama", (0.2, 0.08, 0.02), 0.4, emissao=((1.0, 0.6, 0.2), 4.0))
metal_fosco = material("metal_fosco", (0.35, 0.35, 0.37), 0.35, metal=0.9)

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

# ------------------------------------------------ TERRENO, LAGOA, ÁRVORES ---
# Saíram daqui em 28/09: terreno (cones facetados mesmo suavizados), lagoa,
# barco e a árvore perto do vidro. A paisagem inteira agora é gerada em
# tempo real — terreno contínuo com cor por vértice, água refletindo o céu,
# coqueiros e árvores de copa — porque essa é a técnica que ela aprovou no
# protótipo Claude Design, não algo que dê para replicar bem com cones
# esculpidos no Blender. Ver src/lib/exteriorScene.ts (porta quase 1:1 de
# design_handoff_sala_yoga/exterior.js) e src/lib/iluminacaoScene.ts (luz).

# ------------------------------------------------------------------ SALA ---
uv_metrico(caixa("piso", (L, P, 0.12), (0, 0, -0.06), piso_mat), metros=2.2)

# Teto: base clara + ripas de madeira no sentido norte-sul (eixo Y), a cada
# 25 cm — o `optimize` funde as ripas num nó só, porque compartilham material.
caixa("teto", (L, P, 0.10), (0, 0, A), teto_mat)
n_ripas = int(L / 0.25)
for i in range(n_ripas + 1):
    rx = -L / 2 + i * 0.25
    if rx > L / 2 + 0.001:
        break
    caixa(f"ripa_{i}", (0.045, P, 0.07), (rx, 0, A - 0.035), ripa_teto)

# Vidro a norte e a leste; oeste e sul sao solidas.
caixa("vidro_frente", (L, 0.04, A), (0, P / 2, A / 2), vidro)
caixa("vidro_dir", (0.04, P, A), (L / 2, 0, A / 2), vidro)
uv_metrico(caixa("parede_oeste", (0.2, P, A), (-L / 2, 0, A / 2), parede_mat), metros=2.4)

x = -L / 2
while x <= L / 2 + 0.01:
    caixa(f"mont_frente_{x:.1f}", (0.06, 0.08, A), (x, P / 2, A / 2), esquadria)
    x += 2
y = -P / 2
while y <= P / 2 + 0.01:
    caixa(f"mont_leste_{y:.1f}", (0.08, 0.06, A), (L / 2, y, A / 2), esquadria)
    y += 2

# Parede sul, em tres pedacos para abrir o vao da porta perto do canto leste.
pl, pa, px = PORTA["larg"], PORTA["alt"], PORTA["desloc"]
esq_larg = (px - pl / 2) + L / 2
dir_larg = L / 2 - (px + pl / 2)
uv_metrico(caixa("parede_sul_esq", (esq_larg, 0.2, A), (-L / 2 + esq_larg / 2, -P / 2, A / 2), parede_mat), metros=2.4)
uv_metrico(caixa("parede_sul_dir", (dir_larg, 0.2, A), (L / 2 - dir_larg / 2, -P / 2, A / 2), parede_mat), metros=2.4)
uv_metrico(caixa("parede_sul_verga", (pl, 0.2, A - pa), (px, -P / 2, pa + (A - pa) / 2), parede_mat), metros=2.4)

# Porta entreaberta: parada no batente le como parede pintada.
dobradica_x = px - pl / 2
porta = caixa("porta", (pl - 0.04, 0.05, pa - 0.03), (px, -P / 2 + 0.02, pa / 2), madeira_esc)
bpy.context.scene.cursor.location = (dobradica_x, -P / 2 + 0.02, pa / 2)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
porta.rotation_euler = (0, 0, math.radians(-34))
bpy.context.scene.cursor.location = (0, 0, 0)

mac = caixa("macaneta", (0.05, 0.13, 0.05), (px + pl / 2 - 0.16, -P / 2 + 0.12, 1.05), metal_fosco)
mac.parent = porta
mac.matrix_parent_inverse = porta.matrix_world.inverted()

# Quadros, centralizados na parede sul entre a estante e a porta.
PASTA_ARTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "arte")
QUADRO = {"larg": 0.80, "alt": 1.20, "borda": 0.06}

for i in range(QUADROS):
    qx = -0.6 + i * 1.2
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
    malha = tela_q.data
    uv = malha.uv_layers.active
    xs = [v.co.x for v in malha.vertices]
    zs = [v.co.z for v in malha.vertices]
    x0, x1 = min(xs), max(xs)
    z0, z1 = min(zs), max(zs)
    for laco in malha.loops:
        v = malha.vertices[laco.vertex_index].co
        uv.data[laco.index].uv = (1 - (v.x - x0) / (x1 - x0), (v.z - z0) / (z1 - z0))

# ------------------------------------------------------------------ ALTAR ---
# Parede oeste: mesa baixa, estatua simples (a versao esculpida no Blender e
# proxima etapa, junto das almofadas e das plantas novas) e velas acesas.
ax, ay, am = ALTAR["x"], ALTAR["y"], ALTAR["mesa_alt"]
caixa("altar_mesa_topo", (ALTAR["mesa_prof"], ALTAR["mesa_larg"], 0.05), (ax, ay, am), madeira_esc)
for dx, dy in ((-0.18, -0.64), (0.18, -0.64), (-0.18, 0.64), (0.18, 0.64)):
    caixa(f"altar_pe_{dx:.2f}_{dy:.2f}", (0.05, 0.05, am - 0.05), (ax + dx, ay + dy, (am - 0.05) / 2), madeira_esc)

# Estatua: forma abstrata simples, por primitivas (a mesma logica dos cactos —
# a forma cuja geometria simples ja le como a coisa real).
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.10, depth=0.28,
                                    location=(ax - 0.02, ay, am + 0.19))
est = bpy.context.object
est.name = "altar_estatua_corpo"
est.data.materials.append(bronze)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, radius=0.055,
                                     location=(ax - 0.02, ay, am + 0.36))
cab = bpy.context.object
cab.name = "altar_estatua_cabeca"
cab.data.materials.append(bronze)

# Cinco velas — tres delas com pavio (as luzes de verdade sao pointLight no
# codigo, animadas por perfil de movimento).
for i, (dy, altv) in enumerate(((0.40, 0.20), (0.50, 0.15), (0.58, 0.10), (-0.45, 0.15), (-0.55, 0.10))):
    vx = ax + (0.08 if i % 2 else -0.04)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.035, depth=altv,
                                        location=(vx, ay + dy, am + altv / 2))
    v = bpy.context.object
    v.name = f"vela_{i}"
    v.data.materials.append(vela_cera)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=0.02,
                                        location=(vx, ay + dy, am + altv + 0.01))
    ch = bpy.context.object
    ch.name = f"vela_chama_{i}"
    ch.data.materials.append(vela_chama)

# Incenso.
caixa("incenso_suporte", (0.05, 0.2, 0.015), (ax + 0.1, ay - 0.3, am + 0.008), madeira_esc)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.002, depth=0.24,
                                    location=(ax + 0.1, ay - 0.36, am + 0.12), rotation=(0.35, 0, 0))
bpy.context.object.name = "incenso_vareta"
bpy.context.object.data.materials.append(material("incenso", (0.42, 0.23, 0.17), 0.8))

# --------------------------------------------------------------- ESTANTE ---
sx = ESTANTE["desloc_x"]
sy = -P / 2 + ESTANTE["prof"] / 2 + 0.02
for sz in (0.02, 0.45, 0.88):
    caixa(f"estante_prateleira_{sz:.2f}", (ESTANTE["larg"], ESTANTE["prof"], 0.03), (sx, sy, sz), ripa_teto)
for dx in (-0.79, 0, 0.79):
    caixa(f"estante_lateral_{dx:.2f}", (0.03, ESTANTE["prof"], ESTANTE["alt"]), (sx + dx, sy, ESTANTE["alt"] / 2), ripa_teto)
# Tapetes enrolados e blocos de cortica em cima da prateleira do meio.
cores_rolo = ((0.561, 0.647, 0.541), (0.769, 0.478, 0.353), (0.851, 0.765, 0.627), (0.659, 0.420, 0.337))
for i, cor in enumerate(cores_rolo):
    rx = sx - 0.6 + i * 0.4
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.055, depth=ESTANTE["prof"] - 0.06,
                                        location=(rx, sy, 0.45 + 0.115),
                                        rotation=(math.radians(90), 0, 0))
    ro = bpy.context.object
    ro.name = f"estante_rolo_{i}"
    ro.data.materials.append(material(f"rolo_{i}", cor, 0.9))
for i in range(3):
    caixa(f"estante_bloco_{i}", (0.23, 0.15, 0.08), (sx + 0.5, sy, 0.02 + 0.03 + i * 0.085), cortica)

# ---------------------------------------------------------------- TAPETES ---
# Cores do protótipo: sálvia, terracota, areia, argila, oliva + uma sexta para
# nao repetir (cada tapete precisa de cor propria, ver LEIAME.md).
cores = [
    (0.561, 0.647, 0.541),  # salvia #8FA58A
    (0.769, 0.478, 0.353),  # terracota #C47A5A
    (0.851, 0.765, 0.627),  # areia #D9C3A0
    (0.659, 0.420, 0.337),  # argila #A86B56
    (0.498, 0.541, 0.369),  # oliva #7F8A5E
    (0.40, 0.47, 0.39),     # salvia escura, so para nao repetir
]
def fileira(n, y):
    return [((j - (n - 1) / 2) * TAPETES["passo"], y) for j in range(n)]

lugares = fileira(TAPETES["frente"], TAPETES["y_frente"]) + fileira(
    TAPETES["tras"], TAPETES["y_frente"] - TAPETES["entre_fileiras"])
assert len(set(cores[: len(lugares)])) == len(lugares), "cada tapete precisa de cor propria"
for i, (x, y) in enumerate(lugares):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.003))
    t = bpy.context.object
    t.name = f"tapete_{i}"
    t.scale = (TAPETES["larg"], TAPETES["comp"], 0.006)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type="BEVEL")
    # Tapete de 0,6 cm de espessura (era 5 cm): o bisel tem de caber em menos da
    # metade disso, senao a geometria degenera. Arredonda pouco a quina — o
    # raio de 5 cm do protótipo é do contorno visto de cima, que um bisel
    # uniforme de caixa não reproduz sem selecionar arestas à parte.
    t.modifiers["Bevel"].width = 0.0025
    t.modifiers["Bevel"].segments = 2
    t.data.materials.append(
        material_com_relevo(f"tapete_{i}", cores[i], "tapete", forca_relevo=2.0)
    )
    uv_metrico(t, metros=1.2)

# Esteira da professora, entre a fileira da frente e o vidro (+Y é o lado do
# vidro). 2,85 m e nao 0,95: as esteiras tem 1,83 m, e um gap menor que isso
# fazia a dela encostar na fileira da frente (achado dela, 28/09).
# ⚠️ Nome sem o prefixo "tapete": o site acha os lugares sentaveis por
# esse prefixo, e a esteira dela nao e um lugar que um visitante possa escolher.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 2.85, 0.003))
tp = bpy.context.object
tp.name = "esteira_professora"
tp.scale = (TAPETES["larg"], TAPETES["comp"], 0.006)
bpy.ops.object.transform_apply(scale=True)
tp.data.materials.append(material_com_relevo("tapete_professora", (0.788, 0.627, 0.416), "tapete", forca_relevo=2.0))
uv_metrico(tp, metros=1.2)

# ------------------------------------------------------------ LUZ INTERNA ---
# Pendentes de rattan (forma de cupula achatada) no lugar das luzes redondas
# brancas. A luz de verdade e o pointLight do codigo (SalaYoga3D.tsx); aqui so
# a cupula, o cordao e uma AREA light para o render de conferencia.
# Nos mesmos x dos tapetes (-passo, 0, +passo) e a 0,95 m do vidro — como no
# protótipo — para cada coluna de tapetes ter o proprio pendente em cima.
PENDENTE_Y = 0.95
for i in range(LUZ_INTERNA["quantidade"]):
    fx = (i - (LUZ_INTERNA["quantidade"] - 1) / 2) * TAPETES["passo"]
    fz = LUZ_INTERNA["altura"]
    ld = bpy.data.lights.new(f"luminaria_{i}", type="AREA")
    ld.energy = 40.0
    ld.color = (1.0, 0.80, 0.60)
    ld.shape = "DISK"
    ld.size = 0.4
    lo = bpy.data.objects.new(f"luminaria_{i}", ld)
    col.objects.link(lo)
    lo.location = (fx, PENDENTE_Y, fz - 0.05)
    lo.rotation_euler = (math.radians(180), 0, 0)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=LUZ_INTERNA["raio"],
                                         location=(fx, PENDENTE_Y, fz))
    pend = bpy.context.object
    pend.name = f"pendente_{i}"
    pend.scale = (1.0, 1.0, 0.65)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    pend.data.materials.append(rattan)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.008, depth=A - fz,
                                        location=(fx, PENDENTE_Y, (A + fz) / 2))
    bpy.context.object.name = f"cordao_{i}"
    bpy.context.object.data.materials.append(material(f"cordao_mat_{i}", (0.15, 0.13, 0.11), 0.6))

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
cd.lens = 24
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
for nome, pos, alvo in ([] if "--exportar" in sys.argv else VISTAS):
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    cena.render.filepath = os.path.join(BASE, f"sala_{nome}.png")
    bpy.ops.render.render(write_still=True)
    print(f"VISTA_OK {nome}")

if "--exportar" in sys.argv:
    # Árvore e lago saíam em arquivo próprio para escapar do `palette` do
    # otimizador (funde material chapado e apaga nome). Sem eles no script
    # (paisagem é tempo real agora — ver a nota em TERRENO, LAGOA, ÁRVORES),
    # é a sala inteira, sem exclusão nenhuma.
    for o in bpy.data.objects:
        o.select_set(o.type == "MESH")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(BASE, "sala-yoga.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
    print("GLB_OK")

print("RENDER_FEITO")
