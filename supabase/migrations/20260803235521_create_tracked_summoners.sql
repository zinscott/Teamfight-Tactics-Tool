CREATE TABLE tracked_summoners (
  puuid text PRIMARY KEY,
  tier text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tracked_summoners ENABLE ROW LEVEL SECURITY;
