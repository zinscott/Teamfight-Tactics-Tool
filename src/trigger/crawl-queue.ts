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
    cron: "0/30 * * * *",
    run: async () => {
        const fetchMatchHistoryQueue = await queues.retrieve({type: "task", name: "fetch-match-history"});
        if(fetchMatchHistoryQueue.running > 0 || fetchMatchHistoryQueue.queued > 0){
            logger.log("previous batch still draining, skipping this cycle", {fetchMatchHistoryQueue});
            return;
        }
        const {data: summoners, error} = await supabase.from("tracked_summoners").select("puuid").not("tier","is","null").order("last_crawled_at", {ascending: true, nullsFirst: true}).limit(500);
        if(error){
            logger.log(`Supabase select failed: ${error.message}`);
            throw new Error(`Supabase select failed: ${error.message}`);
        }
        await fetchMatchHistory.batchTrigger(summoners.map(s => ({
            payload: {puuid: s.puuid}
        })));
    }
});