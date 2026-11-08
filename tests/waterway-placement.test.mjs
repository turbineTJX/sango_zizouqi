import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalWorld} from '../national-scenarios.mjs';
import {ATLAS_PORT_WATERS} from '../data/design/atlas-cities.mjs';
import {RIVERS,LAKES,nearestWaterPoint,isLandPoint,isWaterPoint} from '../national-geography.mjs';
import {mapNode} from '../road-network.mjs';
import {chosenRoad} from '../road-metrics.mjs';
import {roadPoint,roadPath} from '../strategic-movement.mjs';
import {roadCurve} from '../road-geometry.mjs';
import {townLayout} from '../town-layout.mjs';
const world=nationalWorld('guandu-200');
test('every port sits on its named river, lake or coastal bank with its pier facing the water',()=>{
 const ports=world.junctions.filter(n=>n.kind==='port');
 assert.equal(Object.keys(ATLAS_PORT_WATERS).length,ports.length);
 for(const p of ports){
  const bank=nearestWaterPoint(p,ATLAS_PORT_WATERS[p.id]),clearance=bank.distance-bank.width/2;
  assert.ok(isLandPoint(p.x,p.y),p.name+' must have a land approach');
  assert.ok(!isWaterPoint(p),p.name+' buildings must be on dry ground beside the water');
  assert.ok(clearance>=1.9&&clearance<=2.7,p.name+' has lost its bank: '+clearance);
  assert.equal(townLayout(p).flip,bank.x>p.x,p.name+' pier faces the wrong shore');
 }
});
test('passes can guard a two-ended road without being a multi-road intersection',()=>{
 const gates=world.junctions.filter(n=>n.kind==='gate'),degree=n=>world.roads.filter(e=>e.includes(n.id)).length;
 assert.ok(gates.filter(n=>degree(n)===2).length>=9);
 for(const n of gates){assert.ok(degree(n)>=2);assert.ok(world.roads.filter(e=>e.includes(n.id)).every(([a,b])=>chosenRoad(world,a,b).terrain==='mountain'));}
});
test('widened rivers leave the nearby city anchors on their original dry bank',()=>{
 for(const id of ['town-28','town-39','town-42','atlas-pingyang','atlas-guangling'])assert.ok(!isWaterPoint(mapNode(world,id)),id+' was submerged by the wider river');
});
test('all water routes follow continuous water, share reverse geometry and leave the world unchanged',()=>{
 const before=JSON.stringify(world);let routes=0,bends=0;
 for(const [a,b] of world.roads){if(chosenRoad(world,a,b).terrain!=='water')continue;routes++;
  const from=mapNode(world,a),to=mapNode(world,b),curve=roadCurve(from,to);
  assert.ok(curve&&curve.points.length>2);if(curve.length>Math.hypot(from.x-to.x,from.y-to.y)*1.2)bends++;
  for(let i=0;i<=256;i++){
   const p=roadPoint(from,to,i/256);assert.ok(isWaterPoint(p,2.7),from.name+'—'+to.name+' sails over land: '+JSON.stringify(p));
   assert.deepEqual(p,roadPoint(to,from,1-i/256));
  }
  assert.doesNotMatch(roadPath(from,to),/NaN|Infinity/);
 }
 assert.ok(routes>=30&&bends>=10);assert.equal(JSON.stringify(world),before);
});
test('broad river trunks connect tributary and lake branches used by actual water roads',()=>{
 for(const [id,width] of [['changjiang',12],['huanghe',10],['hanshui',7],['huaihe',7]])assert.ok(RIVERS.find(r=>r.id===id).width>=width);
 const at=id=>mapNode(world,id),han=roadCurve(at('town-81'),at('town-82')).points;
 const confluence=RIVERS.find(r=>r.id==='hanshui').points.at(-1);
 assert.ok(han.some(p=>Math.hypot(p.x-confluence[0],p.y-confluence[1])<1));
 const lake=LAKES.find(l=>l.name==='鄱阳湖'),poyang=roadCurve(at('town-74'),at('town-76')).points;
 assert.ok(poyang.some(p=>Math.hypot(p.x-lake.label[0],p.y-lake.label[1])<8));
});
