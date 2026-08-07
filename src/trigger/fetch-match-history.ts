import { schemaTask , logger } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { riotFetch } from "./riot-api";

//supabase connection setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!supabaseUrl){
    throw new Error("Incorrect Supabase URL");
}
if(!supabaseKey){
    throw new Error("Incorrect Supabase Service Role Key");
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Given a puuid, fetches their full match history and writes one match_history row + 8 match_participants rows per match
export const fetchMatchHistory = schemaTask({
  id: "fetch-match-history",
  schema: z.object({
    puuid: z.string()
  }),
  run: async (payload, {ctx}) => {
    const {puuid} = payload;
    const url = `https://americas.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids`;
    const data = await riotFetch(url);
    for (const matchId of data){
      const matchUrl = `https://americas.api.riotgames.com/tft/match/v1/matches/${matchId}`;
      const matchData = await riotFetch(matchUrl);

      const matchHistoryRow = {
        match_id: matchData.metadata.match_id,
        game_version: matchData.info.game_version,
        //game_datetime is a unix timestamp in ms, casting it to an ISOString for timestamptz
        game_datetime: new Date(matchData.info.game_datetime).toISOString(),
        tft_set_core_name: matchData.info.tft_set_core_name,
        tft_set_number: matchData.info.tft_set_number
      }

      const matchParticipantRows = matchData.info.participants.map((participant: { puuid: string; win: boolean; placement: number; traits: unknown[]; units: unknown[];})=>({
        //// match_id isn't on the participant object itself — attach it from the match row
        match_id: matchHistoryRow.match_id,
        puuid: participant.puuid,
        win: participant.win,
        placement: participant.placement,
        traits: participant.traits,
        units: participant.units,
      }));

      const {error: historyError} =  await supabase.from("match_history").upsert(matchHistoryRow, {onConflict: "match_id"}).select();
      if(historyError){
        logger.log(`Supabase insert failed at match_history: ${historyError.message}`);
        throw new Error(`Supabase insert failed at match_history: ${historyError.message}`)
      }
      const additionalSummoners = matchParticipantRows.map((summoner: {puuid:string})=> ({puuid:summoner.puuid, tier: "DIAMOND", division: "IV"}));
      const {error: summonersError} = await supabase.from("tracked_summoners").upsert(additionalSummoners, {onConflict: "puuid", ignoreDuplicates: true});
      if(summonersError){
        logger.log(`Supabase insert failed at summonersError: ${summonersError.message}`);
        throw new Error(`Supabase insert failed at summonersError: ${summonersError.message}`)
      }
      // composite PK — a match_id alone isn't unique, 8 participants share it
      const {error: participantError} = await supabase.from("match_participants").upsert(matchParticipantRows, {onConflict: "match_id,puuid"}).select();
      if(participantError){
        logger.log(`Supabase insert failed at match_participant: ${participantError.message}`);
        throw new Error(`Supabase insert failed at match_participant: ${participantError.message}`)
      }
    }
    //return count of matches processed
    return {matchesProcessed: data.length};
  },
});