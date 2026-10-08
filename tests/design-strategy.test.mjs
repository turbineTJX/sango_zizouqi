import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
const cwd=fileURLToPath(new URL('..',import.meta.url));
test('strategy tables reject duplicate/disconnected roads, invalid work handlers and conflicting building values',()=>{
 for(const [edit,needle] of [
  [d=>d.roadNetwork.trailCost=0,'小路代价'],
  [d=>d.roadNetwork.bypasses.push([...d.roadNetwork.bypasses[0]]),'重复小路'],
  [d=>d.roadNetwork.bypasses[0][1]='missing-city','引用的官道不存在'],
  [d=>d.roads.push([...d.roads[0]].reverse()),'重复的双向道路'],
  [d=>d.roads=d.roads.filter(edge=>!edge.includes('town-1')),'地图不连通'],
  [d=>d.demoRoads.push(['ye','missing-city']),'道路引用不存在的据点'],
  [d=>d.domesticActions.build_commerce.cost=1,'不能重复定义'],
  [d=>d.domesticActions.fair.kind='unknown','未实现的内政动作类型'],
  [d=>d.domesticActions.fair.stat='politics+charm','一个有效主属性'],
  [d=>d.domesticActions.build_commerce.value='missing-building','不存在的建筑'],
  [d=>d.movement.roadVariants.main.costFactors.land=0,'无效道路名称或代价系数'],
  [d=>d.movement.scouting.speed=0,'斥候每日行程'],
  [d=>d.movement.army.hunger.reverse(),'阈值须非负且严格降序'],
 ]){const d=structuredClone(DESIGN_TABLES);edit(d);assert.ok(validateDesignTables(d).some(e=>e.includes(needle)),needle);}
});
test('edited action/building/road/movement records drive real autonomous work, routing and saves',()=>{
 const code=`
 import assert from 'node:assert/strict';
 import {DOMESTIC_ACTION_DESIGNS as A} from './data/design/domestic-actions.mjs';
 import {BUILDING_DESIGNS as B} from './data/design/buildings.mjs';
 import {NATIONAL_ROAD_DESIGNS as R} from './data/design/roads.mjs';
 import {ROAD_DISTANCE_DESIGNS as D} from './data/design/road-distances.mjs';
 import {MOVEMENT_RULES as M} from './data/design/movement-rules.mjs';
 A.fair.cost=321;A.fair.days=7;B.commerce.cost=777;B.commerce.days=17;
 R.push(['town-1','town-42']);D['town-1:town-42']=80;M.roadVariants.main.costFactors.land=2;M.army.speedByTroop.cavalry=60;M.personnel.light=90;M.personnel.transport=130;
 const e=await import('./strategic-campaign.mjs'),w=await import('./domestic.mjs'),m=await import('./strategic-movement.mjs'),p=await import('./personnel-movement.mjs');
 assert.equal(w.ACTIONS.build_commerce.cost,777);assert.equal(w.ACTIONS.build_commerce.days,17);assert.equal(e.PROJECTS.commerce.cost,777);assert.equal(e.PROJECTS.commerce.turns,1.7);
 const s=e.newCampaign(42,'heroes-251');assert.deepEqual(e.findCampaignRoute(s,'town-1','town-42'),['town-42']);
 assert.equal(m.roadCost(s,'town-1','town-42','main'),m.roadDistance(s,'town-1','town-42')*2);
 assert.equal(m.movementPoints({leader:'u',morale:80,hunger:0,units:[{id:'u',troops:1000,type:'cavalry',leadership:80}]}),65.4);
 assert.equal(p.lightPersonnelSpeed({id:'dun'}),90);assert.equal(p.personnelSpeed({destination:'ye',unit:{id:'dun',troops:1000}}),130);
 const c=s.cities.find(c=>c.id==='xuchang');c.commerce=1;const {addCityGold}=await import('./city-resources.mjs');addCityGold(s,c,20000-c.gold);
 for(const [id,a] of Object.entries(w.ACTIONS))if(a.direction==='commerce'&&id!=='fair')c.domestic.cooldowns[id]=1000;
 assert.equal(w.assignDomestic(s,c.id,'commerce','cao'),null);w.setDomesticAutoApprove(s,true);w.beginDomesticTurn(s);
 const action=w.assignmentFor(s,'cao').action;assert.equal(action.key,'fair');assert.equal(action.cost,321);assert.equal(action.remaining,7);assert.equal(w.ACTIONS.fair.stat,'politics');
 const restored=e.validateCampaign(JSON.parse(e.serializeCampaign(s)));assert.equal(e.serializeCampaign(restored),e.serializeCampaign(s));
 console.log('strategic design edits verified');
 `;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd,encoding:'utf8'}),/strategic design edits verified/);
});
