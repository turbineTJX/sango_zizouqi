import {fieldFromCity} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_MAP_COUNTS,NATIONAL_SCENARIOS,nationalWorld,nationalRoster} from '../national-scenarios.mjs';
import {newCampaign,findCampaignRoute,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign,orderCampaignArmy,splitCampaignArmy,assignDomestic,launchExpedition} from './helpers/auto-domestic-campaign.mjs';
const restored=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function startTestSiege(s){
 const ids=s.cities.find(c=>c.id==='chenliu').units.slice(0,6).map(u=>u.id);
 assert.equal(launchExpedition(s,{cityId:'chenliu',officerIds:ids,leader:ids[0],advisor:ids[1]||ids[0],deputy:null,target:'ye',policy:'auto'}),null);
}
function toDay(s,day){for(let guard=0;s.campaign.day<day&&guard<300&&!s.finished;guard++){if(s.campaign.phase==='planning')beginExecution(s);const result=advanceCampaignDay(s);if(result.encounter)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}return s;}
// These long combat fixtures exercise the original four-force layouts. The
// expanded source layouts have their own ruler/roster/marching coverage.
for(const spec of NATIONAL_SCENARIOS.filter(s=>s.layout.startsWith('legacy'))){
 test(`${spec.name}: connected national map, valid unique officers and reproducible saves`,()=>{
  const s=newCampaign(203,spec.id);assert.equal(s.cities.length,NATIONAL_MAP_COUNTS.city);assert.ok(s.cities.every(c=>c.kind==='city'));assert.deepEqual(['gate','port','junction'].map(k=>s.junctions.filter(c=>c.kind===k).length),[NATIONAL_MAP_COUNTS.gate,NATIONAL_MAP_COUNTS.port,23]);
  for(const c of s.cities)assert.ok(findCampaignRoute(s,'xuchang',c.id),c.name);
  assert.equal(s.armies.length,0);assert.ok(s.cities.filter(c=>c.units.length).length>15);const first=serializeCampaign(s);assert.equal(serializeCampaign(restored(s)),first);
  const ids=[...s.cities.flatMap(c=>c.units.map(u=>u.id)),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)];assert.equal(ids.length,new Set(ids).size);
  const a=fieldFromCity(s,'xuchang');assert.ok(a.units.some(u=>u.id==='cao'));assert.equal(splitCampaignArmy(s,a.id,[a.units[1].id]),null,'national army count must not block splitting');restored(s);
 });
 test(`${spec.name}: real multi-front combat survives daily serialization and deterministic continuation`,()=>{
  const s=newCampaign(217,spec.id);startTestSiege(s);toDay(s,6);restored(s);
  // Observe real preparation, marching, recovery and warfare without requiring
  // factions to start an AI-vs-AI war during a fixed observation window.
  const copy=restored(s);toDay(s,51);toDay(copy,51);assert.ok(s.campaign.battles.length>0);assert.equal(serializeCampaign(copy),serializeCampaign(s));restored(s);
  for(const b of s.campaign.battles){const live=b.battle.sides.map(side=>side.faction);assert.notEqual(...live);for(const side of b.battle.sides)for(const u of side.units)assert.equal(b.armies.find(a=>a.id===u.armyId)?.faction,side.faction);}
 });
}
test('map includes mandatory passes and long routes beyond the former nine-node limit',()=>{
 const s=newCampaign(1,'guandu-200');const path=findCampaignRoute(s,'town-1','town-42');assert.ok(path.length>9);const a=fieldFromCity(s,'xuchang');a.location='town-1';assert.equal(orderCampaignArmy(s,a.id,'town-42'),null);restored(s);
 assert.ok(!s.roads.some(([a,b])=>[a,b].includes('town-18')&&[a,b].includes('luoyang')),'Tong gate cannot be bypassed by the removed direct road');
});
test('scenario identity, topology, and town coordinates are validated',()=>{
 for(const mutate of [s=>s.campaign.scenarioId='missing',s=>s.roads.pop(),s=>s.cities[0].x++,s=>s.cities[0].id=s.cities[1].id]){const s=newCampaign(1,'heroes-251');mutate(s);assert.throws(()=>restored(s));}
});
test('Guandu and Heroes differ in ownership and time-appropriate recruitment',()=>{
 const a=nationalWorld('guandu-200'),b=nationalWorld('heroes-251');assert.notDeepEqual(a.cities.map(c=>c.owner),b.cities.map(c=>c.owner));assert.ok(nationalRoster('heroes-251',b.cities).length>nationalRoster('guandu-200',a.cities).length);
});
test('a month of real multi-front warfare archives old snapshots and keeps the save compact',()=>{
 const s=newCampaign(417,'heroes-251');startTestSiege(s);toDay(s,31);assert.equal(s.campaign.day,31);assert.ok(s.campaign.battles.some(b=>b.settled));assert.ok(s.campaign.battles.filter(r=>r.settled).length<=20);assert.ok(serializeCampaign(s).length<4_000_000);restored(s);
 const copy=restored(s);toDay(copy,32);toDay(s,32);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 for(const mutate of [s=>s.cities.find(c=>c.owner==='yuan').gold=-1,s=>s.cities[0].kind='port',s=>s.cities[0].water=!s.cities[0].water]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>restored(bad));}
});
test('national victory and defeat depend on ownership of the complete map',()=>{
 for(const [owner,result]of [['cao','victory'],['yuan','defeat']]){const s=newCampaign(5,'guandu-200');s.armies=[];s.cities.forEach(c=>c.owner=owner);beginExecution(s);advanceCampaignDay(s);assert.equal(s.finished,result);}
});
