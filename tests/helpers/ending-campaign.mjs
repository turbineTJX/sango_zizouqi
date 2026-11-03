import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../../strategic-campaign.mjs';
import {conquerTreasures} from '../../treasures.mjs';

// Deliberately controlled terminal-day fixtures for UI/mechanism coverage.
// These are never evidence of natural AI unification.
export function endingCampaign(kind='victory'){
 const s=newCampaign(41,'guandu-200','cao',{allAI:kind==='observer'});s.armies=[];
 for(const city of s.cities){city.owner=kind==='victory'?'cao':'yuan';city.governor=null;}
 const winner=kind==='victory'?'cao':'yuan';
 for(const faction of Object.keys(s.campaign.ai.factions))if(faction!==winner)conquerTreasures(s,faction,winner,'terminal-fixture:'+faction);
 beginExecution(s);advanceCampaignDay(s);
 // This terminal fixture changes ownership directly, so settle any treasury
 // handed back by the displaced personnel through the same conquest handler.
 for(const faction of new Set(s.campaign.treasures.items.map(t=>t.factionId)))if(faction&&faction!==winner)conquerTreasures(s,faction,winner,'terminal-personnel:'+faction);
 return validateCampaign(JSON.parse(serializeCampaign(s)));
}
