import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWarTempo} from '../strategic-tempo.mjs';
import {assessRecoveryCapacity,continuationAdvantageRequirement,recoveryAdvantageRequirement} from '../strategic-recovery.mjs';
import {recoveryCityFacts,strategicContext} from '../strategic-context.mjs';
import {planStrategicAI,strategicCityBudget,validateStrategicAI,initializeStrategicAI,observedTargetStockValue} from '../strategic-ai.mjs';
import {strategicDemand} from '../strategic-policy.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {serializeCampaign,beginExecution,advanceCampaignDay,launchExpedition} from '../strategic-campaign.mjs';
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
 const enemyIds=new Set(target.units.map(u=>u.id)),ids=Object.keys(OFFICER_BY_ID).filter(id=>!enemyIds.has(id));let at=0;
 for(const [i,c]of sources.entries()){
  Object.assign(c,{owner:'yuan',x:-i*8,y:0,gold:50000,grain:50000,manpower:30000,granary:6});c.domestic.owner='yuan';gateDurability(c).hp=100000;
  c.units=Array.from({length:7},(_,n)=>({...makeOfficer(ids[at++],3000,n,3),homeCity:c.id}));
 }
 target.units.forEach(u=>u.troops=6500);target.gold=0;target.manpower=0;target.commerce=10;
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[c.id,home.id])];for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 s.turn=61;s.campaign.day=601;
 initializeVision(s);initializeStrategicAI(s);planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p,'a feasible mature operation should exist');assert.equal(p.columnUnits,6);assert.ok(p.officerIds.length>6);
 assert.ok(p.origins.length>1);assert.equal(p.phase,'assemble');const selected=[...p.officerIds];
 for(let i=0;i<6&&p.phase!=='attack';i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(p.phase,'attack',p.reason);
 const columns=s.armies.filter(a=>a.faction==='yuan'&&a.units.some(u=>selected.includes(u.id)));
 assert.ok(columns.length>=2);assert.ok(columns.every(a=>a.target===target.id&&a.units.length<=6));
 assert.equal(new Set(columns.flatMap(a=>a.units.map(u=>u.id))).size,selected.length);validateStrategicAI(s);
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
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[home.id,c.id]),[rear.id,second.id]];for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};
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

test('real carried grain bridges a finite unsupported camp without requiring every route segment to supply the whole trip',()=>{
 const {s,home,target,rear}=planningFront();home.grain=50000;rear.grain=0;target.grain=0;
 const a={...cityForce(home),units:[home.units[0]],roadPolicy:'main'},junction={id:'bridge-junction',kind:'junction',name:'测试路口',x:4,y:0};
 s.junctions=[junction];s.roads=[[home.id,junction.id],[junction.id,target.id]];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:100};updateVision(s);
 assert.equal(supplyConnection(s,{...a,location:target.id},{siegeEndpoint:target.id}),null,'the enemy camp really lies beyond the current supply range');
 const route=[junction.id,target.id],before=serializeCampaign(s),r=forecastRouteSupply(s,a,route,60,{attack:true});
 assert.ok(r.feasible,'partial real resupply plus carried grain should cover the unsupported outward leg, camp and return');assert.ok(r.delivered>0);
 assert.ok(r.sourceRequirements.every(x=>x.cityId===home.id));assert.equal(serializeCampaign(s),before);
 assert.equal(forecastRouteSupply(s,a,route,100,{attack:true}).feasible,false,'carry must not support an indefinite isolated siege');
 home.grain=900;assert.equal(forecastRouteSupply(s,a,route,60,{attack:true}).feasible,false,'loading carry and home rations cannot reuse the depot stock');
 target.grain=1000000;assert.equal(forecastRouteSupply(s,a,route,60,{attack:true}).feasible,false,'enemy stores cannot become supply');
});

test('sustained refill capacity reduces a long operation burden within a bound without altering losses or food',()=>{
 const input={facts:{target:{kind:'city',commerce:3,grain:0},work:[],duration:30,relieveBorder:false,defense:0,victoryValue:{score:50},recovery:{projectedCoverage:1}},prediction:{estimatedLosses:1000,consumedGrain:1500,replacementGold:500,militaryGold:100},profile:{developmentWeight:1},rules:ECONOMY_RULES.ai.offensive},before=structuredClone(input);
 const shallow=evaluateCostBenefitV3(input);input.facts.recovery.projectedCoverage=2;const sustained=evaluateCostBenefitV3(input);
 assert.ok(sustained.score>shallow.score);assert.equal(sustained.benefit,shallow.benefit);assert.deepEqual(input.prediction,before.prediction);
 input.facts.recovery.projectedCoverage=100;assert.deepEqual(evaluateCostBenefitV3(input),sustained,'the depth discount cannot grow indefinitely');
});
