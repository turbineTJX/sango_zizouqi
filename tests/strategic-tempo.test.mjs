import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWarTempo} from '../strategic-tempo.mjs';
import {assessRecoveryCapacity,continuationAdvantageRequirement,recoveryAdvantageRequirement} from '../strategic-recovery.mjs';
import {recoveryCityFacts,strategicContext} from '../strategic-context.mjs';
import {planStrategicAI,strategicCityBudget,validateStrategicAI,initializeStrategicAI,observedTargetStockValue} from '../strategic-ai.mjs';
import {strategicDemand} from '../strategic-policy.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {serializeCampaign,beginExecution,advanceCampaignDay,launchExpedition} from '../strategic-campaign.mjs';
import {observedJointParticipation} from '../scripts/war-tempo-report.mjs';
import {armySupplyCapacity} from '../army-supply.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {gateDurability} from '../building-durability.mjs';
import {forecastRouteSupply} from '../strategic-route-supply.mjs';
import {cityForce} from '../city-units.mjs';
import {supplyConnection} from '../strategic-campaign.mjs';
import {evaluateCostBenefitV3} from '../strategic-algorithm-defaults.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {registerStrategicAlgorithm,setStrategicAlgorithms} from '../strategic-algorithms.mjs';
import {armyManagementFacts} from '../strategic-management-ai.mjs';

const city=id=>({id,gold:6000,grain:18000,manpower:18000,costs:{gold:500,grain:3000},reserve:{gold:0,grain:0},shortages:{gold:0,grain:0},besieged:false});
function context(n=1){return {day:1,turn:1,critical:false,ownCities:Array.from({length:n},(_,i)=>city('c'+i))};}
const pools=(c,count)=>new Map(c.ownCities.map(x=>[x.id,Array.from({length:count},()=>({troops:3000}))]));

test('conquest stock value is bounded to fresh observed resources and cannot credit hidden or stale warehouses',()=>{
 const stock={gold:100000,grain:120000},fresh={known:true,observedDay:41},before=JSON.stringify(stock);
 assert.equal(observedTargetStockValue(fresh,stock,41),120);
 assert.equal(observedTargetStockValue({...fresh,known:false},stock,41),0);
 assert.equal(observedTargetStockValue(fresh,stock,45),0);
 assert.equal(observedTargetStockValue(fresh,stock,40),0);
 assert.ok(observedTargetStockValue(fresh,{gold:2000,grain:6000},41)>0);
 assert.equal(JSON.stringify(stock),before,'forecast value cannot withdraw or create actual stock');
});

test('large troop formations carry real thirty day rations under the same player and AI stock rules',()=>{
 assert.equal(armySupplyCapacity([{troops:3000,wounded:0}]),900);assert.equal(armySupplyCapacity([{troops:9000,wounded:0}]),2700);
 assert.equal(armySupplyCapacity([{troops:3001,wounded:1}]),930);
 for(const allAI of [false,true]){const {s,home,rear}=planningFront();s.campaign.allAI=allAI;
  home.units=home.units.map((u,i)=>i<2?{...makeOfficer(u.id,6000,i,10),homeCity:home.id}:u);
  const before=home.grain,units=home.units.slice(0,2),q={cityId:home.id,officerIds:units.map(u=>u.id),leader:units[0].id,advisor:units[1].id,target:rear.id,policy:'auto'};
  assert.equal(launchExpedition(s,q,{scheduled:true,faction:home.owner}),null);
  const army=s.armies.find(a=>a.units.some(u=>u.id===units[0].id));assert.equal(army.supplyCapacity,3600);assert.equal(army.supply,3600);assert.equal(before-home.grain,3600);
  assert.equal(JSON.parse(serializeCampaign(s)).armies.find(a=>a.id===army.id).supplyCapacity,3600);
 }
});

test('war stages follow strategic turns while real funded forces limit campaign and joint operations',()=>{
 const small=context(),early=assessWarTempo(small,pools(small,2));assert.equal(early.phase,'early');assert.equal(early.operationLimit,1);
 small.day=1000;assert.deepEqual(assessWarTempo(small,pools(small,2)),early);
 small.turn=21;assert.equal(assessWarTempo(small,pools(small,3)).phase,'campaign');assert.equal(assessWarTempo(small,pools(small,3)).assemblyDays,20);
 const large=context(4);large.turn=20;assert.equal(assessWarTempo(large,pools(large,3)).phase,'early');assert.equal(assessWarTempo(large,pools(large,3)).operationLimit,1);
 for(const turn of [21,60]){large.turn=turn;assert.equal(assessWarTempo(large,pools(large,3)).phase,'campaign');assert.equal(assessWarTempo(large,pools(large,3)).operationLimit,1);}
 large.turn=61;const joint=assessWarTempo(large,pools(large,3));assert.equal(joint.stage,'joint');assert.equal(joint.phase,'joint');assert.equal(joint.operationLimit,2);assert.equal(joint.columnUnits,6);assert.equal(joint.assemblyDays,30);
 assert.equal(assessWarTempo(small,pools(small,2)).phase,'early','passing turn 20 cannot supply missing troops');
 large.ownCities.forEach(c=>c.shortages.gold=1);assert.equal(assessWarTempo(large,pools(large,3)).phase,'early');
 large.critical=true;assert.equal(assessWarTempo(large,pools(large,10)).operationLimit,1);
});

test('current training reservations cannot consume every future turn recruitment quota',()=>{
 const {s,home}=planningFront();home.domestic.reserved=3000;
 const facts=recoveryCityFacts(s,home,home.units.slice(0,2),strategicCityBudget(s,home),strategicContext(s,'yuan'));
 assert.equal(facts.quota,0);assert.ok(facts.nextQuota>0);
 const r=assessRecoveryCapacity({day:1,returnDays:12,cities:[{...facts,trainingRate:.5}]},1500);assert.equal(r.feasible,true);
 assert.ok(r.currentCoverage>0,'stored refill money and manpower survive a spent current quota');
});

test('continuing an affordable attack tolerates bounded changes but never accepts a weaker army',()=>{
 const r={feasible:true,currentCoverage:2,projectedCoverage:2},fresh={known:true,observedDay:1};
 assert.equal(recoveryAdvantageRequirement(1.7,r,fresh,1),1.2);
 assert.equal(continuationAdvantageRequirement(1.7,r,fresh,1),1.1);
 assert.ok(continuationAdvantageRequirement(1.9,{...r,feasible:false},fresh,1)>=1.7);
 assert.ok(continuationAdvantageRequirement(1.9,r,{known:false,observedDay:null},1)>=1.7);
});

test('launched operations protect real replacement resources from optional domestic spending',()=>{
 const {s,home}=planningFront();planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(p.phase,'attack');
 assert.equal(p.requirements.length,1);assert.equal(p.requirements[0].cityId,home.id);
 const demand=strategicDemand(s,home.id);assert.equal(demand.kind,'capture');assert.equal(demand.requirements[0].gold,p.requirements[0].gold);
 assert.ok(p.requirements[0].gold<=home.gold);assert.ok(p.requirements[0].manpower<=home.manpower);
 validateStrategicAI(s);const saved=serializeCampaign(s);
 const second=structuredClone(p);second.id=s.campaign.ai.nextPlanId++;second.target=s.cities.find(c=>c.id!==p.target&&c.id!==p.staging).id;s.campaign.ai.plans.push(second);
 assert.throws(()=>validateStrategicAI(s),'parallel plans must not reuse the same actual officers');
 s.campaign.ai.plans.pop();s.campaign.ai.nextPlanId--;assert.equal(serializeCampaign(s),saved);
});

test('a funded large faction gathers actual troops and launches multiple columns toward one defended objective',()=>{
 const {s,home,target,rear}=planningFront(),sources=[home,rear,...s.cities.filter(c=>![home,target,rear].includes(c)).slice(0,2)];
 s.campaign.allAI=true;
 const enemyIds=new Set(target.units.map(u=>u.id)),ids=Object.keys(OFFICER_BY_ID).filter(id=>!enemyIds.has(id));let at=0;
 for(const [i,c]of sources.entries()){
  Object.assign(c,{owner:'yuan',x:-i*8,y:0,gold:50000,grain:50000,manpower:30000,granary:6});c.domestic.owner='yuan';gateDurability(c).hp=100000;
  c.units=Array.from({length:7},(_,n)=>({...makeOfficer(ids[at++],3000,n,3),homeCity:c.id}));
 }
 target.units.forEach(u=>u.troops=6500);target.gold=0;target.manpower=0;target.commerce=10;
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[c.id,home.id])];for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:1};
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 s.turn=61;s.campaign.day=601;
 initializeVision(s);initializeStrategicAI(s);planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p,'a feasible mature operation should exist');assert.equal(p.columnUnits,6);assert.ok(p.officerIds.length>6);
 assert.ok(p.origins.length>1);assert.equal(p.phase,'assemble');const selected=[...p.officerIds];
 assert.ok(p.columns?.length>1);assert.ok(new Set(p.columns.map(c=>c.departureDay)).size>1,'near columns wait at their own depots for the distant columns');
 const marching=armyManagementFacts(s,'yuan').armies.filter(a=>a.unitIds.some(id=>selected.includes(id)));assert.ok(marching.length);assert.ok(marching.every(a=>!a.modeEditable),'optional forced or light march must not silently change a saved joint contact schedule');
 const waitingResume=JSON.parse(serializeCampaign(s));
 const grainFloors=structuredClone(p.requirements),departedBefore=new Set(s.armies.map(a=>a.id));
 for(let i=0;i<6&&p.phase!=='attack';i++)for(const world of [s,waitingResume]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.equal(serializeCampaign(waitingResume),serializeCampaign(s),'saved future departures must survive reload before all columns have left');
 assert.equal(p.phase,'attack',p.reason);
 const columns=s.armies.filter(a=>a.faction==='yuan'&&a.units.some(u=>selected.includes(u.id)));
 const retained=grainFloors.map(r=>({...r,grain:r.grain-columns.filter(a=>a.homeCity===r.cityId&&!departedBefore.has(a.id)).reduce((n,a)=>n+a.supplyCapacity,0)}));
 assert.ok(retained.some(r=>r.grain>2500),'this fixture must need a sustained reserve beyond the home minimum');
 for(const r of retained)assert.ok(p.requirements.find(q=>q.cityId===r.cityId).grain>=r.grain,'actual loading releases the shipped grain and retains the sustained recovery reserve');
 assert.ok(columns.length>=2);assert.ok(columns.every(a=>a.units.length<=6&&(a.target===target.id||s.campaign.battles.some(b=>b.cityId===target.id&&b.armyIds.includes(a.id)))));
 assert.ok(new Set(columns.map(a=>a.homeCity)).size>1,'joint armies retain distinct real replenishment bases');
 for(const a of columns)assert.ok(a.units.every(u=>p.origins.some(g=>g.cityId===a.homeCity&&g.officerIds.includes(u.id))));
 assert.equal(new Set(columns.flatMap(a=>a.units.map(u=>u.id))).size,selected.length);validateStrategicAI(s);
 // This controlled contact fixture must reach one real battle, not merely
 // retain multiple army references in a plan. Natural scenarios are audited
 // separately with unmodified topology and full campaign save validation.
 const resumed=JSON.parse(serializeCampaign(s)),columnIds=new Set(columns.map(a=>a.id));
 const together=world=>world.campaign.battles.filter(b=>b.cityId===target.id).flatMap(observedJointParticipation)
  .find(row=>row.faction==='yuan'&&row.armyIds.filter(id=>columnIds.has(id)).length>=2);
 for(let i=0;i<15&&!together(s);i++)for(const world of [s,resumed]){
  if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);
 }
 assert.ok(together(s),'separately marching columns must actually arrive on the same battle side');
 assert.deepEqual(together(resumed),together(s));
 assert.equal(serializeCampaign(resumed),serializeCampaign(s),'actual joint contact must remain deterministic after save/resume');
 validateStrategicAI(s);validateStrategicAI(resumed);
});

test('a mature second front uses different real depots and officers while preserving the primary operation',()=>{
 const {s,home,target,rear}=planningFront(),more=s.cities.filter(c=>![home,target,rear].includes(c)),sources=[home,rear,...more.slice(0,2)],second=more[2];
 const enemyIds=new Set(target.units.map(u=>u.id)),ids=Object.keys(OFFICER_BY_ID).filter(id=>!enemyIds.has(id));let at=0;
 for(const [i,c]of sources.entries()){
  Object.assign(c,{owner:'yuan',x:-i*8,y:0,gold:20000,grain:30000,manpower:30000,granary:3});c.domestic.owner='yuan';gateDurability(c).hp=100000;
  c.units=Array.from({length:7},(_,n)=>({...makeOfficer(ids[at++],3000,n,3),homeCity:c.id}));
 }
 Object.assign(second,{owner:'cao',x:-16,y:8,gold:0,manpower:0});second.domestic.owner='cao';second.units=[{...makeOfficer(ids[at++],1000,0,3),homeCity:second.id}];
 target.gold=0;target.manpower=0;
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[home.id,c.id]),[rear.id,second.id]];for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:1};
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 s.turn=61;s.campaign.day=601;
 initializeVision(s);initializeStrategicAI(s);planStrategicAI(s);
 const primary=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(primary);assert.equal(primary.phase,'attack');
 const held=structuredClone(s),cleanup=registerStrategicAlgorithm('selector',{id:'test-tempo-develop-v1',run:({candidates})=>candidates.find(c=>['develop','recover'].includes(c.kind)).id});
 try{setStrategicAlgorithms(held,{selector:'test-tempo-develop-v1'});held.campaign.day=611;held.turn=62;updateVision(held);planStrategicAI(held);
  assert.equal(held.campaign.ai.plans.filter(p=>p.faction==='yuan'&&p.phase==='attack').length,1,'second front must respect the registered strategic selector');
  assert.equal(held.campaign.ai.factions.yuan.strategy.goal.planId,primary.id);validateStrategicAI(held);
 }finally{cleanup();}
 s.campaign.day=611;s.turn=62;updateVision(s);planStrategicAI(s);
 const operations=s.campaign.ai.plans.filter(p=>p.faction==='yuan'&&p.phase==='attack');assert.equal(operations.length,2);
 const other=operations.find(p=>p!==primary);assert.notEqual(other.target,primary.target);assert.notEqual(other.staging,primary.staging);
 assert.ok(other.officerIds.every(id=>!primary.officerIds.includes(id)));assert.ok(other.origins.every(g=>!primary.origins.some(p=>p.cityId===g.cityId)));
 assert.equal(s.campaign.ai.factions.yuan.strategy.goal.planId,primary.id);validateStrategicAI(s);
});

function concentratedFront({rearDistance=1,oneDepot=false}={}){
 const {s,home,target,rear}=planningFront(),sources=[home,rear,...s.cities.filter(c=>![home,target,rear].includes(c)).slice(0,2)];
 const enemyIds=new Set(target.units.map(u=>u.id)),ids=Object.keys(OFFICER_BY_ID).filter(id=>!enemyIds.has(id));let at=0;
 for(const [i,c]of sources.entries()){
  Object.assign(c,{owner:'yuan',x:-i*8,y:0,gold:80000,grain:100000,manpower:30000,granary:6});c.domestic.owner='yuan';gateDurability(c).hp=100000;
  c.units=Array.from({length:oneDepot?(i===0?36:0):i===0?1:7},(_,n)=>({...makeOfficer(ids[at++],3000,n,3),homeCity:c.id}));
 }
 target.units.forEach(u=>u.troops=oneDepot?6500:3500);target.gold=0;target.manpower=0;target.commerce=10;
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[c.id,home.id])];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:e.includes(target.id)?1:rearDistance};
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 s.campaign.allAI=true;s.turn=61;s.campaign.day=601;initializeVision(s);initializeStrategicAI(s);
 return {s,home,target,sources};
}

test('a forward depot can launch more than ten real units as separate legal columns',()=>{
 const {s,home,target}=concentratedFront({oneDepot:true}),before=home.grain;
 planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');
 assert.ok(p,JSON.stringify(s.campaign.ai.factions.yuan.strategy.trace.at(-1)));assert.ok(p.columns?.length>=2);assert.ok(p.officerIds.length>6);
 assert.equal(p.origins.length,1);assert.equal(p.origins[0].cityId,home.id);
 const armies=s.armies.filter(a=>a.faction==='yuan'&&a.target===target.id);
 assert.ok(armies.length>=2);assert.ok(armies.every(a=>a.units.length<=6&&a.homeCity===home.id));
 assert.ok(p.officerIds.length>10);assert.equal(new Set(armies.flatMap(a=>a.units.map(u=>u.id))).size,armies.reduce((n,a)=>n+a.units.length,0));
 assert.equal(new Set(p.columns.flatMap(c=>c.officerIds)).size,p.officerIds.length);
 assert.equal(before-home.grain,armies.reduce((n,a)=>n+a.supply,0));validateStrategicAI(s);
});

test('middle game concentration can use more than ten arrived units through legal ten-unit armies',()=>{
 const {s,home,target}=concentratedFront({oneDepot:true});s.turn=21;s.campaign.day=201;initializeStrategicAI(s);
 const before=home.grain;planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');
 assert.ok(p);assert.equal(p.phase,'attack');assert.equal(p.columns,null,'middle game keeps central assembly instead of late game synchronized departure schedules');
 assert.ok(p.officerIds.length>10);assert.equal(p.columnUnits,10);
 const armies=s.armies.filter(a=>a.faction==='yuan'&&a.target===target.id),ids=new Set(armies.map(a=>a.id));
 assert.ok(armies.length>=2);assert.ok(armies.every(a=>a.units.length<=10));
 assert.equal(before-home.grain,armies.reduce((n,a)=>n+a.supply,0));validateStrategicAI(s);
 const copy=JSON.parse(serializeCampaign(s));
 for(let i=0;i<15&&!s.campaign.battles.some(b=>b.cityId===target.id&&b.armyIds.filter(id=>ids.has(id)).length>=2);i++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.ok(s.campaign.battles.some(b=>b.cityId===target.id&&b.armyIds.filter(id=>ids.has(id)).length>=2));
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('a stalled mature front transfers actual rear troops before reconsidering an attack',()=>{
 const {s,home,target,sources}=concentratedFront({rearDistance:1600}),before=home.units.reduce((n,u)=>n+u.troops,0),troops=s.cities.reduce((n,c)=>n+c.units.reduce((m,u)=>m+u.troops,0),0);
 planStrategicAI(s);const g=s.campaign.ai.factions.yuan.strategy.goal;
 assert.match(g.candidateId,/^capture-assembly:/,JSON.stringify(s.campaign.ai.factions.yuan.strategy.trace.at(-1)));assert.equal(g.status,'preparing');assert.equal(g.planId,null);
 assert.ok(g.requirements.some(r=>r.cityId===home.id&&r.defensePower>0));
 const transfer=s.campaign.idle.find(o=>o.faction==='yuan'&&o.destination===home.id&&o.unit.troops>0);
 assert.ok(transfer);assert.ok(sources.some(c=>c.id===transfer.location&&c!==home));
 assert.equal(home.units.reduce((n,u)=>n+u.troops,0),before,'a travelling soldier cannot defend or attack from the destination');
 assert.equal(s.cities.reduce((n,c)=>n+c.units.reduce((m,u)=>m+u.troops,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops,0),troops);
 assert.equal(s.armies.some(a=>a.faction==='yuan'&&a.target===target.id),false);validateStrategicAI(s);
 const resumed=JSON.parse(serializeCampaign(s));
 for(let i=0;i<3;i++)for(const world of [s,resumed]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.equal(serializeCampaign(resumed),serializeCampaign(s),'preparation and real troop transfers survive a deterministic reload');
});

test('a stalled middle game front concentrates real troops before the late game without counting arrivals early',()=>{
 const {s,home,target}=concentratedFront({rearDistance:1600});s.turn=21;s.campaign.day=201;initializeStrategicAI(s);
 const before=home.units.reduce((n,u)=>n+u.troops,0);planStrategicAI(s);
 const g=s.campaign.ai.factions.yuan.strategy.goal;
 assert.match(g.candidateId,/^capture-assembly:/);assert.equal(g.status,'preparing');
 assert.ok(s.campaign.idle.some(o=>o.destination===home.id&&o.unit.troops>0));
 assert.equal(home.units.reduce((n,u)=>n+u.troops,0),before);
 assert.equal(s.armies.some(a=>a.faction==='yuan'&&a.target===target.id),false);
 assert.equal(g.planId,null);validateStrategicAI(s);
 const copy=JSON.parse(serializeCampaign(s));
 for(let i=0;i<3;i++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 for(let i=0;i<45&&!s.campaign.battles.some(b=>b.cityId===target.id);i++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.ok(s.campaign.battles.some(b=>b.cityId===target.id),'actually arrived troops must reach a real defended-city battle after the next turn review');
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('early game capacity does not enable the middle game concentration fallback',()=>{
 const {s}=concentratedFront({rearDistance:1600});s.turn=20;s.campaign.day=191;initializeStrategicAI(s);planStrategicAI(s);
 assert.equal(s.campaign.ai.factions.yuan.strategy.goal.candidateId.startsWith('capture-assembly:'),false);
});

test('an observed empty city does not acquire a fictional siege after the expedition departs',()=>{
 const {s,home,target}=planningFront();s.campaign.allAI=true;
 home.units=[{...makeOfficer('person-715',1400,0,1),type:'archer',homeCity:home.id}];home.grain=40000;home.gold=20000;
 target.owner='neutral';target.domestic.owner='neutral';target.units=[];target.gold=0;target.manpower=0;gateDurability(target).hp=15000;
 s.roads=[[home.id,target.id]];s.roadSegments[[home.id,target.id].sort().join(':')]={distance:30};
 initializeVision(s);initializeStrategicAI(s);planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.equal(p.phase,'attack');
 const copy=JSON.parse(serializeCampaign(s));
 for(let i=0;i<3;i++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.equal(p.phase,'attack',p.reason);assert.equal(p.military.estimatedLosses,0);assert.equal(p.military.recovery.feasible,true);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));validateStrategicAI(s);
});

test('forward concentration cannot promise missing grain or transfer across an unsafe road',()=>{
 for(const blocked of ['grain','route']){
  const {s,home,sources}=concentratedFront({rearDistance:1600});
  if(blocked==='grain')home.grain=0;
  else for(const c of sources.slice(1)){c.owner='cao';c.domestic.owner='cao';}
  updateVision(s);planStrategicAI(s);
  assert.equal(s.campaign.ai.factions.yuan.strategy.goal.candidateId.startsWith('capture-assembly:'),false);
  assert.equal(s.campaign.idle.some(o=>o.faction==='yuan'&&o.destination===home.id&&o.unit.troops>0),false,JSON.stringify(s.campaign.ai.decisions.slice(0,6)));
 }
});

test('a ready lawful attack cannot be displaced by optional forward concentration',()=>{
 const {s,home,target,sources}=concentratedFront({rearDistance:1600}),open=s.cities.find(c=>![...sources,target].includes(c));
 const source=sources[1];open.x=source.x-4;open.y=source.y;
 s.roads.push([source.id,open.id]);s.roadSegments[[source.id,open.id].sort().join(':')]={distance:1};
 const cleanup=registerStrategicAlgorithm('goalEvaluator',{id:'test-ready-before-concentration-v1',run:({candidate:c})=>({score:c.kind==='capture'?(c.ready?10:100):0})});
 try{
  setStrategicAlgorithms(s,{goalEvaluator:'test-ready-before-concentration-v1'});updateVision(s);planStrategicAI(s);
  const goal=s.campaign.ai.factions.yuan.strategy.goal;
  assert.equal(goal.targetCity,open.id);assert.ok(goal.planId);assert.notEqual(goal.status,'preparing');
  assert.ok(s.armies.some(a=>a.faction==='yuan'&&a.target===open.id));
  assert.equal(goal.requirements.some(r=>r.cityId===home.id&&r.defensePower>0),false);
  // Ordinary staffing may transfer a real city unit to an economic vacancy.
  // The prohibited detour here is military concentration for the other target.
  assert.equal(s.campaign.ai.decisions.some(d=>d.faction==='yuan'&&d.kind==='transfer'&&d.target===home.id&&d.reason.includes('主攻准备')),false);
  validateStrategicAI(s);
 }finally{cleanup();}
});

test('real carried grain bridges a finite unsupported camp without requiring every route segment to supply the whole trip',()=>{
 const {s,home,target,rear}=planningFront();home.grain=50000;rear.grain=0;target.grain=0;
 home.units[0].troops=1000;home.units[0].type='cavalry';home.units[0].equipment.siege=null;
 const a={...cityForce(home),units:[home.units[0]],roadPolicy:'main'},junction={id:'bridge-junction',kind:'junction',name:'测试路口',x:4,y:0};
 s.junctions=[junction];s.roads=[[home.id,junction.id],[junction.id,target.id]];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:91};updateVision(s);
 assert.equal(supplyConnection(s,{...a,location:target.id},{siegeEndpoint:target.id}),null,'the enemy camp really lies beyond the current supply range');
 const route=[junction.id,target.id],before=serializeCampaign(s),r=forecastRouteSupply(s,a,route,170,{attack:true});
 assert.ok(r.feasible,'partial real resupply plus carried grain should cover the unsupported outward leg, camp and return');assert.ok(r.delivered>0);
 assert.ok(r.sourceRequirements.every(x=>x.cityId===home.id));assert.equal(serializeCampaign(s),before);
 a.units[0].troops=3000;assert.equal(forecastRouteSupply(s,a,route,170,{attack:true}).feasible,false,'larger real ration demand cannot reuse the same minimum carry');a.units[0].troops=1000;
 home.grain=900;assert.equal(forecastRouteSupply(s,a,route,170,{attack:true}).feasible,false,'loading carry and home rations cannot reuse the depot stock');
 target.grain=1000000;assert.equal(forecastRouteSupply(s,a,route,170,{attack:true}).feasible,false,'enemy stores cannot become supply');
});

test('sustained refill capacity reduces a long operation burden within a bound without altering losses or food',()=>{
 const input={facts:{target:{kind:'city',commerce:3,grain:0},work:[],duration:30,relieveBorder:false,defense:0,victoryValue:{score:50},recovery:{projectedCoverage:1}},prediction:{estimatedLosses:1000,consumedGrain:1500,replacementGold:500,militaryGold:100},profile:{developmentWeight:1},rules:ECONOMY_RULES.ai.offensive},before=structuredClone(input);
 const shallow=evaluateCostBenefitV3(input);input.facts.recovery.projectedCoverage=2;const sustained=evaluateCostBenefitV3(input);
 assert.ok(sustained.score>shallow.score);assert.equal(sustained.benefit,shallow.benefit);assert.deepEqual(input.prediction,before.prediction);
 input.facts.recovery.projectedCoverage=100;assert.deepEqual(evaluateCostBenefitV3(input),sustained,'the depth discount cannot grow indefinitely');
});
