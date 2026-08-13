CREATE TABLE item_stats (
    character_id text NOT NULL,
    item_name text NOT NULL,
    PRIMARY KEY (character_id, item_name),
    games_count int NOT NULL,
    wins_count int NOT NULL,
    top4_count int NOT NULL,
    avg_placement numeric NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE item_stats ENABLE ROW LEVEL SECURITY;