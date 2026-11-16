# Backend

Owner: Akip

API and game logic for 코덱스의 시험.

Spec: [`docs/design/game_rules.md`](../docs/design/game_rules.md) (rules and formulas) and [`docs/design/data_model.md`](../docs/design/data_model.md) (tables and API draft).
Seed data: [`content/`](../content/) (chapters, stages, dialogue, pets, skills, eggs, drop rates, quests, shop, config).

## To build

- Seed script: load `content/` and `questions/` into the database
- Battle engine (story mode first; then Weekly Trial and ghost challenge)
- Stage clear transaction: stars → records → unlock next stage → partner XP / level-up → egg (first clear or replay roll + pity) → reward mail → daily limits
- Pets: partner, XP, levels, signature skill at Lv 5, passives, feeding, mood
- Eggs: nest, warmth from correct answers, hatch with the bag rule, duplicates to snack packs
- Mailbox claim (one transaction: mark claimed → ledger row → balance)
- Daily limits (10 rewarded battles, 60 cells)
- Battle Room unlock after the Chapter 1 boss
- Admin endpoints for questions (create, approve, edit, reject)

The server picks questions, checks all answers and rolls eggs itself. No AI runs during play.

## Setup

_TBD: add install and run steps once the stack is confirmed._
