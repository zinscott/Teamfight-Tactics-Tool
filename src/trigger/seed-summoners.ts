import {task, logger} from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!supabaseUrl){
    throw new Error("Incorrect Supabase URL");
}
if(!supabaseKey){
    throw new Error("Incorrect Supabase Service Role Key");
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchTier(tiers: string) {
    if(!process.env.RIOT_API_KEY){
        throw new Error(`Incorrect Riot API Key`);
    }
    const response = await fetch(`https://na1.api.riotgames.com/tft/league/v1/${tiers}`, {headers: {"X-Riot-Token": process.env.RIOT_API_KEY}});
    if(!response.ok){
        throw new Error(`Riot API returned ${response.status}`);
    }
    const data = await response.json();
    return data.entries.map((entry: {puuid: string}) => ({
        puuid: entry.puuid,
        tier: data.tier,
        division: "I"
    }));
}

async function fetchDiamond(division: string) {
    if(!process.env.RIOT_API_KEY){
      throw new Error(`Incorrect Riot API Key`);
    }
  
    let page = 1;
    const puuids: {puuid: string; tier: string}[] = [];
  
    while(true){
      const url = `https://na1.api.riotgames.com/tft/league/v1/entries/DIAMOND/${division}?page=${page}`;
      const response = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY } });
      if (!response.ok) {
        throw new Error(`Riot API returned ${response.status}`);
      }
      const entries = await response.json();
      if (entries.length === 0) {
        break;
      }
      puuids.push(...entries.map((entry: {puuid: string}) =>({
        puuid: entry.puuid, 
        tier: "DIAMOND",
        division
      })));
      page++;
    }
  
    return puuids;
  }
  

export const seedSummonersTask = task({
    id: "seed-summoners",
    queue: {
        concurrencyLimit: 1
    },
    run: async () => {
        const d4Data = await fetchDiamond("IV");
        logger.log("D4 done");
        const d3Data = await fetchDiamond("III");
        logger.log("D3 done");
        const d2Data = await fetchDiamond("II");
        logger.log("D2 done");
        const d1Data = await fetchDiamond("I");
        logger.log("D1 done");
        const masData = await fetchTier("master");
        logger.log("Master done");
        const gmData = await fetchTier("grandmaster");
        logger.log("GM done");
        const chalData = await fetchTier("challenger");
        logger.log("Challenger done");  
        
        const allSummoners = [...chalData, ...gmData, ...masData, ...d1Data, ...d2Data, ...d3Data, ...d4Data];
        const uniqueSummoners = Array.from(new Map(allSummoners.map(s => [s.puuid,s])).values())
        const {data, error} = await supabase.from("tracked_summoners").upsert(uniqueSummoners, {onConflict: "puuid"}).select();
        
        if(error){
            logger.log(`Supabase insert failed ${error.message}`);
            throw new Error(`Supabase insert failed: ${error.message}`);   
        }

        return data;
    }
})
