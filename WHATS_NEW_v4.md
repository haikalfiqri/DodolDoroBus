# What's new in this branch (`docs/story-pet-v4`)

This branch turns the v4 design (pets instead of spirits, eggs, Battle Room after Chapter 1) into files the team can build from. **116 files** changed: 108 new (this file included), 7 updated, 1 removed. Nothing is committed or pushed yet.

**The one idea to remember:** `docs/` explains the game in words, `content/` holds the game data (numbers, names, dialogue) that the code loads, and `frontend/public/art/` holds the pet pictures. If a doc and `content/` disagree, `content/` wins.

```
Dorobus/
├── WHATS_NEW_v4.md        ← this file
├── README.md              (updated) project intro, now about pets and eggs
├── CONTRIBUTING.md        (updated) adds content/ to the folder owners
├── content/               NEW  game data for backend and frontend
├── docs/                  NEW + updated  plan, specs, story, prototype
├── frontend/
│   ├── README.md          (updated) screen list for v4
│   └── public/art/        NEW  30 pet pictures
├── backend/README.md      (updated) what to build for v4
├── db/README.md           (updated) table list for v4
├── questions/README.md    (updated) new mission types
└── tools/pet_art/         NEW  the program that draws the pets
```

---

## 1. `docs/`: what the game is

| File | What it is | Who reads it |
|---|---|---|
| `progress_v4.md` | **The main plan.** Feedback → decisions, lore (only Codex and Naty are spirits; students raise pets), pets and eggs, priorities, DB changes, team roles, 6-week timeline | Everyone, first |
| `design/game_rules.md` | Every rule and formula: battle, stars, XP (50 × level), pet forms, mood, egg sources, the replay egg roll with Mythic pity at 50, cells, daily limits, unlocks | Backend (Akip), also frontend |
| `design/screens.md` | 15 screens, how they connect, what each shows, question panels per mission type, colours | Frontend (Wafi, Wam) |
| `design/data_model.md` | Database tables for v4 and a draft list of API endpoints | Backend (Akip) |
| `egg_pet_system_v4.md` | The egg and pet design: 5 eggs, 15 pets, hatching, growth, My Room | Everyone |
| `player_journey.md` | Walkthrough from Day 1 to end-game, egg drop rate tables, how long the Mythic hunt takes | Planning, presentation |
| `story/chapter1_script.md` | Chapter 1 scenes: backgrounds, enemy looks, mood, art list, writing rules | Art, frontend |
| `story/chapters2-5_outline.md` | Chapters 2–5 ideas and a 4-step template for adding a chapter | Planning |
| `prototype/codex_trial_prototype.html` | The clickable prototype (open in a browser). It still shows the old spirit | Frontend |
| `archive/progress_v3.md` | The old v3 plan, kept for history | — |
| `README.md` | (updated) Index of everything above | — |

## 2. `content/`: the game data

These are the files the backend loads into the database (and the frontend can read directly before the API exists). Change a number here, not in code.

| File | What it holds |
|---|---|
| `chapters.json` | 5 chapters: names, place, which egg each first clear gives, boss Mythic % (1–5) |
| `stages.json` | Chapter 1's 7 stages: name, anomaly, gauge, rounds, DIMC category, egg stage or not, what it unlocks |
| `dialogue/ch1.json` | All Chapter 1 lines in Korean: onboarding, each stage's intro / win / lose, system messages |
| `characters.json` | Codex, Naty, Rico, Zero, Xylo, Void and their game roles |
| `eggs.json` | 5 eggs: Korean/English name, colour, how many correct answers to hatch (5 / 10 / 20 / 35 / 50) |
| `pets.json` | 15 pets: rarity, DIMC type, signature skill, passive, picture file names |
| `skills.json` | 4 basic + 15 signature skills, power by level, +20 % type bonus |
| `egg_drop_rates.csv` | Replay egg chances per chapter, stage and rarity |
| `quests_achievements.json` | Daily quests, the weekly egg, achievements and rewards |
| `shop_items.json` | Xylo's shop items and prices (no eggs for sale) |
| `mission_types.json` | Question types (4-choice, O/X, ordering, keyword, command order, pixel art, puzzle, rhythm), time limits, grading |
| `game_config.json` | All tuning numbers: battle, XP, cells, daily limits, egg rules, mood colours |
| `README.md` | Explains each file and the ID rules (`c1s3` = chapter 1 stage 3) |

## 3. `frontend/public/art/`: pet pictures

75 SVG pictures, 5 per pet (4 growth forms + an animated Shining):

- `pet_<id>_baby.svg`: Lv 1–3, chibi and cute, no gear.
- `pet_<id>_junior.svg`: Lv 4–6, the Baby grown bigger with a scarf in its rarity colour and determined brows.
- `pet_<id>_adult.svg`: Lv 7–9, the battle pose with its DIMC-type gear.
- `pet_<id>_shining.svg`: Lv 10, the Adult with its rarity aura and glowing outline.
- `pet_<id>_shining_anim.svg`: the same Lv 10 form, **animated** (flames flicker, the pet breathes, the glow pulses, sparks/lightning/rays/stars move; loops every 2.4 s). Works in a plain `<img>` tag.

GIF versions of the 15 animations are kept outside the repo (too big for git) in `Desktop/Wam's/pet_gifs/`.

| Rarity | Pets | Aura |
|---|---|---|
| Common | dog, cat, rabbit | Green flames with leaves |
| Uncommon | fox, penguin, red_panda | Aqua flames with bubbles |
| Rare | wolf, panda, eagle | Blue flames with lightning |
| Epic | lion, tiger, snow_leopard | Gold flames with sun rays and embers |
| Mythic | haechi, bonghwang, blue_dragon | Purple-to-teal flames with a rune ring and stars |

These are placeholder art made by code, good enough to build and demo with.

## 4. `tools/pet_art/`: the program that draws the pets

Python files that generate all 75 pictures (`build.py`, `build_baby.py`, `build_anim.py`), plus `togif.js` for GIFs. To change a colour or shape, edit them and run:

```
cd tools/pet_art
python3 build.py ../../frontend/public/art
```

`lib.py` has the shared style and the auras, `pets_a.py` the dog, cat and rabbit, `pets_b.py` the other 12, `pets_baby.py` the Baby forms. Run `build_baby.py` the same way for Baby and Junior.

## 5. Updated READMEs

| File | What changed |
|---|---|
| `README.md` | Pets and eggs instead of spirits, a "Start here" table per role, v4 scope, proposed tech stack |
| `frontend/README.md` | v4 screen list (onboarding, map, battle, My Room, hatch, Battle Room) |
| `backend/README.md` | v4 build list (egg roll + pity, hatching, partner XP, Battle Room unlock) |
| `db/README.md` | v4 tables (pets, eggs, drop rates, quests, records) |
| `questions/README.md` | Adds the new mission types and their `payload` column |
| `CONTRIBUTING.md` | `content/` added to the folder owners; `content/` branch prefix |
| `docs/archive/.gitkeep` | Removed (the folder now has a real file) |

## 6. Check before pushing

- **Placeholder text:** most of the Chapter 1 dialogue, the Chapter 2–5 boss names, Xylo's Korean name (자일로) and the shop prices are drafts.
- **Numbers the team never set:** 10 XP for a lost battle, 3 cells per daily quest, the Weekly Trial bonus formula. Change them in `content/game_config.json`.
- **Team agreement:** the pet system replaces the spirit in `progress_v4.md`; make sure everyone has read it.

## 7. How to push

```
git commit -m "Add v4 design docs, game content and pet art"
git push -u origin docs/story-pet-v4
```

Then open a Pull Request on GitHub so a teammate can review it (see `CONTRIBUTING.md`).
