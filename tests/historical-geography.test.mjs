import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalWorld} from '../national-scenarios.mjs';
import {mapNodes,mapNode,edgeKey} from '../road-network.mjs';
import {roadPoint} from '../strategic-movement.mjs';
import {roadCurve} from '../road-geometry.mjs';
import {LAKES,RIVERS,isLakePoint,nearestWaterPoint} from '../national-geography.mjs';
import {historicalGeographyIssues} from '../historical-geography-validation.mjs';
import {HISTORICAL_GEOGRAPHY_DESIGN as DESIGN} from '../data/design/historical-geography.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
const world=nationalWorld('guandu-200'),places=mapNodes(world);
test('all 153 settlements and actual land approaches satisfy the recorded geography checks',()=>{
 assert.equal(places.length,153);assert.deepEqual(historicalGeographyIssues(places,world.roads,{pointOnRoad:roadPoint}),[]);
 for(const r of DESIGN.relations)for(const source of r.sources)assert.ok(DESIGN.sources[source]);
});
test('Wuling, Yuzhang and Linchuan occupy their documented sides of the lakes and tributaries',()=>{
 const wuling=mapNode(world,'town-33'),yuzhang=mapNode(world,'atlas-yuzhang'),linchuan=mapNode(world,'atlas-linchuan');
 const dongting=LAKES.find(l=>l.name==='洞庭湖'),poyang=LAKES.find(l=>l.name==='鄱阳湖');
 assert.ok(wuling.x<Math.min(...dongting.points.map(p=>p[0])));
 assert.ok(yuzhang.y>Math.max(...poyang.points.map(p=>p[1]))&&yuzhang.x<poyang.label[0]);
 assert.ok(nearestWaterPoint(linchuan,'ganshui').x<linchuan.x);
 for(const c of [wuling,yuzhang,linchuan])assert.ok(!isLakePoint(c));
});
test('a historical port uses its regional approach while the lake approach bends around dry ground',()=>{
 const edges=new Set(world.roads.map(e=>edgeKey(...e)));assert.ok(edges.has(edgeKey('town-30','town-80')));assert.ok(!edges.has(edgeKey('town-31','town-80')));
 const a=mapNode(world,'atlas-hefei'),b=mapNode(world,'town-61'),curve=roadCurve(a,b);
 assert.ok(curve.length>Math.hypot(a.x-b.x,a.y-b.y)*1.1,'the road has to go around Chaohu');
 for(let i=0;i<=256;i++)assert.ok(!isLakePoint(roadPoint(a,b,i/256)));
 const ruxu=RIVERS.find(r=>r.id==='rushui'),sailing=roadCurve(mapNode(world,'town-61'),mapNode(world,'town-69'));
 assert.ok(sailing.points.some(p=>Math.hypot(p.x-ruxu.points.at(-1)[0],p.y-ruxu.points.at(-1)[1])<1));
});
test('geography checks reject a misplaced city, swapped pass order, wrong name and wrong port connection',()=>{
 const copy=structuredClone(places),find=id=>copy.find(c=>c.id===id),lake=LAKES.find(l=>l.name==='洞庭湖');
 Object.assign(find('town-33'),{x:lake.label[0],y:lake.label[1]});find('town-48').x=find('town-37').x+1;find('town-77').name='卢陵港';
 const roads=world.roads.filter(e=>edgeKey(...e)!==edgeKey('town-30','town-80'));roads.push(['town-31','town-80']);
 const issues=historicalGeographyIssues(copy,roads);
 for(const kind of ['settlement-in-water','regional-order','place-identity','wrong-port-approach'])assert.ok(issues.some(i=>i.kind===kind),kind);
});
test('road design validation rejects non-finite shore bends and unregistered road references',()=>{
 const copy=structuredClone(DESIGN_TABLES);copy.roadNetwork.geography.paths[0].points[0][0]=NaN;
 assert.ok(validateDesignTables(copy).some(e=>e.includes('geography.paths')));
 copy.roadNetwork.geography.paths[0].source[1]='unregistered-port';assert.ok(validateDesignTables(copy).some(e=>e.includes('geography.paths')));
});
