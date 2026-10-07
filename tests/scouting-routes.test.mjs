import test from 'node:test';
import assert from 'node:assert/strict';
import {scoutRoute,scoutTargets} from '../scouting-state.mjs';

function world(edges){
 const ids=[...new Set(edges.flat())],cities=ids.filter(id=>id.startsWith('city')).map((id,i)=>({id,name:id,x:i*100,y:0,units:[]}));
 return {cities,junctions:ids.filter(id=>!id.startsWith('city')).map((id,i)=>({id,name:id,kind:'port',x:i*10,y:0})),roads:edges,roadSegments:Object.fromEntries(edges.map(([a,b])=>[[a,b].sort().join(':'),{distance:10}]))};
}

test('neighboring cities are endpoints and cannot be used as transit',()=>{
 const s=world([['city-a','local'],['local','city-b'],['city-b','beyond'],['beyond','city-c']]);
 assert.deepEqual(scoutRoute(s,'city-a','city-b'),['local','city-b']);assert.equal(scoutRoute(s,'city-a','city-c'),null);assert.equal(scoutRoute(s,'city-a','beyond'),null);
 assert.deepEqual(scoutTargets(s,'city-a').map(n=>n.id),['city-b','local']);
 const travelling=scoutRoute(s,'city-a','city-b');travelling.shift();assert.deepEqual(scoutRoute(s,'city-a','city-b'),['local','city-b'],'moving one scout must not consume a later dispatch route');
});

test('a legal local route is chosen even when the cheapest route crosses another city',()=>{
 const s=world([['city-a','city-b'],['city-b','city-c'],['city-a','local'],['local','city-c']]);
 s.roadSegments['city-a:local'].distance=40;
 assert.deepEqual(scoutRoute(s,'city-a','city-c'),['local','city-c']);
});

test('continuous ports stay within local and neighboring road districts',()=>{
 const s=world([['city-a','port-a'],['port-a','port-b'],['port-b','city-b'],['port-b','port-c'],['port-c','city-c'],['port-c','port-d'],['port-d','city-d']]);
 assert.ok(scoutTargets(s,'city-a').some(n=>n.id==='city-b'));assert.ok(scoutTargets(s,'city-a').some(n=>n.id==='port-b'));
 assert.equal(scoutRoute(s,'city-a','city-c'),null);assert.equal(scoutRoute(s,'city-a','port-d'),null);
 assert.equal(scoutRoute(s,'port-a','city-b'),null);assert.equal(scoutRoute(s,'city-a','city-a'),null);assert.equal(scoutRoute(s,'city-a','missing'),null);
});

test('scope and paths use public geography without consulting hidden ownership or forces',()=>{
 const s=world([['city-a','local'],['local','city-b']]),before=scoutTargets(s,'city-a').map(n=>n.id),path=scoutRoute(s,'city-a','city-b');
 s.cities[1].owner='enemy';s.cities[1].units=[{id:'secret',troops:999999}];s.armies=[{location:'local',route:['secret-target']}];
 assert.deepEqual(scoutTargets(s,'city-a').map(n=>n.id),before);assert.deepEqual(scoutRoute(s,'city-a','city-b'),path);
});
