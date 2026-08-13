import {task, logger, schedules} from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import {riotFetch} from "./riot-api";

//Connect to supabase
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
    const url = `https://na1.api.riotgames.com/tft/league/v1/${tiers}`;
    const data = await riotFetch(url);
    //Each entry is a {puuid, tier, division} row ready for the tracked_summoners upsert
    return data.entries.map((entry: {puuid: string}) => ({
        puuid: entry.puuid,
        tier: data.tier,
        division: "I"
    }));
}

async function fetchDiamond(division: string) {
    let page = 1;
    const puuids: {puuid: string; tier: string}[] = [];
    while(true){
      const url = `https://na1.api.riotgames.com/tft/league/v1/entries/DIAMOND/${division}?page=${page}`;
      const data = await riotFetch(url);
      if (data.length === 0) {
        break;
      }
      //adds spreaded items onto puuid array
      //"..." unpacks array into individual items so avoid adding whole array as one nested element
      puuids.push(...data.map((entry: {puuid: string}) =>({
        puuid: entry.puuid, 
        tier: "DIAMOND",
        division
      })));
      page++;
    }
    return puuids;
  }
  

export const seedSummonersTask = schedules.task({
    id: "seed-summoners",
    //cron: "0 1 * * *",
    //prevents overlapping runs in a scheduled run
    queue: {
        concurrencyLimit: 1
    },
    run: async () => {
        /*const d4Data = await fetchDiamond("IV");
        logger.log("D4 done");
        const d3Data = await fetchDiamond("III");
        logger.log("D3 done");
        const d2Data = await fetchDiamond("II");
        logger.log("D2 done");
        const d1Data = await fetchDiamond("I");
        logger.log("D1 done");
        const masData = await fetchTier("master");
        logger.log("Master done");*/
        const gmData = await fetchTier("grandmaster");
        logger.log("GM done");
        const chalData = await fetchTier("challenger");
        logger.log("Challenger done");  
        
        //const allSummoners = [...chalData, ...gmData, ...masData, ...d1Data, ...d2Data, ...d3Data, ...d4Data];
        const allSummoners = [...chalData, ...gmData];
        //dedupe by puuid, live ladder update can shift a puuid mid crawl
        const uniqueSummoners = Array.from(new Map(allSummoners.map(s => [s.puuid,s])).values())
        const {data, error} = await supabase.from("tracked_summoners").upsert(uniqueSummoners, {onConflict: "puuid"}).select();
        
        if(error){
            logger.log(`Supabase insert failed ${error.message}`);
            throw new Error(`Supabase insert failed: ${error.message}`);   
        }

        return data;
    }
})
