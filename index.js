require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default;
const app = express();
const PORT = process.env.PORT || 3000; 
const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;
console.log('API Key loaded:', BUNGIE_API_KEY ? 'Yes' : 'No');
const API_ROOT_PATH = "https://www.bungie.net/Platform";

app.use(express.json()); 

app.use(cors({
    origin: 'http://localhost:5173'
}));

app.get('/', (req, res) => res.send('Hello World! This is your D2 Backend.'));


app.get('/api/search-player/:displayNamePrefix', async (req, res) => {
    const displayNamePrefix = req.params.displayNamePrefix; 

    const url = `${API_ROOT_PATH}/User/Search/Prefix/${displayNamePrefix}/0/`; 

    if (!BUNGIE_API_KEY) {
        console.error("Bungie API Key is not set in .env file.");
        return res.status(500).json({ error: "Backend API Key not configured." });
    }

    try {
        const bungieResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': BUNGIE_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!bungieResponse.ok) {
            const errorText = await bungieResponse.text();
            console.error(`Bungie API Error: ${bungieResponse.status} - ${errorText}`);
            return res.status(bungieResponse.status).json({ error: "Failed to fetch data from Bungie API", details: errorText });
        }

        const data = await bungieResponse.json();
        res.json(data); 

    } catch (error) {
        console.error("Backend error during player search:", error);
        res.status(500).json({ error: "Internal server error during player search." });
    }
});


// In d2-backend/index.js, replace the entire player-full-profile endpoint
app.post('/api/player-full-profile', async (req, res) => {
    const { displayName, displayNameCode } = req.body;

    if (!BUNGIE_API_KEY) {
        return res.status(500).json({ error: "Backend API Key not configured." });
    }

    try {
        const searchUrl = `${API_ROOT_PATH}/Destiny2/SearchDestinyPlayerByBungieName/-1/`;
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: { 'X-API-Key': BUNGIE_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, displayNameCode })
        });

        if (searchResponse.status === 204 || !searchResponse.ok) {
            return res.status(404).json({ error: `Could not find Bungie account for ${displayName}.` });
        }

        const searchData = await searchResponse.json();
        const allMemberships = searchData.Response;

        if (!allMemberships || allMemberships.length === 0) {
            return res.status(404).json({ error: "Player has no linked Destiny memberships." });
        }

        // We will try each platform in this priority order until one gives us a valid profile WITH characters.
        const platformPriority = [2, 1, 3]; // Priority: 1st=PSN, 2nd=Xbox, 3rd=Steam

        for (const platformType of platformPriority) {
            const profileToTry = allMemberships.find(dm => dm.membershipType === platformType);
            
            if (!profileToTry) continue;

            console.log(`Attempting to fetch profile for ${displayName} on platform type ${platformType}...`);
            const profileUrl = `${API_ROOT_PATH}/Destiny2/${profileToTry.membershipType}/Profile/${profileToTry.membershipId}/?components=100,200`;
            const profileResponse = await fetch(profileUrl, { headers: { 'X-API-Key': BUNGIE_API_KEY } });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();

                // --- ADDED THIS BLOCK TO SEE YOUR RAW DATA ---
                if (displayName === "RedPhantom728") {
                    console.log("--- RedPhantom728 RAW PROFILE DATA ---");
                    console.log(JSON.stringify(profileData, null, 2));
                }
                // --- END OF ADDED BLOCK ---

                if (profileData.Response?.characters?.data) { 
                    console.log(`SUCCESS! Found working profile for ${displayName} on platform type ${platformType}.`);
                    
                    return res.json({
                        bungieGlobalDisplayName: profileToTry.bungieGlobalDisplayName,
                        bungieGlobalDisplayNameCode: profileToTry.bungieGlobalDisplayNameCode,
                        destinyMembership: profileToTry,
                        profileData: profileData.Response
                    });
                }
            }
            console.log(`Failed to get a valid profile for ${displayName} on platform type ${platformType}.`);
        }
        
        return res.status(404).json({ error: `Could not find a valid, working profile for ${displayName} on any linked platform.` });

    } catch (error) {
        console.error(`Backend error for ${displayName}:`, error);
        res.status(500).json({ error: "Internal server error during full profile fetch." });
    }
});




app.get('/api/deep-activity-search/:membershipType/:membershipId/:characterId', async (req, res) => {
    const { membershipType, membershipId, characterId } = req.params;

    const BUNGIE_API_ROOT = "https://stats.bungie.net/Platform";
    const MAX_SEARCH_PAGES = 50; 

    const findLastMatchesForMode = async (modeId, requiredCount) => {
        let foundActivities = [];
        let currentPage = 0;
        
        console.log(`Starting deep search for mode ${modeId}, seeking ${requiredCount} matches...`);

        while (foundActivities.length < requiredCount && currentPage < MAX_SEARCH_PAGES) {
            const url = `${BUNGIE_API_ROOT}/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/ActivityHistory/?mode=${modeId}&count=250&page=${currentPage}`;
            
            try {
                const response = await fetch(url, { headers: { 'X-API-Key': BUNGIE_API_KEY } });
                
                // We only truly fail if there's a server error or bad request.
                // An empty page is not a failure.
                if (response.status >= 400) {
                     console.error(`Bungie API returned error ${response.status} for page ${currentPage}, mode ${modeId}. Stopping search for this mode.`);
                     break;
                }

                const pageData = await response.json();
                const activities = pageData?.Response?.activities;

                if (!activities || activities.length === 0) {
                    console.log(`No more activities found for mode ${modeId} at page ${currentPage}. History exhausted.`);
                    break; 
                }

                console.log(`Found ${activities.length} activities on page ${currentPage} for mode ${modeId}.`);
                foundActivities.push(...activities);

            } catch (e) {
                console.error(`Error fetching page ${currentPage} for mode ${modeId}`, e);
                break;
            }
            currentPage++;
        }
        
        console.log(`Deep search for mode ${modeId} finished. Found ${foundActivities.length} total matches.`);
        return foundActivities.slice(0, requiredCount);
    };

    try {
        const [ibMatches, trialsMatches, compMatches, overallMatches] = await Promise.all([
            findLastMatchesForMode(19, 10), // Iron Banner
            findLastMatchesForMode(84, 10), // Trials of Osiris
            findLastMatchesForMode(81, 10), // Competitive
            findLastMatchesForMode(5, 20)   // Overall PvP
        ]);

        const modesToCalculate = {
            ironBanner: ibMatches,
            trials: trialsMatches,
            competitive: compMatches,
            overallPvp: overallMatches
        };

        const calculatedStats = {};

        for (const [modeName, activities] of Object.entries(modesToCalculate)) {
            if (!activities || activities.length === 0) {
                calculatedStats[modeName] = { kda: 'N/A', kd: 'N/A', winRate: 'N/A' };
                continue;
            }

            let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalWins = 0;
            activities.forEach(activity => {
                const stats = activity.values;
                totalKills += stats.kills.basic.value;
                totalDeaths += stats.deaths.basic.value;
                totalAssists += stats.assists.basic.value;
                if (stats.standing.basic.value === 0) {
                    totalWins++;
                }
            });

            const kd = (totalDeaths === 0 ? totalKills : totalDeaths).toFixed(2);
            const kda = (totalDeaths === 0 ? (totalKills + totalAssists) : (totalKills + totalAssists) / totalDeaths).toFixed(2);
            const winRate = ((totalWins / activities.length) * 100).toFixed(0);
            
            calculatedStats[modeName] = { kda, kd, winRate };
        }
        
        res.json(calculatedStats);

    } catch (error) {
        console.error("Backend error during deep activity search:", error);
        res.status(500).json({ error: "Internal server error during deep activity search." });
    }
});









app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
