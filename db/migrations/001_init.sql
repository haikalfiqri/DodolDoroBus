-- 코덱스의 시험 · schema v4 (PostgreSQL 16)
-- Zones: content (seeded from content/, read-only in play) · players · battles · economy · admin
-- Every rule the client must not cheat on (answers, rewards, eggs) lives on the server side of these tables.

-- ============================================================
-- 1. CONTENT  (seeded by db/seed.mjs from content/*.json)
-- ============================================================

CREATE TABLE question_categories (
  id       text PRIMARY KEY,                -- 'digital' | 'ai' | 'making' | 'computing'  (DIMC)
  name_ko  text NOT NULL
);

CREATE TABLE mission_types (
  id       text PRIMARY KEY,                -- 'choice4','ox','order','keyword','command_order','pixel_art','puzzle'
  name_ko  text NOT NULL,
  time_s   int  NOT NULL CHECK (time_s > 0)
);

CREATE TABLE rarities (
  id                   text PRIMARY KEY,    -- 'common' .. 'mythic'
  ord                  int  NOT NULL UNIQUE,
  egg_name_ko          text NOT NULL,
  colour               text NOT NULL,
  hatch_correct_needed int  NOT NULL CHECK (hatch_correct_needed > 0)
);

CREATE TABLE story_chapters (
  id                  int  PRIMARY KEY,
  ord                 int  NOT NULL UNIQUE,
  name_ko             text NOT NULL,
  name_en             text,
  status              text NOT NULL CHECK (status IN ('playable','planned')),
  boss_mythic_percent numeric(5,2) NOT NULL DEFAULT 0
);

-- which egg each egg slot gives on FIRST clear (1 row per chapter x slot)
CREATE TABLE chapter_first_clear_eggs (
  chapter_id int  NOT NULL REFERENCES story_chapters(id),
  slot       text NOT NULL CHECK (slot IN ('stage1','stage3','stage6','boss')),
  rarity_id  text NOT NULL REFERENCES rarities(id),
  PRIMARY KEY (chapter_id, slot)
);

CREATE TABLE story_stages (
  id            text PRIMARY KEY,           -- 'c1s3' = chapter 1 stage 3, boss = 'c1s7'
  chapter_id    int  NOT NULL REFERENCES story_chapters(id),
  ord           int  NOT NULL,
  is_boss       boolean NOT NULL DEFAULT false,
  name_ko       text NOT NULL,
  anomaly_ko    text NOT NULL,
  gauge         int  NOT NULL CHECK (gauge > 0),
  max_rounds    int  NOT NULL CHECK (max_rounds > 0),
  categories    text[] NOT NULL,            -- DIMC categories used in this stage
  mission_types text[] NOT NULL,
  difficulty    text NOT NULL CHECK (difficulty IN ('easy','normal','hard')),
  egg_slot      text CHECK (egg_slot IN ('stage3','stage6','boss')),
  UNIQUE (chapter_id, ord)
);

CREATE TABLE stage_dialogue (
  stage_id text NOT NULL REFERENCES story_stages(id),
  moment   text NOT NULL CHECK (moment IN ('intro','win','lose')),
  seq      int  NOT NULL,
  speaker  text NOT NULL,
  text     text NOT NULL,
  PRIMARY KEY (stage_id, moment, seq)
);

CREATE TABLE egg_drop_rates (                -- replay drop chance, tunable by the admin without code
  chapter_id int  NOT NULL REFERENCES story_chapters(id),
  slot       text NOT NULL CHECK (slot IN ('stage3','stage6','boss')),
  rarity_id  text NOT NULL REFERENCES rarities(id),
  percent    numeric(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  PRIMARY KEY (chapter_id, slot, rarity_id)
);

CREATE TABLE skills (
  id          text PRIMARY KEY,
  name_ko     text NOT NULL,
  category_id text NOT NULL REFERENCES question_categories(id),
  kind        text NOT NULL CHECK (kind IN ('basic','signature'))
);

CREATE TABLE pet_species (
  id                 text PRIMARY KEY,      -- 'dog','fox',...
  rarity_id          text NOT NULL REFERENCES rarities(id),
  name_ko            text NOT NULL,
  type_id            text NOT NULL REFERENCES question_categories(id),
  signature_skill_id text NOT NULL REFERENCES skills(id),
  passive_code       text,
  passive_ko         text
);

CREATE TABLE shop_items (
  id      text PRIMARY KEY,
  name_ko text NOT NULL,
  kind    text NOT NULL,                    -- consumable | battle | room_background | room_furniture | pet_accessory | battle_background
  price   int  NOT NULL CHECK (price >= 0),
  effect  text
);

CREATE TABLE game_config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ============================================================
-- 2. QUESTIONS  (admin-managed; only 'approved' rows are used in play)
-- ============================================================

CREATE SEQUENCE question_seq START 1000;

CREATE TABLE questions (
  id              text PRIMARY KEY DEFAULT ('n' || nextval('question_seq')),
  category_id     text NOT NULL REFERENCES question_categories(id),
  difficulty      text NOT NULL CHECK (difficulty IN ('easy','normal','hard')),
  mission_type_id text NOT NULL REFERENCES mission_types(id),
  prompt          text NOT NULL,
  payload         jsonb,                    -- choices / items / target / seq, by mission type
  answer          jsonb,                    -- NEVER sent to the client before it answers
  explanation     text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','hidden')),
  created_by      text NOT NULL DEFAULT 'seed',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_pick_idx ON questions (category_id, mission_type_id) WHERE status = 'approved';

-- ============================================================
-- 3. PLAYERS
-- ============================================================

CREATE TABLE students (
  id                      serial PRIMARY KEY,
  username                text NOT NULL UNIQUE,
  nickname                text NOT NULL,
  password_hash           text NOT NULL,
  role                    text NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','ADMIN')),
  cells                   int  NOT NULL DEFAULT 0 CHECK (cells >= 0),   -- cached balance; cell_ledger is the history
  onboarded_at            timestamptz,
  unlocks                 text[] NOT NULL DEFAULT '{}',                -- 'room','hint','quests','nest','battle_room'
  battle_room_unlocked_at timestamptz,
  mythic_pity             int  NOT NULL DEFAULT 0 CHECK (mythic_pity BETWEEN 0 AND 50),
  nest_slots              int  NOT NULL DEFAULT 1 CHECK (nest_slots BETWEEN 1 AND 3),
  three_star_day          date,
  free_hint_day           date,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pets (
  id          serial PRIMARY KEY,
  student_id  int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  species_id  text NOT NULL REFERENCES pet_species(id),
  nickname    text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 8),
  level       int  NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  xp          int  NOT NULL DEFAULT 0 CHECK (xp >= 0),
  is_partner  boolean NOT NULL DEFAULT false,
  last_fed_on date,
  born_on     date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- exactly one partner per student (partial unique index)
CREATE UNIQUE INDEX pets_one_partner ON pets (student_id) WHERE is_partner;
CREATE INDEX pets_student_idx ON pets (student_id);

CREATE TABLE eggs (
  id             serial PRIMARY KEY,
  student_id     int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  rarity_id      text NOT NULL REFERENCES rarities(id),
  source         text NOT NULL CHECK (source IN ('STARTER','STORY','REPLAY','QUEST','ACHIEVEMENT','PITY')),
  source_ref     text,                      -- stage id that gave it
  warmth         int  NOT NULL DEFAULT 0 CHECK (warmth >= 0),
  nest_slot      int,                       -- null = in the egg box
  hatched_at     timestamptz,
  hatched_pet_id int REFERENCES pets(id),
  became_snack   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- one unhatched egg per nest slot
CREATE UNIQUE INDEX eggs_one_per_slot ON eggs (student_id, nest_slot) WHERE nest_slot IS NOT NULL AND hatched_at IS NULL;

CREATE TABLE stage_progress (
  student_id       int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stage_id         text NOT NULL REFERENCES story_stages(id),
  best_stars       int  NOT NULL CHECK (best_stars BETWEEN 1 AND 3),
  clears           int  NOT NULL DEFAULT 1,
  first_cleared_at timestamptz NOT NULL DEFAULT now(),
  best_score       int  NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, stage_id)
);

-- ============================================================
-- 4. BATTLES  (state lives in the DB, so the API is stateless / serverless-safe)
-- ============================================================

CREATE TABLE battles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stage_id    text NOT NULL REFERENCES story_stages(id),
  pet_id      int  NOT NULL REFERENCES pets(id),
  mode        text NOT NULL DEFAULT 'STORY' CHECK (mode IN ('STORY','GHOST','TRIAL')),
  phase       text NOT NULL CHECK (phase IN ('PICK_SKILL','PET_QUESTION','ANOMALY_QUESTION','WON','LOST')),
  round       int  NOT NULL DEFAULT 1,
  energy      int  NOT NULL,
  max_energy  int  NOT NULL,
  gauge       int  NOT NULL,
  combo       numeric(3,1) NOT NULL DEFAULT 1.0,
  combo_base  numeric(3,1) NOT NULL DEFAULT 1.0,
  skill_id    text REFERENCES skills(id),
  current     jsonb,                        -- {"q": question id, "order": shown->original index map}
  used        text[] NOT NULL DEFAULT '{}',
  correct     int  NOT NULL DEFAULT 0,
  total       int  NOT NULL DEFAULT 0,
  hint_used   boolean NOT NULL DEFAULT false,
  passive     jsonb NOT NULL DEFAULT '{}',  -- one-shot passive flags still unused
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX battles_student_idx ON battles (student_id, started_at DESC);

CREATE TABLE battle_turns (                  -- every answer ever given: source for reports and "not seen recently"
  id          bigserial PRIMARY KEY,
  battle_id   uuid NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  student_id  int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  turn_no     int  NOT NULL,
  actor       text NOT NULL CHECK (actor IN ('PET','ANOMALY')),
  skill_id    text REFERENCES skills(id),
  question_id text NOT NULL REFERENCES questions(id),
  category_id text NOT NULL REFERENCES question_categories(id),
  answer      jsonb,
  is_correct  boolean NOT NULL,
  effect      text NOT NULL,                -- DAMAGE | MISS | DODGE | HIT
  amount      numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, turn_no)
);
CREATE INDEX battle_turns_student_idx ON battle_turns (student_id, created_at DESC);

-- ============================================================
-- 5. ECONOMY
-- ============================================================

CREATE TABLE reward_mail (
  id         serial PRIMARY KEY,
  student_id int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title      text NOT NULL,
  amount     int  NOT NULL CHECK (amount >= 0),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz                    -- null = not yet claimed
);
CREATE INDEX reward_mail_student_idx ON reward_mail (student_id, created_at DESC);

CREATE TABLE cell_ledger (                   -- append-only history of every cell change
  id         bigserial PRIMARY KEY,
  student_id int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  delta      int  NOT NULL,
  reason     text NOT NULL,                 -- MAIL_CLAIM | SHOP_BUY | FEED | HINT
  ref        text,
  balance    int  NOT NULL,                 -- balance after this row
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE student_items (
  student_id int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  item_id    text NOT NULL REFERENCES shop_items(id),
  qty        int  NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (student_id, item_id)
);

CREATE TABLE student_daily_limits (
  student_id        int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day               date NOT NULL,          -- KST date
  rewarded_battles  int  NOT NULL DEFAULT 0 CHECK (rewarded_battles <= 10),
  cells_earned      int  NOT NULL DEFAULT 0 CHECK (cells_earned <= 60),
  first_clear_bonus boolean NOT NULL DEFAULT false,
  PRIMARY KEY (student_id, day)
);

-- ============================================================
-- 6. ADMIN
-- ============================================================

CREATE TABLE question_reports (
  id          serial PRIMARY KEY,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_id  int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
