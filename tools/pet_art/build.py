"""Build pet SVGs: plain (adult battle pose) + shining (with rarity aura) and a contact sheet."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from pets_a import PETS_A
try:
    from pets_b import PETS_B
except ImportError:
    PETS_B = {}

RAR = {"dog": "common", "cat": "common", "rabbit": "common", "fox": "uncommon", "penguin": "uncommon",
       "red_panda": "uncommon", "wolf": "rare", "panda": "rare", "eagle": "rare", "lion": "epic", "tiger": "epic",
       "snow_leopard": "epic", "haechi": "mythic", "bonghwang": "mythic", "blue_dragon": "mythic"}
OUTDIR = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUTDIR, exist_ok=True)
fns = {**PETS_A, **PETS_B}
for pid, fn in fns.items():
    body = fn()
    open(f"{OUTDIR}/pet_{pid}_adult.svg", "w").write(svg(body, title=pid))
    d, back, front = aura(RAR[pid], uid=pid)
    rg, css = rim(body, RARITY[RAR[pid]]["c2"], 14, pid)
    rg2, css2 = rim(body, RARITY[RAR[pid]]["c3"], 22, pid + "o")
    open(f"{OUTDIR}/pet_{pid}_shining.svg", "w").write(svg(back + rg2 + rg + body + front, defs=d, title=pid + " shining"))
print(len(fns), "pets")
