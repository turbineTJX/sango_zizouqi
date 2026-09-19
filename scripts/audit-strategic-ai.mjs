import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const finalDay=Number(process.argv[2]||61),rows=[];
await mkdir('outputs/national-campaign',{recursive:true});
for(const id of (process.argv[3]?[process.argv[3]]:['guandu-200','heroes-251'])){
 const s=newCampaign(417,id);let guard=0;
 while(s.campaign.day<finalDay&&!s.finished&&guard++<finalDay*8){
  if(s.campaign.phase==='planning'){try{validateCampaign(JSON.parse(serializeCampaign(s)));}catch(error){await writeFile(`outputs/national-campaign/${id}-failed-save.json`,serializeCampaign(s));console.log('INVALID',s.campaign.day,s.armies.filter(a=>(a.travel||a.route.length)&&a.units.length>10||a.units.filter(u=>u.first).length>6||a.supply>a.supplyCapacity).map(a=>({id:a.id,units:a.units.length,first:a.units.filter(u=>u.first).length,task:a.task,supply:a.supply,capacity:a.supplyCapacity,route:a.route,location:a.location})));throw error;}const row={id,day:s.campaign.day,battles:s.campaign.battles.length,archived:s.campaign.archive.length,active:activeBattles(s).length,cities:Object.fromEntries([...new Set(s.cities.map(c=>c.owner))].map(f=>[f,s.cities.filter(c=>c.owner===f).length])),orders:s.campaign.ai.decisions.reduce((o,d)=>(o[d.kind]=(o[d.kind]||0)+1,o),{}),marching:s.armies.filter(a=>a.route.length).length,saveChars:serializeCampaign(s).length};rows.push(row);console.log(JSON.stringify(row));beginExecution(s);}
  advanceCampaignDay(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
 }
 validateCampaign(JSON.parse(serializeCampaign(s)));console.log(JSON.stringify({id,completedDay:s.campaign.day,saveChars:serializeCampaign(s).length,archived:s.campaign.archive.length,passed:true}));await writeFile(`outputs/national-campaign/${id}-audit-save.json`,serializeCampaign(s));
}
await writeFile('outputs/national-campaign/ai-audit.json',JSON.stringify(rows,null,2));
