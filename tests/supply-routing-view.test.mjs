import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,supplyConnection,dailyConsumption,serializeCampaign,advanceCampaignDay,activeBattles} from '../strategic-campaign.mjs';
import {intelligenceWorld,supplyRoutingWorld,updateVision} from '../strategic-vision.mjs';
import {citySupplyBudgets,withCitySupplyQueries} from '../city-logistics.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';

function originalBudgets(s){
 const views=new Map();return s.armies.filter(a=>!a.disbanded).map(a=>{
  if(!views.has(a.faction)){const view=intelligenceWorld(s,a.faction);views.set(a.faction,{view,empty:{...view,cities:view.cities.map(c=>c.grain>0?c:{...c,grain:1})}});}
  const {view,empty}=views.get(a.faction);return {army:a,link:supplyConnection(view,a)||supplyConnection(empty,a),need:dailyConsumption(s,a)};
 });
}
test('depot view preserves canonical fog, dated city and army observations without projecting personnel or history',()=>{
 const s=newCampaign(81,'guandu-200'),own=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye');
 for(const location of [own.location,'ye']){
  enemy.location=location;enemy.route=['secret-order'];enemy.target='hidden-target';s.campaign.day++;updateVision(s);
  const before=serializeCampaign(s);
  for(const faction of ['cao','yuan'])withCitySupplyQueries(s,()=>{
   const full=intelligenceWorld(s,faction),routing=supplyRoutingWorld(s,faction);
   assert.deepEqual(routing.cities,full.cities);assert.deepEqual(routing.armies,full.armies);assert.deepEqual(routing.campaign.battles,full.campaign.battles);
   assert.equal(routing.campaign.diplomacy,full.campaign.diplomacy);assert.equal(routing.campaign.playerFaction,faction);
   for(const key of ['domestic','idle','activity','personnelEvents','ai','vision'])assert.equal(Object.hasOwn(routing.campaign,key),false);
   for(const a of s.armies.filter(a=>a.faction===faction))assert.deepEqual(supplyConnection(routing,a),supplyConnection(full,a));
  });
  assert.equal(serializeCampaign(s),before);
 }
});
test('supply view cache expires before new blockades or stocks and respects an explicitly projected counterfactual',()=>{
 const s=newCampaign(81,'guandu-200'),army=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye');updateVision(s);
 for(const blocked of [false,true]){
  if(blocked){enemy.location='junction:chenliu:xuchang';updateVision(s);}
  assert.deepEqual(citySupplyBudgets(s),originalBudgets(s));
  withCitySupplyQueries(s,()=>{
   const full=intelligenceWorld(s,'cao');supplyRoutingWorld(s,'cao');
   const altered={...full,cities:full.cities.map(c=>c.owner==='cao'?{...c,grain:0}:c)};
   assert.equal(supplyRoutingWorld(altered,'cao'),altered,'a projection with deliberately changed stocks keeps its own values');
   assert.deepEqual(citySupplyBudgets(altered),originalBudgets(altered));
  });
 }
 enemy.disbanded=true;for(const c of s.cities.filter(c=>c.owner===army.faction))c.grain=0;updateVision(s);
 const before=serializeCampaign(s),actual=withCitySupplyQueries(s,()=>citySupplyBudgets(s));
 assert.deepEqual(actual,originalBudgets(s));assert.ok(actual.find(row=>row.army===army).link,'empty warehouse connectivity still measures demand');assert.equal(serializeCampaign(s),before,'counterfactual connectivity cannot add real grain');
});
test('depot projection retains real battle sides and casualties for attacking camps and visible opposing armies',()=>{
 const s=newCampaign(31,'guandu-200','cao',{allAI:true}),army=fieldFromCity(s,'xuchang');
 army.location=s.roads.find(pair=>pair.includes('ye')).find(id=>id!=='ye');army.route=['ye'];army.target='ye';approachDestination(s,army,0);s.campaign.ai.lastPlanDay=s.campaign.day;
 advanceCampaignDay(s);assert.ok(activeBattles(s).some(r=>r.armyIds.includes(army.id)));
 const before=serializeCampaign(s);
 for(const faction of ['cao','yuan'])withCitySupplyQueries(s,()=>{
  const full=intelligenceWorld(s,faction),routing=supplyRoutingWorld(s,faction);assert.deepEqual(routing.campaign.battles,full.campaign.battles);assert.deepEqual(routing.armies,full.armies);
  for(const a of s.armies.filter(a=>a.faction===faction))assert.deepEqual(supplyConnection(routing,a),supplyConnection(full,a));
 });
 assert.deepEqual(citySupplyBudgets(s),originalBudgets(s));assert.equal(serializeCampaign(s),before);
});
