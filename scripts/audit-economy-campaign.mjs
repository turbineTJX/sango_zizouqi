import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,findCampaignRoute,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './automatic-domestic-campaign.mjs';
import {fillFactionAppointments} from '../faction-affairs.mjs';

const results=[];await mkdir('outputs/economy-campaign',{recursive:true});
for(const seed of [1709,2027]){
 const s=newCampaign(seed,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang');
 const units=home.units.filter(u=>u.troops>0).slice(0,6),ids=units.map(u=>u.id);
 fillFactionAppointments(s);
 const target=s.cities.find(c=>c.id==='ye');if(target.owner===home.owner||!target.units.some(u=>u.troops>0)||!findCampaignRoute(s,home.id,target.id,home.owner))throw Error('Audit requires a reachable, genuinely defended hostile city');
 const initialExpedition={units:units.length,troops:units.map(u=>u.troops),target:target.id};
 const error=launchExpedition(s,{kind:'expedition',cityId:home.id,officerIds:ids,leader:ids[0],advisor:units.reduce((best,u)=>u.intellect>best.intellect?u:best).id,target:target.id,policy:'auto'});
 if(error)throw Error(error);
 const departures=new Map(),samples=[];let guard=0;
 while(s.campaign.day<121&&!s.finished&&guard++<1500){
  if(s.campaign.phase==='planning'){
   validateCampaign(JSON.parse(serializeCampaign(s)));
   samples.push({day:s.campaign.day,gold:s.gold,grain:home.grain,manpower:home.manpower,men:home.units.reduce((n,u)=>n+u.troops,0)});
   beginExecution(s);
  }
  for(const a of s.armies.filter(a=>!a.defense&&!a.disbanded))if(!departures.has(a.id))departures.set(a.id,{id:a.id,faction:a.faction,day:s.campaign.day,home:a.homeCity,units:a.units.length,troops:a.units.map(u=>u.troops),total:a.units.reduce((n,u)=>n+u.troops,0)});
  for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
  advanceCampaignDay(s);
 }
 if(guard>=1500)throw Error('Campaign did not advance');
 const saved=serializeCampaign(s),restored=validateCampaign(JSON.parse(saved));
 if(serializeCampaign(restored)!==saved)throw Error('Save changed on load');
 const row={seed,day:s.campaign.day,initialExpedition,departures:[...departures.values()],samples,settled:s.campaign.battles.filter(b=>b.settled).length+s.campaign.archive.length,active:activeBattles(s).length,transports:s.campaign.ai.decisions.filter(d=>d.kind==='transport').length,passed:true};
 results.push(row);console.log(JSON.stringify(row));
 await writeFile(`outputs/economy-campaign/${seed}-save.json`,saved);
}
await writeFile('outputs/economy-campaign/results.json',JSON.stringify(results,null,2));
if(results.some(r=>r.settled+r.active===0))process.exitCode=1;
