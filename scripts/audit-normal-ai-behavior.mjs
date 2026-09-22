import {residentOfficer} from '../city-personnel.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';
import {ACTIONS,domesticOfficer} from '../domestic.mjs';
const days=Number(process.argv[2]||121),seed=Number(process.argv[3]||417),dir=process.argv[4]||`outputs/normal-ai-audit-${seed}`;
await mkdir(dir,{recursive:true});
const results=[];
// Rotate the human slot so every playable faction is observed under normal AI.
// The human faction issues no orders; encounters use the real delegated engine.
for(const spec of NATIONAL_SCENARIOS.filter(s=>!process.argv[5]||s.id===process.argv[5]))for(const player of (process.argv[6]?[process.argv[6]]:['cao','yuan'])){
 const s=newCampaign(seed,spec.id,player),factions=Object.keys(s.campaign.ai.factions),seenEvents=new Set(),seenDecisions=new Set(),seenBattles=new Set(),seenPlans=new Set(),issues=[];
 const metrics=Object.fromEntries(factions.map(f=>[f,{name:NATIONAL_FACTIONS[f].name,startCities:s.cities.filter(c=>c.owner===f).length,completed:0,failed:0,interrupted:0,assignments:0,directions:{},decisions:{},captures:0,losses:0,battles:0,wins:0,defeats:0,plans:0,hungryArmyDays:0,hungryCityDays:0}]));
 let owners=new Map(s.cities.map(c=>[c.id,c.owner])),lastDay=0,guard=0,lastPrinted=0;
 const shortages=[],expeditions=[],seenArmies=new Set(),planTrace=[],battleTrace=[],queueTrace=[],seenQueues=new Set(),planVersions=new Map();
 const sample=()=>{
  for(const p of s.campaign.ai.plans){const key=JSON.stringify([p.phase,p.reason]);if(planVersions.get(p.id)===key)continue;planVersions.set(p.id,key);planTrace.push({...structuredClone(p),observedDay:s.campaign.day,actors:p.officerIds.map(id=>{const o=residentOfficer(s,id),a=s.armies.find(a=>a.units.some(u=>u.id===id));return structuredClone({id,location:o?.location||a?.location,army:a?.id,travel:a?.travel,route:a?.route,troops:o?.unit.troops??a?.units.find(u=>u.id===id)?.troops,mission:o?.unit.mission?.kind});})});}
  for(const q of s.campaign.domestic.orders){const key=q.id+':'+s.campaign.day;if(!seenQueues.has(key)){seenQueues.add(key);queueTrace.push({day:s.campaign.day,...structuredClone(q)});}}

  for(const a of s.armies)if(metrics[a.faction]&&a.task==='择敌出征'&&!seenArmies.has(a.id)){seenArmies.add(a.id);expeditions.push({day:s.campaign.day,faction:a.faction,armyId:a.id,units:a.units.length,men:a.units.reduce((n,u)=>n+u.troops,0),wounded:a.units.reduce((n,u)=>n+u.wounded,0),target:a.target,origin:a.homeCity});}
  for(const e of s.campaign.domestic.events)if(!seenEvents.has(e.id)){seenEvents.add(e.id);const m=metrics[e.faction];if(!m)continue;if(e.phase==='complete'){m.completed++;const key=e.result?.key||e.text;m.directions[key]=(m.directions[key]||0)+1;}if(e.phase==='failure')m.failed++;if(e.phase==='cancel')m.interrupted++;if(e.phase==='assignment')m.assignments++;}
  for(const d of s.campaign.ai.decisions){const key=JSON.stringify(d);if(seenDecisions.has(key))continue;seenDecisions.add(key);const m=metrics[d.faction];if(m)m.decisions[d.kind]=(m.decisions[d.kind]||0)+1;}
  for(const p of s.campaign.ai.plans)if(!seenPlans.has(p.id)){seenPlans.add(p.id);metrics[p.faction].plans++;}
  for(const c of s.cities){const prev=owners.get(c.id);if(prev!==c.owner){if(metrics[c.owner])metrics[c.owner].captures++;if(metrics[prev])metrics[prev].losses++;owners.set(c.id,c.owner);}}
  for(const b of s.campaign.battles)if(b.settled&&!seenBattles.has(b.id)){seenBattles.add(b.id);battleTrace.push({id:b.id,day:b.endedDay,startedDay:b.startedDay,target:b.cityId,kind:b.kind,attackSide:b.attackSide,report:b.report,sides:b.battle.sides.map(side=>({faction:side.faction,initial:side.units.reduce((n,u)=>n+u.initial,0),remaining:side.units.reduce((n,u)=>n+u.hp,0),retreat:side.retreat}))});for(const [i,side] of b.battle.sides.entries()){const m=metrics[side.faction];if(m){m.battles++;if(b.report.winner===i)m.wins++;else if(b.report.winner!==null)m.defeats++;}}}
  for(const a of s.campaign.domestic.assignments){const o=domesticOfficer(s,a.officerId),c=s.cities.find(c=>c.id===a.cityId);if(!o||o.location!==c.id||o.faction!==c.owner||a.action&&ACTIONS[a.action.key].direction!==a.direction)issues.push({day:s.campaign.day,type:'invalid-assignment',id:a.id});}
  if(lastDay!==s.campaign.day){lastDay=s.campaign.day;for(const a of s.armies)if(metrics[a.faction]&&a.hunger>=1)metrics[a.faction].hungryArmyDays++;for(const c of s.cities)if(metrics[c.owner]&&c.hunger>=1){metrics[c.owner].hungryCityDays++;shortages.push({day:lastDay,city:c.id,name:c.name,faction:c.owner,hunger:c.hunger,grain:c.grain,men:c.units.reduce((n,u)=>n+u.troops,0),besieged:activeBattles(s).some(b=>b.cityId===c.id&&b.kind==='siege'),work:s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>({direction:a.direction,key:a.action?.key,remaining:a.action?.remaining})),incoming:s.campaign.idle.filter(o=>o.destination===c.id&&o.cargo?.grain).map(o=>({grain:o.cargo.grain,remainingDays:o.remainingDays}))});}}
 };
 try{
  while(s.campaign.day<days&&!s.finished&&guard++<days*12){
   if(s.campaign.phase==='planning'){validateCampaign(JSON.parse(serializeCampaign(s)));beginExecution(s);sample();}
   advanceCampaignDay(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);sample();
   if(s.campaign.day%30===1&&s.campaign.day!==lastPrinted){console.log(JSON.stringify({scenario:spec.id,player,day:s.campaign.day}));lastPrinted=s.campaign.day;}
  }
  validateCampaign(JSON.parse(serializeCampaign(s)));await writeFile(`${dir}/${spec.id}-${player}-final-save.json`,serializeCampaign(s));
 }catch(error){issues.push({day:s.campaign.day,type:'exception',message:error.stack});await writeFile(`${dir}/${spec.id}-${player}-failure.json`,serializeCampaign(s));}
 for(const f of factions){const m=metrics[f];m.endCities=s.cities.filter(c=>c.owner===f).length;m.gold=s.campaign.ai.treasuries[f];m.activeAssignments=s.campaign.domestic.assignments.filter(a=>s.cities.find(c=>c.id===a.cityId).owner===f).length;delete m.directions;}
 const nonSiegeShortages=shortages.filter(x=>x.men>0&&!x.besieged);
 const findings=nonSiegeShortages.length?[{type:'non-siege-garrison-hunger',cityDays:nonSiegeShortages.length,cities:[...new Set(nonSiegeShortages.map(x=>x.city))],message:'非围城驻军发生缺粮，需要检查补兵、供给和内政优先级。'}]:[];
 const result={scenario:spec.id,seed,player,day:s.campaign.day,finished:s.finished||null,issues,findings,metrics,planTrace,battleTrace,queueTrace,expeditions,shortages,plans:s.campaign.ai.plans,decisions:s.campaign.ai.decisions};results.push(result);
 await writeFile(`${dir}/${spec.id}-${player}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,planTrace:undefined,battleTrace:undefined,queueTrace:undefined,expeditions:undefined,shortages:undefined,plans:undefined,decisions:undefined}));
}
await writeFile(`${dir}/summary.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.issues.length||r.day<days&&!r.finished))process.exitCode=1;
else if(results.some(r=>r.findings.length))process.exitCode=2;
