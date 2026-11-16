# 코덱스의 시험 (Codex's Trial): Progress v4

Hanyang ERICA IC-PBL × DORO Co., Ltd. | DOROBUS minigame tab
Last updated: Mon 2026-11-02 | Final: December
Team: Imran (design/PM) · Wam (pets + My Room + QA) · Asyraf (content + validation) · Akip (DB/backend) · Haikal (admin + AI pipeline + docs) · Wafi (front end)

> **v4 replaces v3** (`archive/progress_v3.md`). It applies the professor's midterm feedback and the **egg & pet system**: students raise pets hatched from eggs instead of one spirit. Anything in v3 not changed here stays the same.

| Read next | For |
|---|---|
| [`design/game_rules.md`](design/game_rules.md) | Exact rules and formulas (backend, frontend) |
| [`design/screens.md`](design/screens.md) | Screen list and flow (frontend) |
| [`design/data_model.md`](design/data_model.md) | Tables and API draft (backend) |
| [`egg_pet_system_v4.md`](egg_pet_system_v4.md) | Egg and pet design |
| [`player_journey.md`](player_journey.md) | Walkthrough from Day 1 to end-game, egg drop rates |
| [`story/`](story/) | Chapter 1 script and chapters 2–5 outline |
| [`../content/`](../content/) | All game data as JSON/CSV |

---

## 0. Professor feedback → what we change

| # | Feedback | Decision |
|---|---|---|
| 1 | DIMC categories were good | Keep. Each pet also has a DIMC type |
| 2 | Go beyond quiz to story missions (puzzle, command ordering, pixel art, rhythm) | Add mission types (section 4). Rhythm is a "could" |
| 3 | Spirit concept unclear: Naty vs. player's spirit, one or many? | Only **Codex** and **Naty** are spirits (NPCs). Students raise **pets** (section 1) |
| 4 | No types, grades or growth process | 5 rarities, 4 DIMC types, 4 growth forms (section 2) |
| 5 | Room battles will lack opponents | **Remove live duel.** Async Battle Room: Weekly Trial + ghost challenge (section 5) |
| 6 | Make growth visible (appearance, skills, My Room) | Forms change at Lv 4 / 7 / 10, signature skill at Lv 5, My Room with nest and 도감 |
| 7 | Finish solo story first | Solo story is top priority. **Battle Room unlocks only after the Chapter 1 boss** |

## 1. Lore (locked)

- **Codex** is the guardian spirit who sends the anomalies. **Naty** is his companion spirit and the tutorial guide. Neither is ever a player's pet.
- Codex hid DOROLAND's animals as **eggs inside the anomalies**. Calming an anomaly entrusts its egg to the recruit.
- On Day 1 Naty hands each student a **starter egg** (replaces the purple sprout). The pet that hatches is their first **partner**.
- Mythic eggs are Codex's own guardians (해치, 봉황, 청룡), given only to recruits who keep coming back.

## 2. Pets, eggs and growth

| Item | Design |
|---|---|
| Rarities | Common · Uncommon · Rare · Epic · Mythic, each with its own egg (새싹알, 물방울알, 회로알, 황금갈기알, 코덱스의 알) |
| Pets | 3 per rarity = 15 (dog, cat, rabbit … lion, tiger, snow leopard … haechi, bonghwang, blue dragon) |
| Types | Each pet has one DIMC type; matching skills get +20 % power |
| Growth | Lv 1–10 (XP 50 × level). Forms: Baby → Junior (Lv 4) → Adult (Lv 7) → Shining (Lv 10) |
| Skills | 4 basic (one per category). Signature skill at Lv 5. Power 20 → 25 → 30 |
| Passives | Uncommon and up, small battle effects |
| Hatching | Warmed by correct answers (5 / 10 / 20 / 35 / 50). Bag rule: no duplicates until a rarity set is complete |
| Eggs from | First clears of Stage 3, Stage 6 and boss · replay drops (better odds in later chapters; **Mythic only from bosses, 1–5 %, pity at 50**) · weekly quest egg · achievements |
| Mood | Collar colour, same colours as v3. Never dies, never loses levels |
| Art for final | 9 pets (C/U/R) × Baby + Adult = 18 drawings + 5 eggs. Epic/Mythic as silhouettes |

**My Room:** pets wander, nest with warmth bars, 도감 (15 slots), decorations from Xylo's shop. Set the partner here.

## 3. Priority

1. **Solo story mode, Chapter 1** (6 stages + boss), with first-clear eggs
2. Pets: hatching, partner, XP, forms, skills; **My Room** with nest and 도감
3. Mailbox → claim → shop
4. Admin question page + 100–150 questions
5. Replay egg drops + pity, daily quests
6. Battle Room (unlock after Ch 1): Weekly Trial, ghost challenge
7. Extra mission types

## 4. Mission types

All graded by the server, no AI during play. Details and payload examples: `content/mission_types.json`.

| Type | Status |
|---|---|
| 4-choice, O/X, ordering, short keyword | Must |
| Command ordering (robot/code blocks) | Must |
| Pixel art (fill a grid to match a target) | Should |
| Puzzle (pattern/sequence) | Should |
| Rhythm | Could |

`questions` gets `mission_type_id` and a JSON `payload`, so a new type needs no new table.

## 5. Battle Room (async, unlocks after the Chapter 1 boss)

- Every stage clear saves a best record: stars, accuracy, clear time, energy left, question list.
- Add friends with a friend code. See each friend's best record per stage.
- **Ghost challenge:** replay a stage with the same question list and try to beat a friend's record.
- **Weekly Trial:** the same 8 questions for everyone; ranking among friends resets every Monday.
- No WebSockets, no matching. Reward: small cell bonus, inside the daily limit.

## 6. Database changes from v3

| Change | Tables |
|---|---|
| Remove | `spirits`, `spirit_skills`, room-code duel logic |
| Add | `rarities`, `pet_species`, `pets`, `pet_skills`, `eggs`, `egg_drop_rates`, `stage_dialogue`, `stage_records`, `friendships`, `quests`, `student_quests`, `quest_stamps`, `achievements`, `student_achievements`, `weekly_trials`, `trial_scores`, `mission_types` |
| Change | `questions` + `mission_type_id`, `payload`, `explanation` · `students` + `battle_room_unlocked_at`, `mythic_pity`, `nest_slots`, `friend_code` · `story_stages` + `egg_slot`, `first_clear_egg_rarity` |
| Keep | Stage-clear and mail-claim transactions, `reward_mail`, `cell_ledger`, `game_config`, DIMC categories |

Full list: `design/data_model.md`.

## 7. Tech stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 16 |
| Backend | Node.js + TypeScript (Express, matching DOROBUS's Express 5) |
| Frontend | TypeScript + Vite. DOROBUS uses no UI framework and HTML/CSS over a Babylon.js canvas; React is fine for the prototype if the team agrees |
| Auth | Stub JWT with a fake student table |
| AI question drafts | Offline Python script → JSON for admin review |
| Art | Placeholder SVG / pixel sprites |
| Infra | Docker Compose (Postgres + API + web) |

**Ask DORO:** confirm the stack and login/mailbox APIs; their answer overrides this table.

## 8. Who does what

| Person | Owns | Deliverables |
|---|---|---|
| **Imran** | Design lead, PM | Story and stage data (`content/`), dialogue, task board |
| **Akip** | DB + backend | Schema v4, battle engine, the three transactions, egg roll + pity, records API |
| **Wafi** | Front end core | Map, battle screen, mailbox, shop, API integration |
| **Wam** | Pets and My Room | Pet/egg sprites, My Room + hatch screens (with Wafi), QA |
| **Haikal** | Admin + AI pipeline + docs | Admin question page, offline question generator, API and ERD docs |
| **Asyraf** | Content + validation | 100–150 questions, mission content, playtests, metrics |

## 9. Timeline (about 6 weeks)

| Week | Goal |
|---|---|
| 1 | Lock lore (done), schema v4, mockups, repo + Docker Compose, seed from `content/` |
| 2 | Battle API, map and battle screens start |
| 3 | Chapter 1 playable; partner XP, level-up, first-clear eggs |
| 4 | Hatching, forms, My Room, mailbox and shop |
| 5 | Admin page, questions to 100+, replay drops + pity, quests |
| 6 | Battle Room (Weekly Trial, ghost), polish, demo video, rehearsal |

**Cut order if behind:** rhythm → pixel art → ghost challenge → Weekly Trial → quests. **Never cut:** solo story, eggs + visible pet growth, My Room.

## 10. Open questions for DORO

- What stack does DOROBUS use (backend, database, login, mailbox API)?
- Does a pet system already exist (their roadmap lists "펫 육성")? What data does it keep?
- May students name pets freely, or pick from a safe name list?
- May we use the webtoon characters' art in the game and mockups?
