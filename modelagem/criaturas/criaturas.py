"""Criaturas da sala de yoga: tres seres, duas posturas cada.

    blender --background --python criaturas.py               # vistas em PNG
    blender --background --python criaturas.py -- --exportar # grava criaturas.glb

Blender portatil:
`Documents/blender-portatil/Blender Foundation/Blender 5.2/blender.exe`

## Por que existe

A primeira versao das criaturas vivia em primitivas do three.js, direto no
codigo. Ela pediu para avancar e o diagnostico dela foi exato: "nao tem rosto e
nao tem corpo, e material generico com cor". Estavam certas â€” eram solidos de
revolucao empilhados, sem braco, sem mao, sem perna. Nenhuma cor conserta isso.

## As duas decisoes que definem este arquivo

**Metaball, nao primitiva.** Esferas empilhadas leem como bolas empilhadas
porque nao ha continuidade entre elas. Metaball funde: o braco nasce do tronco,
a mao nasce do braco, e o resultado e uma superficie so. E o jeito barato de
sair do aspecto de peca de xadrez.

**Duas malhas estaticas por criatura, nao um esqueleto.** A sala precisa de
exatamente duas poses. Modelar as duas e muito mais barato que montar esqueleto
e pesar vertice, e o resultado na tela e o mesmo: nunca ha transicao animada
entre elas, porque quem senta viaja de camera e o corpo troca fora de vista.

Toda decisao visual e constante nomeada aqui em cima. Ajustar criatura e trocar
numero, nao remodelar.
"""

import bpy, sys, os
from mathutils import Vector

BASE = os.path.dirname(os.path.abspath(__file__))
RENDER = {"larg": 1200, "alt": 620, "amostras": 40}

# Resolucao da malha de metaball. 0,025 da superficie limpa sem explodir a
# contagem de vertices; abaixo disso o arquivo cresce sem o olho perceber.
RESOLUCAO = 0.025

# ⚠️ Em metaball, `radius` e o raio de **influencia**, nao o da superficie que
# aparece. Com rigidez padrao a casca sai por volta de metade dele. O primeiro
# render saiu com bracos e pernas como bolas soltas ao redor do tronco —
# exatamente o defeito que este arquivo existe para evitar — porque as esferas
# de influencia mal se tocavam.
#
# Os numeros das listas de blobs abaixo sao o tamanho **visivel** pretendido;
# este fator os converte em influencia. Mexer aqui engorda ou emagrece todas as
# criaturas de uma vez, e abaixo de ~1,9 elas voltam a se desmontar.
INFLUENCIA = 1.78

# Rigidez menor espalha mais e funde antes. Com 1,7 e influencia 2,15 o segundo
# render virou uma massa unica: cabeca engolida pelo tronco e membros reduzidos a
# calombos. O ponto de equilibrio e influencia baixa **com a cabeca fora do
# metaball** — ver `montar`.
RIGIDEZ = 1.95


def limpar():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def material(nome, cor, rugosidade=0.72):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (cor[0], cor[1], cor[2], 1)
    p.inputs["Roughness"].default_value = rugosidade
    return m


def corpo_metaball(nome, blobs, mat):
    """Funde uma lista de bolas numa superficie continua.

    Cada blob e (x, y, z, raio) ou (x, y, z, raio, (ex, ey, ez)) para elipsoide.
    Z e a altura, Y a profundidade, X a largura.
    """
    mb = bpy.data.metaballs.new(nome)
    mb.resolution = RESOLUCAO
    mb.render_resolution = RESOLUCAO
    obj = bpy.data.objects.new(nome, mb)
    bpy.context.collection.objects.link(obj)

    for b in blobs:
        e = mb.elements.new()
        e.co = Vector((b[0], b[1], b[2]))
        e.radius = b[3] * INFLUENCIA
        e.stiffness = RIGIDEZ
        if len(b) > 4:
            e.type = "ELLIPSOID"
            e.size_x, e.size_y, e.size_z = b[4]

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    malha = bpy.context.object
    malha.name = nome
    malha.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return malha


def bola(nome, loc, raio, mat, achata=None, rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=raio, location=loc, segments=20, ring_count=12)
    o = bpy.context.object
    o.name = nome
    if achata:
        o.scale = Vector(achata)
        # ⚠️ `location=False, rotation=False` **nao sao opcionais**: os tres
        # padroes do operador sao True, entao `transform_apply(scale=True)`
        # aplica posicao junto e joga a origem do objeto para (0,0,0). A
        # rotacao logo abaixo passa a girar a peca em torno do centro do mundo,
        # e nao do proprio eixo — foi o que arrancou as folhas do broto e
        # empurrou os olhos para fora do rosto.
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def olhos(prefixo, altura, avanco, separacao, raio, mat):
    """Dois olhos fechados: elipsoides bem achatados, levemente inclinados.

    Eu tinha descartado rosto com o argumento de que a 3 m ele some. Some
    mesmo â€” e a 1 m, sentado ao lado de alguem, e a primeira coisa que falta.
    O argumento estava certo para a distancia errada.
    """
    for lado in (-1, 1):
        bola(
            prefixo + "_olho_" + ("e" if lado < 0 else "d"),
            (lado * separacao, -avanco, altura),
            raio,
            mat,
            achata=(1.0, 0.32, 0.20),
            rot=(0, 0, lado * 0.14),
        )


# ------------------------------------------------------------------ CORPOS ---
# O plano corporal e o mesmo nas tres â€” pernas, pes, tronco, bracos, maos,
# pescoco, cabeca â€” e e ele que faz um corpo ler como corpo. O que muda entre
# elas e proporcao, nao inventario de partes.


def em_pe(largura=1.0, altura=1.0, cabeca=0.21, bracos=1.0):
    a = altura
    L = largura
    B = largura * bracos
    return [
        (-0.13 * L, 0, 0.15 * a, 0.095 * L),
        (0.13 * L, 0, 0.15 * a, 0.095 * L),
        (-0.14 * L, -0.035, 0.05 * a, 0.088 * L),
        (0.14 * L, -0.035, 0.05 * a, 0.088 * L),
        (0, 0, 0.38 * a, 0.20 * L),
        (0, 0, 0.52 * a, 0.215 * L),
        (0, 0, 0.64 * a, 0.185 * L),
        # ⚠️ Bracos bem afastados do tronco de proposito. Colados, a fusao os
        # transforma em calombo e o corpo volta a ser um ovo — foi o que
        # aconteceu no segundo render.
        (-0.30 * B, 0, 0.56 * a, 0.072 * L),
        (0.30 * B, 0, 0.56 * a, 0.072 * L),
        (-0.325 * B, 0, 0.42 * a, 0.066 * L),
        (0.325 * B, 0, 0.42 * a, 0.066 * L),
        (-0.335 * B, 0.02, 0.32 * a, 0.078 * L),
        (0.335 * B, 0.02, 0.32 * a, 0.078 * L),
        (0, 0, 0.74 * a, 0.075 * L),
    ]


def sentado(largura=1.0, cabeca=0.21):
    """Pernas cruzadas: rolos achatados cruzando a frente, joelho para fora e pe
    recolhido. E o contorno de quem senta assim, e era o que faltava por
    completo na versao de primitivas."""
    L = largura
    return [
        # Joelho bem para fora e baixo, pe recolhido a frente. Colados demais,
        # os quatro fundem numa saia — que foi o render anterior.
        (-0.34 * L, 0.04, 0.062, 0.105 * L, (1.0, 1.6, 0.48)),
        (0.34 * L, 0.04, 0.062, 0.105 * L, (1.0, 1.6, 0.48)),
        (-0.10 * L, -0.24, 0.058, 0.088 * L, (1.3, 1.0, 0.45)),
        (0.10 * L, -0.24, 0.058, 0.088 * L, (1.3, 1.0, 0.45)),
        (0, 0, 0.235, 0.20 * L),
        (0, 0, 0.375, 0.185 * L),
        (-0.295 * L, 0, 0.335, 0.072 * L),
        (0.295 * L, 0, 0.335, 0.072 * L),
        (-0.315 * L, 0.03, 0.195, 0.078 * L),
        (0.315 * L, 0.03, 0.195, 0.078 * L),
        (0, 0, 0.485, 0.075 * L),
    ]


PALETA = {
    "angular": {"corpo": (0.16, 0.34, 0.62), "cabeca": (0.92, 0.68, 0.20), "olho": (0.05, 0.08, 0.14)},
    "broto": {"corpo": (0.30, 0.52, 0.26), "cabeca": (0.56, 0.76, 0.33), "olho": (0.07, 0.15, 0.09)},
    "redonda": {"corpo": (0.55, 0.44, 0.72), "cabeca": (0.62, 0.79, 0.92), "olho": (0.15, 0.12, 0.22)},
}

PERFIL = {
    "angular": {"largura": 1.08, "altura": 1.04, "cabeca": 0.20, "bracos": 1.05},
    "broto": {"largura": 0.86, "altura": 1.16, "cabeca": 0.155, "bracos": 0.95},
    "redonda": {"largura": 1.16, "altura": 0.88, "cabeca": 0.235, "bracos": 1.0},
}


# ----------------------------------------------------------------- MONTAR ---
def topo_da_cabeca(pose, perfil):
    """Onde fica o centro da cabeca, para pendurar rosto e enfeite nela."""
    c = perfil["cabeca"]
    if pose == "em_pe":
        return 0.73 * perfil["altura"] + c * 0.9
    return 0.475 + c * 0.9


def montar(especie, pose, x):
    perfil = PERFIL[especie]
    cor = PALETA[especie]
    mat_corpo = material(especie + "_corpo_" + pose, cor["corpo"])
    mat_cabeca = material(especie + "_cabeca_" + pose, cor["cabeca"])
    mat_olho = material(especie + "_olho_" + pose, cor["olho"], rugosidade=0.35)

    if pose == "em_pe":
        blobs = em_pe(perfil["largura"], perfil["altura"], perfil["cabeca"], perfil["bracos"])
    else:
        blobs = sentado(perfil["largura"], perfil["cabeca"])

    # ⚠️ A cabeca **nunca** entra no metaball, em nenhuma criatura. Dentro dele
    # ela funde com o tronco e vira ombro: o segundo render saiu com tres domos
    # sem pescoco. Fora, ela e uma peca propria pousada sobre o pescoco, e
    # continua sendo cabeca a qualquer distancia.

    nome = especie + "_" + pose
    partes = [corpo_metaball(nome + "_corpo", blobs, mat_corpo)]
    z = topo_da_cabeca(pose, perfil)
    c = perfil["cabeca"]

    if especie == "angular":
        # ⚠️ Losango = **duas piramides base a base**, nao uma esfera achatada.
        # Icosfera achatada virou um disco hexagonal no render anterior, que e
        # outra coisa. Cone de 4 lados da a piramide; espelhada, o losango.
        for cima in (1, -1):
            bpy.ops.mesh.primitive_cone_add(
                vertices=4,
                radius1=c * 1.25,
                depth=c * 1.15,
                location=(0, 0, z + cima * c * 0.575),
                rotation=(0 if cima > 0 else 3.14159, 0, 0.785),
            )
            piramide = bpy.context.object
            piramide.name = nome + "_cabeca_" + ("alto" if cima > 0 else "baixo")
            # 0,88 e nao 0,72: cabeca rasa demais nao tem onde pousar o olho.
            piramide.scale = Vector((1.0, 0.88, 1.0))
            bpy.ops.object.transform_apply(scale=True)
            piramide.data.materials.append(mat_cabeca)
            bpy.ops.object.shade_flat()
            partes.append(piramide)
    elif especie == "broto":
        partes.append(bola(nome + "_cabeca", (0, 0, z), c, mat_cabeca, achata=(1, 0.95, 1.35)))
        # Duas folhas curtas. Folha comprida fica linda em 2D e vira vareta dura
        # em 3D, porque nao ha simulacao para faze-la ceder.
        for lado in (-1, 1):
            folha_obj = bola(
                    nome + "_folha_" + ("e" if lado < 0 else "d"),
                    (lado * c * 0.34, 0, z + c * 1.02),
                    c * 0.42,
                    mat_cabeca,
                    achata=(1.0, 0.26, 1.45),
                    rot=(0, lado * 0.62, 0),
                )
            partes.append(folha_obj)
        partes.append(
            bola(nome + "_ponta", (0, 0, z + c * 0.72), c * 0.34, mat_cabeca, achata=(1, 1, 1.4))
        )
    else:
        # Cabeca redonda de verdade, e a calota clara por cima.
        partes.append(bola(nome + "_cabeca", (0, 0, z), c, mat_corpo, achata=(1, 0.94, 1.02)))
        partes.append(
            bola(nome + "_calota", (0, 0, z + c * 0.26), c * 0.985, mat_cabeca, achata=(1, 0.94, 0.8))
        )

    # ⚠️ O avanco do olho depende do **formato da cabeca**, nao de uma fracao
    # fixa do raio. O losango e mais raso na frente que a esfera, e com o mesmo
    # numero para as tres os olhos da Angular flutuavam na frente do rosto,
    # visivelmente soltos. Cada uma tem o seu.
    AVANCO = {"angular": 0.50, "broto": 0.72, "redonda": 0.78}
    olhos(nome, z + c * 0.02, c * AVANCO[especie], c * 0.34, c * 0.26, mat_olho)
    for o in bpy.context.scene.objects:
        if o.name.startswith(nome + "_olho"):
            partes.append(o)

    # Junta tudo num objeto so, com o nome que o site procura. Malhas separadas
    # multiplicariam as chamadas de desenho por seis.
    bpy.ops.object.select_all(action="DESELECT")
    for p in partes:
        p.select_set(True)
    bpy.context.view_layer.objects.active = partes[0]
    bpy.ops.object.join()
    junto = bpy.context.object
    junto.name = nome
    junto.location = Vector((x, 0, 0))
    return junto


limpar()

ESPECIES = ("angular", "broto", "redonda")
feitos = []
for i, esp in enumerate(ESPECIES):
    for j, pose in enumerate(("em_pe", "sentado")):
        feitos.append(montar(esp, pose, (i * 2 + j) * 0.95 - 2.4))

# ------------------------------------------------------------------- CENA ---
# Chao neutro so para o render de conferencia. Nao vai para o glb.
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0))
chao = bpy.context.object
chao.name = "chao_de_estudio"
chao.data.materials.append(material("estudio", (0.82, 0.80, 0.76), 0.9))

bpy.ops.object.light_add(type="AREA", location=(2.4, -3.2, 3.4))
luz = bpy.context.object
luz.data.energy = 420
luz.data.size = 3.0
luz.rotation_euler = (0.85, 0, 0.7)

bpy.ops.object.light_add(type="AREA", location=(-3.0, -1.6, 1.9))
preenche = bpy.context.object
preenche.data.energy = 90
preenche.data.size = 4.0
preenche.rotation_euler = (1.3, 0, -1.0)

cena = bpy.context.scene
cena.render.engine = "CYCLES"
cena.cycles.samples = RENDER["amostras"]
cena.render.resolution_x = RENDER["larg"]
cena.render.resolution_y = RENDER["alt"]
cena.render.film_transparent = False
cena.world.use_nodes = True
cena.world.node_tree.nodes["Background"].inputs[0].default_value = (0.86, 0.87, 0.88, 1)
cena.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6

bpy.ops.object.camera_add(location=(0, -8.6, 1.25), rotation=(1.48, 0, 0))
camera = bpy.context.object
cena.camera = camera

VISTAS = {
    # Todas em fila: e a vista que decide se as tres se distinguem.
    "fila": ((0, -8.6, 1.25), (1.48, 0, 0)),
    # De perto numa so: e a distancia em que rosto, mao e joelho aparecem â€” e
    # foi ela que reprovou a versao anterior.
    "perto": ((-0.5, -1.45, 0.80), (1.50, 0, 0)),
}

for nome, (loc, rot) in VISTAS.items():
    camera.location = Vector(loc)
    camera.rotation_euler = rot
    cena.render.filepath = os.path.join(BASE, "criaturas_" + nome + ".png")
    bpy.ops.render.render(write_still=True)
    print("VISTA_OK " + nome)

if "--exportar" in sys.argv:
    for o in bpy.data.objects:
        o.select_set(o.type == "MESH" and o.name != "chao_de_estudio")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(BASE, "criaturas.glb"),
        export_format="GLB",
        use_selection=True,
    )
    print("GLB_OK")

print("RENDER_FEITO")
