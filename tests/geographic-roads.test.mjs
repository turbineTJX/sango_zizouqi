import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalWorld} from '../national-scenarios.mjs';
import {mapNodes,mapNode,edgeKey} from '../road-network.mjs';
import {ROAD_NETWORK_DESIGN} from '../data/design/road-network.mjs';
import {applyAtlasLayout} from '../data/design/atlas-layout.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {chosenRoad,roadCost,marchItinerary,validMapRoute} from '../strategic-movement.mjs';
import {geographicRoute,geographicRiverCrossings,GEOGRAPHIC_CORRIDORS} from '../scripts/audit-geographic-roads.mjs';
import {newCampaign,findCampaignRoute,orderCampaignArmy,serializeCampaign,validateCampaign,advanceCampaignDay,beginExecution,activeBattles,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';

const world=nationalWorld('guandu-200');
for(const [name,from,to,blocked] of GEOGRAPHIC_CORRIDORS)test(`${name}: blockade requires at least twice the road cost or makes the route unreachable`,()=>{
 const route=geographicRoute(world,from,to),detour=geographicRoute(world,from,to,{blocked});
 assert.ok(route,name+' must have a real route');
 for(const id of blocked)assert.ok(route.path.includes(id),name+' must actually pass '+id);
 assert.ok(!detour||detour.cost>=route.cost*2,JSON.stringify({name,route,detour}));
});
test('all cities, ports, gates and prefectures remain connected and rebuild never reopens prohibited links',()=>{
 const first=applyAtlasLayout(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS);assert.deepEqual(applyAtlasLayout(first.cities,first.roads),first);
 const edges=new Set(world.roads.map(e=>edgeKey(...e)));assert.equal(edges.size,world.roads.length);
 for(const node of mapNodes(world))assert.ok(geographicRoute(world,'xuchang',node.id),node.name);
 for(const e of ROAD_NETWORK_DESIGN.geography.remove){assert.ok(!edges.has(edgeKey(...e)));assert.ok(!first.roads.some(x=>edgeKey(...x)===edgeKey(...e)));}
});
test('every navigable water road begins and ends at a physical port, including both new ferry pairs',()=>{
 for(const [a,b] of world.roads){const road=chosenRoad(world,a,b);assert.ok(road);if(road.terrain==='water')for(const id of [a,b])assert.equal(mapNode(world,id).kind,'port');}
 for(const [a,b] of [['atlas-jincheng-port','atlas-jincheng-east-port'],['atlas-huai-port','atlas-huainan-port'],['atlas-jiangzhou-port','atlas-nanjin-port']])assert.equal(chosenRoad(world,a,b).terrain,'water');
 for(const id of ['atlas-jincheng','town-20','atlas-longxi','atlas-zhongli','atlas-hefei'])assert.equal(mapNode(world,id).water,true,id+' must be able to buy real ships before a water journey');
 const forged=structuredClone(world);forged.roads.push(['atlas-jincheng','town-20']);forged.roadSegments[edgeKey('atlas-jincheng','town-20')]={distance:1,terrain:'water'};
 assert.equal(chosenRoad(forged,'atlas-jincheng','town-20'),null);
 assert.equal(validMapRoute(forged,'atlas-jincheng','town-20',['town-20']),false);
});
test('land roads and port approaches cannot cross the displayed Yellow, Yangtze, Huai or Han rivers',()=>{
 assert.deepEqual(geographicRiverCrossings(world),[]);
});
test('ships cannot cross closed mountain ridges, short cross-river city roads or bypass the port nodes',()=>{
 const s=newCampaign(617,'guandu-200'),force={leader:'u',morale:80,hunger:0,units:[{id:'u',troops:1000,type:'spear',leadership:80,equipment:{ship:'ship',siege:null}}]};
 for(const [a,b] of [['town-18','town-37'],['town-38','town-39'],['town-33','town-36'],['atlas-fuling','town-33'],['atlas-guangling','atlas-jingkou'],['luoyang','xuchang']]){
  assert.equal(roadCost(s,a,b),Infinity);assert.equal(validMapRoute(s,a,b,[b]),false);
  assert.equal(marchItinerary(s,a,[b],force).days,Infinity);
 }
 const path=findCampaignRoute(s,'atlas-guangling','atlas-jingkou');assert.ok(path.includes('town-60')&&path.includes('town-71'));
 const noShip=structuredClone(force);noShip.units[0].equipment.ship=null;
 assert.ok(Number.isFinite(marchItinerary(s,'atlas-guangling',path,force).days));assert.equal(marchItinerary(s,'atlas-guangling',path,noShip).days,Infinity);
});
test('real water marching keeps the arrival port when a mid-river order changes the land destination',()=>{
 const s=newCampaign(617,'guandu-200'),a=fieldFromCity(s,'xuchang');
 a.location='town-60';a.units.forEach(u=>u.equipment.ship='ship');
 assert.equal(orderCampaignArmy(s,a.id,'town-71'),null);
 a.travel={from:'town-60',to:'town-71',progress:5,road:'main',terrain:'water'};
 const original=structuredClone(a.travel);assert.equal(orderCampaignArmy(s,a.id,'town-24'),null);
 assert.deepEqual(a.travel,original);assert.equal(a.location,'town-60');assert.equal(a.route[0],'town-71');assert.equal(a.route.at(-1),'town-24');
 assert.equal(orderCampaignArmy(s,a.id,'town-24','auto',{path:['town-24']}),null);assert.equal(a.route[0],'town-71');
 assert.ok(orderCampaignArmy(s,a.id,'town-23','auto',{path:['town-23']}));assert.equal(a.route[0],'town-71');
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(serializeCampaign(restored),serializeCampaign(s));
 const old=JSON.parse(serializeCampaign(s));old.campaign.version=64;assert.throws(()=>validateCampaign(old),/重新开始/);
});
test('an enemy holding the landing port forces a real harbor battle before the army can reach land',()=>{
 const s=newCampaign(617,'guandu-200'),a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye');
 a.location='town-60';a.units.forEach(u=>u.equipment.ship='ship');enemy.location='town-71';enemy.cooldownDay=999;
 assert.equal(orderCampaignArmy(s,a.id,'town-24'),null);assert.equal(a.route[0],'town-71');approachDestination(s,a,.1);
 s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
 const battle=activeBattles(s).find(b=>b.cityId==='town-71');assert.ok(battle);assert.equal(battle.battle.mapId,'river-harbor');assert.ok(battle.armyIds.includes(enemy.id));assert.notEqual(a.location,'town-24');
 chooseEncounter(s,battle.id,false);const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,copy]){state.campaign.ai.lastPlanDay=state.campaign.day;advanceCampaignDay(state);}
 assert.equal(serializeCampaign(copy),serializeCampaign(s));
});
