-- Battle Room · ghost challenge: replay a stage with exactly the same questions as a friend's best run
-- and try to beat their score. Nobody has to be online at the same time.
ALTER TABLE students ADD COLUMN friend_code text UNIQUE;
UPDATE students SET friend_code = upper(substr(md5(id::text || username), 1, 6)) WHERE friend_code IS NULL;

CREATE TABLE friendships (
  student_id int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  friend_id  int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, friend_id),
  CHECK (student_id <> friend_id)
);

-- which battle was the best run (its battle_turns hold the exact question list)
ALTER TABLE stage_progress ADD COLUMN best_battle_id uuid REFERENCES battles(id) ON DELETE SET NULL;

ALTER TABLE battles ADD COLUMN ghost_of int REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE battles ADD COLUMN ghost_questions text[];
ALTER TABLE battles ADD COLUMN ghost_score int;
