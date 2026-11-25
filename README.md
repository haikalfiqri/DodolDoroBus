# 코덱스의 시험 (Codex's Trial)

> **"도로랜드 신입사원이 되어, 나의 펫과 함께 코덱스의 시험을 풀어나간다."**
> Become a DOROLAND new recruit and pass Codex's trials together with your pets.

A minigame for the **DOROBUS** learning platform, built for the Hanyang University ERICA **IC-PBL** course in cooperation with **DORO Co., Ltd.**

**Status:** design v4 (2 Nov 2026, after the midterm feedback). Final build in December.

---

## What is it?

Every student joins DOROLAND as a **new recruit**. **Codex**, the guardian spirit, tests humans with **anomalies (이상 현상)** and has hidden DOROLAND's animals inside them as **eggs**. On day 1 Naty hands the student a starter egg; the pet that hatches is their first **partner**. The student and their pets calm anomalies by answering DIMC questions and missions.

- **Story mode (main, solo):** Chapter 1 is the Safari: 6 stages + a boss. Stage 3, Stage 6 and the boss drop eggs.
- **Pets:** 15 pets in 5 rarities (Common → Mythic), each with a DIMC type. Eggs hatch with correct answers. Pets level up and change form (Baby → Junior → Adult → Shining).
- **My Room:** pets, the nest, the 도감 (collection book), decorations.
- **Battle Room:** unlocks after the Chapter 1 boss. Asynchronous only: Weekly Trial and ghost challenges against friends' records.
- **Economy:** rewards go to the mailbox (우편함), then the student claims cells and spends them in Xylo's shop. Eggs are never sold.
- **Admin page:** the admin creates and approves questions. No AI runs while students play.

## Start here

| You are | Read |
|---|---|
| Everyone | [`docs/progress_v4.md`](docs/progress_v4.md): the current plan (single source of truth) |
| Backend | [`docs/design/game_rules.md`](docs/design/game_rules.md), [`docs/design/data_model.md`](docs/design/data_model.md), [`content/`](content/) |
| Frontend | [`docs/design/screens.md`](docs/design/screens.md), [`docs/prototype/`](docs/prototype/), [`content/`](content/) |
| Story / art | [`docs/egg_pet_system_v4.md`](docs/egg_pet_system_v4.md), [`docs/player_journey.md`](docs/player_journey.md), [`docs/story/`](docs/story/) |

## What works now

- **Login** for students and the admin (signed session cookie, scrypt password hashes), and sign-up for new students
- **Onboarding:** Codex's letter → tap Naty's starter egg 3× → a pet hatches → name it → mood colours
- **Chapter 1** (6 stages + boss) on a pixel map; stage cards show first-clear eggs and replay drop rates
- **Battle engine on the server:** skill → mission → damage × combo; the anomaly's turn → dodge question; stars by energy left; 7 mission types; Rico's hint; pet passives
- **Stage-clear transaction:** progress, unlocks, daily limits, reward mail, eggs (first clear / replay roll + Mythic pity), partner XP and level-ups
- **My Room:** partner, feeding, renaming, the nest with warmth, hatching with the bag rule, the 도감
- **Mailbox, Xylo's shop, cell history, Void's weekly report**
- **Battle Room:** Weekly Trial with ranking, ghost challenge against a friend's record (friend codes)
- **Daily quests** with a weekly stamp egg
- **Admin page:** stats, question management for all mission types, reports, game settings (gauges, egg rarities, drop rates, prices) and a read-only SQL lab

Not built yet: pet accessories, Chapters 2–5 (they are data: add stage rows).

| Demo account | Password | |
|---|---|---|
| `student1` | `doro1234` | new student |
| `student2` | `doro1234` | mid-game student (after `GET /api/demo-setup` once) |
| `admin` | `admin1234` | operator page |

## Tech stack

| Part | Choice |
|---|---|
| Front end | TypeScript + Vite, no UI framework (HTML/CSS), pixel art |
| API | Node.js + Express 5 (`server/`), deployed as one serverless function (`api/index.ts`) |
| Database | PostgreSQL (Neon on Vercel; any Postgres 14+ locally) |
| Hosting | Vercel |

## Repository layout

```
.
├── api/         Vercel entry (exports the Express app)
├── server/      Express app: auth, battle engine, game rules, quests, Battle Room, admin
├── db/          migrations/*.sql (schema) + migrate.mjs (migrate + seed)
├── src/         front end: screens/, ui/ (sprites, sound), api.ts, types.ts (API contract)
├── public/art/  svg/ = original pet art · px/ = pixel versions (64×64)
├── content/     game data: stages, dialogue, pets, skills, eggs, drop rates, shop, config
├── questions/   question bank (questions.json), loaded by the seed
├── scripts/     playtest.mjs (end-to-end test), erd.mjs, pixel art pipeline
├── tools/       pet art generator
└── docs/        plan, design specs, story, HOW_IT_WORKS.md, erd/
```

## Getting started

```bash
git clone https://github.com/haikalfiqri/DodolDoroBus.git
cd DodolDoroBus
npm install
cp .env.example .env            # put your own DATABASE_URL in it
npm run db:setup                # create tables + load content, questions and demo accounts
npm run dev:api                 # API on http://localhost:3000
npm run dev                     # game on http://localhost:5173
npm test                        # plays all of Chapter 1 through the API and checks the transactions
npm run demo:race               # concurrency demo: 10 claims of one reward at the same moment
```

Use your own database for development: a local PostgreSQL, or your own Neon branch (ask the deploy owner).
On Vercel, `npm run build` runs the migrations and the seed automatically.

### Concurrency demo

`npm run demo:race` (with `npm run dev:api` running) fires 10 claims of the same reward mail at the same moment. Only one succeeds and `cell_ledger` gets exactly one row.
With `DATABASE_URL` set it also runs the same race on a naive "SELECT, then UPDATE" design next to ours, to show the difference:

```
naive  (SELECT, then UPDATE)                   successful claims: 10 · wallet: 200 cells ❌ (should be 20)
ours   (UPDATE ... WHERE claimed_at IS NULL)   successful claims:  1 · wallet:  20 cells ✅
```

Use your own database branch for this, not production.

### Logging in from other clients

`/api/auth/login` and `/api/auth/register` return a `token` as well as setting the login cookie.
Clients that are not the browser game (for example DOROBUS, or a test script) can send it as `Authorization: Bearer <token>`.

**Read [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md)** for the database design, the transactions and every endpoint.

## Team

| Member | Role |
|---|---|
| Imran | Team lead, planning, game design, integration, presentation |
| Akip | Database + backend |
| Wafi | Front end |
| Wam | Pets, art, egg/pet system |
| Haikal | Admin page, documentation, repository and deployment |
| Asyraf | Research, questions, testing |

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before your first push.

## Credits

Story, characters and world (DOROLAND, Codex, Naty, Rico, Zero, Xylo, Void) belong to DORO Co., Ltd. This is a university project and is not an official DORO product.
