"""Baby (Lv 1-3) and Junior (Lv 4-6) forms. Chibi body: big head, small body, sparkly eyes.
Junior = the same drawing scaled 1.18 from the feet, a rarity-colour scarf and determined brows."""
import math
from lib import *

BLUSH = "#F7A1B5"


def ceye(x, y, r, iris):
    g = E(x, y, r * 0.82, r, OUT, sw=0)
    g += E(x, y + r * 0.22, r * 0.6, r * 0.62, iris, sw=0)
    g += E(x, y + r * 0.42, r * 0.36, r * 0.3, "#FFFFFF", sw=0, extra='opacity="0.25"')
    g += f'<circle cx="{x - r*0.28:.1f}" cy="{y - r*0.34:.1f}" r="{r*0.3:.1f}" fill="#FFFFFF"/>'
    g += f'<circle cx="{x + r*0.3:.1f}" cy="{y + r*0.36:.1f}" r="{r*0.13:.1f}" fill="#FFFFFF"/>'
    return g


def ears(kind, c1, c2, inner):
    if kind == "floppy":
        return (P("M146,132 Q92,140 100,232 Q132,230 156,168 Z", c2) +
                P("M278,132 Q332,140 324,232 Q292,230 268,168 Z", c2))
    if kind == "pointy":
        return (P("M126,156 L114,62 L192,118 Z", c1) + P("M136,138 L130,90 L172,122 Z", inner, sw=0) +
                P("M232,116 L304,58 L300,156 Z", c1) + P("M250,118 L292,84 L290,140 Z", inner, sw=0))
    if kind == "round":
        return (E(130, 124, 30, 30, c1) + E(132, 126, 15, 15, inner, sw=0) +
                E(294, 120, 30, 30, c1) + E(292, 122, 15, 15, inner, sw=0))
    if kind == "long":
        return (P("M168,124 Q132,20 168,4 Q204,36 196,120 Z", c1) + P("M172,112 Q150,40 168,22 Q186,48 186,112 Z", inner, sw=0) +
                P("M230,118 Q240,24 290,12 Q296,70 258,128 Z", c1) + P("M240,110 Q252,44 282,30 Q282,74 254,118 Z", inner, sw=0))
    return ""


def snout(kind, belly, nose, beak="#FFB300"):
    if kind == "dog":
        return (E(222, 240, 40, 28, belly) + E(222, 224, 12, 9, nose, sw=0) +
                '<circle cx="218" cy="221" r="3" fill="#fff"/>' +
                P("M206,250 Q214,260 222,250 Q230,260 238,250", "none", sw=3.5))
    if kind == "cat":
        return (P("M214,226 L230,226 L222,236 Z", nose, sw=2) +
                P("M208,244 Q215,252 222,244 Q229,252 236,244", "none", sw=3) +
                P("M176,236 L140,230 M176,244 L140,248 M268,236 L304,230 M268,244 L304,248", "none", sw=2, stroke="#46516A"))
    if kind == "bear":
        return (E(222, 242, 34, 24, belly) + E(222, 230, 11, 8, nose, sw=0) +
                '<circle cx="218" cy="227" r="2.5" fill="#fff"/>' +
                P("M210,250 Q216,257 222,250 Q228,257 234,250", "none", sw=3))
    if kind == "beak":
        return (P("M204,226 Q222,216 240,226 Q232,248 222,250 Q212,248 204,226 Z", beak, sw=3.5) +
                P("M206,232 Q222,240 238,232", "none", sw=2.5))
    return ""


def baby(c1, c2, belly, iris, ear="round", inner=None, nose=OUT, muzzle="bear", tail="", behind="", marks="",
         body_c=None, arm_c=None, feet_c=None, front="", beak="#FFB300", scarf=None, brows=False):
    inner = inner or c2
    body_c = body_c or c1
    arm_c = arm_c or body_c
    feet_c = feet_c or c2
    g = ground(w=95)
    g += tail + behind
    g += E(196, 302, 72, 54, body_c)                                          # body
    g += E(196, 316, 40, 30, belly, sw=0)                                     # tummy
    g += E(166, 346, 26, 14, feet_c) + E(232, 348, 26, 14, feet_c)            # feet
    g += E(144, 300, 18, 27, arm_c, rot=22) + E(250, 306, 18, 25, arm_c, rot=-28)  # arms
    if scarf:
        g += P("M136,270 Q200,302 268,270 L272,290 Q200,324 132,290 Z", scarf)
        g += P("M150,288 L124,326 L166,308 Z", scarf)
        g += P("M146,280 Q200,306 262,280", "none", sw=2, stroke="#FFFFFF", extra='opacity="0.6"')
    g += ears(ear, c1, c2, inner) if ear in ("pointy", "long") else ""
    g += ears(ear, c1, c2, inner) if ear == "round" else ""
    g += E(212, 196, 102, 90, c1)                                             # head
    g += shade("M120,220 Q140,282 212,286 Q160,270 140,214 Z", c2, .35)
    g += ears(ear, c1, c2, inner) if ear == "floppy" else ""
    g += marks
    g += snout(muzzle, belly, nose, beak)
    g += ceye(180, 198, 24, iris) + ceye(262, 196, 24, iris)
    g += E(166, 236, 14, 8, BLUSH, sw=0, extra='opacity="0.75"') + E(278, 234, 14, 8, BLUSH, sw=0, extra='opacity="0.75"')
    if brows:
        g += P("M158,164 L198,174 M244,172 L284,160", "none", sw=5)
    g += front
    return g


# ------------------------------------------------------------------ the 15 babies (each returns a function of scarf, brows)

def dog(**k):
    return baby("#E3A35F", "#B9733A", "#FBE3C4", "#6B3E1E", ear="floppy", muzzle="dog",
                tail=P("M128,300 Q90,280 96,246 Q112,270 136,284 Z", "#E3A35F"),
                marks=E(256, 160, 16, 12, "#F3C48E", sw=0), **k)


def cat(**k):
    return baby("#8C9BB5", "#5D6A85", "#F2F4F8", "#22D3EE", ear="pointy", inner="#F5B3C8", muzzle="cat", nose="#F06A8F",
                tail=P("M130,310 Q70,300 74,240 Q78,214 100,210 Q92,240 100,262 Q110,288 140,294 Z", "#8C9BB5"),
                marks=P("M192,118 l8,22 M212,112 l2,24 M232,118 l-6,22", "none", sw=4, stroke="#5D6A85"), **k)


def rabbit(**k):
    return baby("#F4EFEA", "#C9BFB4", "#FFFFFF", "#E2584B", ear="long", inner="#F7A8BE", muzzle="cat", nose="#F7A8BE",
                tail=E(126, 316, 20, 18, "#FFFFFF"),
                front=P("M216,246 L216,258 L228,258 L228,246", "#FFFFFF", sw=2), **k)


def fox(**k):
    c1 = "#F28C38"
    tail = (P("M140,320 Q60,330 50,256 Q46,200 98,188 Q88,226 96,256 Q110,294 150,300 Z", c1) +
            P("M98,188 Q66,190 54,222 Q72,206 92,208 Z", "#FFF4E6"))
    marks = (P("M120,214 Q150,280 212,286 Q170,252 172,230 Q150,236 120,214 Z", "#FFF4E6", sw=0) +
             P("M304,214 Q274,280 212,286 Q254,252 252,230 Q274,236 304,214 Z", "#FFF4E6", sw=0) +
             P("M122,96 L114,62 L146,90 Z M296,92 L304,58 L272,86 Z", "#3B2416", sw=0))
    return baby(c1, "#C2571A", "#FFF4E6", "#F5C542", ear="pointy", inner="#FFE0C2", muzzle="dog", tail=tail, marks=marks,
                feet_c="#3B2416", **k)


def penguin(**k):
    marks = P("M140,214 Q150,140 212,138 Q276,140 284,214 Q276,270 212,272 Q150,270 140,214 Z", "#F5F7FA", sw=0)
    return baby("#7C879E", "#4E586D", "#E8ECF2", "#3BA4F5", ear=None, muzzle="beak", beak="#FF9F1C", marks=marks,
                arm_c="#4E586D", feet_c="#FF9F1C",
                front=P("M196,112 q4,-16 14,-18 q-2,10 4,16", "none", sw=4, stroke="#4E586D"), **k)


def red_panda(**k):
    c1, dk = "#C8502A", "#3A1A10"
    tail = P("M140,318 Q66,322 62,262 Q60,226 92,214 Q86,248 98,274 Q112,300 150,302 Z", c1)
    for (x, y) in [(78, 290), (68, 258), (76, 232)]:
        tail += P(f"M{x-12},{y+6} q12,-10 26,-4", "none", sw=8, stroke="#F1C9A5")
    marks = (E(172, 168, 22, 14, "#FFF4EA", sw=0) + E(252, 166, 22, 14, "#FFF4EA", sw=0) +
             P("M168,222 Q170,256 156,276", "none", sw=6, stroke="#8E3418") + P("M266,220 Q264,254 278,272", "none", sw=6, stroke="#8E3418") +
             E(222, 244, 32, 22, "#FFF4EA", sw=0))
    return baby(c1, "#8E3418", "#FFF4EA", "#6B3A1A", ear="round", inner="#FFF4EA", muzzle="bear", tail=tail, marks=marks,
                arm_c=dk, feet_c=dk, **k)


def wolf(**k):
    c1 = "#7E8AA6"
    tail = P("M132,300 Q70,290 66,236 Q96,256 112,250 Q100,272 142,284 Z", c1)
    marks = (E(222, 246, 46, 30, "#EEF1F6", sw=0) +
             P("M110,214 l-16,6 l14,8 l-10,10 l20,-2", c1) + P("M314,214 l16,6 l-14,8 l10,10 l-20,-2", c1))
    return baby(c1, "#4B5570", "#EEF1F6", "#34D399", ear="pointy", inner="#C9A0B4", muzzle="dog", tail=tail, marks=marks, **k)


def panda(**k):
    b = "#26262E"
    marks = E(178, 202, 30, 36, b, sw=0, rot=-25) + E(264, 200, 30, 36, b, sw=0, rot=25)
    return baby("#F7F7F7", "#D5D8DE", "#FFFFFF", "#5A5A6A", ear="round", inner=b, muzzle="bear", nose=b, marks=marks,
                arm_c=b, feet_c=b, body_c="#F7F7F7",
                behind=E(130, 124, 30, 30, b) + E(294, 120, 30, 30, b), **k)


def eagle(**k):
    tuft = P("M196,110 q-6,-26 8,-34 q2,16 10,22 q6,-20 22,-22 q-4,18 -12,34 Z", "#F5F5F0")
    return baby("#F5F5F0", "#D8D2C4", "#FFFFFF", "#F5A623", ear=None, muzzle="beak", beak="#FFC107",
                body_c="#8A5A36", arm_c="#6B4226", feet_c="#FFC107", behind=tuft,
                front=P("M222,226 Q246,232 238,252 Q232,242 224,244 Z", "#FFC107", sw=3), **k)


def lion(**k):
    c1, mane = "#E5A93B", "#A0461C"
    pts = []
    for i in range(22):
        a = 2 * math.pi * i / 22
        rr = 134 if i % 2 == 0 else 112
        pts.append(f"{212+rr*math.cos(a):.0f},{198+rr*math.sin(a)*0.9:.0f}")
    behind = P("M" + " L".join(pts) + " Z", mane)
    tail = P("M130,306 Q86,300 80,260", "none", sw=8, stroke="#B9772A") + E(80, 250, 14, 16, mane)
    return baby(c1, "#B9772A", "#FBE7BF", "#E8A317", ear="round", inner="#B9772A", muzzle="bear", nose="#3A2A2A",
                tail=tail, behind=behind, marks=P("M200,110 q12,-18 24,0", "none", sw=6, stroke=mane), **k)


def tiger(**k):
    c1 = "#F08A24"
    tail = P("M132,310 Q74,306 78,250 Q82,226 100,220 Q94,250 102,272 Q112,294 140,298 Z", c1)
    tail += P("M80,262 l16,-2 M84,242 l14,2", "none", sw=5)
    marks = (P("M196,112 l4,20 M212,108 l0,22 M228,112 l-4,20", "none", sw=6) +
             P("M112,190 l22,6 M114,208 l20,2 M312,188 l-22,6 M310,206 l-20,2", "none", sw=6) +
             E(222, 246, 40, 28, "#FFF3E0", sw=0))
    return baby(c1, "#B85A12", "#FFF3E0", "#2BD4F0", ear="round", inner="#3A2A20", muzzle="bear", nose="#3A2A2A",
                tail=tail, marks=marks, **k)


def snow_leopard(**k):
    c1 = "#E6ECF2"
    tail = P("M136,318 Q60,330 58,262 Q58,214 104,208 Q86,236 92,262 Q100,298 140,304 Z", c1)
    tail += E(76, 270, 6, 5, "none", sw=3) + E(72, 244, 6, 5, "none", sw=3)
    spots = ""
    for (x, y) in [(176, 128), (206, 118), (246, 126), (134, 176), (296, 172), (150, 262), (240, 280), (176, 300)]:
        spots += E(x, y, 8, 6, "none", sw=3) + E(x, y, 2.5, 2.5, "#5E6B7A", sw=0)
    return baby(c1, "#A9B5C4", "#FFFFFF", "#7DD3FC", ear="round", inner="#A9B5C4", muzzle="bear", nose="#7A6A72",
                tail=tail, marks=spots, **k)


def haechi(**k):
    c1 = "#5CC8B0"
    curls = ""
    for i in range(12):
        a = math.pi * (0.62 + 1.42 * i / 11)
        x, y = 212 + 116 * math.cos(a), 198 + 104 * math.sin(a)
        curls += E(round(x), round(y), 18, 16, "#2E6F8E")
        curls += P(f"M{x-6:.0f},{y:.0f} q6,-9 11,0 q-3,6 -8,3", "none", sw=2.5, stroke="#BEE7FF")
    tail = P("M130,306 Q90,306 82,270", "none", sw=8, stroke="#2E8C7A") + E(80, 258, 16, 14, "#2E6F8E")
    front = (P("M206,110 Q212,70 230,56 Q228,86 224,110 Z", "#F4C542") +
             f'<circle cx="198" cy="278" r="12" fill="#F4C542" stroke="{OUT}" stroke-width="3.5"/><path d="M191,278 h14" stroke="{OUT}" stroke-width="2.5"/>')
    return baby(c1, "#2E8C7A", "#E9FFF8", "#F4C542", ear=None, muzzle="bear", nose="#2E5E55", tail=tail, behind=curls,
                front=front, **k)


def bonghwang(**k):
    plumes = ""
    for i, (col, dy) in enumerate([("#8E24AA", -20), ("#26C6DA", 6), ("#FFC107", 32)]):
        plumes += P(f"M142,300 Q86,{270+dy} 56,{226+dy} Q76,{262+dy} 74,{300+dy} Q106,{306+dy} 146,318 Z", col)
        plumes += E(64, 238 + dy, 8, 6, "#FFFFFF", sw=2.5) + E(64, 238 + dy, 3, 3, col, sw=0)
    crest = P("M190,116 Q178,72 200,56 Q200,84 214,96 Q222,66 246,60 Q232,92 232,114 Z", "#8E24AA")
    front = P("M120,190 q-10,-8 -6,-20 M118,206 q-14,-2 -16,-14", "none", sw=3, stroke="#FFC107")
    return baby("#E53935", "#B71C1C", "#FFE082", "#FFD54F", ear=None, muzzle="beak", beak="#FFC107",
                body_c="#FFC107", arm_c="#E53935", feet_c="#FFB300", tail=plumes, behind=crest, front=front, **k)


def blue_dragon(**k):
    c1 = "#2F80ED"
    tail = (P("M136,316 Q70,330 64,280 Q62,250 90,246 Q80,270 92,288 Q108,302 142,300 Z", c1) +
            P("M66,262 l-18,-14 l22,0 Z", "#1A4F9C"))
    horns = (P("M170,116 Q162,82 176,66 M172,92 l-14,-8", "none", sw=7, stroke="#E8D5A3") +
             P("M252,112 Q262,80 284,70 M258,90 l14,-10", "none", sw=7, stroke="#E8D5A3"))
    marks = (E(222, 246, 40, 26, "#FFF1C9", sw=0) +
             P("M246,250 Q290,252 312,274 M198,250 Q154,252 132,274", "none", sw=3, stroke="#1A4F9C"))
    front = (f'<circle cx="252" cy="318" r="15" fill="#A78BFA" stroke="{OUT}" stroke-width="3.5"/><circle cx="247" cy="312" r="4.5" fill="#FFFFFF"/>' +
             P("M186,280 l10,-10 l10,10 l10,-10 l10,10", "#1A4F9C", sw=2))
    return baby(c1, "#1A4F9C", "#FFF1C9", "#FFD54F", ear=None, muzzle="bear", nose="#1A3A70", tail=tail, behind=horns,
                marks=marks, front=front, **k)


BABIES = {"dog": dog, "cat": cat, "rabbit": rabbit, "fox": fox, "penguin": penguin, "red_panda": red_panda,
          "wolf": wolf, "panda": panda, "eagle": eagle, "lion": lion, "tiger": tiger, "snow_leopard": snow_leopard,
          "haechi": haechi, "bonghwang": bonghwang, "blue_dragon": blue_dragon}
