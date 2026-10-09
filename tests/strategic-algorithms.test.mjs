import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {registerStrategicAlgorithm,setStrategicAlgorithms,listStrategicAlgorithms,runStrategicAlgorithm} from '../strategic-algorithms.mjs';
import {planStrategicAI,evaluateOffensive} from '../strategic-ai.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {chooseFactionStrategy,newFactionStrategy} from '../strategic-policy.mjs';
import {forecastStrategicPreparation} from '../strategic-forecast.mjs';
import {serializeCampaign,validateCampaign,newCampaign} from '../strategic-campaign.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {predictAttritionV1} from '../strategic-algorithm-defaults.mjs';
import {initializeVision} from '../strategic-vision.mjs';

const goal=(home,target,score=30)=>({kind:'capture',targetFaction:'cao',targetCity:target.id,staging:home.id,ready:true,score,reason:'合法候选'});
const proposal=({home,target})=>({faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,-1),days:0}],assaultDays:1,siegeDays:0});

test('goal scoring and candidate selection can be replaced independently without mutating inputs',()=>{
 const {s,home,target,rear}=planningFront(),context=strategicContext(s,'yuan'),candidates=[goal(home,target,60),goal(home,rear,30)],before=JSON.stringify({context,candidates});
 const cleanup=registerStrategicAlgorithm('goalEvaluator',{id:'test-favor-rear-v1',run:({candidate})=>({score:candidate.targetCity===rear.id?100:0})});
 try{const g=chooseFactionStrategy(context,{},newFactionStrategy(),candidates,{algorithms:{...R.algorithms,goalEvaluator:'test-favor-rear-v1'}});assert.equal(g.goal.targetCity,rear.id);assert.equal(g.trace[0].algorithms.goalEvaluator,'test-favor-rear-v1');}
 finally{cleanup();}
 const stop=registerStrategicAlgorithm('selector',{id:'test-last-choice-v1',run:({candidates})=>candidates.at(-1).id});
 try{assert.equal(chooseFactionStrategy(context,{},newFactionStrategy(),candidates,{algorithms:{...R.algorithms,selector:'test-last-choice-v1'}}).goal.kind,'develop');}
 finally{stop();}
 assert.equal(JSON.stringify({context,candidates}),before);
});

test('the selected force variant is the exact legal composition sent to the shared executor',()=>{
 const {s,target}=planningFront();target.units=[];let chosen;
 const cleanup=registerStrategicAlgorithm('selector',{id:'test-large-force-v1',run:({candidates})=>{
  const capture=candidates.filter(c=>c.kind==='capture').sort((a,b)=>b.forces.unitCount-a.forces.unitCount)[0];
  if(capture)chosen=capture;return capture?.id||candidates[0].id;
 }});
 try{assert.equal(setStrategicAlgorithms(s,{selector:'test-large-force-v1'}),null);planStrategicAI(s);
  const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(p.officerIds.length,chosen.forces.unitCount);assert.ok(p.officerIds.length>1);
  assert.equal(s.campaign.ai.factions.yuan.strategy.goal.candidateId,chosen.id);
  assert.ok(s.armies.some(a=>a.faction==='yuan'&&a.units.length===chosen.forces.unitCount));
 }finally{cleanup();}
});

test('an optimistic evaluator cannot override source budgets, staffing or physical supply constraints',()=>{
 const fixture=planningFront(),{s,home}=fixture;home.gold=0;
 const cleanup=registerStrategicAlgorithm('offensiveEvaluator',{id:'test-optimistic-v1',run:()=>({score:100000,benefit:100000,cost:0,workCost:0})});
 try{setStrategicAlgorithms(s,{offensiveEvaluator:'test-optimistic-v1'});const before=serializeCampaign(s),result=evaluateOffensive(s,proposal(fixture));assert.equal(result.accepted,false);assert.match(result.reason,/补兵金/);assert.equal(serializeCampaign(s),before);}
 finally{cleanup();}
});

test('algorithm requests are frozen value DTOs and malformed scores or invented candidates are rejected',()=>{
 const {s,home,target}=planningFront(),context=strategicContext(s,'yuan'),profile={...R.algorithms};
 const bad=registerStrategicAlgorithm('goalEvaluator',{id:'test-mutation-v1',run:({context})=>{assert.equal('seed' in context,false);assert.equal('campaign' in context,false);context.ownCities[0].gold=999999;return {score:0};}});
 try{assert.throws(()=>chooseFactionStrategy(context,{},newFactionStrategy(),[goal(home,target)],{algorithms:{...profile,goalEvaluator:'test-mutation-v1'}}),TypeError);}finally{bad();}
 for(const [kind,id,run,input]of [
  ['selector','test-invented-v1',()=> 'fabricated',{candidates:[{id:'legal'}]}],
  ['goalEvaluator','test-nan-v1',()=>({score:NaN}),{}],
  ['battlePredictor','test-invalid-loss-v1',()=>({estimatedLosses:101,consumedGrain:0,replacementGold:0,militaryGold:0,counterPower:0}),{facts:{men:100}}],
 ]){const cleanup=registerStrategicAlgorithm(kind,{id,run});try{assert.throws(()=>runStrategicAlgorithm(kind,{...profile,[kind]:id},input),/输出无效/);}finally{cleanup();}}
 assert.throws(()=>registerStrategicAlgorithm('selector',{id:'utility-v1',run:()=>''}),/已注册/);
 assert.throws(()=>registerStrategicAlgorithm('selector',{id:'test-async-v1',run:async()=>''}),/同步/);
});

test('preparation prediction is replaceable but receipts stay hypothetical and its horizon is bounded',()=>{
 const {s,home}=planningFront(),context=strategicContext(s,'yuan'),before=serializeCampaign(s),requirements=[{cityId:home.id,gold:home.gold+1000,grain:0,manpower:0}];
 const cleanup=registerStrategicAlgorithm('preparationPredictor',{id:'test-soon-v1',run:({context})=>({feasible:true,readyDay:context.day+2,reason:'假设性预测'})});
 try{const result=forecastStrategicPreparation(context,requirements,{...R.algorithms,preparationPredictor:'test-soon-v1'});assert.equal(result.readyDay,context.day+2);assert.equal(serializeCampaign(s),before);}finally{cleanup();}
 const invalid=registerStrategicAlgorithm('preparationPredictor',{id:'test-unbounded-v1',run:({context})=>({feasible:true,readyDay:context.day+1000,reason:'越界'})});
 try{assert.throws(()=>forecastStrategicPreparation(context,requirements,{...R.algorithms,preparationPredictor:'test-unbounded-v1'}),/输出无效/);}finally{invalid();}
});

test('algorithm identity persists in saves and missing implementations or malformed configurations fail closed',()=>{
 const s=newCampaign(71,'guandu-200','cao',{allAI:true}),saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 const unknown=JSON.parse(saved);unknown.campaign.ai.algorithms.selector='missing-v1';assert.throws(()=>validateCampaign(unknown),/算法/);
 const absent=JSON.parse(saved);delete absent.campaign.ai.algorithms;assert.throws(()=>validateCampaign(absent),/战略AI/);
 const before=serializeCampaign(s);assert.match(setStrategicAlgorithms(s,{selector:'missing-v1'}),/算法/);assert.equal(serializeCampaign(s),before);
 s.campaign.phase='executing';assert.match(setStrategicAlgorithms(s,{selector:'utility-v1'}),/筹划/);
 assert.ok(listStrategicAlgorithms().selector.includes('utility-v1'));
});

test('switching selectors keeps an already executing plan committed to its actual armies',()=>{
 const {s}=planningFront();planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan'),id=p.id;
 const cleanup=registerStrategicAlgorithm('selector',{id:'test-development-v1',run:({candidates})=>(candidates.find(c=>c.kind==='develop'||c.kind==='recover')||candidates[0]).id});
 try{assert.equal(setStrategicAlgorithms(s,{selector:'test-development-v1'}),null);s.campaign.day++;planStrategicAI(s);
  assert.equal(s.campaign.ai.factions.yuan.strategy.goal.planId,id);assert.equal(s.campaign.ai.factions.yuan.strategy.goal.kind,'capture');assert.equal(p.phase,'attack');
  assert.equal(s.campaign.ai.factions.yuan.strategy.trace.at(-1).algorithms.selector,'test-development-v1');
 }finally{cleanup();}
});

test('a substituted battle model receives dated lawful intelligence, never hidden stocks or RNG',()=>{
 const fixture=planningFront(),{s,target}=fixture;target.x=500;initializeVision(s);const requests=[];
 const cleanup=registerStrategicAlgorithm('battlePredictor',{id:'test-observation-v1',run:input=>{requests.push(structuredClone(input));return predictAttritionV1(input);}});
 try{setStrategicAlgorithms(s,{battlePredictor:'test-observation-v1'});const first=evaluateOffensive(s,proposal(fixture));
  target.gold=999999;target.grain=999999;target.units.forEach(u=>u.troops*=10);s.seed+=999;
  assert.deepEqual(evaluateOffensive(s,proposal(fixture)),first);assert.deepEqual(requests[1],requests[0]);
  assert.equal(requests[0].facts.intelligence.known,false);assert.equal(requests[0].facts.intelligence.observedDay,null);
  assert.equal('seed' in requests[0].facts,false);assert.equal('campaign' in requests[0].facts,false);
 }finally{cleanup();}
});
