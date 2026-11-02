# Database (PostgreSQL)

Owner: Akip

Schema based on ERD v3 (see `docs/progress_v3.md`, section 11).

| Zone | Tables |
|---|---|
| Story & content | `story_chapters`, `story_stages`, `question_categories`, `questions` |
| Spirit | `spirits`, `skills`, `spirit_skills` |
| Battle | `battle_rooms`, `battle_participants`, `battle_turns`, `stage_progress` |
| Economy | `students`, `reward_mail`, `cell_ledger`, `shop_items`, `student_items`, `student_daily_limits` |
| Admin | `game_config`, `question_reports` |

## Suggested layout

```
db/
├── schema.sql        # CREATE TABLE statements
├── migrations/       # changes after the first version
└── seed/             # Chapter 1 stages, categories, first 50 questions
```

## Setup

_TBD: how to create the database and run `schema.sql`._
