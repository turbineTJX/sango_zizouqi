import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,findCampaignRoute,orderCampaignArmy,beginExecution,advanceCampaignStep,advanceCampaignDay,validateCampaign,serializeCampaign,supplyConnection,transferOfficer,activeBattles,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,marchTestTurns,approachDestination} from './helpers/field-campaign.mjs';
import {mapNode,isJunction,edgeKey,adjacentCityPath,cityRoads} from '../road-network.mjs';
import {ROAD_NETWORK_DESIGN} from '../data/design/road-network.mjs';
import {ROAD_CROSSING_DESIGN} from '../data/design/road-crossings.mjs';
import {UNPLACED_ROAD_LINKS} from '../data/design/road-link-policy.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {NATIONAL_MAP_COUNTS} from '../national-scenarios.mjs';
import {advancePersonnel,transportEnemy} from '../personnel-movement.mjs';
import {roadCost,roadDistance,marchItinerary} from '../strategic-movement.mjs';
import {commandMarkup,newCommand} from '../strategic-command.mjs';

const world=(seed=217)=>newCampaign(seed,'guandu-200');
const mid=(a,b)=>'junction:'+edgeKey(a,b);
// Authored connections can now contain additional real crossroads.
const sourcePath=(from,to)=>{
 const source=[from,to].sort(),cuts=ROAD_CROSSING_DESIGN.flatMap(n=>n.roads.filter(r=>edgeKey(...r.source)===edgeKey(from,to)).map(r=>({id:n.id,at:r.at}))).sort((a,b)=>a.at-b.at);
 const path=[source[0],...cuts.map(n=>n.id),source[1]];if(from!==source[0])path.reverse();return path.slice(1);
};
const expand=(from,stops)=>{const path=[];for(const to of stops){path.push(...sourcePath(from,to));from=to;}return path;};
const cost=(s,from,path)=>marchItinerary(s,from,path,24);
const closed=new Set(UNPLACED_ROAD_LINKS.map(e=>edgeKey(...e)));
function checkAuthoredPath(s,from,path){
 if(Number.isFinite(cost(s,from,path).cost))return true;
 let at=from,removed=false;for(const to of path){removed||=closed.has(edgeKey(at,to));at=to;}
 assert.ok(removed,'missing approaches must be explicitly closed by the named-place policy');
 assert.ok(findCampaignRoute(s,from,path.at(-1)),'closing an unnamed branch must not isolate its endpoints');
 return false;
}
test('junctions create cross-road bypasses without adding cities or bypassing passes',()=>{
 const s=world();assert.equal(s.cities.length,NATIONAL_MAP_COUNTS.city);assert.equal(s.junctions.filter(n=>n.kind==='junction').length,Object.keys(ROAD_NETWORK_DESIGN.nodeNames).length+ROAD_CROSSING_DESIGN.filter(n=>n.id.startsWith('junction:crossing-')).length);
 for(const [center,left,right] of ROAD_NETWORK_DESIGN.bypasses){
  const from=mid(center,left),to=mid(center,right);
  assert.ok(sourcePath(from,to).every(id=>isJunction(s,id)));
  checkAuthoredPath(s,center,sourcePath(center,from));
  checkAuthoredPath(s,from,sourcePath(from,to));
 }
 for(const edge of NATIONAL_ROAD_DESIGNS.filter(e=>e.some(id=>['gate','port'].includes(mapNode(s,id).kind))))checkAuthoredPath(s,edge[0],sourcePath(...edge));
});
test('Xuchang and Qiao connect through a named countryside junction with a limited northern branch',()=>{
 const s=world(),id=mid('xuchang','atlas-qiao');
 assert.deepEqual(adjacentCityPath(s,'xuchang','atlas-qiao'),expand('xuchang',[id,'atlas-qiao']));
 assert.ok(cityRoads(s).some(e=>edgeKey(...e)===edgeKey('xuchang','atlas-qiao')));
 assert.ok(!s.roads.some(e=>edgeKey(...e)===edgeKey('xuchang','atlas-qiao')));
 assert.ok(Number.isFinite(cost(s,'xuchang',expand('xuchang',[id,'atlas-qiao'])).cost));
 const north=mid('chenliu','xuchang');assert.ok(sourcePath(id,north).every(n=>isJunction(s,n))&&Number.isFinite(cost(s,id,sourcePath(id,north)).cost));
 const a=fieldFromCity(s,'xuchang');assert.equal(orderCampaignArmy(s,a.id,id),null);beginExecution(s);
 for(let i=0,limit=marchTestTurns(s,a)*10;i<limit&&a.location!==id;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(a.location,id);assert.equal(a.travel,null);
 const camp=s.campaign.bandits.camps.find(c=>c.nodeId===id);
 if(camp){assert.equal(a.task,'交战');assert.ok(activeBattles(s).some(b=>b.banditCampId===camp.id&&b.armyIds.includes(a.id)));}
 else assert.equal(a.task,'府驻守');
 assert.ok(!s.cities.some(c=>c.id===id));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,restored]){for(const b of activeBattles(state).filter(b=>b.awaiting))chooseEncounter(state,b.id,false);advanceCampaignDay(state);}
 assert.equal(serializeCampaign(s),serializeCampaign(restored));
});
test('a real order arrives at a junction without creating an occupation or city economy',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),id=mid('xuchang','chenliu'),before=structuredClone(s.junctions);
 assert.equal(orderCampaignArmy(s,a.id,id),null);beginExecution(s);
 for(let i=0,limit=marchTestTurns(s,a)*10;i<limit&&a.location!==id;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(a.location,id);assert.equal(a.travel,null);assert.equal(a.target,null);assert.equal(a.task,'府驻守');
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
  const days=Math.ceil(o.remainingDays)+1;for(let i=0;i<days&&o.destination&&s.campaign.idle.includes(o);i++)advancePersonnel(s,o);
  assert.equal(s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'),blocked);
  if(!blocked){assert.equal(o.location,'chenliu');assert.equal(o.destination,null);}
 }
});
test('junction defenders trigger a real field battle and the battle save validates',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),e=fieldFromCity(s,'ye'),id=mid('xuchang','chenliu');
 e.location=id;e.cooldownDay=999;
 assert.equal(orderCampaignArmy(s,a.id,id),null);approachDestination(s,a);beginExecution(s);e.route=[];e.target=null;
 for(let i=0,limit=marchTestTurns(s,a)*10;i<limit&&!activeBattles(s).some(b=>b.cityId===id);i++)advanceCampaignDay(s);const battle=activeBattles(s).find(b=>b.cityId===id);
 assert.ok(battle);assert.equal(battle.kind,'field');assert.equal(battle.battle.siege,undefined);
 validateCampaign(JSON.parse(serializeCampaign(s)));
 chooseEncounter(s,battle.id,false);advanceCampaignDay(s);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('command target and review display junctions as field locations',()=>{
 const s=world(),a=fieldFromCity(s,'xuchang'),p=newCommand(s,'march','xuchang',{armyId:a.id});p.destination=s.junctions[0].id;
 const html=commandMarkup(s,{officerPick:p},'').body;assert.ok(html.includes(s.junctions[0].name));assert.doesNotMatch(html,/NaN|undefined/);
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
 const first=mid('ye','town-4'),last=mid('ye','town-5');
 const direct=marchItinerary(s,'town-4',expand('town-4',[first,'ye',last]),24);
 const bypassPath=expand('town-4',[first,last]),bypass=marchItinerary(s,'town-4',bypassPath,24);
 assert.ok(Number.isFinite(direct.cost)&&Number.isFinite(bypass.cost));
 assert.ok(!bypassPath.includes('ye'));assert.notEqual(bypass.cost,direct.cost);
 assert.equal(direct.days,direct.legs.reduce((n,l)=>n+l.days,0));
 assert.notEqual(direct.legs[0].cost,direct.legs[1].cost);
 assert.ok(direct.days>Math.ceil(direct.cost/24),'arrival days account for each separate road');
});

test('every regional settlement stays connected and authored bypasses avoid cities',()=>{
 const s=world();
 for(const n of s.junctions.filter(n=>n.kind==='junction')){
  const exits=s.roads.flatMap(([a,b])=>a===n.id?[b]:b===n.id?[a]:[]);
  assert.ok(exits.length>=2,n.name+' needs connected road approaches');
 }
 for(const [city,a,b] of ROAD_NETWORK_DESIGN.bypasses){
  const from=mid(city,a),to=mid(city,b),path=sourcePath(from,to);
  assert.ok(path.every(id=>isJunction(s,id)));assert.ok(!path.includes(city));
  checkAuthoredPath(s,from,path);
 }
});
