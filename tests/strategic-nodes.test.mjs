import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,orderCampaignArmy,beginExecution,advanceCampaignStep,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,commissionProject,appointGovernor,assignDomestic,consolidateCityArmies,supplyConnection,transferOfficer} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {mapNode,isJunction,cityRoads,adjacentCityPath} from '../road-network.mjs';
import {renderJunctions} from '../road-network-view.mjs';
import {strategicTravelDays} from '../strategic-ai.mjs';
import {marchItinerary,movementPoints} from '../strategic-movement.mjs';
import {strategicView} from '../strategic-view.mjs';
import {commandMarkup,newCommand} from '../strategic-command.mjs';
import {canFormArmyAt} from '../city-units.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function scene(kind){
 const s=newCampaign(217,'guandu-200'),n=s.junctions.find(n=>n.kind===kind),a=fieldFromCity(s,'xuchang');
 const edge=s.roads.find(e=>e.includes(n.id)&&e.some(id=>s.cities.some(c=>c.id===id)));
 a.location=edge.find(id=>id!==n.id);assert.equal(orderCampaignArmy(s,a.id,n.id),null);approachDestination(s,a,.5);
 return {s,n,a};
}

for(const kind of ['port','gate']){
 test(`${kind} has no domestic state, income, governor, recruitment or city transfer destination`,()=>{
  const {s,n,a}=scene(kind);
  assert.ok(isJunction(s,n.id));assert.ok(!s.cities.includes(n));
  for(const key of ['grain','manpower','units','domestic','governor','farm','commerce','gateHp'])assert.equal(n[key],undefined);
  assert.ok(commissionProject(s,n.id,'farm'));assert.ok(appointGovernor(s,n.id,a.leader));assert.ok(assignDomestic(s,n.id,'commerce',a.leader));assert.equal(canFormArmyAt(s,n.id,a.faction),false);
  const person=s.campaign.idle.find(o=>o.faction==='cao');assert.ok(transferOfficer(s,person.unit.id,n.id));
  const before=structuredClone(n);s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
  assert.equal(a.location,n.id);assert.equal(a.travel,null);assert.ok(s.armies.includes(a));assert.equal(activeBattles(s).length,0);
  consolidateCityArmies(s);assert.ok(s.armies.includes(a));assert.deepEqual(n,before);restore(s);
  const html=strategicView(s,{city:n.id,strategyTab:'node',mapPanelOpen:true});
  const panel=html.slice(html.indexOf('<aside class="strategy-panel">'));
  assert.ok(panel.includes(n.name));assert.match(panel,/驻守军团/);assert.doesNotMatch(panel,/data-action="city-domestic"|data-task="domestic"|预备兵|NaN|undefined/);
  assert.match(renderJunctions(s,n.id),new RegExp(`data-junction="${n.id}"`));
  const p=newCommand(s,'march',a.location,{armyId:a.id});p.destination=n.id;
  assert.doesNotMatch(commandMarkup(s,{officerPick:p},'').body,/NaN|undefined/);
 });

 test(`${kind} defenders fight on the correct battlefield and reload without gaining a city economy`,()=>{
  const {s,n,a}=scene(kind),enemy=fieldFromCity(s,'ye');enemy.location=n.id;enemy.cooldownDay=999;
  const nodeBefore=structuredClone(n);s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignStep(s);
  const r=activeBattles(s).find(r=>r.cityId===n.id);assert.ok(r);assert.equal(r.kind,'field');assert.equal(r.battle.terrain,kind==='port'?'river':'hill');assert.equal(r.battle.siege,undefined);
  assert.ok(r.armyIds.includes(a.id)&&r.armyIds.includes(enemy.id));assert.deepEqual(n,nodeBefore);
  chooseEncounter(s,r.id,false);const copy=restore(s);
  for(const state of [s,copy])advanceCampaignDay(state);
  assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.deepEqual(n,nodeBefore);
  for(let guard=0;guard<1000&&!r.settled;guard++){
   s.campaign.ai.lastPlanDay=s.campaign.day;
   if(s.campaign.phase==='planning')beginExecution(s);
   advanceCampaignStep(s);
  }
  assert.ok(r.settled);assert.deepEqual(n,nodeBefore);restore(s);
 });
}

test('AI city adjacency expands every port/pass leg instead of treating separated cities as one road',()=>{
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang');
 const pair=cityRoads(s).find(([from,to])=>adjacentCityPath(s,from,to)?.some(id=>['gate','port'].includes(mapNode(s,id).kind)));
 assert.ok(pair);const [from,to]=pair,path=adjacentCityPath(s,from,to);assert.ok(path.length>1);
 assert.ok(path.slice(0,-1).every(id=>isJunction(s,id)));
 assert.equal(strategicTravelDays(s,a,[to],from),marchItinerary(s,from,path,movementPoints(a)).days);
});

test('a port/pass garrison blocks the actual supply corridor but an empty node does not',()=>{
 for(const kind of ['port','gate']){
  const {s,n,a}=scene(kind),source=mapNode(s,a.location),enemy=fieldFromCity(s,'ye');
  for(const c of s.cities)c.grain=c===source?10000:0;
  source.owner=a.faction;source.domestic.owner=a.faction;a.location=n.id;a.travel=null;a.route=[];a.target=null;
  assert.ok(supplyConnection(s,a));enemy.location=n.id;enemy.route=[];enemy.target=null;
  assert.equal(supplyConnection(s,a),null);
 }
});

test('node schema changes reject the previous campaign rather than importing port economies',()=>{
 const s=newCampaign(217,'guandu-200');s.campaign.version=24;assert.throws(()=>restore(s),/重新开始/);
});
