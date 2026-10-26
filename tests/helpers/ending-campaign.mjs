import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../../strategic-campaign.mjs';

// Deliberately controlled terminal-day fixtures for UI/mechanism coverage.
// These are never evidence of natural AI unification.
export function endingCampaign(kind='victory'){
 const s=newCampaign(41,'guandu-200','cao',{allAI:kind==='observer'});s.armies=[];
 for(const city of s.cities){city.owner=kind==='victory'?'cao':'yuan';city.governor=null;}
 beginExecution(s);advanceCampaignDay(s);
 return validateCampaign(JSON.parse(serializeCampaign(s)));
}
