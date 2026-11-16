"""Animated Shining forms: pet_<id>_shining_anim.svg (CSS animation, transparent, loops every 2.4 s)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from pets_a import PETS_A
from pets_b import PETS_B
RAR = {"dog": "common", "cat": "common", "rabbit": "common", "fox": "uncommon", "penguin": "uncommon",
       "red_panda": "uncommon", "wolf": "rare", "panda": "rare", "eagle": "rare", "lion": "epic", "tiger": "epic",
       "snow_leopard": "epic", "haechi": "mythic", "bonghwang": "mythic", "blue_dragon": "mythic"}

# Every duration divides the 2.4 s loop, so a GIF made from 2.4 s of frames loops seamlessly.
CSS = """
.fA,.fB,.fC,.fD{transform-box:fill-box;transform-origin:50% 100%}
.fA{animation:flk .6s ease-in-out infinite alternate}
.fB{animation:flk2 .4s ease-in-out -.2s infinite alternate}
.fC{animation:flk .3s ease-in-out -.1s infinite alternate}
.fD{animation:flk2 .6s ease-in-out -.3s infinite alternate}
@keyframes flk{from{transform:scale(1,.92) skewX(-2.5deg)}to{transform:scale(1.03,1.08) skewX(2.5deg)}}
@keyframes flk2{from{transform:scale(1.02,1.07) skewX(2deg)}to{transform:scale(.98,.93) skewX(-2deg)}}
.sl{animation:rise .8s linear infinite}
@keyframes rise{from{transform:translateY(34px);opacity:0}30%{opacity:1}to{transform:translateY(-44px);opacity:0}}
.bob{animation:bob 1.2s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.rim{animation:pulse .4s ease-in-out infinite alternate}
@keyframes pulse{from{opacity:.5}to{opacity:1}}
.p{transform-box:fill-box;transform-origin:center;animation:drift 1.2s ease-in-out infinite}
.p1{animation-delay:-.3s}.p2{animation-delay:-.6s}.p3{animation-delay:-.9s}
@keyframes drift{0%{transform:translateY(14px) scale(.5);opacity:0}25%{opacity:1}55%{transform:translateY(-8px) scale(1.15);opacity:1}100%{transform:translateY(-30px) scale(.6);opacity:0}}
.bt{animation:flash .6s steps(1,end) infinite}
.b1{animation-delay:-.15s}.b2{animation-delay:-.3s}.b3{animation-delay:-.45s}
@keyframes flash{0%{opacity:1}20%{opacity:0}40%{opacity:1}60%{opacity:.15}80%{opacity:1}}
.ry{transform-box:view-box;transform-origin:200px 252px;animation:spin45 2.4s linear infinite}
@keyframes spin45{to{transform:rotate(45deg)}}
.rg{transform-box:view-box;transform-origin:200px 202px;animation:spin30 2.4s linear infinite}
@keyframes spin30{to{transform:rotate(30deg)}}
.sw{animation:swirl 1.2s ease-in-out infinite alternate}
@keyframes swirl{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
@media (prefers-reduced-motion:reduce){*{animation:none !important}}
"""

OUTDIR = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUTDIR, exist_ok=True)
for pid, fn in {**PETS_A, **PETS_B}.items():
    body = fn()
    d, back, front = aura(RAR[pid], uid=pid)
    rg, _ = rim(body, RARITY[RAR[pid]]["c2"], 14, pid)
    rg2, _ = rim(body, RARITY[RAR[pid]]["c3"], 22, pid + "o")
    inner = back + f'<g class="bob"><g class="rim">{rg2}{rg}</g>{body}</g>' + front
    open(f"{OUTDIR}/pet_{pid}_shining_anim.svg", "w").write(svg(inner, defs=d + f"<style>{CSS}</style>", title=pid + " shining (animated)"))
print("animated svgs written")
