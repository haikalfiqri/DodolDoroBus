import math
from lib import *

# ------------------------------------------------------------------ shared big-cat body (faces right, lunging)

def bigcat(c1, c2, belly, iris, tail, ears="round", mane=None, pattern="", head_extra="", roar=True, gear="", mane_front=False, gear_front=""):
    g = ground(w=140)
    g += tail
    g += P("M112,300 Q92,350 122,354 L162,354 Q170,326 158,296 Z", c2)                 # back leg
    if mane and not mane_front:
        g += mane
    g += P("M100,300 Q104,234 182,230 Q262,224 288,262 Q302,302 268,326 Q200,348 136,338 Q100,328 100,300 Z", c1)
    g += shade("M112,322 Q196,350 272,318 Q240,344 190,346 Q136,344 112,322 Z", c2, .6)
    g += P("M222,300 L218,350 Q234,358 252,350 L256,302 Z", c2)                         # far front leg
    g += P("M258,290 L290,344 Q310,356 326,344 L292,282 Z", c1)                         # near front leg (stepping)
    g += P("M288,340 Q308,330 330,342 Q332,356 310,358 Q288,358 288,340 Z", belly)
    for i in range(3):
        g += P(f"M{300+i*8},356 l4,6", "none", sw=2.5)
    g += pattern
    g += gear
    if mane and mane_front:
        g += mane
    if ears == "round":
        g += E(222, 142, 20, 20, c1) + E(222, 144, 10, 10, c2, sw=0)
        g += E(300, 128, 18, 18, c1) + E(300, 130, 9, 9, c2, sw=0)
    g += P("M206,200 Q200,134 262,126 Q326,124 334,190 Q336,246 272,252 Q208,254 206,200 Z", c1)  # head
    g += shade("M210,210 Q220,250 270,252 Q232,240 222,206 Z", c2, .5)
    g += E(306, 216, 30, 22, belly)
    g += P("M318,196 L340,198 L330,212 Z", "#3A2A2A", sw=2.5)                           # nose
    if roar:
        g += P("M286,226 Q310,262 340,224 Q314,238 286,226 Z", "#8E1B2A", sw=3)
        g += P("M292,230 L296,242 L301,232 Z M326,229 L322,241 L318,231 Z", "#FFFFFF", sw=1.5)
    g += eye(274, 184, 1.1, iris)
    g += head_extra
    g += gear_front
    return g


def lion():
    c1, c2, be = "#E5A93B", "#B9772A", "#FBE7BF"
    mane_c, mane_d = "#A0461C", "#6E2C10"
    pts = []
    for i in range(18):
        a = 2 * math.pi * i / 18
        rr = 112 if i % 2 == 0 else 80
        pts.append(f"{262+rr*math.cos(a):.0f},{188+rr*math.sin(a)*0.95:.0f}")
    mane = P("M" + " L".join(pts) + " Z", mane_c)
    pts2 = []
    for i in range(18):
        a = 2 * math.pi * (i + 0.5) / 18
        rr = 80 if i % 2 == 0 else 58
        pts2.append(f"{262+rr*math.cos(a):.0f},{190+rr*math.sin(a)*0.95:.0f}")
    mane += P("M" + " L".join(pts2) + " Z", mane_d, sw=0)
    tail = P("M104,296 Q56,286 52,232 Q50,208 66,198", "none", sw=10, stroke=c2) + P("M104,296 Q56,286 52,232 Q50,208 66,198", "none", sw=5, stroke=c1)
    tail += P("M66,198 Q50,170 72,160 Q92,170 82,196 Z", mane_c)
    mk = TYPE_COL["making"]
    gear = (P("M318,330 L352,150", "none", sw=13, stroke=OUT) + P("M318,330 L352,150", "none", sw=7, stroke="#8B5A2B") +
            P("M318,120 L384,132 L376,176 L310,164 Z", "#9AA4B2") + P("M318,120 L384,132", "none", sw=4, stroke=mk) +
            P("M322,142 L380,152", "none", sw=2.5, stroke="#6B7684") +
            f'<circle cx="349" cy="149" r="8" fill="{mk}" stroke="{OUT}" stroke-width="2.5"/>' +
            E(320, 322, 16, 14, c1))
    return bigcat(c1, c2, be, "#E8A317", tail, mane=mane, mane_front=True, gear_front=gear)


def tiger():
    c1, c2, be = "#F08A24", "#B85A12", "#FFF3E0"
    dg = TYPE_COL["digital"]
    tail = P("M104,300 Q40,300 46,236 Q50,206 74,196 Q66,226 74,252 Q84,282 112,286 Z", c1)
    for (x, y) in [(54, 250), (60, 228), (70, 210)]:
        tail += P(f"M{x-6},{y} l14,-4", "none", sw=5)
    stripes = ""
    for (x, y, l) in [(130, 250, 34), (160, 240, 40), (192, 236, 42), (224, 236, 38), (252, 244, 30)]:
        stripes += P(f"M{x},{y} q-6,{l/2} 4,{l}", "none", sw=7)
        stripes += P(f"M{x},{y} q-6,{l/2} 4,{l}", "none", sw=2, stroke=dg)
    head_extra = ""
    for (x, y) in [(244, 140), (262, 136), (280, 140)]:
        head_extra += P(f"M{x},{y} l4,16", "none", sw=5)
    head_extra += P("M214,190 l18,6 M212,206 l18,2", "none", sw=5)
    head_extra += P("M244,140 l4,16 M262,136 l4,16 M280,140 l4,16", "none", sw=1.5, stroke=dg)
    return bigcat(c1, c2, be, "#2BD4F0", tail, pattern=stripes, head_extra=head_extra)


def snow_leopard():
    c1, c2, be = "#E6ECF2", "#A9B5C4", "#FFFFFF"
    ai = TYPE_COL["ai"]
    tail = P("M104,304 Q30,316 30,250 Q32,200 80,196 Q60,224 64,250 Q72,290 110,290 Z", c1)
    tail += E(52, 262, 6, 5, "none", sw=3) + E(46, 236, 6, 5, "none", sw=3) + E(64, 212, 6, 5, "none", sw=3)
    spots = ""
    for (x, y) in [(140, 264), (172, 250), (204, 258), (236, 252), (156, 296), (196, 292), (240, 286), (122, 290)]:
        spots += E(x, y, 9, 7, "none", sw=3.5) + E(x, y, 3, 3, "#5E6B7A", sw=0)
    head_extra = E(240, 150, 5, 4, "#5E6B7A", sw=0) + E(256, 142, 5, 4, "#5E6B7A", sw=0) + E(222, 170, 5, 4, "#5E6B7A", sw=0)
    head_extra += (f'<ellipse cx="274" cy="184" rx="34" ry="26" fill="none" stroke="{ai}" stroke-width="2.5" stroke-dasharray="6 5"/>'
                   f'<path d="M232,184 L316,184 M274,152 L274,216" stroke="{ai}" stroke-width="1.5" opacity="0.8"/>')
    return bigcat(c1, c2, be, "#7DD3FC", tail, pattern=spots, head_extra=head_extra, roar=False)


def haechi():
    c1, c2, be = "#5CC8B0", "#2E8C7A", "#E9FFF8"
    cm = TYPE_COL["computing"]
    curls = ""
    for i in range(14):
        a = math.pi * (0.55 + 1.5 * i / 13)
        x, y = 262 + 92 * math.cos(a), 190 + 86 * math.sin(a)
        curls += E(round(x), round(y), 22, 20, "#2E6F8E")
        curls += P(f"M{x-8:.0f},{y:.0f} q8,-12 14,0 q-4,8 -10,4", "none", sw=3, stroke="#BEE7FF")
    tail = P("M104,296 Q60,300 50,250", "none", sw=10, stroke=c2) + P("M104,296 Q60,300 50,250", "none", sw=5, stroke=c1)
    for (x, y) in [(50, 242), (36, 226), (58, 220)]:
        tail += E(x, y, 16, 14, "#2E6F8E")
    scales = ""
    for row, y in enumerate([252, 276, 300]):
        for k in range(5):
            x = 130 + k * 32 + (16 if row % 2 else 0)
            scales += P(f"M{x-14},{y} q14,-16 28,0", "none", sw=3, stroke=c2)
    scales += P("M200,228 Q240,262 284,236", "none", sw=6) + f'<circle cx="244" cy="262" r="14" fill="#F4C542" stroke="{OUT}" stroke-width="4"/><path d="M236,262 h16" stroke="{OUT}" stroke-width="3"/>'
    head_extra = (P("M252,128 Q258,70 286,46 Q282,86 276,128 Z", "#F4C542") + P("M262,118 Q266,84 280,62", "none", sw=2, stroke="#FFF6C8") +
                  f'<path d="M222,168 l10,-8 M216,188 l12,-4" stroke="{cm}" stroke-width="3"/>')
    return bigcat(c1, c2, be, "#F4C542", tail, ears=None, mane=curls, pattern=scales, head_extra=head_extra)


# ------------------------------------------------------------------ others

def wolf():
    c1, c2, wh = "#7E8AA6", "#4B5570", "#EEF1F6"
    cm = TYPE_COL["computing"]
    g = ground(w=140)
    g += P("M104,292 Q40,268 34,210 Q70,236 90,232 Q70,256 120,270 Z", c1)              # bushy tail
    g += P("M40,216 Q60,236 86,236 Q66,226 54,206 Z", c2, sw=0)
    g += P("M112,300 Q92,350 122,354 L162,354 Q170,326 158,296 Z", c2)
    g += P("M100,300 Q104,238 180,232 Q252,226 280,260 Q296,300 262,326 Q196,346 134,338 Q100,328 100,300 Z", c1)
    g += P("M150,240 l10,-18 l8,16 l10,-20 l8,18 l10,-16 l6,18", "none", sw=4)            # hackles
    g += shade("M112,322 Q196,350 266,318 Q236,344 188,346 Q134,344 112,322 Z", c2, .6)
    g += P("M222,300 L218,350 Q234,358 252,350 L256,302 Z", c2)
    g += P("M256,290 L286,344 Q306,356 322,344 L290,282 Z", c1)
    g += P("M284,340 Q304,330 326,342 Q328,356 306,358 Q284,358 284,340 Z", wh)
    g += P("M226,236 Q256,288 292,262 Q282,240 258,232 Z", wh, sw=0)                    # chest fluff
    # armband
    g += P("M262,300 L298,292 L304,306 L268,314 Z", cm)
    # head with long snout
    g += P("M222,128 L230,62 L268,118 Z", c1) + P("M232,112 L236,82 L254,112 Z", "#C9A0B4", sw=0)
    g += P("M262,118 L296,58 L304,130 Z", c1) + P("M272,116 L292,82 L294,122 Z", "#C9A0B4", sw=0)
    g += P("M210,198 Q204,140 250,126 Q292,118 310,150 L352,176 Q362,196 340,206 L304,226 Q270,252 236,242 Q210,230 210,198 Z", c1)
    g += P("M268,206 Q300,236 340,206 L304,226 Q284,236 268,206 Z", wh, sw=0)
    g += P("M212,212 l-16,8 l14,4 l-10,10 l18,-2", c1)                                  # cheek tuft
    g += E(350, 184, 9, 7, OUT, sw=0)
    g += P("M300,214 Q324,232 348,206", "none", sw=3.5)
    g += P("M318,220 L322,232 L326,220 Z", "#FFFFFF", sw=2)
    g += eye(268, 170, 1.05, cm)
    g += P("M244,144 L262,162 M248,138 L266,156", "none", sw=3, stroke="#2E3448")
    return g


def fox():
    c1, c2, wh = "#F28C38", "#C2571A", "#FFF4E6"
    ai = TYPE_COL["ai"]
    g = ground(w=120)
    g += P("M128,308 Q40,320 30,240 Q24,170 92,150 Q78,190 88,226 Q100,272 150,286 Z", c1)  # big tail
    g += P("M92,150 Q60,150 44,180 Q60,168 84,170 Z", wh)
    g += P("M40,226 Q50,260 86,276", "none", sw=3, stroke=ai)
    g += f'<circle cx="62" cy="200" r="4" fill="{ai}"/><circle cx="86" cy="276" r="4" fill="{ai}"/>'
    g += P("M122,310 Q108,350 134,352 L168,352 Q172,328 160,300 Z", c2)
    g += P("M114,316 Q142,250 222,260 Q272,268 270,316 Q262,346 196,346 Q132,346 114,316 Z", c1)
    g += shade("M128,330 Q190,350 262,322 Q248,344 196,346 Q148,346 128,330 Z", c2, .6)
    g += P("M236,300 L248,348 Q266,356 282,346 L268,296 Z", "#3B2416")                 # dark socks
    g += P("M196,300 Q206,262 232,262 L240,300 Z", wh, sw=0)
    g += P("M190,168 L180,96 L232,144 Z", c1) + P("M188,124 L184,100 L204,120 Z", "#3B2416", sw=0)
    g += P("M262,138 L306,84 L304,156 Z", c1) + P("M290,104 L304,88 L302,120 Z", "#3B2416", sw=0)
    g += P("M184,212 Q176,150 236,140 Q300,136 314,190 L342,212 Q340,230 312,236 Q280,256 244,254 Q188,254 184,212 Z", c1)
    g += P("M236,222 Q270,256 312,236 Q340,230 342,212 Q300,226 270,214 Z", wh, sw=0)
    g += E(340, 210, 7, 6, OUT, sw=0)
    g += P("M300,232 Q314,240 330,232", "none", sw=3)
    g += eye(268, 182, 1.05, "#F5C542")
    g += P("M248,150 l10,-14 l10,14 l-10,8 Z", ai, sw=2.5)                               # AI forehead gem
    g += shade("M188,224 Q198,252 244,254 Q208,244 200,214 Z", c2, .5)
    return g


def penguin():
    bk, wh, org = "#2A2F45", "#F5F7FA", "#FF9F1C"
    cm = TYPE_COL["computing"]
    g = ground(w=95)
    g += P("M168,340 Q160,356 184,356 L204,356 Q206,344 196,336 Z", org)
    g += P("M212,340 Q206,356 230,356 L250,356 Q252,344 242,336 Z", org)
    g += P("M150,250 Q146,140 210,128 Q276,126 276,240 Q280,330 214,344 Q150,344 150,250 Z", bk)  # body
    g += P("M176,250 Q174,170 220,166 Q262,170 258,250 Q258,326 216,334 Q178,330 176,250 Z", wh, sw=0)
    g += P("M150,236 Q112,256 104,306 Q132,296 156,274 Z", bk)                         # back flipper
    g += P("M262,226 Q300,190 330,176 Q326,210 280,250 Z", bk)                         # front flipper raised (punch)
    g += E(330, 176, 12, 12, bk)
    g += shade("M180,300 Q216,340 256,296 Q246,330 214,334 Q186,330 180,300 Z", "#C9D1DC", .7)
    # headband
    g += P("M168,164 Q214,146 270,160 L268,176 Q214,162 170,180 Z", cm)
    g += P("M170,176 L140,190 L150,170 Z", cm)
    g += '<text x="206" y="172" font-family="monospace" font-weight="700" font-size="13" fill="#0B3D2E">{ }</text>'
    g += P("M262,200 L304,208 L264,222 Z", org)                                        # beak
    g += eye(236, 196, 1.05, "#3BA4F5")
    g += E(212, 222, 9, 6, "#F7A8BE", sw=0, extra='opacity="0.7"')
    return g


def red_panda():
    c1, c2, wh, dk = "#C8502A", "#8E3418", "#FFF4EA", "#3A1A10"
    mk = TYPE_COL["making"]
    g = ground(w=110)
    # ringed tail
    g += P("M150,320 Q70,330 64,260 Q60,214 96,200 Q90,240 104,270 Q120,300 160,300 Z", c1)
    for (x, y) in [(84, 286), (70, 252), (78, 222)]:
        g += P(f"M{x-14},{y+6} q14,-12 30,-4", "none", sw=9, stroke="#F1C9A5")
    g += P("M150,310 Q130,352 160,354 L196,354 Q196,330 188,304 Z", dk)
    g += P("M146,322 Q140,250 196,236 Q252,226 258,290 Q262,342 206,346 Q152,348 146,322 Z", c1)
    g += shade("M150,326 Q196,350 252,316 Q244,342 206,346 Q160,348 150,326 Z", c2, .6)
    g += P("M196,252 Q226,244 246,262 L240,300 Q214,306 196,300 Z", dk, sw=0)
    g += P("M208,344 Q206,356 226,356 L252,356 Q256,344 240,336 Z", dk)
    # bamboo hammer
    g += P("M236,300 L322,190", "none", sw=12, stroke="#4E7A2A") + P("M236,300 L322,190", "none", sw=6, stroke="#8BC34A")
    g += P("M262,268 l8,6 M290,232 l8,6", "none", sw=3, stroke="#33691E")
    g += P("M296,160 L352,204 L330,232 L274,188 Z", "#A5D66B") + P("M300,168 L346,204", "none", sw=3, stroke=mk)
    g += E(258, 278, 15, 13, dk)
    # head
    g += E(212, 160, 18, 18, c1) + E(212, 162, 9, 9, wh, sw=0)
    g += E(290, 150, 18, 18, c1) + E(290, 152, 9, 9, wh, sw=0)
    g += P("M196,206 Q190,152 248,146 Q306,146 306,204 Q306,248 250,252 Q198,252 196,206 Z", c1)
    g += P("M246,218 Q272,250 304,214 Q300,246 254,252 Q232,250 246,218 Z", wh, sw=0)
    g += E(232, 200, 16, 12, wh, sw=0) + E(286, 198, 14, 11, wh, sw=0)
    g += P("M222,180 Q232,214 214,236", "none", sw=6, stroke=c2)                         # tear mark
    g += E(296, 214, 6, 5, OUT, sw=0)
    g += P("M282,226 Q290,234 300,224", "none", sw=3)
    g += eye(268, 192, 1.0, "#6B3A1A")
    g += P("M206,160 Q248,140 296,158", "none", sw=6, stroke=mk)                         # sweatband
    return g


def panda():
    w, b = "#F7F7F7", "#26262E"
    dg = TYPE_COL["digital"]
    g = ground(w=120)
    g += P("M136,316 Q120,354 154,356 L192,356 Q196,330 184,306 Z", b)
    g += P("M136,300 Q130,220 204,214 Q276,212 280,294 Q284,348 210,350 Q140,350 136,300 Z", w)  # round body
    g += P("M150,236 Q206,206 272,240 Q262,262 206,258 Q160,258 150,236 Z", b)              # shoulders band
    g += P("M150,250 Q112,270 116,306 Q140,300 164,276 Z", b)                              # back arm
    g += P("M246,250 Q296,206 314,170 Q336,182 326,210 Q300,252 268,272 Z", b)             # raised fist arm
    g += E(322, 176, 18, 16, b)
    g += shade("M146,314 Q210,350 274,312 Q262,346 210,350 Q156,350 146,314 Z", "#D5D8DE", .8)
    g += P("M214,342 Q210,358 238,358 L266,358 Q268,342 252,334 Z", b)
    # head
    g += E(196, 132, 20, 20, b) + E(290, 124, 20, 20, b)
    g += P("M186,182 Q180,122 242,116 Q306,114 310,178 Q312,230 248,236 Q188,236 186,182 Z", w)
    g += E(232, 172, 16, 20, b, sw=0, rot=-20) + E(284, 170, 15, 19, b, sw=0, rot=20)
    # pixel shades (digital)
    g += P("M212,160 L300,156 L296,184 L270,186 L262,174 L252,186 L216,186 Z", dg, extra='fill-opacity="0.55"')
    g += P("M216,164 h8 v8 h-8 z M276,162 h8 v8 h-8 z", "#FFFFFF", sw=0)
    g += E(256, 198, 8, 6, b, sw=0)
    g += P("M242,210 Q256,218 270,208", "none", sw=3)
    g += shade("M192,192 Q204,232 248,236 Q212,224 204,188 Z", "#D5D8DE", .7)
    return g


def eagle():
    br, bd, wh, yl = "#6B4226", "#47291A", "#F5F5F0", "#FFC107"
    ai = TYPE_COL["ai"]
    g = ground(w=110)
    # wings spread, feathered
    for side in (-1, 1):
        sx = 200 + side * 34
        tipx = 200 + side * 178
        fe = ""
        for k in range(5):                                   # primary feathers fanning out
            fx = tipx - side * k * 26
            fy = 104 + k * 34
            fe += f" L{fx:.0f},{fy:.0f} Q{fx - side*6:.0f},{fy + 26:.0f} {fx - side*20:.0f},{fy + 20:.0f}"
        d = f"M{sx},206 Q{200+side*90},110 {tipx},104" + fe + f" Q{200+side*70},290 {sx},266 Z"
        g += P(d, br)
        g += P(f"M{sx+side*10},226 Q{200+side*90},160 {tipx-side*20},120", "none", sw=3, stroke=bd)
        g += P(f"M{sx+side*8},244 Q{200+side*80},214 {tipx-side*70},218", "none", sw=3, stroke=bd)
        g += P(f"M{sx},212 Q{200+side*60},170 {200+side*110},150 Q{200+side*70},196 {sx},226 Z", wh, sw=0, extra='opacity="0.25"')
    g += P("M160,256 Q148,334 200,350 Q252,334 240,256 Z", br)                            # body
    g += P("M178,320 L170,356 M200,330 L200,358 M222,320 L230,356", "none", sw=8, stroke=bd)  # tail feathers
    g += P("M182,340 l-8,14 l10,-4 M220,340 l8,14 l-10,-4", yl, sw=3)                       # talons
    g += P("M168,262 Q166,210 200,204 Q236,204 234,262 Z", br)
    # head
    g += P("M170,198 Q164,140 206,132 Q248,130 252,178 Q252,214 210,220 Q172,222 170,198 Z", wh)
    g += P("M174,150 l-14,-10 l18,0 M180,138 l-10,-16 l16,8", wh)
    g += P("M240,166 Q276,166 282,188 Q270,184 262,198 Q252,192 238,192 Z", yl)
    g += P("M262,198 Q276,194 282,188", "none", sw=3)
    g += eye(222, 168, 1.0, "#F5A623")
    g += (f'<circle cx="224" cy="168" r="20" fill="none" stroke="{ai}" stroke-width="2.5"/>'
          f'<path d="M224,142 v10 M224,184 v10 M198,168 h10 M240,168 h10" stroke="{ai}" stroke-width="2.5"/>')
    return g


def bonghwang():
    rd, gd, pu, tl = "#E53935", "#FFC107", "#8E24AA", "#26C6DA"
    mk = TYPE_COL["making"]
    g = ground(w=110)
    # tail plumes sweeping left
    for i, (col, dy) in enumerate([(pu, -10), (tl, 20), (gd, 50), (rd, 80)]):
        g += P(f"M170,300 Q90,{260+dy} 40,{200+dy} Q70,{250+dy} 60,{300+dy} Q110,{300+dy} 170,320 Z", col)
        g += E(52 + i * 4, 214 + dy, 10, 7, "#FFFFFF", sw=2.5) + E(52 + i * 4, 214 + dy, 4, 4, col, sw=0)
    # wings raised
    g += P("M190,250 Q150,140 70,80 Q130,110 150,96 Q160,130 186,120 Q190,170 220,180 Z", rd)
    g += P("M200,236 Q160,160 110,112 Q150,130 180,150 Z", gd, sw=0)
    g += P("M236,240 Q280,140 350,76 Q320,120 334,130 Q300,140 300,170 Q270,170 252,230 Z", rd)
    g += P("M242,228 Q280,160 322,118 Q300,160 268,200 Z", gd, sw=0)
    g += P("M184,262 Q176,330 214,346 Q254,330 246,262 Z", rd)
    g += P("M196,346 l-6,12 M214,350 v12 M232,346 l6,12", "none", sw=4, stroke="#FFB300")
    g += P("M186,262 Q184,214 216,206 Q250,208 248,262 Q218,274 186,262 Z", gd)
    # head + crest
    g += P("M222,150 Q210,104 240,84 Q236,112 250,124 Q260,92 286,86 Q268,116 270,140 Z", pu)
    g += P("M196,196 Q192,146 232,140 Q272,138 276,182 Q276,214 236,220 Q200,220 196,196 Z", rd)
    g += P("M268,170 L304,182 L268,194 Z", gd)
    g += eye(246, 172, 1.0, "#FFD54F")
    g += P("M212,190 q10,12 24,8", "none", sw=3, stroke=gd)
    for (x, y) in [(300, 230), (316, 214), (290, 206), (130, 150)]:                     # forge embers
        g += f'<path d="M{x},{y} q5,-10 0,-18 q-5,8 0,18 Z" fill="{mk}" stroke="{OUT}" stroke-width="1.5"/>'
    return g


def blue_dragon():
    bl, bd, be, hn = "#2F80ED", "#1A4F9C", "#FFF1C9", "#E8D5A3"
    ai = TYPE_COL["ai"]
    g = ground(w=150)
    # cloud
    g += P("M70,340 Q60,310 96,312 Q104,286 136,300 Q160,284 178,306 Q210,300 210,332 Q214,354 180,352 L96,352 Q66,354 70,340 Z", "#FFFFFF")
    # serpentine body: S curve
    body = "M80,300 C40,240 120,200 170,240 C220,280 290,300 300,240 C306,200 260,180 250,150"
    g += P(body, "none", sw=48, stroke=OUT) + P(body, "none", sw=40, stroke=bl)
    g += P(body, "none", sw=14, stroke=be, extra='transform="translate(4,8)"')
    for i, (x, y) in enumerate([(110, 236), (150, 228), (196, 262), (240, 284), (282, 270), (296, 226)]):
        g += P(f"M{x-8},{y-14} l8,-14 l8,14", bd, sw=2.5)                                  # dorsal spikes
    g += P("M80,300 Q60,320 40,310 Q56,300 52,286 Z", bd)                                 # tail fin
    # claws
    g += P("M190,262 l-10,26 l10,-4 l4,10 l6,-12", be, sw=3)
    g += P("M296,262 l12,22 l-12,-2 l-2,10 l-8,-12", be, sw=3)
    # pearl (cloud network)
    g += f'<circle cx="330" cy="300" r="20" fill="{ai}" stroke="{OUT}" stroke-width="4"/><circle cx="324" cy="292" r="6" fill="#FFFFFF"/>'
    g += P("M316,300 L330,288 L344,302 L330,312 Z", "none", sw=1.5, stroke="#FFFFFF")
    # head
    g += P("M234,120 Q226,82 262,74 Q300,70 330,98 L360,108 Q370,126 352,134 L322,140 Q292,164 258,158 Q232,150 234,120 Z", bl)
    g += P("M300,138 Q330,142 352,134 Q340,150 310,152 Z", be, sw=2)
    g += P("M244,84 Q232,40 258,24 M246,62 L230,52 M252,46 L270,36", "none", sw=6, stroke=hn)  # antlers
    g += P("M274,78 Q276,36 304,26 M278,56 L296,48", "none", sw=6, stroke=hn)
    g += P("M352,120 Q384,130 392,160 M346,128 Q370,150 366,182", "none", sw=3, stroke=bd)    # whiskers
    g += P("M236,126 l-18,6 l14,6 l-12,10 l20,-4", bd)                                       # mane
    g += E(356, 114, 4, 3, OUT, sw=0)
    g += eye(290, 102, 1.0, "#FFD54F")
    return g


PETS_B = {"fox": fox, "penguin": penguin, "red_panda": red_panda, "wolf": wolf, "panda": panda, "eagle": eagle,
          "lion": lion, "tiger": tiger, "snow_leopard": snow_leopard, "haechi": haechi, "bonghwang": bonghwang,
          "blue_dragon": blue_dragon}
