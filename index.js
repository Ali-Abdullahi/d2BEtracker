require('dotenv').config();
const express= require('express');
const cors= require('cors')
const app= express();
const port= 4001;
app.use(express.json());
const API_ROOT_PATH= 'https://www.bungie.net/Platform';
const key= process.env.BUNGIE_API_KEY

const cleanMatch=(match)=>{
    return{
        date:match.period,
        KDA:match.values.efficiency.basic.displayValue
    };
}

const cleanAllTimeStats = (data) => {
    const stats = data.Response.mergedAllCharacters.results.allPvP.allTime;

    return {
        lifetimeKD: stats.killsDeathsRatio.basic.displayValue,
        lifetimeKDA: stats.efficiency.basic.displayValue,
        winRate: (parseFloat(stats.winLossRatio.basic.value) * 100).toFixed(1) + "%"
    };
};

app.use(cors({ origin: 'http://localhost:5173' }));


app.use((req,res,next)=>{
    console.log(`Listening for incoming requests ${req.method}, ${req.url}`);
    next();
})
// Get membership ids
app.post("/search-player/",async(req,res)=>{
    const displayName="Yellowflash3454";
    const displayNameCode=7726;
    try{
        const response= await fetch(`${API_ROOT_PATH}/Destiny2/SearchDestinyPlayerByBungieName/All/`,{
            method:'POST',
            headers:{'X-API-KEY':key, 'Content-Type': 'application/json'},
            body: JSON.stringify({displayName:displayName, displayNameCode:displayNameCode})
        })
        if(!response.ok){
            console.log("Was not able to find displayName and code in Bungie Servers", response.status);
            return res.status(404); //Not connecting to frontend yet so no reason for .send()
        }
        const data= await response.json();
        console.log("Successfully found membershipID for: ",displayName,"#",displayNameCode)
        res.json(data);
    }
    catch(error){
        console.log("Error:",error);
        res.status(500).send();

    }
})
//Get character ids
app.get("/get-char-ids/:mType/:mId",async(req,res)=>{
    const { mType, mId } = req.params;
    try{
        const response= await fetch(`${API_ROOT_PATH}/Destiny2/${mType}/Profile/${mId}/?components=Profiles`,{
            headers:{'X-API-KEY': key}
        })
        if(!response.ok){
            console.log("Error:",response.error);
            return res.status(400).send("Error:", error);
        }
        const data= await response.json();
        const charIds= data.Response.profile.data.characterIds;
        res.send({
            characters:charIds
        });
    }
    catch(error){
        console.log("Something crashed while accessing bungie servers:",error);
        res.status(500);
    }
})

 // Most recent 10 games of trials account wide
app.get("/get-Trials-stats/:mType/:mId/:charIds",async(req,res)=>{
    const{mType,mId,charIds}= req.params;
    const charArray = charIds.split(',');
    try{
        const response= await Promise.all(charArray.map(id=> fetch(`${API_ROOT_PATH}/Destiny2/${mType}/Account/${mId}/Character/${id}/Stats/Activities/?count=10&mode=84`,{headers:{ 'X-API-KEY': key }})))


        if (response.some(r => !r.ok)) {
            return res.status(400).send("Bungie account or Character not found");
        }
        const data= await Promise.all(response.map(r=>r.json()));

        const matches= data.flatMap(m=>m.Response.activities || [])

        const cleanedMatches= matches.map(cleanMatch);
        cleanedMatches.sort((a,b)=> new Date(b.date)- new Date(a.date));
        const rec_10= cleanedMatches.slice(0,10);
        const totalKDA = rec_10.reduce((sum, match) => sum + parseFloat(match.KDA), 0);
        const averageKDA = rec_10.length > 0 ? (totalKDA / rec_10.length).toFixed(2) : "0.00";
        res.json({'averageKDA': averageKDA, 'gamesCounted': rec_10.length, 'history':rec_10})
    }
    catch(error){
        console.log("Server crashed while looking for account:", error);
        res.status(500).send("Server crashed on Bungies end.")
    }

})

 // Most recent 10 games of Iron Banner account wide
 app.get("/get-IB-stats/:mType/:mId/:charIds",async(req,res)=>{
    const{mType,mId,charIds}= req.params;
    const charArray = charIds.split(',');
    try{
        const response= await Promise.all(charArray.map(id=> fetch(`${API_ROOT_PATH}/Destiny2/${mType}/Account/${mId}/Character/${id}/Stats/Activities/?count=10&mode=19`,{headers:{ 'X-API-KEY': key }})))


        if (response.some(r => !r.ok)) {
            return res.status(400).send("Bungie account or Character not found");
        }
        const data= await Promise.all(response.map(r=>r.json()));

        const matches= data.flatMap(m=>m.Response.activities || [])

        const cleanedMatches= matches.map(cleanMatch);
        cleanedMatches.sort((a,b)=> new Date(b.date)- new Date(a.date));
        const rec_10= cleanedMatches.slice(0,10);
        const totalKDA = rec_10.reduce((sum, match) => sum + parseFloat(match.KDA), 0);
        const averageKDA = rec_10.length > 0 ? (totalKDA / rec_10.length).toFixed(2) : "0.00";
        res.json({'averageKDA': averageKDA, 'gamesCounted': rec_10.length, 'history':rec_10})
    }
    catch(error){
        console.log("Server crashed while looking for account:", error);
        res.status(500).send("Server crashed on Bungies end.")
    }

})

// Most recent 10 games of pvp Competitive account wide
app.get("/get-Comp-stats/:mType/:mId/:charIds",async(req,res)=>{
    const{mType,mId,charIds}= req.params;
    const charArray = charIds.split(',');
    try{
        const response= await Promise.all(charArray.map(id=> fetch(`${API_ROOT_PATH}/Destiny2/${mType}/Account/${mId}/Character/${id}/Stats/Activities/?count=10&mode=69`,{headers:{ 'X-API-KEY': key }})))


        if (response.some(r => !r.ok)) {
            return res.status(400).send("Bungie account or Character not found");
        }
        const data= await Promise.all(response.map(r=>r.json()));

        const matches= data.flatMap(m=>m.Response.activities || [])

        const cleanedMatches= matches.map(cleanMatch);
        cleanedMatches.sort((a,b)=> new Date(b.date)- new Date(a.date));
        const rec_10= cleanedMatches.slice(0,10);
        const totalKDA = rec_10.reduce((sum, match) => sum + parseFloat(match.KDA), 0);
        const averageKDA = rec_10.length > 0 ? (totalKDA / rec_10.length).toFixed(2) : "0.00";
        res.json({'averageKDA': averageKDA, 'gamesCounted': rec_10.length, 'history':rec_10})
    }
    catch(error){
        console.log("Server crashed while looking for account:", error);
        res.status(500).send("Server crashed on Bungies end.")
    }

})
//All time stats for Kd, Kda, Win%
app.get("/allTime-Stats/:mType/:mId",async(req,res)=>{
    const{mType,mId}= req.params;
    try{
        const response= await fetch(`${API_ROOT_PATH}/Destiny2/${mType}/Account/${mId}/Stats/?groups=General`,{headers:{'X-API-KEY':key}})
        if(!response.ok){
            console.log("All time stats not found",error)
            return res.status(404).send();
        }
        const data= await response.json();
        const cleanData= cleanAllTimeStats(data)
        res.json(cleanData);
    }
    catch(error){
        console.log("Server crashed while looking for All Time stats", error);
        res.status(500).send();
    }

})





app.listen(port,()=>{
    console.log("The D2 Tracker is up and running!")
})