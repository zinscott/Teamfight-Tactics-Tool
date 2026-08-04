CREATE TABLE Match_Participants(
    match_id text,
    puuid text,
    PRIMARY KEY(match_id, puuid),
    FOREIGN KEY(match_id) REFERENCES Match_History(match_id),
    FOREIGN KEY(puuid) REFERENCES tracked_summoners(puuid),
    win boolean NOT NULL,
    placement int NOT NULL,
    traits jsonb NOT NULL,
    units jsonb NOT NULL
);
ALTER TABLE Match_Participants ENABLE ROW LEVEL SECURITY;