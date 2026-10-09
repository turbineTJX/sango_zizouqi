import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,findCampaignRoute,supplyConnection,armyBattle,campaignBattleSide,liveSoldiers,roadLength,CAMPAIGN,advanceCampaignStep} from '../strategic-campaign.mjs';
import {cityObservation,observedArmies,intelligenceWorld,armyVisible,updateVision} from '../strategic-vision.mjs';
import {cityPersonnel,residentOfficer,residentArmy} from '../city-personnel.mjs';
import {cityUnitRows} from '../city-units.mjs';
import {mapNode,mapNodes,isJunction,junctionBlocked,roadSegment} from '../road-network.mjs';
import {roadCost,campaignRoads,threatenedTransportRoute} from '../strategic-movement.mjs';
import {diplomaticPassage,factionsHostile} from '../diplomacy-relations.mjs';
import {citySupplyBudgets,withCitySupplyQueries} from '../city-logistics.mjs';
import {safeStrategicTransportRoute} from '../strategic-ai.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';

// Pre-optimization shortest-path algorithms provide an independent tie/order
// oracle. Keep real distances, ownership, fog and passage checks in both paths.
function originalRoute(s,from,to,faction,policy){
 if(roadSegment(s,from,to)?.trail)return [to];
 const dist=new Map([[from,0]]),paths=new Map([[from,[]]]),todo=new Set(mapNodes(s).map(c=>c.id));
 while(todo.size){const current=[...todo].sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity)||a.localeCompare(b))[0];
  if(!dist.has(current))return null;todo.delete(current);if(current===to)return paths.get(current);
  if(current!==from&&faction&&!isJunction(s,current)&&mapNode(s,current).owner!==faction&&!diplomaticPassage(s,faction,current))continue;
  for(const [a,b]of s.roads){const next=a===current?b:b===current?a:null;if(!next||!todo.has(next))continue;
   const d=dist.get(current)+roadCost(s,current,next,policy);if(d<(dist.get(next)??Infinity)){dist.set(next,d);paths.set(next,[...paths.get(current),next]);}}
 }return null;
}
function originalTransport(s,from,to,faction){
 const view=intelligenceWorld(s,faction),queue=[{id:from,path:[],cost:0}],seen=new Set();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const at=queue.shift();if(seen.has(at.id))continue;seen.add(at.id);if(at.id===to)return at.path;
  for(const [a,b]of view.roads){const next=a===at.id?b:b===at.id?a:null;if(!next||seen.has(next)||threatenedTransportRoute(view,at.id,[next],faction))continue;queue.push({id:next,path:[...at.path,next],cost:at.cost+roadCost(view,at.id,next)});}
 }return null;
}
const sameEdge=(t,a,b,road='main')=>t&&(t.road||'main')===road&&(t.from===a&&t.to===b||t.from===b&&t.to===a);
function originalSupply(s,a){
 const encounter=armyBattle(s,a.id),siegeEndpoint=!a.travel&&encounter?.kind==='siege'&&encounter.cityId===a.location&&campaignBattleSide(s,encounter,a)===encounter.attackSide?a.location:null;
 const blocked=(from,to,road)=>s.armies.some(e=>factionsHostile(s,e.faction,a.faction)&&liveSoldiers(s,e)>0&&sameEdge(e.travel,from,to,road));let best=null;
 for(const source of s.cities.filter(c=>c.owner===a.faction&&c.grain>0)){
  const queue=[{id:source.id,distance:0,path:[source.id],roads:[]}],seen=new Set();
  while(queue.length){queue.sort((x,y)=>x.distance-y.distance||x.id.localeCompare(y.id));const p=queue.shift();if(seen.has(p.id))continue;seen.add(p.id);
   if(p.distance>CAMPAIGN.supplyRange||junctionBlocked(s,p.id,a.faction))continue;
   if(p.id===a.location){const distance=p.distance+(a.travel?a.travel.progress/roadLength(s,a.travel.from,a.travel.to)*roadCost(s,a.travel.from,a.travel.to,a.travel.road||'main'):0);
    if(distance<=CAMPAIGN.supplyRange){const rate=Math.max(30,Math.floor((240+source.granary*120)/(1+distance/90)));if(!best||rate>best.rate||rate===best.rate&&source.id<best.source)best={source:source.id,path:p.path,roads:p.roads,distance:Math.round(distance*1000)/1000,rate};}break;}
   for(const [x,y]of s.roads){const next=x===p.id?y:y===p.id?x:null;if(!next||seen.has(next)||!isJunction(s,next)&&mapNode(s,next).owner!==a.faction&&next!==siegeEndpoint&&!diplomaticPassage(s,a.faction,next,'military',null,a))continue;
    for(const road of campaignRoads(s,p.id,next)){if(!blocked(p.id,next,road.id))queue.push({id:next,distance:p.distance+road.cost,path:[...p.path,next],roads:[...p.roads,road.id]});}}
  }
 }
 if(a.travel){const t=a.travel;if(s.armies.some(e=>factionsHostile(s,e.faction,a.faction)&&sameEdge(e.travel,t.from,t.to,t.road||'main')&&liveSoldiers(s,e)>0&&((e.travel.from===t.from?e.travel.progress:roadLength(s,t.from,t.to)-e.travel.progress)<t.progress-.01)))return null;}
 return best;
}

test('optimized route queries retain costs, tie order, ownership and current road changes',()=>{
 const s=newCampaign(217,'guandu-200'),nodes=mapNodes(s),pairs=Array.from({length:16},(_,i)=>[nodes[i*11%nodes.length].id,nodes[(i*19+7)%nodes.length].id]);
 pairs.push(['xuchang','xuchang'],['xuchang','ye'],s.roads[0]);
 for(const faction of [null,'cao','yuan'])for(const policy of ['auto','main'])for(const [from,to]of pairs)assert.deepEqual(findCampaignRoute(s,from,to,faction,policy),originalRoute(s,from,to,faction,policy));
 const from=s.roads[0][0],to=s.roads[0][1];s.roads.splice(0,1);mapNode(s,'chenliu').owner='yuan';
 for(const faction of [null,'cao','yuan'])assert.deepEqual(findCampaignRoute(s,from,to,faction),originalRoute(s,from,to,faction,'auto'));
});

test('safe transport keeps shortest legal roads and immediately reacts to a visible blockade',()=>{
 const s=newCampaign(217,'guandu-200'),enemy=fieldFromCity(s,'ye'),mid='junction:chenliu:xuchang';
 for(const blocked of [false,true]){
  if(blocked)enemy.location=mid;updateVision(s);
  for(const faction of ['cao','yuan']){
   const view=intelligenceWorld(s,faction),nodes=mapNodes(view);
   for(let i=0;i<12;i++){const from=nodes[i*13%nodes.length].id,to=nodes[(i*17+5)%nodes.length].id;
    assert.deepEqual(safeStrategicTransportRoute(view,from,to,faction),originalTransport(view,from,to,faction));}
   assert.deepEqual(safeStrategicTransportRoute(s,'xuchang','chenliu',faction),originalTransport(s,'xuchang','chenliu',faction));
  }
 }
 assert.ok(!safeStrategicTransportRoute(s,'xuchang','chenliu','cao')?.includes(mid));
});

test('city and army queries match complete fog projection, preserve dates and exclude secret orders',()=>{
 const s=newCampaign(217,'guandu-200'),own=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye');enemy.location=own.location;enemy.target='secret-target';enemy.route=['secret-route'];updateVision(s);
 for(const base of [s,intelligenceWorld(s,'cao')])for(const faction of ['cao','yuan']){
  const view=intelligenceWorld(base,faction);
  assert.deepEqual(observedArmies(base,faction),view.armies);
  for(const c of s.cities)assert.deepEqual(cityObservation(base,c.id,faction),mapNode(view,c.id));
  for(const n of s.junctions)assert.deepEqual(cityObservation(base,n.id,faction),mapNode(view,n.id));
 }
 const seen=observedArmies(s,'cao').find(a=>a.id===enemy.id);assert.ok(seen);assert.deepEqual(seen.route,[]);assert.equal(seen.target,null);
 const far=s.cities.find(c=>!armyVisible(s,{...enemy,location:c.id},'cao'));assert.ok(far);enemy.location=far.id;s.campaign.day++;updateVision(s);
 const before=JSON.stringify(s),view=intelligenceWorld(s,'cao');assert.ok(!observedArmies(s,'cao').some(a=>a.id===enemy.id));
 for(const c of s.cities)assert.deepEqual(cityObservation(s,c.id,'cao'),mapNode(view,c.id));assert.equal(JSON.stringify(s),before);
 delete s.campaign.vision;assert.equal(observedArmies(s,'cao'),s.armies);for(const c of s.cities)assert.equal(cityObservation(s,c.id,'cao'),c);
});

test('residence queries keep authoritative officers and exclude away missions and marching armies',()=>{
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang'),traveler=s.cities.find(c=>c.id==='chenliu').units[0];traveler.mission={location:'ye',faction:'cao'};
 for(const marching of [false,true]){
  a.route=marching?['chenliu']:[];
  for(const c of s.cities){
   const expected=[...cityUnitRows(s).filter(o=>o.location===c.id&&!o.unit.mission),...s.campaign.idle.filter(o=>o.location===c.id&&o.faction===c.owner&&!o.destination&&!o.retreating&&!o.unit.mission),...s.armies.filter(a=>a.location===c.id&&residentArmy(s,a)).flatMap(army=>army.units.map(unit=>({unit,faction:army.faction,location:c.id,destination:null,army})))];
   assert.deepEqual(cityPersonnel(s,c.id),expected);
   for(const row of expected){const resident=residentOfficer(s,row.unit.id);assert.ok(resident);assert.equal(resident.unit,row.unit);assert.equal(resident.location,c.id);}
  }
  for(const u of a.units)assert.equal(!!residentOfficer(s,u.id),!marching);
  assert.equal(residentOfficer(s,traveler.id),undefined);
 }
});

test('supply searches preserve depot choice, capacity, marching interception and stock changes',()=>{
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye'),mid='junction:chenliu:xuchang';
 const check=()=>assert.deepEqual(supplyConnection(s,a),originalSupply(s,a));check();
 a.travel={from:'xuchang',to:mid,road:'main',progress:roadLength(s,'xuchang',mid)/2};check();
 enemy.location=mid;enemy.travel={from:mid,to:'xuchang',road:'main',progress:roadLength(s,'xuchang',mid)*.7};check();assert.equal(supplyConnection(s,a),null);
 enemy.travel=null;a.travel=null;a.location=mid;check();assert.equal(supplyConnection(s,a),null);
 enemy.location='ye';check();const first=supplyConnection(s,a);assert.ok(first);s.cities.find(c=>c.id===first.source).grain=0;check();
 for(const c of s.cities.filter(c=>c.owner===a.faction))c.grain=0;check();assert.equal(supplyConnection(s,a),null);
});

test('supply routing preserves the real attacker camp endpoint at an enemy siege',()=>{
 const s=newCampaign(31,'guandu-200','cao',{allAI:true}),a=fieldFromCity(s,'xuchang'),edge=s.roads.find(pair=>pair.includes('ye'));
 a.location=edge.find(id=>id!=='ye');a.route=['ye'];a.target='ye';approachDestination(s,a,0);s.campaign.ai.lastPlanDay=s.campaign.day;advanceCampaignStep(s);
 const r=armyBattle(s,a.id);assert.equal(r.kind,'siege');assert.deepEqual(supplyConnection(s,a),originalSupply(s,a));
});

test('read-only supply scopes expire before changed troops, empty depots or later queries',()=>{
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang'),before=JSON.stringify(s);
 const first=withCitySupplyQueries(s,()=>{const rows=citySupplyBudgets(s);assert.equal(citySupplyBudgets(s),rows);return withCitySupplyQueries(s,()=>citySupplyBudgets(s));});
 assert.equal(JSON.stringify(s),before);const previousNeed=first[0].need;a.units[0].troops+=100;
 const second=withCitySupplyQueries(s,()=>citySupplyBudgets(s));assert.notEqual(second,first);assert.ok(second[0].need>previousNeed);
 const source=s.cities.find(c=>c.id===second[0].link.source);source.grain=0;assert.deepEqual(citySupplyBudgets(s)[0].link,supplyConnection(intelligenceWorld(s,a.faction),a));
 assert.throws(()=>withCitySupplyQueries(s,()=>{citySupplyBudgets(s);throw Error('scope closed');}),/scope closed/);
 assert.notEqual(citySupplyBudgets(s),second);
});
