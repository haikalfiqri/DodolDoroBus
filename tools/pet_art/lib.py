"""Shared drawing helpers for the battle-pet SVGs (400x400 canvas, pet faces right)."""
import math, random

OUT = "#1B1530"   # ink outline
SW = 4            # outline width

RARITY = {
    "common":   {"c1": "#7BC67E", "c2": "#C9F2B8", "c3": "#2F7D3A"},
    "uncommon": {"c1": "#4FC3F7", "c2": "#D2F4FF", "c3": "#0B6E99"},
    "rare":     {"c1": "#3D5AFE", "c2": "#B9C6FF", "c3": "#1A237E"},
    "epic":     {"c1": "#FFB300", "c2": "#FFF0B3", "c3": "#C43E00"},
    "mythic":   {"c1": "#9C27B0", "c2": "#7FF5E8", "c3": "#2B0A4A"},
}
TYPE_COL = {"digital": "#22D3EE", "ai": "#A78BFA", "making": "#FB923C", "computing": "#34D399"}


def P(d, fill, sw=SW, stroke=OUT, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'


def E(cx, cy, rx, ry, fill, sw=SW, stroke=OUT, rot=0, extra=""):
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{t} {extra}/>'


def shade(d, fill, op=1.0):
    """Cel-shade shape: no outline."""
    return f'<path d="{d}" fill="{fill}" opacity="{op}"/>'


def eye(x, y, s, iris, look=1, fierce=True):
    """Anime battle eye facing right. s = size. look=1 right."""
    s = s * 1.4
    w, h = 11 * s, 9 * s
    # almond with angled top
    d = (f"M{x-w},{y+h*0.1} Q{x-w*0.4},{y-h*1.15} {x+w},{y-h*0.55} "
         f"Q{x+w*0.6},{y+h*1.0} {x-w},{y+h*0.1} Z")
    g = P(d, "#FFFFFF", sw=3)
    g += f'<circle cx="{x+2*s*look}" cy="{y}" r="{6.2*s}" fill="{iris}"/>'
    g += f'<circle cx="{x+2.6*s*look}" cy="{y+0.4*s}" r="{3.2*s}" fill="{OUT}"/>'
    g += f'<circle cx="{x+0.2*s}" cy="{y-2.6*s}" r="{1.9*s}" fill="#FFFFFF"/>'
    g += f'<circle cx="{x+4.2*s}" cy="{y+2.2*s}" r="{0.9*s}" fill="#FFFFFF"/>'
    if fierce:  # brow
        g += P(f"M{x-w*1.05},{y-h*0.95} L{x+w*1.05},{y-h*0.35}", "none", sw=4.5)
    return g


def speedlines(cx, cy, col, n=10, seed=3):
    r = random.Random(seed)
    s = ""
    for i in range(n):
        x = cx + r.uniform(-150, 150)
        y = cy + r.uniform(-40, 120)
        L = r.uniform(30, 80)
        s += f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x:.0f}" y2="{y-L:.0f}" stroke="{col}" stroke-width="{r.uniform(2,4):.1f}" stroke-linecap="round" opacity="{r.uniform(.35,.8):.2f}"/>'
    return s


def flame_ring(cx, cy, rx, ry, spikes, amp, seed, up=1.6):
    """Rising flame silhouette: sharp tongues that point upward, tallest above the centre."""
    r = random.Random(seed)
    val, peak = [], []
    for i in range(spikes):
        a = -math.pi / 2 + 2 * math.pi * i / spikes
        a2 = a + math.pi / spikes
        top = max(0.0, -math.sin(a2))
        bottom = max(0.0, math.sin(a2))
        val.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
        lift = rx * amp * (0.5 + up * top + 0.9 * (1 - bottom)) * r.uniform(0.75, 1.25)
        px = cx + rx * (1 + amp * 0.25 * (1 - top)) * math.cos(a2)
        py = cy + ry * math.sin(a2) - lift
        peak.append((px, max(py, 6)))
    d = f"M{val[0][0]:.1f},{val[0][1]:.1f} "
    for i in range(spikes):
        v0, p, v1 = val[i], peak[i], val[(i + 1) % spikes]
        c1 = (v0[0] * 0.55 + p[0] * 0.45, v0[1] * 0.35 + p[1] * 0.65 + 14)
        c2 = (v1[0] * 0.65 + p[0] * 0.35, v1[1] * 0.5 + p[1] * 0.5)
        d += f"Q{c1[0]:.1f},{c1[1]:.1f} {p[0]:.1f},{p[1]:.1f} Q{c2[0]:.1f},{c2[1]:.1f} {v1[0]:.1f},{v1[1]:.1f} "
    return d + "Z"


def flame_wall(cx, cy, rx, ry, n, hmax, seed, scale=1.0):
    """A wall of flame tongues standing on an ellipse; tallest at the top centre, leaning outward."""
    r = random.Random(seed)
    d = f"M{cx-rx},{cy} A{rx},{ry} 0 1 0 {cx+rx},{cy} A{rx},{ry} 0 1 0 {cx-rx},{cy} Z "
    for i in range(n):
        t = i / (n - 1)                       # 0..1 left to right along the upper arc (+ sides)
        a = math.pi * (1.15 - 1.3 * t)        # from slightly below left to slightly below right
        bx, by = cx + rx * math.cos(a), cy - ry * math.sin(a)
        centre = 1 - abs(t - 0.5) * 2         # 1 in the middle
        h = hmax * scale * (0.45 + 0.75 * centre ** 0.7) * r.uniform(0.8, 1.15)
        w = (rx * 2.6 / n) * scale * r.uniform(1.6, 2.1)
        lean = (bx - cx) * 0.35 + r.uniform(-10, 10)
        curl = r.choice([-1, 1]) * w * 0.35
        x0, x1 = bx - w / 2, bx + w / 2
        tx, ty = bx + lean, by - h
        d += (f"M{x0:.1f},{by+6:.1f} C{x0:.1f},{by-h*0.45:.1f} {tx-w*0.5+curl:.1f},{by-h*0.55:.1f} {tx:.1f},{ty:.1f} "
              f"C{tx+w*0.25+curl:.1f},{by-h*0.6:.1f} {x1:.1f},{by-h*0.4:.1f} {x1:.1f},{by+6:.1f} Z ")
    return d


def star(cx, cy, r, col, op=1):
    return (f'<path d="M{cx},{cy-r} L{cx+r*0.25},{cy-r*0.25} L{cx+r},{cy} L{cx+r*0.25},{cy+r*0.25} '
            f'L{cx},{cy+r} L{cx-r*0.25},{cy+r*0.25} L{cx-r},{cy} L{cx-r*0.25},{cy-r*0.25} Z" fill="{col}" opacity="{op}"/>')


def bolt(x, y, s, col):
    return (f'<path d="M{x},{y} l{8*s},{-18*s} l{-3*s},{12*s} l{10*s},{-2*s} l{-14*s},{26*s} l{3*s},{-14*s} Z" '
            f'fill="{col}" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>')


def aura(rarity, cx=200, cy=272, rx=118, ry=70, uid="a"):
    """Webtoon battle aura behind the pet. Returns (defs, back, front)."""
    R = RARITY[rarity]
    c1, c2, c3 = R["c1"], R["c2"], R["c3"]
    defs = (f'<radialGradient id="{uid}g" cx="50%" cy="58%" r="55%">'
            f'<stop offset="0" stop-color="{c2}" stop-opacity="0.95"/>'
            f'<stop offset="0.45" stop-color="{c1}" stop-opacity="0.55"/>'
            f'<stop offset="1" stop-color="{c1}" stop-opacity="0"/></radialGradient>')
    if rarity == "mythic":
        defs += (f'<linearGradient id="{uid}m" x1="0" y1="1" x2="0" y2="0">'
                 f'<stop offset="0" stop-color="#9C27B0"/><stop offset="0.6" stop-color="#5B5BEA"/>'
                 f'<stop offset="1" stop-color="#2EE6D6"/></linearGradient>')
    outer_fill = f"url(#{uid}m)" if rarity == "mythic" else c1
    back = f'<ellipse cx="{cx}" cy="{cy}" rx="{rx*1.15}" ry="{ry*1.1}" fill="url(#{uid}g)"/>'
    spikes = {"common": 9, "uncommon": 10, "rare": 11, "epic": 12, "mythic": 13}[rarity]
    amp = {"common": .5, "uncommon": .55, "rare": .6, "epic": .66, "mythic": .72}[rarity]
    up = 1.9
    hmax = {"common": 150, "uncommon": 158, "rare": 166, "epic": 174, "mythic": 182}[rarity]
    fw = flame_wall(cx, cy, rx, ry, spikes, hmax, 11, 1.0)
    back += f'<g class="fA"><path d="{fw}" fill="{c3}" stroke="{c3}" stroke-width="8" stroke-linejoin="round"/>'
    back += f'<path d="{fw}" fill="{outer_fill}"/></g>'
    back += f'<g class="fB"><path d="{flame_wall(cx, cy+6, rx*0.82, ry*0.8, spikes, hmax, 23, 0.78)}" fill="{c1}" opacity="0.9"/></g>'
    back += f'<g class="fC"><path d="{flame_wall(cx, cy+12, rx*0.64, ry*0.6, spikes-1, hmax, 37, 0.58)}" fill="{c2}"/></g>'
    back += f'<g class="fD"><path d="{flame_wall(cx, cy+18, rx*0.46, ry*0.42, spikes-2, hmax, 41, 0.4)}" fill="#FFFFFF" opacity="0.85"/></g>'
    back += '<g class="sl">' + speedlines(cx, cy, c3, 10, 5) + speedlines(cx, cy, "#FFFFFF", 8, 9) + '</g>'
    front = ""
    r = random.Random(7)
    if rarity == "common":
        for i in range(6):  # leaves
            x, y = cx + r.uniform(-150, 150), cy + r.uniform(-140, 80)
            a = r.uniform(0, 360)
            front += (f'<g class="p p{i%4}"><path d="M{x:.0f},{y:.0f} q8,-12 18,0 q-8,12 -18,0 Z" fill="{c1}" stroke="{c3}" '
                      f'stroke-width="1.5" transform="rotate({a:.0f} {x:.0f} {y:.0f})"/></g>')
    elif rarity == "uncommon":
        for i in range(9):  # bubbles + swirls
            x, y = cx + r.uniform(-160, 160), cy + r.uniform(-150, 90)
            rr = r.uniform(4, 11)
            front += f'<g class="p p{i%4}"><circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.0f}" fill="{c2}" fill-opacity="0.35" stroke="#FFFFFF" stroke-width="2"/></g>'
        front += f'<g class="sw"><path d="M{cx-150},{cy+60} q60,-90 150,-40 q80,40 140,-60" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.7"/></g>'
    elif rarity == "rare":
        for i, (x, y, s) in enumerate([(cx - 150, cy - 40, 1.4), (cx + 130, cy - 90, 1.2), (cx - 110, cy - 130, 0.9), (cx + 150, cy + 30, 1.0)]):
            front += f'<g class="bt b{i}">' + bolt(x, y, s, "#FFE45C") + '</g>'
        front += f'<g class="bt b1"><path d="M{cx-170},{cy-10} l30,-20 l-8,24 l30,-18" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.9"/></g>'
    elif rarity == "epic":
        rays = ""
        for i in range(16):
            a = 2 * math.pi * i / 16
            x2, y2 = cx + 210 * math.cos(a), cy - 20 + 210 * math.sin(a)
            rays += f'<line x1="{cx}" y1="{cy-20}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{c2}" stroke-width="{6 if i%2 else 3}" opacity="0.5"/>'
        back = '<g class="ry">' + rays + '</g>' + back
        for i in range(12):  # embers
            x, y = cx + r.uniform(-160, 160), cy + r.uniform(-170, 60)
            front += f'<g class="p p{i%4}"><path d="M{x:.0f},{y:.0f} q4,-10 0,-18 q-4,8 0,18 Z" fill="#FFE07A" stroke="{c3}" stroke-width="1"/></g>'
    elif rarity == "mythic":
        ring = (f'<circle cx="{cx}" cy="{cy-70}" r="150" fill="none" stroke="#2EE6D6" stroke-width="3" stroke-dasharray="2 10" opacity="0.8"/>'
                f'<circle cx="{cx}" cy="{cy-70}" r="138" fill="none" stroke="#E6D7FF" stroke-width="1.5" opacity="0.7"/>')
        for i in range(12):  # rune ticks on the ring
            a = 2 * math.pi * i / 12
            x, y = cx + 144 * math.cos(a), cy - 70 + 144 * math.sin(a)
            ring += f'<rect x="{x-4:.0f}" y="{y-4:.0f}" width="8" height="8" fill="#2EE6D6" transform="rotate(45 {x:.0f} {y:.0f})" opacity="0.9"/>'
        back = '<g class="rg">' + ring + '</g>' + back
        for i in range(14):
            x, y = cx + r.uniform(-170, 170), cy + r.uniform(-180, 90)
            front += f'<g class="p p{i%4}">' + star(round(x), round(y), round(r.uniform(4, 11)), r.choice(["#FFFFFF", "#2EE6D6", "#E6D7FF"]), 0.95) + '</g>'
    return defs, back, front


def ground(cx=200, y=352, w=120):
    return f'<ellipse class="gnd" cx="{cx}" cy="{y}" rx="{w}" ry="14" fill="{OUT}" opacity="0.18"/>'


def svg(inner, defs="", size=400, title=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<title>{title}</title><defs>{defs}</defs>{inner}</svg>')


def rim(body, col, w=16, uid="r"):
    """Glowing outline behind the pet: the same shapes recoloured to one colour with a thick stroke (no CSS)."""
    import re
    b = re.sub(r'<text[^>]*>.*?</text>', '', body)
    b = re.sub(r'<ellipse class="gnd"[^>]*/>', '', b)
    b = re.sub(r' (fill|stroke)="(?!none)[^"]*"', lambda m: f' {m.group(1)}="{col}"', b)
    b = re.sub(r' stroke="none"', f' stroke="{col}"', b)
    b = re.sub(r' (stroke-width|opacity|fill-opacity|stroke-opacity)="[^"]*"', '', b)
    b = re.sub(r'<(path|ellipse|circle|rect|line)(?![^>]*stroke=)', lambda m: f'<{m.group(1)} stroke="{col}"', b)
    return (f'<g stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round">{b}</g>', "")
