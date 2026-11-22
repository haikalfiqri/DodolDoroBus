-- Battle Room · Weekly Trial: the same 8 questions for everyone each week (Monday 00:00 KST).
-- Asynchronous: nobody has to be online at the same time; students compare best scores.

CREATE TABLE weekly_trials (
  week_start   date PRIMARY KEY,              -- Monday (KST)
  question_ids text[] NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trial_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    int  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start    date NOT NULL REFERENCES weekly_trials(week_start),
  idx           int  NOT NULL DEFAULT 0,      -- which of the 8 questions is open
  q_order       jsonb,                        -- shuffle of the open question's choices
  q_started_at  timestamptz,                  -- server-side timer for the time bonus
  correct       int  NOT NULL DEFAULT 0,
  combo         numeric(3,1) NOT NULL DEFAULT 1.0,
  best_combo    numeric(3,1) NOT NULL DEFAULT 1.0,
  time_bonus    int  NOT NULL DEFAULT 0,
  score         int  NOT NULL DEFAULT 0,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);
CREATE INDEX trial_runs_week_idx ON trial_runs (week_start, score DESC) WHERE finished_at IS NOT NULL;
