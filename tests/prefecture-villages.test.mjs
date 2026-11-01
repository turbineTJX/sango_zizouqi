import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalWorld} from '../national-scenarios.mjs';
import {mapNodes,edgeKey,buildRoadNetwork} from '../road-network.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {ROAD_DISTANCE_DESIGNS} from '../data/design/road-distances.mjs';
import {ROAD_NETWORK_DESIGN} from '../data/design/road-network.mjs';
import {ROAD_CROSSING_DESIGN} from '../data/design/road-crossings.mjs';
import {UNPLACED_ROAD_LINKS} from '../data/design/road-link-policy.mjs';
import {geographicRoute} from '../scripts/audit-geographic-roads.mjs';
import {roadCurve} from '../road-geometry.mjs';
import {cityCompactMarkup,citySceneMarkup,citySceneState} from '../city-scene.mjs';
import {renderJunctions} from '../road-network-view.mjs';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';

test('historical trunk roads retain named county junctions instead of blanket city-bypass triangles',()=>{
 const s=nationalWorld('guandu-200');
 const land=(a,b)=>geographicRoute(s,a,b,{landOnly:true}).path;
 assert.deepEqual(land('town-23','town-24'),['junction:town-23:town-24','town-24']);
 assert.ok(land('atlas-jingkou','town-71').includes('junction:town-23:town-24'));
 assert.deepEqual(land('town-33','town-35'),['junction:town-32:town-33','junction:town-33:town-35','town-35']);
 assert.ok(!s.roads.some(e=>edgeKey(...e)===edgeKey('atlas-linchuan','town-34')));
 for(const n of s.junctions)assert.ok(!n.id.startsWith('junction:crossing-'));
});

test('atlas reconstruction retains the parent length sources used to derive crossroads',()=>{
 const base=buildRoadNetwork(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS,{requireLengths:false,includeCrossings:false});
 assert.equal(base.roads.length,Object.keys(ROAD_DISTANCE_DESIGNS).length);
 for(const [a,b] of base.roads)assert.equal(base.roadSegments[edgeKey(a,b)].distance,ROAD_DISTANCE_DESIGNS[edgeKey(a,b)]);
 const actual=buildRoadNetwork(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS);
 assert.deepEqual(actual.junctions.map(n=>n.id).sort(),base.junctions.map(n=>n.id).sort());
 const known=new Set(Object.keys(ROAD_NETWORK_DESIGN.nodeNames).map(key=>'junction:'+key));
 assert.ok(ROAD_CROSSING_DESIGN.every(n=>known.has(n.id)&&n.name===ROAD_NETWORK_DESIGN.nodeNames[n.id.slice('junction:'.length)]),'intersections must use registered named prefectures');
 assert.ok(actual.junctions.every(n=>known.has(n.id)));
 for(const edge of UNPLACED_ROAD_LINKS)assert.ok(!actual.roads.some(e=>edgeKey(...e)===edgeKey(...edge)),'unnamed branch remains active');
});

test('all visible land-road crossings meet at a shared settlement',()=>{
 const s=nationalWorld('guandu-200'),nodes=new Map(mapNodes(s).map(n=>[n.id,n]));
 assert.equal(new Set(s.roads.map(e=>edgeKey(...e))).size,s.roads.length,'no parallel duplicate roads');
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const roads=s.roads.map(edge=>{const [a,b]=edge.map(id=>nodes.get(id));return {edge,water:a.kind==='port'&&b.kind==='port',points:roadCurve(a,b)?.points||[a,b]};});
 const missing=[];
 for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++){
  const a=roads[i],b=roads[j];if(a.water||b.water)continue;
  for(let p=1;p<a.points.length;p++)for(let q=1;q<b.points.length;q++){
   const x=a.points[p-1],y=b.points[q-1],v={x:a.points[p].x-x.x,y:a.points[p].y-x.y},w={x:b.points[q].x-y.x,y:b.points[q].y-y.y},d=cross(v,w);
   if(Math.abs(d)<1e-9)continue;
   const delta={x:y.x-x.x,y:y.y-x.y},t=cross(delta,w)/d,u=cross(delta,v)/d;
   if(t<=1e-7||t>=1-1e-7||u<=1e-7||u>=1-1e-7)continue;
   const at={x:x.x+t*v.x,y:x.y+t*v.y};
   // Roads can merge inside an existing settlement's local approach area.
   if(!a.edge.some(id=>b.edge.includes(id)&&Math.hypot(nodes.get(id).x-at.x,nodes.get(id).y-at.y)<5))missing.push({a:a.edge,b:b.edge,at});
  }
 }
 assert.deepEqual(missing,[]);
});

test('every prefecture keeps a residential village and real facility sites without changing saves',()=>{
 const s=newCampaign(81,'guandu-200'),before=serializeCampaign(s);
 for(const n of s.junctions.filter(n=>n.kind==='junction')){
  const model=citySceneState(s,n),compact=cityCompactMarkup(model),interior=citySceneMarkup(model);
  for(const html of [compact,interior]){assert.match(html,/class="prefecture-village"/);assert.equal((html.match(/class="village-house"/g)||[]).length,10);}
  assert.ok(s.roads.filter(e=>e.includes(n.id)).length>=2,n.name+' needs real exits');
 }
 const markup=renderJunctions(s,'xuchang');assert.doesNotMatch(markup,/M-5-7H5V4L0 7-5 4Z/);
 assert.equal(serializeCampaign(s),before);
 assert.equal(serializeCampaign(validateCampaign(JSON.parse(before))),before);
});
