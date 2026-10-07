import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {ATLAS_CITY_ADDITIONS,ATLAS_SAME_CITY_NAMES,ATLAS_GATE_ADDITIONS,ATLAS_LARGE_CITY_IDS,ATLAS_CIRCLE_CITY_IDS} from '../data/design/atlas-cities.mjs';
import {applyAtlasLayout} from '../data/design/atlas-layout.mjs';
import {nationalWorld,NATIONAL_MAP_COUNTS} from '../national-scenarios.mjs';
import {newCampaign,findCampaignRoute,transferOfficer,appointGovernor,assignDomestic,serializeCampaign,validateCampaign,orderCampaignArmy,beginExecution,advanceCampaignDay,activeBattles,cityIncome} from '../strategic-campaign.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {nationalLobby} from '../national-lobby.mjs';

test('reference cities extend the real city roster and same-city labels keep one Three Kingdoms name',()=>{
 assert.equal(ATLAS_CITY_ADDITIONS.length,34);assert.equal(NATIONAL_MAP_COUNTS.city,76);
 assert.equal(new Set(CITY_DESIGNS.filter(c=>c.kind==='city').map(c=>c.name)).size,76);
 for(const alias of ATLAS_SAME_CITY_NAMES){const c=CITY_DESIGNS.find(c=>c.id===alias.id);assert.equal(c.name,alias.name);assert.equal(CITY_DESIGNS.filter(c=>c.kind==='city'&&c.name===alias.name).length,1);if(alias.name!==alias.label)assert.ok(!CITY_DESIGNS.some(c=>c.kind==='city'&&c.name===alias.label));}
 for(const scenario of ['guandu-200','heroes-251']){
  const s=newCampaign(217,scenario),world=nationalWorld(scenario);
  for(const entry of ATLAS_CITY_ADDITIONS){const c=s.cities.find(c=>c.id===entry.id);assert.ok(c);assert.ok(c.domestic&&c.grain>=0&&c.manpower>=0);assert.ok(findCampaignRoute(s,'xuchang',c.id));assert.ok(!s.junctions.some(n=>n.id===entry.id));}
  for(const gate of ATLAS_GATE_ADDITIONS){assert.ok(world.junctions.some(n=>n.id===gate.id));assert.ok(!world.cities.some(n=>n.id===gate.id));}
 }
 assert.match(nationalLobby(null),/76 座城市/);assert.match(nationalLobby(null),/42 大城 · 34 小城 · 12 关隘 · 35 港口/);
});
test('the atlas legend classifies squares as large cities and circles as small cities, including Jingxing',()=>{
 const s=newCampaign(217,'guandu-200');
 assert.equal(s.cities.filter(c=>c.citySize==='large').length,42);
 assert.equal(s.cities.filter(c=>c.citySize==='small').length,34);
 for(const id of ATLAS_LARGE_CITY_IDS)assert.equal(s.cities.find(c=>c.id===id)?.citySize,'large');
 for(const id of ATLAS_CIRCLE_CITY_IDS)assert.equal(s.cities.find(c=>c.id===id)?.citySize,'small');
 const jingxing=s.cities.find(c=>c.id==='atlas-jingxing');assert.equal(jingxing.name,'井陉');assert.ok(jingxing.domestic&&jingxing.units&&jingxing.grain>0);assert.ok(!s.junctions.some(n=>n.id===jingxing.id));
 jingxing.citySize='large';assert.throws(()=>validateCampaign(s),/地图数据不匹配/);
});
test('atlas inventory rebuild is idempotent and does not fabricate people or duplicate roads',()=>{
 const first=applyAtlasLayout(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS),second=applyAtlasLayout(first.cities,first.roads);assert.deepEqual(second,first);
 assert.equal(new Set(first.roads.map(e=>[...e].sort().join(':'))).size,first.roads.length);
 for(const city of first.cities)assert.ok(Number.isFinite(city.x)&&Number.isFinite(city.y));
});
test('an existing officer really travels to an added city, becomes governor and performs domestic work',()=>{
 const s=newCampaign(217,'guandu-200'),c=s.cities.find(c=>c.id==='atlas-qiao');
 const o=s.campaign.idle.find(o=>o.location==='xuchang'&&o.faction==='cao'&&!s.cities.some(c=>c.governor===o.unit.id));assert.ok(o);
 assert.equal(appointGovernor(s,c.id,o.unit.id),'太守必须仍在本城');
 assert.equal(transferOfficer(s,o.unit.id,c.id),null);assert.notEqual(o.location,c.id);
 for(let i=0;i<10&&o.location!==c.id;i++)advancePersonnel(s,o);
 assert.equal(o.location,c.id);assert.equal(appointGovernor(s,c.id,o.unit.id),null);assert.equal(assignDomestic(s,c.id,'commerce',o.unit.id),null);
 assert.ok(cityIncome(s,c).gold>0);assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
});
test('an undefended added city is occupied by real marching and participates in the victory condition',()=>{
 const s=newCampaign(217,'guandu-200'),c=s.cities.find(c=>c.id==='atlas-qiao');c.owner='neutral';c.units=[];
 const a=fieldFromCity(s,'xuchang');assert.equal(orderCampaignArmy(s,a.id,c.id),null);
 for(let i=0;i<15&&c.owner!==a.faction;i++){s.campaign.ai.lastPlanDay=s.campaign.day;if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(c.owner,a.faction);assert.equal(a.location,c.id);assert.ok(!activeBattles(s).some(b=>b.cityId===c.id));
 const v=newCampaign(217,'guandu-200');v.armies=[];for(const c of v.cities){c.owner='cao';c.units=[];}v.cities.find(c=>c.id==='atlas-longbian').owner='neutral';v.campaign.ai.lastPlanDay=v.campaign.day;beginExecution(v);advanceCampaignDay(v);assert.ok(!v.finished);
});
