import { schedules, logger } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";

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

//aggregates match_participants into per-(unit, item) pick rate / win rate / avg placement
//written to item_stats
export const itemStats = schedules.task({
    id: "item-stats",
    cron: "0 2-22/4 * * *",
    run: async() => {
        const playerBuild: {units:{character_id: string; itemNames: string[]}[]; placement: number; win: boolean} [] =[];
        //supabase caps a single select at ~1000 rows, so page through everything
        let page = 0;
        const pageSize = 1000;

        while(true){
            const {data, error} = await supabase
            .from("match_participants")
            .select("units, placement, win")
            .range(page,page+pageSize-1);

            if(error){
                logger.log(`Supabase select failed: ${error.message}`);
                throw new Error(`Supabase select failed: ${error.message}`);
            }
            if(data.length===0){
                break;
            }

            playerBuild.push(...data);
            page += pageSize;
        }

        const itemTally = new Map<string, {games: number; wins: number; top4: number; placementTotal: number}>();
        
        for(const board of playerBuild){
            for(const unit of board.units){
                //dedupe so a unit with 2x the same item only counts once per game, not twice
                //because this is a single item stat it is fine to dedupe
                const itemSet = new Set(unit.itemNames);
                for(const item of itemSet){
                    const key = `${unit.character_id}|${item}`
                    if(!itemTally.has(key)){
                        itemTally.set(key, {games:0,wins:0,top4:0,placementTotal:0});
                    }
                    const entry = itemTally.get(key)!;
                    entry.games += 1;
                    //riot returns top 4 as a win I want actual wins (1st)
                    if(board.placement===1){
                        entry.wins += 1;
                    }
                    if(board.win){
                        entry.top4 += 1;
                    }
                    entry.placementTotal += board.placement;
                }
            }
        }

        const itemStatsRows = Array.from(itemTally.entries()).map(([key,stats]) =>{
            const [character_id, item_name] = key.split("|");
            return {
                character_id,
                item_name,
                games_count: stats.games,
                wins_count: stats.wins,
                top4_count: stats.top4,
                avg_placement: Math.round((stats.placementTotal/stats.games)*100)/100,
                updated_at: new Date().toISOString()
            };
        });

        const {error: upsertError} = await supabase
            .from("item_stats")
            .upsert(itemStatsRows, {onConflict: "character_id,item_name"});

        if(upsertError){
            logger.log(`Supabase upsert failed: ${upsertError.message}`);
            throw new Error(`Supabase upsert failed: ${upsertError.message}`);
        }
    }
});