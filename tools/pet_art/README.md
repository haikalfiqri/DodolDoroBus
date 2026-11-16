# Pet art generator

Placeholder battle art for all 15 pets, drawn as SVG from code so the team can tweak colours and shapes.

```
cd tools/pet_art
python3 build.py ../../frontend/public/art       # adult + shining
python3 build_baby.py ../../frontend/public/art  # baby + junior
python3 build_anim.py ../../frontend/public/art  # animated shining (svg)
node togif.js ../../frontend/public/art frames   # optional: frames for GIFs (needs Playwright + ffmpeg)
```

| File | What it holds |
|---|---|
| `lib.py` | Shared style: ink outline, anime battle eyes, rarity colours, the webtoon aura (flame tongues, rim glow, per-rarity effects) |
| `pets_a.py` | Dog, cat, rabbit |
| `pets_b.py` | The other 12 pets |
| `build.py` | Writes `pet_<id>_adult.svg` and `pet_<id>_shining.svg` |
| `pets_baby.py` | Chibi Baby forms for all 15 pets (big head, sparkly eyes, no gear) |
| `build_anim.py` | Writes `pet_<id>_shining_anim.svg`: the Shining form with CSS animation (flames flicker, pet breathes, rim pulses, rarity effects move; 2.4 s loop) |
| `togif.js` | Renders the animated SVGs to 48 frames each (20 fps) for making GIFs with ffmpeg |
| `build_baby.py` | Writes `pet_<id>_baby.svg` and `pet_<id>_junior.svg` (Baby × 1.18 + rarity scarf + determined brows) |

Canvas 400 × 400, the pet faces right (player side of the battle screen), ground line at y ≈ 352.
Auras: Common leaf wind · Uncommon tide · Rare lightning · Epic sun blaze · Mythic cosmic runes.
All 60 forms (15 pets × 4) are done.
