require('dotenv').config();
const express=require('express');
const cors=require('cors');
const fetch=require('node-fetch').default;
const app= express();

const PORT= process.env.PORT || 3000;
const BUNGIE_API_KEY= process.env.BUNGIE_API_KEY;
const API_ROOT_PATH= "https://www.bungie.net/Platform";

app.use(express.json());
app.use(cors({origin:'http://localhost:5173'}));

app.get('/',(req,res)=>res.send("Your D2 backend server is up and running"));

app.post('/api/player-full-profile', async (req, res) => {
    const { displayName, displayNameCode } = req.body;
    try {
        const searchUrl = `${API_ROOT_PATH}/Destiny2/SearchDestinyPlayerByBungieName/-1/`;
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: { 'X-API-Key': BUNGIE_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, displayNameCode })
        });

        if (searchResponse.status == 204 || !searchResponse.ok) {
            return res.status(404).json({ error: `Could not find bungie account for ${displayName}.` });
        }

        const searchData = await searchResponse.json();
        const allMemberships = searchData.Response;

        if (!allMemberships || allMemberships.length === 0) {
            return res.status(404).json({ error: "Player has no linked Destiny memberships." });
        }

        const primaryPlatform = allMemberships.find(dm=>dm.crossSaveOverride!==0);
        const selectedDestinyMembership = primaryPlatform || allMemberships[0];

        if(!selectedDestinyMembership){
            return res.status(404).json({error:"Player has no linked Destiny Accounts."});
        }

        console.log(`Success! Found primary account for ${displayName} on platform type:`, selectedDestinyMembership);

        const profileUrl = `${API_ROOT_PATH}/Destiny2/${selectedDestinyMembership.membershipType}/Profile/${selectedDestinyMembership.membershipId}/?components=100,200`;
        const profileResponse = await fetch(profileUrl, { headers: { 'X-API-Key': BUNGIE_API_KEY } });

        if (!profileResponse.ok) {
            return res.status(404).json({ error: `Could not retrieve profile data for selected profile.` });
        }
                
        const profileData = await profileResponse.json();
        
  
        console.log(`Full profile data received for ${displayName}. Character IDs can be found in characters.data below:`);
        console.log(JSON.stringify(profileData.Response, null, 2));
                
        return res.json({
            bungieGlobalDisplayName: selectedDestinyMembership.bungieGlobalDisplayName,
            bungieGlobalDisplayNameCode: selectedDestinyMembership.bungieGlobalDisplayNameCode,
            destinyMembership: selectedDestinyMembership,
            profileData: profileData.Response
        });

    } 
    catch (error) {
        console.error(`Backend error for ${displayName}:`, error);
        res.status(500).json({ error: "Internal Server error during full profile fetch." });
    }
});







app.get('/api/historical-stats/:membershipType/:membershipId', async (req, res) => {
    const { membershipType, membershipId } = req.params;
    const url = `${API_ROOT_PATH}/Destiny2/${membershipType}/Account/${membershipId}/Character/0/Stats/?modes=5,19,37,84&groups=1`;

    console.log(`Requesting historical stats from: ${url}`);

    try {
        const bungieResponse = await fetch(url, { headers: { 'X-API-Key': BUNGIE_API_KEY } });
        if (!bungieResponse.ok) {
            console.error(`Bungie API error for ${membershipId}: ${bungieResponse.status}`);
            return res.status(bungieResponse.status).json({ error: 'Failed to fetch lifetime stats from Bungie.' });
        }

        const data = await bungieResponse.json();
        if (!data.Response || Object.keys(data.Response).length === 0) {
            console.log(`No historical stats found for player ${membershipId}. Returning N/A.`);
            return res.json({
                ironBanner: { kda: 'N/A', kd: 'N/A', winRate: 'N/A' },
                trials: { kda: 'N/A', kd: 'N/A', winRate: 'N/A' },
                competitive: { kda: 'N/A', kd: 'N/A', winRate: 'N/A' },
                overallPvp: { kda: 'N/A', kd: 'N/A', winRate: 'N/A' }
            });
        }
        
        const stats = data.Response;
        const calculatedStats = {};
        
        const modeMap = {
            ironBanner: 'ironbanner',
            trials: 'trialsofosiris',
            competitive: 'survival', 
            allPvP: 'allpvp'
        };

        Object.keys(modeMap).forEach(ourKey => {
            const bungieKey = Object.keys(stats).find(key => key.toLowerCase().includes(modeMap[ourKey]));
            const modeStats = bungieKey ? stats[bungieKey]?.allTime : null;

            let kda = 'N/A', kd = 'N/A', winRate = 'N/A';
            if (modeStats && modeStats.activitiesEntered?.basic.value > 0) {
                const kills = modeStats.kills?.basic.value || 0;
                const deaths = modeStats.deaths?.basic.value || 0;
                const assists = modeStats.assists?.basic.value || 0;
                const wins = modeStats.activitiesWon?.basic.value || 0;
                const totalGames = modeStats.activitiesEntered?.basic.value;
                
                kd = (deaths === 0 ? kills : kills / deaths).toFixed(2);
                kda = (deaths === 0 ? (kills + assists) : (kills + assists) / deaths).toFixed(2);
                winRate = ((wins / totalGames) * 100).toFixed(0);
            }
            

            const finalKey = ourKey === 'allPvP' ? 'overallPvp' : ourKey;
            calculatedStats[finalKey] = { kda, kd, winRate };
        });
        
        console.log(`Successfully processed stats for ${membershipId}:`, calculatedStats);
        res.json(calculatedStats);

    } catch (error) {
        console.error(`Backend error during historical stats fetch for ${membershipId}:`, error);
        res.status(500).json({ error: "Internal server error during historical stats fetch." });
    }
});


app.listen(PORT, () => {
    console.log(`Server ready on http://localhost:${PORT}`);
});