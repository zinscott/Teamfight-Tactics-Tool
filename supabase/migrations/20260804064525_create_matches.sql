CREATE TABLE Match_History(
    match_id text PRIMARY KEY,
    game_version text NOT NULL,
    game_datetime timestamptz NOT NULL,
    tft_set_core_name text NOT NULL,
    tft_set_number int NOT NULL
);
ALTER TABLE Match_History ENABLE ROW LEVEL SECURITY;