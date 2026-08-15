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

        const unitTally = new Map<string, {games: number; wins: number; top4: number; placementTotal: number}>();
        const itemTally = new Map<string, {games: number; wins: number; top4: number; placementTotal: number}>();
        const pairTally = new Map<string, {games: number; wins: number; top4: number; placementTotal: number}>();

        for(const board of playerBuild){
            for(const unit of board.units){

                //set up unit stats
                const unitKey = `${unit.character_id}`;
                if(!unitTally.has(unitKey)){
                    unitTally.set(unitKey, {games:0,wins:0,top4:0,placementTotal:0});
                }
                const unitCount = unitTally.get(unitKey)!;
                    unitCount.games += 1;
                    //riot returns top 4 as a win I want actual wins (1st)
                    if(board.placement===1){
                        unitCount.wins += 1;
                    }
                    if(board.win){
                        unitCount.top4 += 1;
                    }
                    unitCount.placementTotal += board.placement;

                //singleItem stats
                //dedupe so a unit with 2-3x the same item only counts once per game, not twice
                //because this is a single item stat it is fine to dedupe
                const singleItem = new Set(unit.itemNames);
                for(const item of singleItem){
                    const itemKey = `${unit.character_id}|${item}`;
                    if(!itemTally.has(itemKey)){
                        itemTally.set(itemKey, {games:0,wins:0,top4:0,placementTotal:0});
                    }
                    const entry = itemTally.get(itemKey)!;
                    entry.games += 1;
                    if(board.placement===1){
                        entry.wins += 1;
                    }
                    if(board.win){
                        entry.top4 += 1;
                    }
                    entry.placementTotal += board.placement;
                }

                //itemPair stats
                const itemCounts = new Map<string, number>();
                for(const name of unit.itemNames){
                    itemCounts.set(name,(itemCounts.get(name) ?? 0)+1);
                }
                const uniqueItems = Array.from(itemCounts.keys());
                const pairsPresent = new Set<string>();
                //if a unit uses 2+ of the same item
                for(const [name,count] of itemCounts){
                    if(count>=2){
                        pairsPresent.add(`${unit.character_id}|${name}|${name}`);
                    }
                }
                //if a unit has unique items
                for(let i=0; i<uniqueItems.length; i++){
                    for(let j=i+1; j<uniqueItems.length; j++){
                        const [a,b] = [uniqueItems[i],uniqueItems[j]].sort();
                        pairsPresent.add(`${unit.character_id}|${a}|${b}`);
                    }
                }
                for(const pair of pairsPresent){
                    if(!pairTally.has(pair)){
                        pairTally.set(pair, {games:0,wins:0,top4:0,placementTotal:0});
                    }
                    const pairEntry = pairTally.get(pair)!;
                    pairEntry.games += 1;
                    if(board.placement===1){
                        pairEntry.wins += 1;
                    }
                    if(board.win){
                        pairEntry.top4 += 1;
                    }
                    pairEntry.placementTotal += board.placement;
                }
            }
        }
        //upsert to unit_stats in supabase
        const unitStatRows = Array.from(unitTally.entries()).map(([character_id,stats]) => ({
            character_id,
            games_count: stats.games,
            wins_count: stats.wins,
            top4_count: stats.top4,
            avg_placement: Math.round((stats.placementTotal/stats.games)*100)/100,
            updated_at: new Date().toISOString()
        }));
        const {error: unitError} = await supabase
            .from("unit_stats")
            .upsert(unitStatRows, {onConflict: "character_id"});
        if(unitError){
            logger.log(`Supabase unit_stats upsert failed: ${unitError.message}`);
            throw new Error(`Supabase unit_stats upsert failed: ${unitError.message}`);
        }
        else{
            logger.log(`Supabase unit_stats upsert completed`)
        }

        //upsert for item_stats in supabase
        const itemStatsRows = Array.from(itemTally.entries()).map(([key,stats]) => {
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
        const {error: itemError} = await supabase
            .from("item_stats")
            .upsert(itemStatsRows, {onConflict: "character_id,item_name"});
        if(itemError){
            logger.log(`Supabase item_stats upsert failed: ${itemError.message}`);
            throw new Error(`Supabase item_stats upsert failed: ${itemError.message}`);
        }
        else{
            logger.log(`Supabase item_stats upsert completed`)
        }

        //upsert for item_pair_stats in supabase
        const itemPairRows = Array.from(pairTally.entries()).map(([key, stats]) => {
            const [character_id, item_a, item_b] = key.split("|");
            return{
                character_id,
                item_a,
                item_b,
                games_count: stats.games,
                wins_count: stats.wins,
                top4_count: stats.top4,
                avg_placement: Math.round((stats.placementTotal/stats.games) * 100)/100,
                updated_at: new Date().toISOString()
            };
        });
        const chunkSize = 500;
        for (let i = 0; i < itemPairRows.length; i += chunkSize) {
            const chunk = itemPairRows.slice(i, i + chunkSize);
            const {error: pairError} = await supabase
                .from("item_pair_stats")
                .upsert(chunk, {onConflict: "character_id,item_a,item_b"});

            if(pairError){
                logger.log(`Supabase item_pair_stats upsert failed: ${pairError.message}`);
                throw new Error(`Supabase item_pair_stats upsert failed: ${pairError.message}`);
            }
            else{
                logger.log(`Supabase ${chunkSize} item_pair_stats upsert completed`)
            }
        }
    }
});