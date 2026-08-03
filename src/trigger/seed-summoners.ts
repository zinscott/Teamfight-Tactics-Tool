import {task, logger} from "@trigger.dev/sdk";

async function fetchTierCount(tier: string) {
    if(!process.env.RIOT_API_KEY){
        throw new Error(`Incorrect Riot API Key`);
    }
    const response = await fetch(`https://na1.api.riotgames.com/tft/league/v1/${tier}`, {headers: {"X-Riot-Token": process.env.RIOT_API_KEY}});
    if(!response.ok){
        throw new Error(`Riot API returned ${response.status}`);
    }
    const data = await response.json();
    return data.entries.length;
}

async function fetchDiamondCount(division: string) {
    if (!process.env.RIOT_API_KEY) {
      throw new Error(`Incorrect Riot API Key`);
    }
  
    let page = 1;
    let total = 0;
  
    while (true) {
      const url = `https://na1.api.riotgames.com/tft/league/v1/entries/DIAMOND/${division}?page=${page}`;
      const response = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY } });
      if (!response.ok) {
        throw new Error(`Riot API returned ${response.status}`);
      }
      const entries = await response.json();
      if (entries.length === 0) {
        break;
      }
      total += entries.length;
      page++;
    }
  
    return total;
  }
  

export const seedSummonersTask = task({
    id: "seed-summoners",
    run: async () => {
        const chalData = await fetchTierCount("challenger");
        logger.log(`Challenger count: ${chalData}`);
        const gmData = await fetchTierCount("grandmaster");
        logger.log(`Grand Master count: ${gmData}`);
        const masData = await fetchTierCount("master");
        logger.log(`Master count: ${masData}`);
        const d1Data = await fetchDiamondCount("I");
        logger.log(`Diamond 1 count: ${d1Data}`);
        const d2Data = await fetchDiamondCount("II");
        logger.log(`Diamond 2 count: ${d2Data}`);
        const d3Data = await fetchDiamondCount("III");
        logger.log(`Diamond 3 count: ${d3Data}`);
        const d4Data = await fetchDiamondCount("IV");
        logger.log(`Diamond 4 count: ${d4Data}`);
    }
})
