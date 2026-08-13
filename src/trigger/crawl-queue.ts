import { schedules, logger, queues } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { fetchMatchHistory } from "./fetch-match-history";

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

export const crawlQueue = schedules.task({
    id: "crawl-queue",
    //run every hour and check, if something still in queue skip
    cron: "0 * * * *", 
    run: async () => {
        const fetchMatchHistoryQueue = await queues.retrieve({type: "task", name: "fetch-match-history"});
        if(fetchMatchHistoryQueue.running > 0 || fetchMatchHistoryQueue.queued > 0){
            logger.log("previous batch still draining, skipping this cycle", {fetchMatchHistoryQueue});
            return;
        }
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const {data: summoners, error} = await supabase
            .from("tracked_summoners")
            .select("puuid")
            .in("tier", ["CHALLENGER", "GRANDMASTER"])
            .or(`last_crawled_at.is.null,last_crawled_at.lt.${oneDayAgo}`)
            .order("last_crawled_at", {ascending: true, nullsFirst: true})
            .limit(1000);        
        if(error){
            logger.log(`Supabase select failed: ${error.message}`);
            throw new Error(`Supabase select failed: ${error.message}`);
        }
        if (summoners.length === 0) {
            logger.log("Summoners are up to date (24hr cycle");
            return;
        }
        await fetchMatchHistory.batchTrigger(summoners.map(s => ({
            payload: {puuid: s.puuid}
        })));
    }
});