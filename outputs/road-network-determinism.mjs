import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
function toDay(s,day){for(let guard=0;s.campaign.day<day&&guard<300&&!s.finished;guard++){if(s.campaign.phase==='planning')beginExecution(s);const result=advanceCampaignDay(s);if(result.encounter)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}return s;}
for(const scenario of ['guandu-200','heroes-251']){
 const s=newCampaign(217,scenario);toDay(s,6);validateCampaign(JSON.parse(serializeCampaign(s)));const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 toDay(s,51);toDay(copy,51);const a=serializeCampaign(s),b=serializeCampaign(copy);let i=0;while(i<a.length&&a[i]===b[i])i++;
 console.log(scenario,s.campaign.day,copy.campaign.day,a.length,b.length,a===b,i,a.slice(Math.max(0,i-100),i+100),b.slice(Math.max(0,i-100),i+100));
 try{validateCampaign(JSON.parse(a));console.log('valid')}catch(e){console.log(e.stack)}
}
