# 코덱스의 시험 (Codex's Trial)

> **"도로랜드 신입사원이 되어, 나의 정령과 함께 코덱스의 시험을 풀어나간다."**
> Become a DOROLAND new recruit and pass Codex's trials together with your spirit.

A minigame for the **DOROBUS** learning platform, built for the Hanyang University ERICA **IC-PBL** course in cooperation with **DORO Co., Ltd.**

**Status:** in development (midterm presentation done 26 Oct 2026; final build in about 7 weeks)

---

## What is it?

Every student joins DOROLAND as a **new recruit**. On day 1 a purple sprout appears and the student's own **spirit (정령)** hatches from it. **Codex**, the guardian spirit, tests humans with **anomalies (이상 현상)**. The student and their spirit calm the anomalies by answering questions.

- **Story mode (main, solo):** Chapter 1 is the Safari: 6 stages + a boss.
- **Friend duel:** create a room, share a 6-digit code, and let your spirits duel.
- **Spirit growth:** XP, levels, new skills, mood colours, daily feeding.
- **Economy:** battle rewards go to the mailbox (우편함), then the student claims cells. Cells are spent in the shop.
- **Admin page:** the admin creates and approves questions. AI drafts question batches **offline**. No AI runs while students play.

Full design: [`docs/progress_v3.md`](docs/progress_v3.md)

## Scope for the final

| Priority | Items |
|---|---|
| **Must** | Battle engine, story mode with Chapter 1 playable, spirit (level, XP, skills), mailbox → claim → shop, admin question page, 100–150 questions |
| **Should** | Friend duel with room code, mood colours + feeding, Rico's hint, Void's growth report |
| **Could** | One sample Chapter 2 stage, AI batch question generation |
| **Not in final** | Chapters 2–5 playable, spirit evolution, real art |

## Repository layout

```
.
├── backend/     API, battle engine, game logic
├── frontend/    Story map, spirit screen, battle, shop, admin page
├── db/          PostgreSQL schema (ERD v3), migrations, seed data
├── questions/   Question sets (DIMC categories) before import
├── docs/        Design docs, briefings, mockups
└── CONTRIBUTING.md
```

## Tech stack

> To be confirmed by the team. Fill this in once decided.

| Part | Choice |
|---|---|
| Database | PostgreSQL |
| Backend | _TBD_ |
| Frontend | _TBD_ |
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
| Akip | Database + backend (battle engine, story progress, spirit, mailbox) |
| Haikal | Documentation, questions, repository |
| Wafi | Front end (story map, spirit screen, battle, shop, admin page) |

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before your first push.

## Credits

Story, characters and world (DOROLAND, Codex, Naty, Rico, Zero, Xylo, Void) belong to DORO Co., Ltd. This is a university project and is not an official DORO product.
