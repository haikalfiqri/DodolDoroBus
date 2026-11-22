# How 코덱스의 시험 works

Read this once from top to bottom. After it you should be able to explain every part of the project
and answer DB questions in the final presentation.

---

## 1. The whole system in one picture

```
 Student's browser                    Vercel (Frankfurt)                     Neon (PostgreSQL)
┌────────────────────┐   /api/...   ┌───────────────────────────┐   SQL   ┌──────────────────────┐
│ src/  (TypeScript) │ ───────────► │ api/index.ts → server/    │ ──────► │ 28 tables            │
│ screens, pixel art │ ◄─────────── │ Express 5: rules, grading,│ ◄────── │ db/migrations/*.sql  │
│ never sees answers │     JSON     │ transactions              │         │ seeded from content/ │
└────────────────────┘              └───────────────────────────┘         └──────────────────────┘
```

Three rules hold everywhere:

1. **The browser only draws.** It never decides if an answer is right, how many cells you get, or which egg drops.
2. **The server decides everything and saves it in PostgreSQL.** The API is stateless: even the battle in progress is a row in `battles`, so any server instance can handle the next click (this is what makes serverless hosting work).
3. **Game numbers live in `content/`** (the team's JSON). `db/migrate.mjs` loads them into tables on every deploy. Change a gauge in `content/stages.json`, push, and the game changes. No code edit needed.

## 2. A request, step by step (what happens when a student answers)

1. The student taps choice 2. `src/screens/battle.ts` calls `api.answer(battleId, questionId, 1)`.
2. `POST /api/battles/:id/answer` reaches `server/app.ts`, which checks the login cookie (`needLogin`) and calls `battle.answer()`.
3. `battle.answer()` opens a **transaction** and runs `SELECT … FROM battles WHERE id=$1 FOR UPDATE`: the row is **locked**, so a double click waits and then sees the question is already answered.
4. It loads the question **with its answer key** from `questions` (the client never had it), and grades it. Shuffled choices are mapped back using `battles.current.order`.
5. If correct: gauge −(power × combo); every egg in the nest gets +1 warmth (`UPDATE eggs … FROM rarities`). If wrong on a dodge: energy −15.
6. It writes one row to `battle_turns` (who answered what, right or wrong) and saves the new battle state.
7. `COMMIT`. The JSON reply tells the screen what happened; the screen animates it.

## 3. The database (`db/migrations/*.sql`)

ER diagrams generated from the real schema (`scripts/erd.mjs`): **`docs/erd/erd_core.png`** (13 core tables, for slides) and `docs/erd/erd.png` (all 28 tables).

### Zones

| Zone | Tables | Notes |
|---|---|---|
| Content (read-only in play) | `question_categories`, `mission_types`, `rarities`, `story_chapters`, `chapter_first_clear_eggs`, `story_stages`, `stage_dialogue`, `egg_drop_rates`, `skills`, `pet_species`, `shop_items`, `game_config` | Seeded from `content/` with upserts |
| Questions | `questions`, `question_reports` | Admin-managed. `status` = draft / approved / hidden. `payload` and `answer` are **jsonb**, so one table holds all 7 mission types |
| Players | `students`, `pets`, `eggs`, `stage_progress` | `students.cells` is a cached balance; `cell_ledger` is the history |
| Battles | `battles`, `battle_turns` | Battle state + every answer ever given |
| Economy | `reward_mail`, `cell_ledger`, `student_items`, `student_daily_limits` | |
| Battle Room | `weekly_trials`, `trial_runs` | Same 8 questions for everyone each week; best run counts (migration 002) |
| Quests | `student_quests`, `quest_stamps` | Which 3 quests today; progress is **computed** from other tables, not stored (migration 003) |

### Design choices you will be asked about

| Question | Answer |
|---|---|
| Why is `payload`/`answer` jsonb instead of columns? | Each mission type stores different things (4 choices, a list of steps, a 5×5 grid). jsonb keeps one `questions` table; a new type needs no new table. Common fields (category, type, status) are still real columns with foreign keys and an index. |
| How do you guarantee one partner pet? | A **partial unique index**: `CREATE UNIQUE INDEX pets_one_partner ON pets(student_id) WHERE is_partner`. The DB itself refuses a second partner. When switching, we first clear the old partner, then set the new one, in one transaction. |
| One egg per nest slot? | Same trick: `UNIQUE (student_id, nest_slot) WHERE nest_slot IS NOT NULL AND hatched_at IS NULL`. |
| Why `cells` on `students` AND a `cell_ledger`? | The balance is read on every screen, so it is cached on the student row. The ledger is the audit trail (who got / spent what, and the balance after each row). Every change goes through one function `changeCells()` that updates both in the same transaction, so `SUM(delta) = cells` always holds (the test checks this). `CHECK (cells >= 0)` makes overspending impossible. |
| Why is there a `reward_mail` step? Why not add cells directly? | DORO's DOROBUS already uses a mailbox. It also lets the daily limit count rewards when they are *earned*, while the balance only changes when they are *claimed*. |
| How do you stop a double claim? | `UPDATE reward_mail SET claimed_at=now() WHERE id=$2 AND claimed_at IS NULL RETURNING amount`. The second request updates 0 rows, so it adds nothing. The test fires two claim-all requests at the same moment and checks the money was added once. |
| How are repeat questions avoided? | `SELECT question_id FROM battle_turns WHERE student_id=$1 ORDER BY created_at DESC LIMIT 50`, then pick a random approved question not in that list (`ORDER BY random() LIMIT 1`). |
| Where do reports come from? | All from `battle_turns`. Void's weekly report: `avg(is_correct::int) FILTER (WHERE created_at >= now() - interval '7 days') GROUP BY category`. The admin "hardest questions" list uses `GROUP BY question_id HAVING count(*) >= 2 ORDER BY accuracy`. |
| Why don't quests have a progress counter? | Progress is derived with SQL from rows that already exist: correct answers today come from `battle_turns`, clears from `battles`, feeding from `pets.last_fed_on`. One query returns all quest progress (`server/quests.ts`). Nothing can get out of sync, and no extra writes happen during play. |
| How does the ghost challenge work without both players online? | `stage_progress.best_battle_id` points to a student's best run; its `battle_turns` (ordered by `turn_no`) are the exact question list. A ghost battle copies that list into `battles.ghost_questions` and serves it in order, then compares scores. Friendships are two rows (A→B, B→A) inserted in one transaction; `CHECK (student_id <> friend_id)` blocks adding yourself. |
| How is the Weekly Trial fair? | `weekly_trials` stores the 8 question ids for the week (picked once with `row_number() OVER (PARTITION BY category_id ORDER BY random())`, 2 per DIMC area). The server times each question (`q_started_at`), so the time bonus can't be faked from the browser. Ranking = `max(score) GROUP BY student`. |
| Daily limits? | `student_daily_limits (student_id, day)` with `CHECK (rewarded_battles <= 10)` and `CHECK (cells_earned <= 60)`. The row is locked (`FOR UPDATE`) inside the stage-clear transaction. The day is the Korean date. |
| Normal forms? | Content and player data are separate; every repeated fact lives in one table (species → rarity, stage → chapter) and is referenced by foreign key. Two deliberate exceptions: the cached `students.cells` (explained above) and `battle_turns.category_id` (copied from the question so weekly reports need no join and stay correct even if the admin later changes the question's category). |
| Can DORO change rewards without a developer? | Yes: admin → ⚙ 게임 설정 edits stage gauges/rounds, first-clear egg rarity, replay drop rates and shop prices directly in the tables. The seed only *inserts* content, so a deploy never overwrites those edits (`npm run db:reseed` forces a reset from `content/`). |
| How do schema changes work? | `db/migrations/NNN_name.sql` files run once each, in order; applied ones are recorded in `schema_migrations`. An advisory lock (`pg_advisory_lock`) stops two deploys from migrating at once. |

## 4. The three transactions (show these in the final)

All three are in `server/`. Each runs inside `tx(async (db) => …)` from `server/db.ts`: `BEGIN` … `COMMIT`, or `ROLLBACK` if anything throws.

**1. Stage clear** (`battle.finish`):
lock battle → mark finished → lock today's limits → stars from energy (≥80 ★★★, ≥50 ★★) → insert/update `stage_progress` → first clear? unlock features (`students.unlocks`), Battle Room after the boss, move box eggs into the nest → rewarded? add to daily limits + insert `reward_mail` (+5 first clear of the day) → egg: first clear gives the fixed rarity; a replay with ★★+ rolls `egg_drop_rates` (boss rolls add to `mythic_pity`, 50 = guaranteed Mythic) → partner XP and level-ups (Lv n→n+1 costs 50×n).

**2. Mail claim** (`claim` in `app.ts`): conditional `UPDATE … WHERE claimed_at IS NULL RETURNING` → `changeCells` (+ledger row) for each claimed mail.

**3. Hatch** (`POST /eggs/:id/hatch`): lock the egg → check warmth ≥ needed → **bag rule** query: species of that rarity the student does not own (`NOT EXISTS (SELECT 1 FROM pets …)`) → none left? the egg becomes a snack pack (+100 XP to the partner) → else insert the pet, mark the egg hatched, move the next box egg into the free nest slot.

## 5. API (all under `/api`, JSON, cookie login)

| | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `/auth/register`, `/auth/logout` |
| Player | `GET /me` · `POST /onboarding` |
| Story | `GET /chapters` · `GET /chapters/:id/stages` |
| Battle | `POST /battles` · `/battles/:id/skill` · `/battles/:id/answer` · `/battles/:id/hint` · `/battles/:id/finish` |
| Pets & eggs | `GET /pets` · `PATCH /pets/:id` (partner / rename) · `POST /pets/:id/feed` · `GET /eggs` · `POST /eggs/:id/nest` · `POST /eggs/:id/hatch` · `GET /dex` |
| Economy | `GET /mail` · `POST /mail/:id/claim` · `POST /mail/claim-all` · `GET /shop` · `POST /shop/buy` · `GET /ledger` |
| Friends | `GET /friends` · `POST /friends` (friend code); ghost battle = `POST /battles` with `mode: 'GHOST', ghostOf: code` |
| Quests & Battle Room | `GET /quests` · `POST /quests/:id/claim` · `GET /battle-room` · `POST /trial/start` · `POST /trial/:id/answer` |
| Other | `GET /report/weekly` · `POST /questions/:id/report` · `GET /health` · `GET /selftest` |
| Admin (role ADMIN) | `GET /admin/settings` · `PUT /admin/settings/stages/:id` · `PUT /admin/settings/first-egg` · `PUT /admin/settings/drop` · `PUT /admin/settings/shop/:id` · `GET /admin/stats` · `GET/POST /admin/questions` · `PUT /admin/questions/:id` · `POST /admin/questions/:id/status` · `GET /admin/reports` · `POST /admin/reports/:id/resolve` |

The request/response shapes are in `src/types.ts`, the same contract file as the team repo (`frontend/src/api/types.ts`), so the team's front end can switch from its mock to this server.

## 6. Game rules implemented (numbers from `content/`)

- Energy 100 (Tiger 110). Gauge 40–100 by stage. 4 rounds (boss 6). A round = my skill question + the anomaly's dodge question.
- Damage = power × type bonus (×1.2 if the skill matches the pet's type) × combo. Power 20 → 25 (Lv 3) → 30 (Lv 7). Signature skill at Lv 5.
- Dodge right: combo +0.2 (max ×2.0, used up by the next attack). Dodge wrong: −15 energy (boss −20).
- Times: 4-choice / O/X 20 s, ordering / keyword / puzzle 30 s, pixel art 45 s. Timeout = wrong.
- XP: 30 + 10 × stars, boss 100, loss 10; food +10 % that day. Forms: Baby 1–3, Junior 4–6, Adult 7–9, Shining 10.
- Cells: ★/★★/★★★ = 5/10/15, boss 20, first clear of the day +5. Cap: 10 rewarded clears and 60 cells a day, then practice mode (XP only).
- Eggs: Stage 3 Common, Stage 6 Uncommon, Boss Rare (first clear). Hatch: 5 / 10 / 20 / 35 / 50 correct answers.
- Unlocks: Stage 1 → My Room + shop · Stage 2 → hint · Stage 3 → nest · Boss → Battle Room + 2nd nest slot.
- Mood (collar colour, computed when read): in battle tense · not fed 2+ days sad · ★★★ today harmony · fed today calm · new stage open curious.

## 7. Art

- Pets: Wam's 60 SVGs (`public/art/svg`) rendered and pixelated to 64×64 (`public/art/px`) by `scripts/render_svg.cjs` + `scripts/pixelate.py` (box-filter downscale, 20-colour palette, 1 px dark outline). Re-run both after Wam changes a pet.
- Codex, Naty, Rico, Zero, Xylo, Void, eggs and anomalies: pixel grids drawn in code (`src/ui/sprites.ts`), the same method as the midterm prototype. Red is only used for anomalies.

## 8. Showing the database live (admin → 🧪 SQL 실험실)

Eight fixed, read-only queries (`server/sqlLab.ts`) you can run in the presentation: ledger = balance check, one-partner check,
accuracy per DIMC area, stage funnel (where students get stuck), hardest questions, eggs → hatches → pets, students per day,
and where cells come from and go. Each shows its SQL, the rows and the time in ms. They run in a `READ ONLY` transaction and no
free SQL can be sent from the browser.

## 8b. Testing

- `npm test` (`scripts/playtest.mjs`): registers a new student and plays all 7 stages through the real API and database, answering correctly by reading the key from the DB. It checks: locked stages, ★★ after missed dodges, first-clear eggs, unlocks, the daily cap, single and **parallel** mail claims, `SUM(ledger) = balance`, shop rules, feeding once a day, one partner, the weekly report and admin permissions.
- `GET /api/selftest` on the live site plays Stage 1 against Neon and reports milliseconds per call.

## 9. Who owns what

| Teammate | Area | Files |
|---|---|---|
| Akip | Database + backend | `db/`, `server/` |
| Wafi | Front end | `src/screens/` (map, battle, result, mailbox, shop), `src/styles.css` |
| Wam | Pets + art | `public/art/`, `tools/`, `src/ui/sprites.ts`, `src/screens/room.ts` |
| Haikal | Admin + docs + deploy | `src/screens/admin.ts`, admin routes, `docs/`, Vercel/Neon |
| Asyraf | Questions + testing | `questions/questions.json` |
| Imran | Lead, story, integration, presentation | `content/`, reviews and merges |

## 10. Next steps (in order)

Done: 120 questions (30 per DIMC area), Weekly Trial with ranking, ghost challenge with friend codes, daily quests + weekly stamp egg, admin game settings, SQL lab.

1. Asyraf: check every question's wording for upper-elementary students; add more (admin page or `questions/questions.json`).
2. Pet accessories (`scarf_star`) shown on the pet; battle background item.
3. DORO's 1280×720 check on a real laptop; the demo video.
4. Ask DORO: can pets/nest live in their existing 마이룸? Free pet names or a safe list?
