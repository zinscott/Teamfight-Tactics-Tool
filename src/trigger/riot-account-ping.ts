import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const riotAccountPingTask = schemaTask({
  id: "riot-account-ping",
  schema: z.object({
    gameName: z.string(), tagLine: z.string()
  }),
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload, { ctx }) => {
    const {gameName, tagLine} = payload;
    if(!process.env.RIOT_API_KEY){
      throw new Error("RIOT_API_KEY not set or old");
    }
    //Fetch riot account using game name and tag line ex. Raccoon Scooter #RACC
    logger.log("Fetching Riot Account", {payload, ctx});
    const puuidUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const puuidResponse = await fetch(puuidUrl, {headers: {"X-Riot-Token": process.env.RIOT_API_KEY}});
    if(!puuidResponse.ok){
      throw new Error(`Riot API returned ${puuidResponse.status}`);
    }
    //Parse puuidURL to obtain puuid to fetch match history (List[String]) for the user
    const puuidData = await puuidResponse.json();
    const {puuid} = puuidData;
    //Fetch match history using PUUID
    logger.log(`Fetching ${gameName} #${tagLine}'s match history`, {puuidData, ctx});
    const matchURL = `https://americas.api.riotgames.com/tft/match/v1/matches/by-puuid/${encodeURIComponent(puuid)}/ids`;
    const matchResponse = await fetch(matchURL, {headers: {"X-Riot-Token": process.env.RIOT_API_KEY}});
    if(!matchResponse.ok){
      throw new Error(`User "${gameName} #${tagLine}" not found`);
    }
    const matchHistory = await matchResponse.json();

    return {puuid, matchHistory: matchHistory};
  },
});