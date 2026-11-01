import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,transferOfficer,serializeCampaign,validateCampaign,findCampaignRoute} from './helpers/auto-domestic-campaign.mjs';
import {movementPoints,chosenRoad,roadCost,marchItinerary} from '../strategic-movement.mjs';
import {personnelSpeed,transportSpeed,personnelRouteDays,advancePersonnel,startPersonnelJourney,transportProxy,isTransport,remainingPersonnelDays} from '../personnel-movement.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {MOVEMENT_RULES} from '../data/design/movement-rules.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(){
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),unit=c.units.find(u=>u.id!==c.governor);
 assert.equal(transferOfficer(s,unit.id,'chenliu',{cargo:{gold:100,grain:500,manpower:200}}),null);
 return {s,o:s.campaign.idle.find(o=>o.unit.id===unit.id)};
}
test('every convoy load uses 1.5 times the same army reference, including water and grain traits',()=>{
 const r=MOVEMENT_RULES.personnel.transport;
 for(const terrain of ['land','mountain','water']){
  const army={units:[{id:'reference',type:r.troop,troops:1000,leadership:r.leadership,equipment:{ship:r.ship}}],leader:'reference',morale:r.morale,hunger:0,travel:{terrain}};
  assert.equal(transportSpeed(terrain),movementPoints(army)*1.5);
  for(const [troops,cargo] of [[2500,{}],[0,{manpower:2500}],[0,{gold:1000}],[0,{grain:500}],[2500,{grain:1,gold:200}]]){
   const o={unit:{id:'plain',type:'cavalry',troops,leadership:100,equipment:{siege:'ram'}},destination:'chenliu',cargo};
   assert.equal(personnelSpeed(o,terrain),transportSpeed(terrain));
  }
  const id=Object.keys(OFFICER_ASSIGNMENTS).find(id=>OFFICER_ASSIGNMENTS[id].traits.includes('relayCargo'));
  assert.equal(personnelSpeed({unit:{id,troops:2500},destination:'chenliu',cargo:{grain:1}},terrain),transportSpeed(terrain));
 }
});
test('convoys finish only one road per day, ETA matches arrival and midway saves keep cargo and markers',()=>{
 const {s,o}=fixture(),route=[...o.journey.route];assert.ok(route.length>1);
 const before=serializeCampaign(s),days=personnelRouteDays(s,o,route);
 assert.equal(serializeCampaign(s),before);
 const copy=restore(s),other=copy.campaign.idle.find(x=>x.unit.id===o.unit.id);let actual=0;
 while(o.destination){
  assert.ok(actual<days,'journey must finish at its forecast time');
  assert.match(armyMapMarkers(s,{}),new RegExp('data-transport-officer="'+o.unit.id+'"'));
  advancePersonnel(s,o);advancePersonnel(copy,other);actual++;
  assert.equal(serializeCampaign(s),serializeCampaign(copy));
 }
 assert.equal(actual,days);assert.equal(o.location,'chenliu');assert.equal(s.campaign.idle.some(x=>x.unit.id===o.unit.id),false);
 assert.equal(s.cities.find(c=>c.id==='chenliu').units.filter(u=>u.id===o.unit.id).length,1);
 restore(s);
});
test('unused movement stops at the actual road node and cannot skip a later arriving enemy',()=>{
 for(const enemy of [false,true]){
  const {s,o}=fixture(),next=o.journey.route[0];
  o.journey.progress=roadCost(s,o.location,next)-personnelSpeed(o)*.1;
  const remaining=personnelRouteDays(s,o,o.journey.route,{progress:o.journey.progress});
  const traffic=enemy?[{id:'incoming-enemy',faction:'yuan',edge:{from:'branch',to:next,p0:0,p1:1,until:.8}}]:[];
  advancePersonnel(s,o,traffic);
  if(enemy){assert.ok(s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'));assert.ok(!s.campaign.idle.includes(o));}
  else {assert.equal(o.location,next);assert.equal(o.journey.progress,0);assert.equal(o.remainingDays,remaining-1);assert.equal(transportProxy(s,o).travel.progress,0);}
 }
});
test('mixed land and water transport ETA follows each terrain and exactly matches actual progress',()=>{
 const s=newCampaign(203,'guandu-200'),from='town-1',to='town-8',route=findCampaignRoute(s,from,to),unit=s.cities.find(c=>c.id==='xuchang').units[0];
 assert.ok(route.some((id,i)=>chosenRoad(s,i?route[i-1]:from,id).terrain==='water'));
 for(const id of [from,...route]){const node=s.cities.find(c=>c.id===id)||s.junctions.find(c=>c.id===id);if(node)node.owner='cao';}
 const o={unit:{...unit,troops:0,wounded:0},faction:'cao',location:from,destination:to,cargo:{grain:100}};
 startPersonnelJourney(s,o,route);const expected=personnelRouteDays(s,o,route);
 assert.equal(expected,marchItinerary(s,from,route,{units:[{id:'reference',type:'spear',troops:1,leadership:80,equipment:{ship:'ship'}}],leader:'reference',morale:80,hunger:0}).legs.reduce((n,leg)=>n+Math.ceil(leg.cost/transportSpeed(chosenRoad(s,leg.from,leg.to).terrain)),0));
 let days=0;while(o.destination){assert.ok(days<expected);advancePersonnel(s,o);days++;}assert.equal(days,expected);
});
test('a dispatched convoy remains visible at convoy speed even when no cargo remains',()=>{
 const {s,o}=fixture();o.unit.troops=0;o.unit.wounded=0;o.cargo={gold:0,grain:0,manpower:0};
 assert.equal(isTransport(o),true);assert.equal(personnelSpeed(o),transportSpeed());
 assert.match(armyMapMarkers(s,{}),new RegExp('data-transport-officer="'+o.unit.id+'"'));
});

test('displayed remaining days are read-only and ignore an old cached express ETA',()=>{
 const {s,o}=fixture();o.remainingDays=1;const before=serializeCampaign(s);
 assert.equal(remainingPersonnelDays(s,o),personnelRouteDays(s,o,o.journey.route));
 assert.ok(remainingPersonnelDays(s,o)>1);assert.equal(serializeCampaign(s),before);
});
