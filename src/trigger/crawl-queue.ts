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
    //run every 4 hours and check, if something still in queue skip
    cron: "0 */4 * * *", 
    run: async () => {
        const fetchMatchHistoryQueue = await queues.retrieve({type: "task", name: "fetch-match-history"});
        if(fetchMatchHistoryQueue.running > 0 || fetchMatchHistoryQueue.queued > 0){
            logger.log("previous batch still draining, skipping this cycle", {fetchMatchHistoryQueue});
            return;
        }

        const { data: latestMatch } = await supabase
            .from("match_history")
            .select("game_version")
            .order("game_datetime", {    ascending: false })
            .limit(1)
            .maybeSingle();

        const latestPatch = latestMatch?.game_version.match(/<Releases\/([\d.]+)>/)?.[1] ?? null;

        const { data: patchState } = await supabase
            .from("patch_number")
            .select("current_patch")
            .eq("id", 1)
            .maybeSingle();

        if (latestPatch && patchState?.current_patch && latestPatch !== patchState.current_patch) {
            logger.log(`Patch changed ${patchState.current_patch} -> ${latestPatch}, resetting all data`);
            await supabase.rpc("reset_patch_data");
            await supabase.from("patch_number").update({ current_patch: latestPatch }).eq("id", 1);
        } 
        else if (latestPatch && !patchState?.current_patch) {
            // first run ever - just record the baseline, nothing to reset yet
            await supabase.from("patch_number").update({ current_patch: latestPatch }).eq("id", 1);
        }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const {data: summoners, error} = await supabase
            .from("tracked_summoners")
            .select("puuid")
            .in("tier", ["CHALLENGER", "GRANDMASTER"])
            .or(`last_crawled_at.is.null,last_crawled_at.lt.${oneDayAgo}`)
            .order("last_crawled_at", {ascending: true, nullsFirst: true})
            .limit(250);

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