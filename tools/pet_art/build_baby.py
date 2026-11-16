"""Write pet_<id>_baby.svg and pet_<id>_junior.svg."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from pets_baby import BABIES
from build import RAR
OUTDIR = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUTDIR, exist_ok=True)
for pid, fn in BABIES.items():
    open(f"{OUTDIR}/pet_{pid}_baby.svg", "w").write(svg(fn(), title=pid + " baby"))
    jr = fn(scarf=RARITY[RAR[pid]]["c1"], brows=True)
    sc, dy = (1.08, 30) if pid == "rabbit" else (1.18, 0)
    jr = f'<g transform="translate(200 {352+dy}) scale({sc}) translate(-200 -352)">{jr}</g>'
    open(f"{OUTDIR}/pet_{pid}_junior.svg", "w").write(svg(jr, title=pid + " junior"))
print(len(BABIES), "babies")
