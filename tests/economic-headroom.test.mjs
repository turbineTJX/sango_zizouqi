import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {BUILDING_DESIGNS} from '../data/design/buildings.mjs';
import {trainingCost} from '../troop-training.mjs';
import {foodConsumption} from '../army-supply.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';

test('original scenarios share player and AI headroom while neutral cities start with small local stocks',()=>{
 for(const spec of NATIONAL_SCENARIOS){
  const s=newCampaign(20261011,spec.id),observer=newCampaign(20261011,spec.id,spec.factions[0],{allAI:true});
  for(const c of s.cities){
   const size=c.citySize==='small'?'small':'large',opening=c.owner==='neutral'?ECONOMY_RULES.neutralOpening:ECONOMY_RULES.opening;assert.equal(c.gold,opening.gold[size]);
   assert.equal(c.manpower,opening.manpower[size]);assert.ok(c.grain>=opening.grain[size]&&c.grain<=20000);
   if(c.owner==='neutral')assert.equal(c.grain,opening.grain[size]);
   const other=observer.cities.find(o=>o.id===c.id);assert.deepEqual([other.gold,other.grain,other.manpower],[c.gold,c.grain,c.manpower]);
  }
  assert.equal(s.gold,s.cities.filter(c=>c.owner===s.campaign.playerFaction).reduce((n,c)=>n+c.gold,0));
  const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 }
});
test('a large city can develop and retry while forming a normal army, but cannot finance every wish',()=>{
 const initial=ECONOMY_RULES.opening.gold.large;
 const development=['commerce','farm','barracks'].reduce((n,k)=>n+BUILDING_DESIGNS[k].cost,0);
 const army=3*trainingCost('cavalry',3000);
 const retry=development;assert.ok(initial-army-development-retry>=ECONOMY_RULES.budget.goldReserve);
 assert.ok(6*trainingCost('cavalry',3000)+development+ECONOMY_RULES.budget.goldReserve>initial);
 assert.ok(ECONOMY_RULES.opening.manpower.large>=9000);
});
test('larger armies and advanced equipment retain real recurring money and ration demand',()=>{
 const ordinary={type:'spear',equipment:{siege:null,ship:null}},equipped={type:'cavalry',equipment:{siege:'tower',ship:'ship'}};
 assert.ok(trainingCost(equipped,3000)>3*trainingCost(ordinary,3000));
 assert.equal(foodConsumption(18000)*60,10800);assert.equal(foodConsumption(36000)*60,21600);
 assert.ok(foodConsumption(36000)*60>ECONOMY_RULES.opening.grain.large);
 assert.ok(trainingCost(equipped,9000)>ECONOMY_RULES.opening.gold.large);
});
test('opening resources reject fractional, missing or inverted city budgets',()=>{
 for(const mutate of [t=>t.economy.opening.gold.large=1.5,t=>delete t.economy.opening.grain.small,t=>t.economy.opening.manpower.small=30000]){
  const tables=structuredClone(DESIGN_TABLES);mutate(tables);assert.ok(validateDesignTables(tables).some(e=>e.includes('economy.opening')));
 }
});

test('neutral stocks and military occupation reject excess, fractional, missing or full retention designs',()=>{
 for(const mutate of [t=>t.economy.neutralOpening.gold.large=3000,t=>t.economy.neutralOpening.manpower.small=.5,t=>delete t.economy.neutralOpening.grain.small,t=>t.economy.occupation.goldRetention=1,t=>t.economy.occupation.grainRetention=-.1,t=>t.economy.occupation.manpowerRetention=NaN,t=>t.economy.occupation.unknown=.2]){
  const tables=structuredClone(DESIGN_TABLES);mutate(tables);assert.ok(validateDesignTables(tables).some(e=>e.includes('economy.neutralOpening')||e.includes('economy.occupation')));
 }
});
