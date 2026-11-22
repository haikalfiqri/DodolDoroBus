-- Daily quests: 3 a day per student. Progress is NOT stored as counters:
-- it is computed with SQL from what already happened (battle_turns, battles, pets, trial_runs).
CREATE TABLE student_quests (
  student_id int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day        date NOT NULL,                 -- KST date
  quest_id   text NOT NULL,
  target     int  NOT NULL,
  claimed_at timestamptz,
  PRIMARY KEY (student_id, day, quest_id)
);
-- 5 days with all 3 quests done in one week = the weekly egg
CREATE TABLE quest_stamps (
  student_id int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  stamps     int  NOT NULL DEFAULT 0 CHECK (stamps BETWEEN 0 AND 7),
  egg_given  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (student_id, week_start)
);
