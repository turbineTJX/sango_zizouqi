import {fieldFromCity} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_MAP_COUNTS,NATIONAL_SCENARIOS,nationalWorld,nationalRoster} from '../national-scenarios.mjs';
import {newCampaign,findCampaignRoute,beginExecution,advanceCampaignDay,validateCampaign,serializeCampaign,orderCampaignArmy,splitCampaignArmy} from './helpers/auto-domestic-campaign.mjs';
const restored=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
// Legacy layouts retain initialization, topology and save checks.
// Natural combat timing is observed separately from mechanism regressions.
for(const spec of NATIONAL_SCENARIOS.filter(s=>s.layout.startsWith('legacy'))){
 test(`${spec.name}: connected national map, valid unique officers and reproducible saves`,()=>{
  const s=newCampaign(203,spec.id);assert.equal(s.cities.length,NATIONAL_MAP_COUNTS.city);assert.ok(s.cities.every(c=>c.kind==='city'));assert.deepEqual(['gate','port','junction'].map(k=>s.junctions.filter(c=>c.kind===k).length),[NATIONAL_MAP_COUNTS.gate,NATIONAL_MAP_COUNTS.port,nationalWorld(spec.id).junctions.filter(c=>c.kind==='junction').length]);
  for(const c of s.cities)assert.ok(findCampaignRoute(s,'xuchang',c.id),c.name);
  assert.equal(s.armies.length,0);assert.ok(s.cities.filter(c=>c.units.length).length>15);const first=serializeCampaign(s);assert.equal(serializeCampaign(restored(s)),first);
  const ids=[...s.cities.flatMap(c=>c.units.map(u=>u.id)),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)];assert.equal(ids.length,new Set(ids).size);
  const a=fieldFromCity(s,'xuchang');assert.ok(a.units.some(u=>u.id==='cao'));assert.equal(splitCampaignArmy(s,a.id,[a.units[1].id]),null,'national army count must not block splitting');restored(s);
 });

}
test('map accepts saved multi-node journeys and retains declared mountain barriers',()=>{
 const s=newCampaign(1,'guandu-200');const path=findCampaignRoute(s,'town-1','town-42');assert.ok(path.length);const a=fieldFromCity(s,'xuchang');a.location='town-1';assert.equal(orderCampaignArmy(s,a.id,'town-42'),null);restored(s);
 assert.ok(!s.roads.some(([a,b])=>[a,b].includes('town-18')&&[a,b].includes('luoyang')),'Tong gate cannot be bypassed by the removed direct road');
});
test('scenario identity, topology, and town coordinates are validated',()=>{
 for(const mutate of [s=>s.campaign.scenarioId='missing',s=>s.roads.pop(),s=>s.cities[0].x++,s=>s.cities[0].id=s.cities[1].id]){const s=newCampaign(1,'heroes-251');mutate(s);assert.throws(()=>restored(s));}
});
test('Guandu and Heroes differ in ownership and time-appropriate recruitment',()=>{
 const a=nationalWorld('guandu-200'),b=nationalWorld('heroes-251');assert.notDeepEqual(a.cities.map(c=>c.owner),b.cities.map(c=>c.owner));assert.ok(nationalRoster('heroes-251',b.cities).length>nationalRoster('guandu-200',a.cities).length);
});

test('national victory and defeat depend on ownership of the complete map',()=>{
 for(const [owner,result]of [['cao','victory'],['yuan','defeat']]){const s=newCampaign(5,'guandu-200');s.armies=[];s.cities.forEach(c=>c.owner=owner);beginExecution(s);advanceCampaignDay(s);assert.equal(s.finished,result);}
});
