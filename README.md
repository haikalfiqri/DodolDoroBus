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

## Scope for the final

| Priority | Items |
|---|---|
| **Must** | Chapter 1 playable with first-clear eggs · pets (hatching, partner, XP, forms, skills) · My Room with nest and 도감 · mailbox → claim → shop · admin question page · 100–150 questions |
| **Should** | Replay egg drops + pity · daily quests · Battle Room (Weekly Trial, ghost challenge) · pixel art and puzzle missions · Void's report |
| **Could** | Rhythm missions · Epic pets drawn · one sample Chapter 2 stage |
| **Not in final** | Chapters 2–5 playable · Mythic pets playable · live duels |

## Repository layout

```
.
├── backend/     API, battle engine, game logic
├── frontend/    Map, battle, My Room, mailbox, shop, Battle Room, admin page
├── db/          PostgreSQL schema, migrations, seed scripts
├── content/     Game data: chapters, stages, dialogue, pets, eggs, drop rates, config
├── questions/   Question sets (DIMC categories) before import
├── docs/        Plan, design specs, story, prototype
└── CONTRIBUTING.md
```

## Tech stack

> To be confirmed by the team. Fill this in once decided.

| Part | Choice |
|---|---|
| Database | PostgreSQL |
| Backend | Node.js + TypeScript + Express (proposed in progress v4; confirm with DORO) |
| Frontend | TypeScript + Vite (proposed; confirm with DORO) |
| Hosting / demo | _TBD_ |

## Getting started

> Placeholder. Update once the backend and frontend exist.

```bash
git clone https://github.com/<org-or-user>/<repo>.git
cd <repo>
cp .env.example .env     # then fill in your own values
```

Setup steps for each part are in `backend/README.md`, `frontend/README.md` and `db/README.md`.

## Team

| Member | Role |
|---|---|
| Imran | Planning, game design, story stages and dialogue, questions |
| Wam | Presenting, testing, questions |
| Asyraf | Research, testing, questions |
| Akip | Database + backend (battle engine, story progress, pets and eggs, mailbox) |
| Haikal | Documentation, questions, repository |
| Wafi | Front end (story map, battle, My Room, shop, admin page) |

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before your first push.

## Credits

Story, characters and world (DOROLAND, Codex, Naty, Rico, Zero, Xylo, Void) belong to DORO Co., Ltd. This is a university project and is not an official DORO product.
