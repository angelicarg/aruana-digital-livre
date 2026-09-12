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
# Sala dimensionada para caber gente circulando: duas fileiras de tapetes no
# tamanho real (0,66 x 1,83), a de tras intercalada com a da frente para quem
# senta atras ver o professor pelo vao, como em estudio. Sobra ~1 m ate a
# parede de fundo e ~0,5 m entre a primeira fileira e o tapete do professor.
SALA = {"larg": 9.0, "prof": 7.5, "alt": 3.2}
PORTA = {"larg": 1.1, "alt": 2.15, "desloc": -2.6}   # desloc = posicao em x
SOL = {"elevacao": 4.0, "rotacao": -35.0, "forca": 2.2}
LUZ_INTERNA = {"forca": 70.0, "quantidade": 3, "cor": (1.0, 0.80, 0.60)}
MONTANHAS = {"raio": 42, "altura": 19, "quantidade": 14}
# y_frente = centro da primeira fileira (+y e o lado do vidro); passo = entre
# centros na mesma fileira. "tras": 3 alinha as fileiras em vez de intercalar.
TAPETES = {"frente": 3, "tras": 4, "passo": 1.6, "larg": 0.66, "comp": 1.83,
           "y_frente": 0.45, "vao": 0.5}
# Arvore do lado de fora, perto do vidro. A posicao importa: longe demais ela
# vira cenario chapado como as montanhas; perto, ela desliza contra o fundo
# quando a pessoa caminha, e e essa paralaxe que transforma a janela em vista.
# Altura 3,6 contra os 3,2 m do vidro: com 5,4 a copa passava do teto e de
# dentro so se via tronco. A folhagem tem que cair na faixa da janela.
ARVORE = {"x": -3.4, "y": 6.2, "altura": 3.6, "copas": 7}
QUADROS = 2
RENDER = {"larg": 900, "alt": 560, "amostras": 48}

# Cada vista e (nome, posicao da camera, para onde olha). Todas na altura dos
# olhos de quem esta em pe, porque e assim que a sala sera percorrida.
OLHOS = 1.6
VISTAS = [
    # Unica vista na altura de quem esta sentado. As outras quatro sao de pe, a
    # 3-4 m: nessa distancia tapete e piso ocupam poucos pixels e textura fina
    # nao aparece — foi olhando so para elas que eu dei o tapete por texturizado
    # quando ele ainda estava liso.
    ("perto_tapete", (0.0, -0.5, 0.95), (0.0, 0.9, 0.0)),
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

    Por que nao so relevo: mapa de normais em superficie de rugosidade 0,85 sob
    luz difusa quase nao produz sombreado — medido, o tapete so com normal dava
    a mesma variacao de pixel que o vidro liso. O que faz uma superficie ler como
    texturizada e variacao de albedo, nao relevo.

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
madeira_esc = material("madeira_escura", (0.20, 0.13, 0.08), 0.5)
vidro = material("vidro", (0.80, 0.90, 0.88), 0.06, transmissao=0.92)
esquadria = material("esquadria", (0.06, 0.07, 0.07), 0.35, metal=0.85)
parede = material("parede", (0.72, 0.68, 0.62), 0.8)
# Piso e parede de fundo sao as duas maiores superficies em campo de visao —
# recebem textura de verdade; o resto segue em cor chapada, que basta.
# Tabua clara e quase neutra (R/B 1,5) escolhida por medicao, nao por nome: a
# primeira opcao testada tinha R/B 7,8 e deixava a sala inteira laranja sob o sol
# baixo. Sem tinta — corrigir dominante no material so mascara madeira errada.
piso_mat = material_texturizado("piso_madeira", "piso")
parede_mat = material_texturizado("parede_reboco", "parede")
rocha = material("rocha", (0.13, 0.12, 0.13), 0.9)
grama = material("grama", (0.10, 0.16, 0.09), 0.95)
tronco_mat = material("tronco", (0.19, 0.13, 0.09), 0.85)
copa_mat = material("copa", (0.11, 0.24, 0.13), 0.75)
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

# ----------------------------------------------------------------- ARVORE ---
# Copas nomeadas copa_0..N de proposito: o balanco ao vento e feito no navegador,
# em SalaYoga3D.tsx, procurando por esse prefixo. Animar no glb exigiria exportar
# esqueleto e mais peso; deslocar grupos por codigo custa nada e le igual.
AX, AY, AH = ARVORE["x"], ARVORE["y"], ARVORE["altura"]

bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.26, radius2=0.14, depth=AH,
                                location=(AX, AY, AH / 2 - 0.1))
tr = bpy.context.object
tr.name = "tronco"
tr.data.materials.append(tronco_mat)
tr.rotation_euler = (math.radians(2.5), math.radians(-2), 0)  # nenhuma arvore e prumada

for i in range(3):  # galhos que sustentam a copa visualmente
    ang = i * math.tau / 3 + 0.4
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.10, radius2=0.045, depth=1.5,
        location=(AX + math.cos(ang) * 0.42, AY + math.sin(ang) * 0.42, AH * 0.74),
        rotation=(math.radians(58) * math.sin(ang), math.radians(58) * math.cos(ang), 0),
    )
    g = bpy.context.object
    g.name = f"galho_{i}"
    g.data.materials.append(tronco_mat)

for i in range(ARVORE["copas"]):
    ang = (i / ARVORE["copas"]) * math.tau + random.uniform(-0.3, 0.3)
    raio = random.uniform(0.5, 1.25)
    alt = AH * random.uniform(0.80, 1.06)
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=random.uniform(0.72, 1.15),
        location=(AX + math.cos(ang) * raio, AY + math.sin(ang) * raio, alt),
    )
    c = bpy.context.object
    c.name = f"copa_{i}"
    c.scale = (1.0, 1.0, random.uniform(0.62, 0.82))  # copa achatada, nao bola
    bpy.ops.object.transform_apply(scale=True)
    c.data.materials.append(copa_mat)

# ------------------------------------------------------------------ SALA ---
uv_metrico(caixa("piso", (L, P, 0.12), (0, 0, -0.06), piso_mat), metros=2.2)
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
uv_metrico(caixa("parede_fundo_esq", (esq_larg, 0.14, A), (-L / 2 + esq_larg / 2, -P / 2, A / 2), parede_mat), metros=2.4)
uv_metrico(caixa("parede_fundo_dir", (dir_larg, 0.14, A), (L / 2 - dir_larg / 2, -P / 2, A / 2), parede_mat), metros=2.4)
uv_metrico(caixa("parede_fundo_verga", (pl, 0.14, A - pa), (px, -P / 2, pa + (A - pa) / 2), parede_mat), metros=2.4)

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
# Divididas por 0,76 — a media linear do modulador de trama — para o tapete
# renderizar no mesmo tom de antes, agora com a trama por cima.
# ⚠️ Uma cor por tapete, nunca repetida: o `optimize` funde materiais identicos
# e depois junta as malhas que dividem material — dois tapetes da mesma cor
# viravam um no so, e o site perdia os dois (ele acha cada tapete pelo nome).
# A fileira da frente fica com as tres cores de sempre; a de tras, tons de terra
# na mesma faixa apagada, para nao disputar com o ponto de cor da sala — que
# eram as flores dos cactos e hoje sao os vasos esmaltados, carregados em
# codigo (ver Plantas em SalaYoga3D.tsx). A faixa apagada continua valendo: o
# que mudou foi a altura do acento, nao a regra.
cores = [
    (0.20, 0.55, 0.46), (0.72, 0.45, 0.29), (0.37, 0.39, 0.50),
    (0.66, 0.58, 0.40), (0.62, 0.40, 0.42), (0.20, 0.42, 0.50), (0.46, 0.52, 0.34),
]
def fileira(n, y):
    return [((j - (n - 1) / 2) * TAPETES["passo"], y) for j in range(n)]

# Frente primeiro: o site numera os tapetes nesta ordem.
lugares = fileira(TAPETES["frente"], TAPETES["y_frente"]) + fileira(
    TAPETES["tras"], TAPETES["y_frente"] - TAPETES["comp"] - TAPETES["vao"]
)
assert len(set(cores[: len(lugares)])) == len(lugares), "cada tapete precisa de cor propria"
for i, (x, y) in enumerate(lugares):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.025))
    t = bpy.context.object
    t.name = f"tapete_{i}"
    t.scale = (TAPETES["larg"], TAPETES["comp"], 0.05)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type="BEVEL")
    t.modifiers["Bevel"].width = 0.02
    t.modifiers["Bevel"].segments = 3
    # Linho: da trama e variacao de brilho sem tocar na cor de cada tapete.
    # Relevo em 2.0 porque o pipeline reduz a textura para 512 px e come a trama.
    t.data.materials.append(
        material_com_relevo(f"tapete_{i}", cores[i], "tapete", forca_relevo=2.0)
    )
    uv_metrico(t, metros=1.2)    # trama grossa: a 0,55 os fios davam ~2 mm e sumiam

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
    # A arvore sai num arquivo proprio, e nao por capricho de organizacao: o
    # pipeline junta malhas por material e funde as cores chapadas numa paleta
    # unica, entao dentro do glb da sala as copas perdem os nos individuais e
    # passam a dividir material com a montanha. Animar aquilo faria a montanha
    # balancar. Separada, ela mantem copa_0..N e ainda serve de peca para o
    # jardim.
    NOMES_ARVORE = ("tronco", "galho_", "copa_")

    def e_arvore(o):
        return any(o.name == n or o.name.startswith(n) for n in NOMES_ARVORE)

    for o in bpy.data.objects:
        o.select_set(o.type == "MESH" and e_arvore(o))
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(BASE, "arvore.glb"),
        export_format="GLB",
        use_selection=True,
    )
    print("GLB_ARVORE_OK")

    for o in bpy.data.objects:
        o.select_set(o.type == "MESH" and not e_arvore(o))
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(BASE, "sala-yoga.glb"),
        export_format="GLB",
        use_selection=True,
    )
    print("GLB_OK")

print("RENDER_FEITO")
