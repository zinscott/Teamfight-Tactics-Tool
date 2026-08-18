CREATE TABLE unit_build_stats (
  character_id text NOT NULL,
  item_a text NOT NULL,
  item_b text NOT NULL,
  item_c text NOT NULL,
  PRIMARY KEY (character_id, item_a, item_b, item_c),
  games_count int NOT NULL,
  wins_count int NOT NULL,
  top4_count int NOT NULL,
  avg_placement numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE unit_build_stats ENABLE ROW LEVEL SECURITY;
