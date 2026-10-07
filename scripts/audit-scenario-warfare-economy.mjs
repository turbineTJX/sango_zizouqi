import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {newCampaign,findCampaignRoute,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,recruitLocalUnits,prepareCityUnits,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {fillFactionAppointments} from '../faction-affairs.mjs';
import {cityFoodReserve,canTrain} from '../domestic.mjs';
import {allocateUnitTroops} from '../troop-allocation.mjs';
import {plannedOfficer,plannedGrain} from '../strategic-intent.mjs';
import {factionLord} from '../talent-core.mjs';
import {diplomaticAssignment,factionsHostile} from '../diplomacy-relations.mjs';
import {strategicTravelDays} from '../strategic-ai.mjs';
import {cityForce} from '../city-units.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const days=Number(args.days||180),seed=Number(args.seed||2027),out='outputs/scenario-economy/warfare';
const specs=args.scenario?NATIONAL_SCENARIOS.filter(s=>s.id===args.scenario):NATIONAL_SCENARIOS;
await mkdir(out,{recursive:true});
const files=['strategic-campaign.mjs','strategic-ai.mjs','domestic.mjs','economy.mjs','diplomacy.mjs','data/design/economy-rules.mjs','data/design/national-scenarios.mjs','scripts/audit-scenario-warfare-economy.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const sources=await hashes();
const sum=(rows,fn)=>rows.reduce((n,r)=>n+fn(r),0);
for(const spec of specs){
 const s=newCampaign(seed,spec.id),start=performance.now(),orders=[],samples=[],departures=new Map(),hunger=[],battleIds=new Set();let guard=0,error=null;
 function takeSample(){const cities=s.cities.filter(c=>c.owner==='cao'),armies=s.armies.filter(a=>a.faction==='cao'&&!a.disbanded);samples.push({day:s.campaign.day,gold:s.gold,grain:sum(cities,c=>c.grain),manpower:sum(cities,c=>c.manpower),carriedGrain:sum(armies,a=>a.supply),troops:sum(cities,c=>sum(c.units,u=>u.troops))+sum(armies,a=>sum(a.units,u=>u.troops)),cities:cities.length});}
 function playerOrders(){
  // This is an explicit test player, not a modification of the game's AI.
  // One real column at a time, three existing units, with a resident defender.
  if(s.armies.some(a=>a.faction==='cao'&&!a.disbanded&&!a.defense)||s.campaign.domestic.orders.some(q=>q.faction==='cao'&&q.kind==='expedition'))return;
  const options=[];
  for(const c of s.cities.filter(c=>c.owner==='cao'&&!activeBattles(s).some(b=>b.kind==='siege'&&b.cityId===c.id))){
   const units=c.units.filter(u=>u.id!==factionLord(s,'cao')&&u.id!==c.governor&&!u.mission&&!plannedOfficer(s,u.id)&&!diplomaticAssignment(s,u.id)).sort((a,b)=>b.leadership-a.leadership||a.id.localeCompare(b.id));
   if(units.length<3)continue;
   const chosen=units.slice(0,3),ids=chosen.map(u=>u.id);
   const before={gold:s.gold,manpower:c.manpower,grain:c.grain};
   recruitLocalUnits(s,c,ids,{cap:3000,goldReserve:1000,grainReserve:cityFoodReserve(s,c,20)+plannedGrain(s,c.id)});
   const paid={gold:before.gold-s.gold,manpower:before.manpower-c.manpower,grain:before.grain-c.grain};
   if(paid.manpower)orders.push({day:s.campaign.day,kind:'replenishment',city:c.id,paid});
   assert.equal(paid.grain,0,'Replenishment must not burn formation grain');
   if(chosen.some(u=>u.troops<1000)||c.grain<2700+cityFoodReserve(s,c,20)+plannedGrain(s,c.id))continue;
   for(const target of s.cities.filter(t=>t.owner!=='cao'&&t.owner!=='neutral'&&factionsHostile(s,'cao',t.owner)&&t.units.some(u=>u.troops>0)&&!activeBattles(s).some(b=>b.cityId===t.id))){
    const path=findCampaignRoute(s,c.id,target.id,'cao');if(!path)continue;
    const travelDays=strategicTravelDays(s,{...cityForce(c),units:chosen},path);if(!Number.isFinite(travelDays))continue;
    options.push({c,target,ids,chosen,travelDays});
   }
  }
  options.sort((a,b)=>a.travelDays-b.travelDays||a.target.id.localeCompare(b.target.id)||a.c.id.localeCompare(b.c.id));
  for(const p of options){const leader=p.chosen[0].id,advisor=[...p.chosen].sort((a,b)=>b.intellect-a.intellect)[0].id;
   if(!p.c.units.some(u=>!p.ids.includes(u.id)&&u.troops>=1000)){
    const guard=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===p.c.id&&!o.destination&&!o.retreating&&!o.unit.mission&&!diplomaticAssignment(s,o.unit.id)&&canTrain(p.c,o.unit.type));if(!guard)continue;
    const before={gold:s.gold,manpower:p.c.manpower,grain:p.c.grain},id=guard.unit.id;
    if(prepareCityUnits(s,p.c.id,[id])||allocateUnitTroops(s,p.c,[id],{[id]:1000}))continue;
    const paid={gold:before.gold-s.gold,manpower:before.manpower-p.c.manpower,grain:before.grain-p.c.grain};assert.equal(paid.manpower,1000);assert.equal(paid.grain,0);
    orders.push({day:s.campaign.day,kind:'resident-defender',city:p.c.id,officerId:id,paid});
   }
   const result=requestStrategicOrder(s,{kind:'expedition',cityId:p.c.id,officerIds:p.ids,leader,advisor,deputy:null,target:p.target.id,policy:'auto',minSupply:2700},'after');
   orders.push({day:s.campaign.day,kind:'expedition',city:p.c.id,target:p.target.id,targetFaction:p.target.owner,officerIds:p.ids,troops:p.chosen.map(u=>u.troops),travelDays:p.travelDays,result});
   if(!result.error)break;
  }
 }
 try{
  takeSample();validateCampaign(JSON.parse(serializeCampaign(s)));
  console.log(JSON.stringify({phase:'start',scenario:spec.id,seed,days}));
  while(s.campaign.day<=days&&!s.finished){
   assert.ok(guard++<days*20,'The daily engine stopped advancing');
   if(performance.now()-start>1200000)throw Error('Warfare audit exceeded its wall-time budget');
   const day=s.campaign.day;
   if(s.campaign.phase==='planning'){playerOrders();fillFactionAppointments(s);assert.equal(beginExecution(s),null);}
   for(const b of activeBattles(s).filter(b=>b.awaiting))assert.equal(chooseEncounter(s,b.id,false),null);
   advanceCampaignDay(s);
   for(const a of s.armies.filter(a=>a.faction==='cao'&&!a.disbanded&&!a.defense))if(!departures.has(a.id))departures.set(a.id,{id:a.id,day:s.campaign.day,home:a.homeCity,target:a.target,units:a.units.length,troops:a.units.map(u=>u.troops)});
   for(const b of s.campaign.battles)if(b.armies.some(a=>a.faction==='cao'))battleIds.add(b.id);
   if(s.campaign.day!==day){takeSample();for(const c of s.cities.filter(c=>c.owner==='cao'&&c.hunger>0))hunger.push({day,kind:'city',id:c.id,hunger:c.hunger});for(const a of s.armies.filter(a=>a.faction==='cao'&&!a.disbanded&&a.hunger>0))hunger.push({day,kind:'army',id:a.id,hunger:a.hunger,location:a.location});
    if((s.campaign.day-1)%30===0){validateCampaign(JSON.parse(serializeCampaign(s)));console.log(JSON.stringify({phase:'progress',scenario:spec.id,day:s.campaign.day,battles:battleIds.size,departures:departures.size,seconds:Math.round((performance.now()-start)/1000)}));}
   }
  }
  const save=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(save))),save);await writeFile(`${out}/${spec.id}-${seed}-${days}-save.json`,save);
 }catch(e){error=e.stack;await writeFile(`${out}/${spec.id}-${seed}-${days}-failed-save.json`,serializeCampaign(s));}
 const after=await hashes(),changedSources=files.filter(f=>sources[f]!==after[f]);
 const result={scenario:spec.id,name:spec.name,seed,requestedDays:days,completedDay:s.campaign.day,finished:s.finished||null,error,changedSources,sources,seconds:Math.round((performance.now()-start)/1000),complete:!error&&!changedSources.length&&(s.campaign.day>days||!!s.finished),orders,departures:[...departures.values()],playerBattles:[...battleIds],hunger,samples,scope:'Supplementary actual-war test: selected Cao player legally orders one three-unit column against the nearest reachable genuinely defended enemy, retains a real city defender (forming and paying for one when needed), replenishes candidate troops to at most 3000 with shared money/reserve/quota and food support checks, respects domestic completion and full roads. Other factions run unchanged AI. No assigned damage, shortened journeys, free resources or fixed winner. This player policy is not a claim about normal AI attack frequency.'};
 await writeFile(`${out}/${spec.id}-${seed}-${days}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({phase:'finish',scenario:spec.id,day:s.campaign.day,seconds:result.seconds,complete:result.complete,error,changedSources,departures:departures.size,battles:battleIds.size,hungerDays:hunger.length,initial:samples[0],final:samples.at(-1)}));if(!result.complete)process.exitCode=1;
}
