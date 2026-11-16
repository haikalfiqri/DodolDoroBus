# Game rules (spec for backend and frontend)

This is the rulebook the code follows. Every number here is also in `content/game_config.json`; if they differ, the JSON wins and this file gets fixed.

## 1. Battle (story stage)

| Rule | Value |
|---|---|
| Gauges | Partner pet **energy 100** (Tiger passive: 110) · anomaly **unstable gauge** = `stages.gauge` (40–100) |
| Length | `max_rounds` rounds (4, boss 6). A round = my turn + the anomaly's turn |
| My turn | Pick 1 of 4 equipped skills → answer one question of that skill's DIMC category. Correct: gauge −= `round(power × type_bonus × combo)`; combo resets to ×1.0. Wrong: no effect |
| Anomaly's turn | Answer one question (O/X or 4-choice). Correct = dodge, combo += 0.2 (max ×2.0). Wrong = energy −15 (boss −20) |
| Clear | Gauge ≤ 0 |
| Fail | Energy ≤ 0, or rounds run out. "다시 도전". Partner gets 10 XP, no cells, no other penalty |
| Stars | ★ cleared · ★★ energy ≥ 50 · ★★★ energy ≥ 80 |
| Time limits | 4-choice, O/X: 20 s · order, keyword, command order, puzzle: 30 s · pixel art: 45 s. Timeout = wrong |
| Hint | Rico's hint: removes one wrong choice, 3 cells, max 1 per battle (Eagle passive: 1 free per day) |

**Skill power:** 20 at Lv 1–2, 25 at Lv 3–6, 30 at Lv 7+. `type_bonus` = 1.2 when the skill's category equals the pet's type, else 1.0.

**Question pick:** random approved question from the stage's categories and difficulty, not seen by this student in their last 50 questions. Grading is done by the server only (see `content/mission_types.json`). No AI during play.

## 2. Pets

- A student owns many pets; exactly one is the **partner** (`pets.is_partner`). Only the partner gets battle XP.
- XP to go from level n to n+1 = **50 × n**. Max level 10 (2,250 XP total).
- XP per clear: stage `30 + 10 × stars`, boss `100`, fail `10`. Pet food: +10 % that day (Red Panda: +15 %).
- Forms: Baby Lv 1–3 · Junior Lv 4–6 · Adult Lv 7–9 · Shining Lv 10. The front end picks the sprite from the level.
- Skills: 4 basic skills (one per category). At **Lv 5** the signature skill replaces the basic skill of the pet's own type.
- Passives (Uncommon and up): see `content/pets.json` `passive_code`. Each is a small rule in the battle engine.
- Pets never die and never lose levels.

**Mood** (collar colour, computed on read, not stored as a timer):

| Condition (first match wins) | Mood |
|---|---|
| In battle | tense (yellow) |
| Not fed for 2+ days | sad (purple) |
| A new stage unlocked since last visit | curious (green) |
| ★★★ clear today | harmony (white) |
| Otherwise | calm (sky blue) |

Red is never used for pets; it is only for anomalies.

## 3. Eggs

**Sources**

| Source | When | Rarity |
|---|---|---|
| Starter | Onboarding (Naty) | Common, hatches with 3 taps |
| First clear | Stage 1 (starter), Stage 3, Stage 6, Boss of each chapter | `chapters.json` → `first_clear_eggs` |
| Replay roll | Re-clearing an egg stage | `egg_drop_rates.csv` |
| Weekly egg | 5 daily-quest stamps in a week | Common → Uncommon (after Ch 1) → Rare (after Ch 3) |
| Achievement | Once each | `quests_achievements.json` |

No source guarantees a Mythic. **Mythic eggs only come from boss replay rolls** (1 % Ch 1 … 5 % Ch 5) and pity.

**Replay roll** (server side, inside the stage-clear transaction):

```
if stage.egg_slot is null or first clear: no roll
if not rewarded clear (daily cap reached) or stars < 2: no roll
r = random 0..99.99
walk the rarity rows for (chapter, slot) from mythic down to common, adding percent;
the first row where r < running total gives that rarity; otherwise no egg.
if stage is boss:
    if rarity == mythic: pity = 0
    else: pity += 1; if pity >= 50: rarity = mythic; pity = 0
```

`students.mythic_pity` is shown on every boss node ("코덱스의 호의 37 / 50"). Rates are shown on each egg stage's info card.

**Nest and hatching**

- Nest slots: 1 at start, 2 after the Chapter 1 boss. Extra eggs go to the egg box (max 10; past that, the oldest Common becomes a snack pack).
- Every correct answer in any mode adds 1 warmth to every egg in the nest.
- Hatch when warmth ≥ `eggs.json hatch_correct_needed` (5 / 10 / 20 / 35 / 50). The student taps to hatch.
- **Bag rule:** the species is picked at random from species of that rarity the student does not own yet. If they own all 3, the egg becomes a **snack pack** (+100 XP to any pet).
- Eggs are never sold or bought, for cells or money.

## 4. Cells and limits

| Earn (always through the mailbox) | Cells |
|---|---|
| Stage clear ★ / ★★ / ★★★ | 5 / 10 / 15 |
| Boss clear | 20 |
| First clear of the day | +5 |
| Daily quest done | 3 each |
| Ghost challenge win / loss | 10 / 3 (max 2 rewarded per friend per day) |

| Spend | Cells |
|---|---|
| Pet food (once a day) | 5 |
| Rico's hint | 3 |
| Decorations, backgrounds, accessories | `shop_items.json` |

**Daily limits:** 10 rewarded battles and 60 cells. After that the student can keep playing for practice (XP yes, cells and egg rolls no) and Naty shows the "take a break" line.

## 5. Unlocks

| Trigger | Unlocks |
|---|---|
| Onboarding done | Chapter 1 map, My Room, mailbox, shop |
| Clear c1s2 | Daily quests, Rico's hint |
| Clear c1s3 | Nest + hatching by answers |
| Clear c1s7 (Ch 1 boss) | **Battle Room**, 2nd nest slot, Chapter 2 |
| Clear chapter N boss | Chapter N+1 |
| Clear c5 boss | Title 코덱스의 인정, end-game goals |

**Battle Room** is locked (padlock on the plaza door) until `students.battle_room_unlocked_at` is set by the Ch 1 boss clear.

## 6. Battle Room (asynchronous only)

- **Weekly Trial:** the same 8 questions for everyone, chosen each Monday 00:00 KST. Score = correct × 100 + time bonus (remaining seconds × 5) + combo bonus (best combo × 50). Best score per student per week counts. Ranking among friends and class.
- **Ghost challenge:** play a stage with exactly the same question list as a friend's best record (`stage_records.question_ids`) and try to beat their score. Nobody needs to be online at the same time.
- Live duels are removed (progress v4).

## 7. Transactions (must be atomic)

1. **Stage clear:** save stars and `stage_records` (best) → unlock next stage → partner XP and level-up → first-clear egg or replay roll (+ pity) → reward mail → daily limits.
2. **Mail claim:** only if unclaimed → `cell_ledger` row → `students.cell_balance`.
3. **Hatch:** warmth ≥ needed → bag-rule species pick → create pet → mark egg hatched (or snack pack).
