import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
const s=newCampaign(217,'guandu-200');let ever=false;
for(let guard=0;s.campaign.day<51&&guard<500&&!s.finished;guard++){
 if(s.campaign.phase==='planning')beginExecution(s);const result=advanceCampaignDay(s);if(result.encounter)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
 const third=s.campaign.battles.filter(b=>b.battle.sides.every(x=>x.faction!=='cao'));if(third.length&&!ever){console.log('first',s.campaign.day,third.map(b=>b.name));ever=true;}
 if(s.campaign.day===31)console.log('day31',s.campaign.battles.map(b=>[b.name,b.battle.sides.map(x=>x.faction)]),s.campaign.archive.length);
}
console.log('finished',s.campaign.day,ever,s.campaign.ai.decisions.slice(0,5));
