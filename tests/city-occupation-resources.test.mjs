import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignStep,settleCityEconomy,serializeCampaign,validateCampaign,activeBattles} from '../strategic-campaign.mjs';
import {openingCityResources,cityCaptureResources,syncResourceTotals} from '../city-resources.mjs';
import {cityBaseIncome,cityIncomeBreakdown} from '../economy.mjs';
import {observedTargetStockValue} from '../strategic-ai.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {siegeMobilizationFixture} from './helpers/siege-mobilization.mjs';
import {transferOfficer} from '../strategic-campaign.mjs';
import {siegeDefenseCandidates} from '../siege-defense.mjs';
import {recruitmentLimit} from '../domestic.mjs';

const stocks=c=>Object.fromEntries(['gold','grain','manpower'].map(k=>[k,c[k]]));
const receiptAt=(s,id)=>s.campaign.activity.nodes.find(n=>n.category==='occupation'&&n.cityId===id&&n.phase==='captured')?.result.resources;
const reload=s=>validateCampaign(JSON.parse(serializeCampaign(s)));

test('neutral city stocks stay small over twenty economic turns and production starts only after ownership changes',()=>{
 const s=newCampaign(20261020,'guandu-200','cao',{allAI:true}),cities=s.cities.filter(c=>c.owner==='neutral');assert.ok(cities.length);
 for(let turn=1;turn<=20;turn++)for(const c of cities){
  const before=stocks(c);assert.deepEqual(before,openingCityResources(c));assert.deepEqual(cityBaseIncome(s,c),{gold:0,grain:0,manpower:0});
  assert.deepEqual(cityIncomeBreakdown(s,c).recurring,{gold:0,grain:0,manpower:0});settleCityEconomy(s,c);assert.deepEqual(stocks(c),before);
 }
 const c=cities[0];c.owner='cao';assert.ok(cityBaseIncome(s,c).gold>0&&cityBaseIncome(s,c).manpower>0);
});

for(const owner of ['neutral','enemy'])for(const allAI of [false,true])test(`${owner} empty occupation debits stocks once under ${allAI?'AI':'player'} attack and records the real handover`,()=>{
 const {s,c,a}=siegeMobilizationFixture({allAI}),actualOwner=owner==='neutral'?'neutral':c.owner;
 // Move actual residents away; leave a stocked but legally undefended city.
 c.governor=null;const destination=s.cities.find(t=>t.owner===c.owner&&t.id!==c.id).id;
 for(const o of siegeDefenseCandidates(s,c.id))assert.equal(transferOfficer(s,o.unit.id,destination,{scheduled:true,faction:c.owner}),null);
 c.owner=actualOwner;c.domestic.owner=actualOwner;Object.assign(c,{gold:10001,grain:17003,manpower:19007});syncResourceTotals(s);
 advanceCampaignStep(s);assert.equal(c.owner,a.faction);assert.equal(activeBattles(s).length,0);
 const receipt=receiptAt(s,c.id);assert.ok(receipt);assert.deepEqual(receipt,cityCaptureResources({...c,owner:actualOwner,...receipt.before}));
 assert.deepEqual(receipt.retained,owner==='neutral'?{gold:500,grain:1500,manpower:200}:{gold:5000,grain:8501,manpower:3801});
 assert.equal(c.gold,receipt.retained.gold);assert.equal(c.manpower,receipt.retained.manpower);
 // The arriving army's own remaining rations are unloaded separately.
 assert.equal(c.grain,receipt.retained.grain+a.supply);
 for(const key of ['gold','grain','manpower'])assert.equal(receipt.before[key],receipt.retained[key]+receipt.lost[key]);
 if(owner==='neutral'){const cap=openingCityResources({...c,owner:actualOwner});for(const key of ['gold','grain','manpower'])assert.ok(receipt.retained[key]<=Math.floor(cap[key]*ECONOMY_RULES.occupation[key+'Retention']));}
 const copy=reload(s),before=stocks(c);assert.deepEqual(stocks(copy.cities.find(t=>t.id===c.id)),before);
 advanceCampaignStep(s);advanceCampaignStep(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 assert.equal(s.campaign.activity.nodes.filter(n=>n.category==='occupation'&&n.cityId===c.id&&n.phase==='captured').length,1);
 const bad=JSON.parse(serializeCampaign(s));bad.campaign.activity.nodes.find(n=>n.category==='occupation'&&n.cityId===c.id&&n.phase==='captured').result.resources.retained.gold++;
 assert.throws(()=>validateCampaign(bad),/记录无效/);
});

test('an autonomous siege applies the same stock losses only after the attacker actually wins',()=>{
 const {s,c,a}=siegeMobilizationFixture({zeroPrepared:true});
 c.units[0].troops=1000;c.drafted=recruitmentLimit(c);Object.assign(c,{gold:10001,grain:17003,manpower:19007});syncResourceTotals(s);
 advanceCampaignStep(s);const battle=s.campaign.battles.find(r=>r.cityId===c.id);assert.ok(battle);assert.equal(c.owner,'yuan');assert.equal(receiptAt(s,c.id),undefined);
 for(let step=0;!battle.settled&&step<1000;step++){
  s.campaign.ai.lastPlanDay=s.campaign.day;s.campaign.diplomacy.lastDay=s.campaign.day;
  if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignStep(s);
 }
 assert.equal(battle.settled,true);assert.equal(battle.report.winner,battle.attackSide);assert.equal(c.owner,a.faction);
 const receipt=receiptAt(s,c.id);assert.ok(receipt);assert.equal(receipt.retained.gold,Math.floor(receipt.before.gold*.5));assert.equal(receipt.retained.manpower,Math.floor(receipt.before.manpower*.2));
 assert.equal(c.gold,receipt.retained.gold);assert.equal(c.manpower,receipt.retained.manpower);reload(s);
 const before=stocks(c);advanceCampaignStep(s);assert.deepEqual(stocks(c),before);
});

test('fresh intelligence values only receivable stocks, without changing the report or reading hidden state',()=>{
 const intel={known:true,observedDay:1},target={owner:'yuan',gold:2000,grain:6000,manpower:9000},before=structuredClone(target);
 assert.equal(observedTargetStockValue(intel,target,1),(1000+3000*.13)*.35/100);
 const neutral={...target,owner:'neutral',citySize:'small'};
 assert.equal(observedTargetStockValue(intel,neutral,1),(250+750*.13)*.35/100);
 assert.deepEqual(target,before);assert.equal(observedTargetStockValue({...intel,known:false},target,1),0);assert.equal(observedTargetStockValue(intel,target,5),0);
});
