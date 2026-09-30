import {writeFileSync,mkdirSync} from 'node:fs';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';

const label=process.argv[2]||'current',end=Number(process.argv[3]||61),rows=[];
for(const scenario of ['guandu-200','heroes-251'])for(const seed of [417,643]){
 const s=newCampaign(seed,scenario),plans=new Set(),battles=new Set(),attacks=new Map();let calls=0;
 while(s.campaign.day<end&&!s.finished&&calls++<end*20){
  if(s.campaign.phase==='planning')beginExecution(s);
  advanceCampaignDay(s);
  for(const p of s.campaign.ai.plans){plans.add(p.id);if(p.phase==='attack'&&!attacks.has(p.id))attacks.set(p.id,{faction:p.faction,day:s.campaign.day,units:p.officerIds.length});}
  for(const b of s.campaign.battles)battles.add(b.id);
  for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
 }
 validateCampaign(JSON.parse(serializeCampaign(s)));
 const row={scenario,seed,day:s.campaign.day,plans:plans.size,attacks:attacks.size,battles:battles.size,departures:[...attacks.values()]};rows.push(row);console.log(JSON.stringify(row));
}
mkdirSync('outputs/strategic-pacing',{recursive:true});
writeFileSync(`outputs/strategic-pacing/${label}.json`,JSON.stringify(rows,null,2));
