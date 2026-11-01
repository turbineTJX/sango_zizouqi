import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalWorld} from '../national-scenarios.mjs';
import {mapNode} from '../road-network.mjs';
import {roadPoint,roadPath} from '../strategic-movement.mjs';
import {roadCurve} from '../road-geometry.mjs';
import {RIVERS,isLandPoint} from '../national-geography.mjs';
import {crossingRoadSection} from '../road-crossings.mjs';
const world=nationalWorld('guandu-200');
const side=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
const intersects=(a,b,c,d)=>side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
test('winding atlas roads share endpoints, reverse travel and evenly spaced progress without changing the world',()=>{
 const before=JSON.stringify(world);let winding=0;
 for(const [a,b]of world.roads){
  const from=mapNode(world,a),to=mapNode(world,b),curve=roadCurve(from,to);if(!curve)continue;
  const distance=Math.hypot(to.x-from.x,to.y-from.y);
  assert.ok(Math.hypot(roadPoint(from,to,0).x-from.x,roadPoint(from,to,0).y-from.y)<1e-8);
  assert.ok(Math.hypot(roadPoint(from,to,1).x-to.x,roadPoint(from,to,1).y-to.y)<1e-8);
  for(const t of [.125,.25,.5,.75,.875])assert.deepEqual(roadPoint(from,to,t),roadPoint(to,from,1-t));
  const cross=curve.points.some(p=>Math.abs((p.x-from.x)*(to.y-from.y)-(p.y-from.y)*(to.x-from.x))/distance>.2);
  if(cross)winding++;
  assert.ok(Number.isFinite(curve.length)&&curve.length>=distance-1e-8);
  const path=[...roadPath(from,to).matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)],points=from.id<to.id?curve.points:[...curve.points].reverse();assert.equal(path.length,points.length);
  for(let i=0;i<points.length;i++)assert.ok(Math.hypot(+path[i][1]-points[i].x,+path[i][2]-points[i].y)<.001);
 }
 assert.ok(winding>150,'land routes should have individual terrain bends');assert.equal(JSON.stringify(world),before);
});
test('bends introduce no new river crossings or excursions beyond the existing coastline',()=>{
 for(const [a,b]of world.roads){
  const from=mapNode(world,a),to=mapNode(world,b),curve=roadCurve(from,to);if(!curve)continue;
  const section=crossingRoadSection(a,b),source=section?section.source.map(id=>mapNode(world,id)):[from,to];
  for(const river of RIVERS)for(let i=1;i<river.points.length;i++){
   const c={x:river.points[i-1][0],y:river.points[i-1][1]},d={x:river.points[i][0],y:river.points[i][1]};
   if(intersects(...source,c,d))continue;
   assert.ok(!curve.points.slice(1).some((p,j)=>intersects(curve.points[j],p,c,d)),a+' / '+b+' crosses '+river.name);
  }
  const entirelyInland=Array.from({length:65},(_,i)=>{const t=i/64;return isLandPoint(source[0].x+(source[1].x-source[0].x)*t,source[0].y+(source[1].y-source[0].y)*t);}).every(Boolean);
  if(entirelyInland)assert.ok(curve.points.every(p=>isLandPoint(p.x,p.y)),a+' / '+b+' leaves land');
 }
});
