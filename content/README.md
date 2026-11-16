# Game content

Owner: planning (story, stages, pets). Backend seeds these files into the database; frontend may read them directly for labels and art names while the API is not ready.

**Rule:** game numbers and text live here, not in code. If a number changes, change it here and re-run the seed.

| File | What it holds | DB table(s) it seeds |
|---|---|---|
| `chapters.json` | 5 chapters: names, place, status, unlock rule, first-clear egg per slot, boss Mythic % | `story_chapters` |
| `stages.json` | Chapter 1 stages: anomaly, gauge, rounds, categories, mission types, egg slot, unlocks | `story_stages` |
| `dialogue/ch1.json` | Onboarding, stage intro / win / lose lines, system messages | `stage_dialogue` (or served as a static file) |
| `characters.json` | Codex, Naty, Rico, Zero, Xylo, Void | static |
| `eggs.json` | 5 egg rarities: name, colour, correct answers to hatch, look | `rarities` |
| `pets.json` | 15 pets: rarity, DIMC type, signature skill, passive; growth forms | `pet_species` |
| `skills.json` | 4 basic + 15 signature skills, power by level, type bonus | `skills` |
| `egg_drop_rates.csv` | Replay drop chance per chapter × slot × rarity | `egg_drop_rates` |
| `quests_achievements.json` | Daily quest pool, weekly egg, achievements | `quests`, `achievements` |
| `shop_items.json` | Xylo's shop: food, hint, decorations (fixed prices, no eggs) | `shop_items` |
| `mission_types.json` | Question/mission types, time limits, grading rule, payload examples | `mission_types` |
| `game_config.json` | Battle, XP, cells, limits, egg and mood rules | `game_config` |

## IDs

- Stage id: `c{chapter}s{order}`. The boss is stage 7 (`c1s7`).
- Egg slots: `stage1` (starter only), `stage3`, `stage6`, `boss`.
- Rarity ids: `common`, `uncommon`, `rare`, `epic`, `mythic`.
- DIMC category ids: `digital`, `ai`, `making`, `computing` (same as `questions/`).
- Sprite file names are listed in the JSON; art goes in `frontend/public/art/` (placeholder art is fine).

## Status

- Chapter 1 is complete and playable data.
- Chapters 2–5: names, first-clear eggs and drop rates only. Stages are added later as data (same shape as Chapter 1).
- Final build needs art for 9 pets (Common, Uncommon, Rare). Epic and Mythic show as egg silhouettes.

Rules behind the numbers: [`docs/design/game_rules.md`](../docs/design/game_rules.md).
