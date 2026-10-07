import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS} from '../national-scenarios.mjs';
import {fillFactionAppointments} from '../faction-affairs.mjs';
import {factionGold,servingPeople} from '../talent-core.mjs';
import {grainCapacity,reservedMen,BUILDINGS} from '../domestic.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {battleWounded} from '../engine.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const days=Number(args.days||360),seed=Number(args.seed||417),maxMs=Number(args['max-ms']||900000);
const specs=args.scenario?NATIONAL_SCENARIOS.filter(s=>s.id===args.scenario):NATIONAL_SCENARIOS;
assert.ok(specs.length&&Number.isInteger(days)&&days>0&&Number.isSafeInteger(seed));
const out='outputs/scenario-economy';await mkdir(out,{recursive:true});
const files=['strategic-campaign.mjs','strategic-ai.mjs','domestic.mjs','talent-core.mjs','talent-lifecycle.mjs','economy.mjs','diplomacy.mjs','diplomacy-relations.mjs','personnel-movement.mjs','national-scenarios.mjs','troop-training.mjs','data/design/economy-rules.mjs','data/design/domestic-actions.mjs','data/design/national-scenarios.mjs','scripts/audit-scenario-economy.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const sources=await hashes();
const round=n=>Math.round(n*100)/100;
const sum=(rows,fn)=>rows.reduce((n,r)=>n+fn(r),0);

function snapshot(s,faction){
 const cities=s.cities.filter(c=>c.owner===faction),armies=s.armies.filter(a=>a.faction===faction&&!a.disbanded);
 const live=new Map(s.campaign.battles.filter(b=>!b.settled).flatMap(b=>b.battle.sides.flatMap(side=>side.units.filter(u=>!u.retreatDispatched).map(u=>[u.armyId+'|'+u.id,u]))));
 const men=[...cities.flatMap(c=>c.units.map(u=>({troops:u.troops,wounded:u.wounded}))),...armies.flatMap(a=>a.units.map(u=>{const v=live.get(a.id+'|'+u.id);return {troops:v?.hp??u.troops,wounded:u.wounded+(v?battleWounded(v):0)};}))];
 const traveling=s.campaign.idle.filter(o=>o.faction===faction&&(o.destination||o.unit.mission));
 const cargo={grain:sum(traveling,o=>(o.cargo?.grain||0)+(o.unit.mission?.cargo?.kind==='grain'?o.unit.mission.cargo.amount:0)),manpower:sum(traveling,o=>(o.cargo?.manpower||0)+(o.unit.mission?.cargo?.kind==='manpower'?o.unit.mission.cargo.amount:0))};
 const people=[...servingPeople(s).values()].filter(o=>o.faction===faction),staffed=cities.filter(c=>c.units.some(u=>u.troops+u.wounded>0));
 const besieged=new Set(activeBattles(s).filter(b=>b.kind==='siege').map(b=>b.cityId));
 const jobs=s.campaign.domestic.assignments.filter(a=>cities.some(c=>c.id===a.cityId));
 const hungry=staffed.filter(c=>c.hunger>0),armyHunger=armies.filter(a=>a.hunger>0);
 return {day:s.campaign.day,faction,cities:cities.length,cityIds:cities.map(c=>c.id),officers:people.length,
  cityStores:cities.map(c=>({id:c.id,gold:c.gold,grain:round(c.grain),manpower:c.manpower})),lowGoldCities:cities.filter(c=>c.gold<300).map(c=>c.id),gold:factionGold(s,faction),grain:round(sum(cities,c=>c.grain)),manpower:sum(cities,c=>c.manpower),usableManpower:sum(cities,c=>Math.max(0,c.manpower-reservedMen(c))),
  carriedGrain:round(sum(armies,a=>a.supply)+cargo.grain),carriedManpower:cargo.manpower,
  troops:round(sum(men,u=>u.troops)),wounded:round(sum(men,u=>u.wounded)),
  stationedTroops:sum(cities,c=>sum(c.units,u=>u.troops)),armies:armies.length,
  armyDetails:armies.map(a=>({id:a.id,home:a.homeCity,units:a.units.length,troops:round(sum(a.units,u=>live.get(a.id+'|'+u.id)?.hp??u.troops)),hunger:a.hunger,task:a.task})),
  staffedCities:staffed.length,hungryCities:hungry.map(c=>({id:c.id,name:c.name,hunger:c.hunger,besieged:besieged.has(c.id)})),
  hungryArmies:armyHunger.map(a=>({id:a.id,hunger:a.hunger,task:a.task,location:a.location})),
  lowFoodCities:staffed.filter(c=>c.grain<sum(c.units,u=>u.troops/100+u.wounded/200)*10).map(c=>c.id),
  reserveBlockedCities:staffed.filter(c=>c.manpower-reservedMen(c)<1000&&sum(c.units,u=>Math.max(0,Math.min(troopCapacity(u),faction===s.campaign.playerFaction?troopCapacity(u):ECONOMY_RULES.ai.cityTroopTarget)-u.troops-u.wounded))>1000).map(c=>c.id),
  fullGrainCities:cities.filter(c=>c.grain>=grainCapacity(c)*.95).length,fullReserveCities:cities.filter(c=>c.manpower>=28500).length,
  assignments:jobs.length,activeWork:jobs.filter(a=>a.action).length,waiting:jobs.filter(a=>!a.action).map(a=>({cityId:a.cityId,direction:a.direction,reason:a.waiting})),
  facilities:sum(cities,c=>sum(Object.keys(BUILDINGS),key=>c[key]||0)),
  cityDetails:cities.map(c=>({id:c.id,name:c.name,grain:c.grain,manpower:c.manpower,hunger:c.hunger,troops:sum(c.units,u=>u.troops),officers:people.filter(o=>o.location===c.id&&!o.destination&&!o.army).length,besieged:besieged.has(c.id)}))};
}

for(const spec of specs){
 const initial=newCampaign(seed,spec.id),alternate=[...spec.factions].filter(f=>f!=='cao').sort((a,b)=>initial.cities.filter(c=>c.owner===b).length-initial.cities.filter(c=>c.owner===a).length||a.localeCompare(b))[0];
 const player=args.player==='alternate'?alternate:args.player||'cao';
 const s=player==='cao'?initial:newCampaign(seed,spec.id,player),start=performance.now(),rows=[],events=[],decisions=[],departures=new Map(),seenDecisions=new WeakSet();
 let sequence=0,guard=0,error=null,stopped=null,lastProgress=0;
 const trackers=Object.fromEntries(spec.factions.map(f=>[f,{faction:f,name:NATIONAL_FACTIONS[f].name,controller:f===player?'player-domestic-delegation':'AI',aliveDays:0,staffedCityDays:0,cityHungerDays:0,severeCityHungerDays:0,rearCityHungerDays:0,armyDays:0,armyHungerDays:0,severeArmyHungerDays:0,lowGoldDays:0,reserveBlockedCityDays:0,fullGrainCityDays:0,fullReserveCityDays:0,cityDays:0,minGold:Infinity,minGrain:Infinity,minManpower:Infinity,longestLowGold:0,currentLowGold:0,longestCityHunger:0,cityHungerRuns:{},domesticStarted:0,domesticCompleted:0,sourceCommands:{},civilGoldSpent:0,eliminatedDay:null}]));
 const collect=()=>{
  for(const n of s.campaign.activity.nodes)if(n.sequence>sequence){events.push(n);const t=trackers[n.faction];if(t&&n.category==='domestic'){
   if(n.phase==='start'){t.domesticStarted++;t.civilGoldSpent+=n.result.cost||0;}
   if(n.phase==='complete'){t.domesticCompleted++;t.sourceCommands[n.key]=(t.sourceCommands[n.key]||0)+1;}
  }}sequence=s.campaign.activity.nextSequence-1;
  for(const d of s.campaign.ai.decisions)if(!seenDecisions.has(d)){seenDecisions.add(d);decisions.push({...d,faction:d.armyId.startsWith('city-force:')?s.cities.find(c=>c.id===d.armyId.slice(11))?.owner:s.armies.find(a=>a.id===d.armyId)?.faction});}
  for(const a of s.armies.filter(a=>!a.defense&&!a.disbanded))if(!departures.has(a.id))departures.set(a.id,{day:s.campaign.day,id:a.id,faction:a.faction,home:a.homeCity,units:a.units.length,troops:a.units.map(u=>u.troops),total:sum(a.units,u=>u.troops),task:a.task});
 };
 const sample=(account=true)=>{for(const f of spec.factions){const row=snapshot(s,f);rows.push(row);if(!account)continue;const t=trackers[f];
  if(!row.cities){t.eliminatedDay??=s.campaign.day;continue;}t.aliveDays++;t.cityDays+=row.cities;t.staffedCityDays+=row.staffedCities;t.cityHungerDays+=row.hungryCities.length;t.severeCityHungerDays+=row.hungryCities.filter(c=>c.hunger>=3).length;t.rearCityHungerDays+=row.hungryCities.filter(c=>!c.besieged).length;
  t.armyDays+=row.armies;t.armyHungerDays+=row.hungryArmies.length;t.severeArmyHungerDays+=row.hungryArmies.filter(a=>a.hunger>=3).length;t.reserveBlockedCityDays+=row.reserveBlockedCities.length;t.fullGrainCityDays+=row.fullGrainCities;t.fullReserveCityDays+=row.fullReserveCities;
  t.minGold=Math.min(t.minGold,row.gold);t.minGrain=Math.min(t.minGrain,row.grain);t.minManpower=Math.min(t.minManpower,row.manpower);
  if(row.gold<300){t.lowGoldDays++;t.currentLowGold++;t.longestLowGold=Math.max(t.longestLowGold,t.currentLowGold);}else t.currentLowGold=0;
  for(const c of row.cityDetails){t.cityHungerRuns[c.id]=c.hunger>0?(t.cityHungerRuns[c.id]||0)+1:0;t.longestCityHunger=Math.max(t.longestCityHunger,t.cityHungerRuns[c.id]);}
 }};
 sample(false);
 console.log(JSON.stringify({phase:'start',scenario:spec.id,seed,player,days,factions:spec.factions.length}));
 try{
  validateCampaign(JSON.parse(serializeCampaign(s)));
  while(s.campaign.day<=days&&!s.finished){
   assert.ok(guard++<days*20,'The daily engine stopped advancing');
   if(performance.now()-start>maxMs){stopped='wall-time-budget';break;}
   const day=s.campaign.day;
   if(s.campaign.phase==='planning'){fillFactionAppointments(s);assert.equal(beginExecution(s),null);collect();}
   for(const b of activeBattles(s).filter(b=>b.awaiting))assert.equal(chooseEncounter(s,b.id,false),null);
   advanceCampaignDay(s);collect();
   if(s.campaign.day!==day){sample();
    if((s.campaign.day-1)%30===0){validateCampaign(JSON.parse(serializeCampaign(s)));}
    if(s.campaign.day-lastProgress>=10){lastProgress=s.campaign.day;console.log(JSON.stringify({phase:'progress',scenario:spec.id,seed,player,day:s.campaign.day,seconds:round((performance.now()-start)/1000),battles:s.campaign.battles.length,active:activeBattles(s).length,departures:departures.size}));}
   }
  }
  if(s.finished)sample(false);
  const save=serializeCampaign(s),restored=validateCampaign(JSON.parse(save));assert.equal(serializeCampaign(restored),save,'Save/load must preserve the simulation');
  await writeFile(`${out}/${spec.id}-${seed}-${player}-${days}-save.json`,save);
 }catch(e){error=e.stack;await writeFile(`${out}/${spec.id}-${seed}-${player}-${days}-failed-save.json`,serializeCampaign(s));}
 const after=await hashes(),changedSources=files.filter(f=>sources[f]!==after[f]);
 const factions=Object.values(trackers).map(t=>{
  const own=rows.filter(r=>r.faction===t.faction),final=own.at(-1),recent=own.filter(r=>r.day>=s.campaign.day-90&&r.cities);
  if(!final.cities)t.eliminatedDay??=s.campaign.day;
  const reasons=[];if(t.longestLowGold>=30)reasons.push('资金低于300连续至少30天');if(t.severeCityHungerDays)reasons.push('城内发生严重断粮');if(t.severeArmyHungerDays)reasons.push('出征部队发生严重断粮');
  if(t.reserveBlockedCityDays/Math.max(1,t.staffedCityDays)>.1)reasons.push('超过10%的驻兵城日同时缺兵源且有补兵缺额');
  const saturation=recent.length&&recent.every(r=>r.gold>=3000&&r.fullGrainCities>=r.cities*.75&&r.fullReserveCities>=r.cities*.75);
  return {...t,initial:own[0],final,tailMean:{gold:round(sum(recent,r=>r.gold)/Math.max(1,recent.length)),grain:round(sum(recent,r=>r.grain)/Math.max(1,recent.length)),manpower:round(sum(recent,r=>r.manpower)/Math.max(1,recent.length))},departures:[...departures.values()].filter(a=>a.faction===t.faction),holdReasons:decisions.filter(d=>d.faction===t.faction&&d.kind==='hold').reduce((n,d)=>(n[d.reason]=(n[d.reason]||0)+1,n),{}),status:t.eliminatedDay?'lost-territory':reasons.length?'needs-investigation':'operating',reasons,saturated:saturation};
 });
 const result={scenario:spec.id,name:spec.name,seed,player,requestedDays:days,completedDay:s.campaign.day,finished:s.finished||null,seconds:round((performance.now()-start)/1000),stopped,error,changedSources,sources,complete:!error&&!stopped&&!changedSources.length&&(s.campaign.day>days||!!s.finished),factions,rows,events,decisions,scope:{model:'Current selectable scenario, unmodified opening resources/rosters, actual wars, diplomacy, movement, supply, battles and economics. No prescribed attrition or gratis stock replenishment.',player:'Selected player uses the public fill-empty-domestic-appointments command each turn; no player offensive or diplomatic approval is fabricated. Every other faction runs its real AI. Run with another selected player to observe the original player faction as AI.',metrics:'Daily resource stocks and local hunger, not a claim of exact gross income/expenditure. Individual city stores and low-money cities are recorded separately from faction totals. Carried grain and manpower are separate from city warehouses. Territory loss is distinguished from resource failure. Warning thresholds are diagnostics, not automatic tuning targets.'}};
 await writeFile(`${out}/${spec.id}-${seed}-${player}-${days}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({phase:'finish',scenario:spec.id,seed,player,day:s.campaign.day,seconds:result.seconds,complete:result.complete,error,stopped,changedSources,factions:factions.map(f=>({name:f.name,status:f.status,gold:f.final.gold,grain:f.final.grain,manpower:f.final.manpower,departures:f.departures.length,reasons:f.reasons}))}));
 if(!result.complete)process.exitCode=1;
}
