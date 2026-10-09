import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,orderCampaignArmy,beginExecution,advanceCampaignDay,advanceCampaignStep,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {movementPoints,marchItinerary} from '../strategic-movement.mjs';
import {strategicTravelDays} from '../strategic-ai.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {resourceRecipe} from '../scripts/resource-recipe.mjs';

for(const [type,expected] of [['spear',8],['cavalry',6],['siege',14]]){
 test(`Xinye–Runan ${type} takes ${expected} marching days on the real national map`,()=>{
  const s=newCampaign(217,'guandu-200','force-7'),home=s.cities.find(c=>c.id==='town-29');
  const a=fieldFromCity(s,home.id,{ids:[home.units[0].id]});
  resourceRecipe(a.units[0],type);initializeTacticLearning(a.units[0],s.seed);
  a.morale=80;a.hunger=0;
  const trip=marchItinerary(s,a.location,['runan'],movementPoints(a));
  assert.equal(trip.days,expected);assert.equal(strategicTravelDays(s,a,['runan']),expected);
  assert.equal(orderCampaignArmy(s,a.id,'runan'),null);
  let restored;
  for(let day=1;day<=expected;day++){
   // Isolate the journey from unrelated AI orders, retaining real supply,
   // daily movement, occupation and save validation.
   for(const state of [s,restored].filter(Boolean)){
    state.campaign.ai.lastPlanDay=state.campaign.day;
    if(state.campaign.phase==='planning')beginExecution(state);
    if(day===2){advanceCampaignStep(state);}
   }
   if(day===2)restored=validateCampaign(JSON.parse(serializeCampaign(s)));
   for(const state of [s,restored].filter(Boolean))advanceCampaignDay(state);
   if(restored)assert.equal(serializeCampaign(s),serializeCampaign(restored));
   if(day<expected){assert.equal(a.location,'town-29');assert.ok(a.travel.progress>0);assert.equal(s.cities.find(c=>c.id==='runan').owner,'neutral');}
  }
  assert.equal(a.location,'runan');assert.equal(a.travel,null);
  assert.equal(s.campaign.day,expected+1);assert.equal(s.cities.find(c=>c.id==='runan').owner,a.faction);
  validateCampaign(JSON.parse(serializeCampaign(s)));
 });
}

test('even maximum-command cavalry with a forced-march multiplier cannot cross Xinye–Runan in one day',()=>{
 const s=newCampaign(217,'guandu-200');
 const a={leader:'plain',morale:100,hunger:0,units:[{id:'plain',type:'cavalry',troops:1000,leadership:100}]};
 assert.ok(marchItinerary(s,'town-29',['runan'],movementPoints(a)*1.35).days>=4);
});
