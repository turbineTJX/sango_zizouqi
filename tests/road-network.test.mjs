import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,findCampaignRoute,orderCampaignArmy,beginExecution,advanceCampaignStep,advanceCampaignDay,validateCampaign,serializeCampaign,supplyConnection,transferOfficer,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {mapNode,isJunction,edgeKey} from '../road-network.mjs';
import {ROAD_NETWORK_DESIGN} from '../data/design/road-network.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {NATIONAL_MAP_COUNTS} from '../national-scenarios.mjs';
import {advancePersonnel,transportEnemy} from '../personnel-movement.mjs';
import {roadCost,marchItinerary} from '../strategic-movement.mjs';
import {commandMarkup,newCommand} from '../strategic-command.mjs';

const world=()=>newCampaign(217,'guandu-200');
const mid=(a,b)=>'junction:'+edgeKey(a,b);
test('junctions create cross-road bypasses without adding cities or bypassing passes',()=>{
 const s=world();assert.equal(s.cities.length,NATIONAL_MAP_COUNTS.city);assert.equal(s.junctions.filter(n=>n.kind==='junction').length,23);
 for(const [center,left,right] of ROAD_NETWORK_DESIGN.bypasses){
  const from=mid(center,left),to=mid(center,right);
  assert.deepEqual(findCampaignRoute(s,from,to),[to]);
  assert.ok(s.roads.some(([a,b])=>a===center&&b===from||b===center&&a===from));
  assert.ok(Number.isFinite(roadCost(s,from,to)));
 }
 for(const edge of NATIONAL_ROAD_DESIGNS.filter(e=>e.some(id=>['gate','port'].includes(mapNode(s,id).kind))))assert.ok(s.roads.some(e=>edgeKey(...e)===edgeKey(...edge)));
});
test('a real order arrives at a junction without creating an occupation or city economy',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),id=mid('xuchang','chenliu'),before=structuredClone(s.junctions);
 assert.equal(orderCampaignArmy(s,a.id,id),null);beginExecution(s);
 for(let i=0;i<10&&a.location!==id;i++)advanceCampaignDay(s);
 assert.equal(a.location,id);assert.equal(a.travel,null);assert.equal(a.target,null);assert.equal(a.task,'路口驻守');
 assert.deepEqual(s.junctions,before);assert.ok(!s.cities.some(c=>c.id===id));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 advanceCampaignDay(s);advanceCampaignDay(restored);assert.equal(serializeCampaign(s),serializeCampaign(restored));
});
test('supply avoids occupied junctions and cannot use a completely blocked source outlet',()=>{
 const s=world(),a=fieldFromCity(s,'chenliu'),e=fieldFromCity(s,'ye');
 for(const c of s.cities)c.grain=c.id==='xuchang'?10000:0;
 s.cities.find(c=>c.id==='luoyang').owner='yuan';
 const direct=supplyConnection(s,a);assert.ok(direct);const id=mid('xuchang','chenliu');assert.ok(direct.path.includes(id));
 e.location=id;e.route=[];e.target=null;
 const detour=supplyConnection(s,a);assert.ok(!detour||!detour.path.includes(id));if(detour)assert.ok(detour.distance>direct.distance);
 for(const [x,y] of s.roads){const next=x==='xuchang'?y:y==='xuchang'?x:null;if(!next)continue;if(isJunction(s,next))s.armies.push({...structuredClone(e),id:'block:'+next,location:next});else mapNode(s,next).owner='yuan';}
 assert.equal(supplyConnection(s,a),null);
});
test('convoys pass unoccupied junctions but lose cargo to an actual junction garrison',()=>{
 for(const blocked of [false,true]){
  const s=world(),u=s.campaign.idle.find(o=>o.faction==='cao'&&o.location==='xuchang'&&!s.cities.some(c=>c.governor===o.unit.id)).unit;
  assert.equal(transferOfficer(s,u.id,'chenliu',{cargo:{grain:200,manpower:100}}),null);
  const o=s.campaign.idle.find(o=>o.unit.id===u.id);assert.ok(o.journey.route.some(id=>isJunction(s,id)));
  if(blocked){const e=fieldFromCity(s,'ye');e.location=mid('xuchang','chenliu');}
  advancePersonnel(s,o);
  assert.equal(s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'),blocked);
  if(!blocked){assert.equal(o.location,'chenliu');assert.equal(o.destination,null);}
 }
});
test('junction defenders trigger a real field battle and the battle save validates',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),e=fieldFromCity(s,'ye'),id=mid('xuchang','chenliu');
 e.location=id;e.cooldownDay=999;
 assert.equal(orderCampaignArmy(s,a.id,id),null);beginExecution(s);e.route=[];e.target=null;
 for(let i=0;i<10&&!activeBattles(s).some(b=>b.cityId===id);i++)advanceCampaignDay(s);const battle=activeBattles(s).find(b=>b.cityId===id);
 assert.ok(battle);assert.equal(battle.kind,'field');assert.equal(battle.battle.siege,undefined);
 validateCampaign(JSON.parse(serializeCampaign(s)));
 chooseEncounter(s,battle.id,false);advanceCampaignDay(s);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('command target and review display junctions as field locations',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),p=newCommand(s,'march','xuchang',{armyId:a.id});p.destination=s.junctions[0].id;
 const html=commandMarkup(s,{officerPick:p},'').body;assert.match(html,/野外路口/);assert.doesNotMatch(html,/NaN|undefined/);
 p.step='review';const review=commandMarkup(s,{officerPick:p},'').body;assert.ok(review.includes(s.junctions[0].name));assert.doesNotMatch(review,/—.*路口/);
});
test('junction topology is validated and old campaign versions are rejected',()=>{
 const s=world();s.junctions[0].x++;assert.throws(()=>validateCampaign(s),/路网/);
 const old=world();old.campaign.version=17;assert.throws(()=>validateCampaign(old),/重新开始/);
});

test('convoys meet enemies arriving from another branch only after their arrival time',()=>{
 const s=world(),next=mid('xuchang','chenliu'),other=mid('xuchang','runan'),o={location:'xuchang',faction:'cao'};
 const traffic=[{faction:'yuan',location:other,edge:{from:other,to:next,road:'main',p0:0,p1:1,until:.2}}];
 assert.equal(transportEnemy(s,o,next,0,1,0,.15,traffic),undefined);
 assert.equal(transportEnemy(s,o,next,0,1,0,.4,traffic)?.faction,'yuan');
});

 test('regional positions drive unequal road legs and meaningful bypass travel',()=>{
 const s=world();
 for(const [key,pos] of Object.entries(ROAD_NETWORK_DESIGN.nodePositions)){
  const n=mapNode(s,'junction:'+key);assert.deepEqual([n.x,n.y],pos);
 }
 const first=mid('chenliu','xuchang'),last=mid('runan','xuchang');
 const direct=marchItinerary(s,'chenliu',[first,'xuchang',last,'runan'],24);
 const bypass=marchItinerary(s,'chenliu',[first,last,'runan'],24);
 assert.equal(direct.cost,86);assert.equal(direct.days,6);
 assert.equal(bypass.cost,79);assert.equal(bypass.days,4);
 assert.deepEqual(direct.legs.map(l=>l.days),[1,2,2,1]);
 assert.notEqual(direct.legs[0].cost,direct.legs[1].cost);
 assert.ok(direct.days>Math.ceil(direct.cost/24),'arrival days account for each separate road');
});

test('every regional node provides a real branch and direct access to another node',()=>{
 const s=world();
 for(const n of s.junctions.filter(n=>n.kind==='junction')){
  const exits=s.roads.flatMap(([a,b])=>a===n.id?[b]:b===n.id?[a]:[]);
  assert.ok(exits.length>=3,n.name+' needs a meaningful branch');
  assert.ok(exits.some(id=>isJunction(s,id)),n.name+' needs a neighboring node');
 }
 for(const [city,a,b] of ROAD_NETWORK_DESIGN.bypasses){
  const from=mid(city,a),to=mid(city,b),path=findCampaignRoute(s,from,to);
  assert.deepEqual(path,[to]);assert.ok(!path.includes(city));
 }
});
