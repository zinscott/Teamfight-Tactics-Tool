import {wait} from "@trigger.dev/sdk";

//helper function to fetch the Riot API URL with auth
export async function riotFetch(url: string) {
    while(true){
        if(!process.env.RIOT_API_KEY){
            throw new Error(`Incorrect Riot API Key`);
        }
        const response = await fetch(url, {headers: {"X-Riot-Token": process.env.RIOT_API_KEY}});
        //on 429 wait for retryAfter and automatically retry instead of throw
        if(response.status===429){
            const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
            await wait.for({seconds: retryAfter});
            continue;
        }
        if(!response.ok){
            throw new Error(`Riot API returned ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
}