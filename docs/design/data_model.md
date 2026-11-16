# Data model v4 and API draft (for backend)

PostgreSQL. This replaces the "Spirit" zone of ERD v3 with pets and eggs, and adds the content tables seeded from `content/`. Akip owns the final schema; this is the planning view of what the game needs. Column types are suggestions.

## Content tables (seeded from `content/`, read-only in play)

| Table | Key columns | Seed file |
|---|---|---|
| `question_categories` | id (`digital`/`ai`/`making`/`computing`), name_ko | — |
| `story_chapters` | id, order, name_ko, name_en, place, status, boss_mythic_percent | `chapters.json` |
| `story_stages` | id (`c1s3`), chapter_id, order, is_boss, name_ko, anomaly_ko, gauge, max_rounds, categories text[], mission_types text[], difficulty, egg_slot, first_clear_egg_rarity, enemy_sprite | `stages.json` + `chapters.json` |
| `stage_dialogue` | stage_id, moment (`intro`/`win`/`lose`), seq, speaker, text | `dialogue/ch1.json` |
| `rarities` | id, order, egg_name_ko, colour, hatch_correct_needed | `eggs.json` |
| `pet_species` | id, rarity_id, name_ko, type (category), signature_skill_id, passive_code, sprite_baby, sprite_adult | `pets.json` |
| `skills` | id, name_ko, category_id, kind (`basic`/`signature`), pet_species_id null | `skills.json` |
| `egg_drop_rates` | chapter_id, slot, rarity_id, percent (PK chapter+slot+rarity) | `egg_drop_rates.csv` |
| `mission_types` | id, time_s, status | `mission_types.json` |
| `questions` | id, category_id, difficulty, mission_type_id, prompt, payload jsonb, answer jsonb, explanation, status, created_by | `questions/*.csv` |
| `quests`, `achievements` | id, text, target, reward | `quests_achievements.json` |
| `shop_items` | id, name_ko, kind, price, effect | `shop_items.json` |
| `game_config` | key, value jsonb | `game_config.json` |

## Player tables

| Table | Key columns | Notes |
|---|---|---|
| `students` (existing) | id, nickname, cell_balance, **onboarded_at**, **battle_room_unlocked_at**, **mythic_pity** int, **nest_slots** int, **friend_code** | balance lives here (DORO confirmed) |
| `pets` | id, student_id, species_id, nickname, level, xp, is_partner, last_fed_at, created_at | partial unique index: one partner per student |
| `pet_skills` | pet_id, skill_id, is_equipped | 4 equipped |
| `eggs` | id, student_id, rarity_id, source (`STARTER`/`STORY`/`REPLAY`/`QUEST`/`ACHIEVEMENT`/`PITY`), source_ref, warmth, nest_slot null, hatched_pet_id null, became_snack bool, created_at | |
| `stage_progress` | student_id, stage_id, best_stars, first_cleared_at, clears | PK student+stage |
| `stage_records` | student_id, stage_id, best_score, accuracy, clear_time_ms, energy_left, question_ids int[] | best run; used by ghost challenge |
| `battles` | id, student_id, mode (`STORY`/`TRIAL`/`GHOST`), stage_id, ghost_of_student_id, pet_id, status, energy, gauge, combo, stars, started_at, ended_at | replaces `battle_rooms` |
| `battle_turns` | battle_id, turn_no, actor (`PET`/`ANOMALY`), skill_id, question_id, answer jsonb, is_correct, effect, time_ms | growth report source |
| `reward_mail` | id, student_id, title, amount, source_ref, claimed_at null | |
| `cell_ledger` | id, student_id, delta, reason, ref, created_at | |
| `student_items` | student_id, item_id, qty, placed jsonb | My Room placement |
| `student_quests` | student_id, quest_id, date, progress, done | daily reset |
| `quest_stamps` | student_id, week_start, stamps | weekly egg |
| `student_achievements` | student_id, achievement_id, earned_at | |
| `student_daily_limits` | student_id, date, rewarded_battles, cells_earned | |
| `friendships` | student_id, friend_id, created_at | added by friend code |
| `weekly_trials`, `trial_scores` | week_start, question_ids · student_id, week_start, score | |
| `question_reports` | question_id, student_id, reason | |

**Removed from v3:** `spirits`, `spirit_skills`, friend-duel room code logic in `battle_rooms`.

## API draft (REST, JSON)

The frontend can mock these with the files in `content/` until the backend is ready.

| Method | Path | Returns / does |
|---|---|---|
| GET | `/api/me` | nickname, cells, partner pet, mail count, onboarded, battle_room_unlocked, mythic_pity |
| POST | `/api/onboarding` | `{petName}` → starter egg hatched, partner created |
| GET | `/api/chapters` | chapters with lock state and progress |
| GET | `/api/chapters/:id/stages` | stages with lock state, best stars, egg slot, drop rates |
| POST | `/api/battles` | `{stageId, petId, mode, ghostOf?}` → battle id, first state |
| POST | `/api/battles/:id/skill` | `{skillId}` → question (no answer) |
| POST | `/api/battles/:id/answer` | `{questionId, answer}` → correct?, effect, explanation, next state (anomaly question if its turn) |
| POST | `/api/battles/:id/hint` | removes one wrong choice (3 cells) |
| POST | `/api/battles/:id/finish` | runs the stage-clear transaction → stars, XP, level-up, egg, mail |
| GET | `/api/pets` · PATCH `/api/pets/:id` | list · set partner / rename |
| POST | `/api/pets/:id/feed` | 5 cells, once a day |
| GET | `/api/eggs` · POST `/api/eggs/:id/nest` · POST `/api/eggs/:id/hatch` | eggs + warmth · move into nest · hatch (bag rule) |
| GET | `/api/dex` | 15 species with owned flag |
| GET | `/api/mail` · POST `/api/mail/:id/claim` · POST `/api/mail/claim-all` | mailbox |
| GET | `/api/shop` · POST `/api/shop/buy` | items · buy |
| GET | `/api/quests` · POST `/api/quests/:id/claim` | daily, weekly stamps, achievements |
| GET | `/api/battle-room` | 403 until unlocked; trial info, friends' best records |
| POST | `/api/friends` | `{friendCode}` |
| GET | `/api/report/weekly` | accuracy per DIMC category |
| Admin | `/api/admin/questions` (GET, POST, PATCH, approve, reject) | question management |

**Security:** the server picks questions, checks answers, rolls eggs and computes rewards. The client never sends scores, stars or rarities.
