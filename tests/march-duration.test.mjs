import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,orderCampaignArmy,beginExecution,advanceCampaignDay,advanceCampaignStep,serializeCampaign,validateCampaign,activeBattles,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {movementPoints,marchItinerary,remainingMarchDays,roadCost,roadDistance,chosenRoad} from '../strategic-movement.mjs';
import {strategicTravelDays} from '../strategic-ai.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {resourceRecipe} from '../scripts/resource-recipe.mjs';

for(const [type,expected] of [['spear',42],['cavalry',28],['siege',73]]){
 test(`Xinye–Runan ${type} takes ${expected} marching days on the real national map`,()=>{
  const s=newCampaign(217,'guandu-200','force-7'),home=s.cities.find(c=>c.id==='town-29');
  const a=fieldFromCity(s,home.id,{ids:[home.units[0].id]});
  resourceRecipe(a.units[0],type);initializeTacticLearning(a.units[0],s.seed);
  a.morale=80;a.hunger=0;
  const trip=marchItinerary(s,a.location,['runan'],a);
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

test('sub-one daily movement retains its full remaining road time',()=>{
 const s=newCampaign(217,'guandu-200'),from='town-29',to='runan';
 const a={leader:'u',morale:80,hunger:0,units:[{id:'u',type:'spear',troops:1000,leadership:80,equipment:{siege:'ram',ship:null}}],travel:{from,to,road:'main',progress:roadDistance(s,from,to)/2}};
 const speed=movementPoints(a);assert.ok(speed>0&&speed<1);
 assert.equal(remainingMarchDays(s,a),Math.ceil(roadCost(s,from,to)/2/speed));
 assert.ok(remainingMarchDays(s,a)>Math.ceil(roadCost(s,from,to)/2));
});

test('army itinerary uses each actual land or water speed instead of reusing land speed',()=>{
 const s=newCampaign(217,'guandu-200'),water=s.roads.find(([a,b])=>chosenRoad(s,a,b).terrain==='water');
 const [port,other]=water,land=s.roads.find(e=>e.includes(port)&&chosenRoad(s,...e).terrain==='land'),from=land.find(id=>id!==port);
 const a={leader:'u',morale:80,hunger:0,units:[{id:'u',type:'spear',troops:1000,leadership:80,equipment:{siege:null,ship:'ship'}}]};
 const trip=marchItinerary(s,from,[port,other],a),waterSpeed=movementPoints({...a,travel:{terrain:'water'}});
 assert.ok(waterSpeed>movementPoints(a));
 assert.equal(trip.legs[0].days,Math.ceil(roadCost(s,from,port)/movementPoints(a)));
 assert.equal(trip.legs[1].days,Math.ceil(roadCost(s,port,other)/waterSpeed));
 assert.equal(strategicTravelDays(s,a,[port,other],from),trip.days);
});

test('an ordinary adjacent-city march reaches an actual defended battle after three to five turns',()=>{
 const s=newCampaign(81,'guandu-200'),home=s.cities.find(c=>c.id==='chenliu');
 const a=fieldFromCity(s,home.id,{ids:[home.units[0].id]});
 const expected=strategicTravelDays(s,a,['ye']);assert.ok(expected>=30&&expected<=50);
 assert.ok(s.cities.find(c=>c.id==='ye').units.some(u=>u.troops>0));
 assert.equal(orderCampaignArmy(s,a.id,'ye'),null);
 const battle=()=>s.campaign.battles.find(b=>b.armyIds.includes(a.id));let copy;
 for(let d=1;d<=expected&&!battle();d++){
  for(const state of [s,copy].filter(Boolean)){
   state.campaign.ai.lastPlanDay=state.campaign.day;
   if(state.campaign.phase==='planning')beginExecution(state);
   for(const b of activeBattles(state).filter(b=>b.awaiting))chooseEncounter(state,b.id,false);
   advanceCampaignDay(state);
  }
  if(d===20)copy=validateCampaign(JSON.parse(serializeCampaign(s)));
  if(copy)assert.equal(serializeCampaign(copy),serializeCampaign(s));
  if(d<expected)assert.equal(battle(),undefined);
 }
 assert.ok(battle(),'the real marching army must reach the actual defended city');
 assert.equal(battle().startedDay,expected);
});
