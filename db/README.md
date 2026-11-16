# Database (PostgreSQL)

Owner: Akip

Schema v4: see [`docs/design/data_model.md`](../docs/design/data_model.md). v3 is in `docs/archive/progress_v3.md`.

| Zone | Tables |
|---|---|
| Story & content | `story_chapters`, `story_stages`, `stage_dialogue`, `question_categories`, `mission_types`, `questions` |
| Pets & eggs | `rarities`, `pet_species`, `skills`, `pets`, `pet_skills`, `eggs`, `egg_drop_rates` |
| Battle | `battles`, `battle_turns`, `stage_progress`, `stage_records`, `friendships`, `weekly_trials`, `trial_scores` |
| Economy | `students`, `reward_mail`, `cell_ledger`, `shop_items`, `student_items`, `student_daily_limits` |
| Quests | `quests`, `student_quests`, `quest_stamps`, `achievements`, `student_achievements` |
| Admin | `game_config`, `question_reports` |

## Suggested layout

```
db/
├── schema.sql        # CREATE TABLE statements
├── migrations/       # changes after the first version
└── seed/             # loads content/*.json, content/egg_drop_rates.csv and questions/*.csv
```

## Setup

_TBD: how to create the database and run `schema.sql`._
