import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreCapturePurpose} from '../ai-policy/action-purpose.mjs';
import {jointFormations} from '../ai-policy/army-formations.mjs';

const facts=()=>({victoryValue:{},occupationPayoff:{expected:{grain:0,gold:0,manpower:0},recoveredWounded:0,earlierRecovered:0,expectedCaptives:0},relieveBorder:false,foodUse:300,men:30000,duration:40,work:[],opposition:{staleMargin:0}});
const prediction={estimatedLosses:6000,replacementGold:2000,militaryGold:500,consumedGrain:12000};
test('capture purposes distinguish threat removal, connection and replenishment without net-profit admission',()=>{
 const f=facts(),before=structuredClone(f),ordinary=scoreCapturePurpose(f,prediction);
 assert.ok(ordinary.score>0,'a safe territorial objective can be useful without immediate loot');
 const elimination=scoreCapturePurpose({...f,victoryValue:{elimination:35}},prediction);
 const connection=scoreCapturePurpose({...f,victoryValue:{connection:20,corridor:18}},prediction);
 assert.ok(elimination.score>ordinary.score);assert.ok(connection.score>ordinary.score);
 const rich={...f,occupationPayoff:{...f.occupationPayoff,expected:{grain:20000,gold:6000,manpower:9000},recoveredWounded:2000,expectedCaptives:2}};
 assert.ok(scoreCapturePurpose(rich,prediction).score>ordinary.score);
 const huge={...rich,occupationPayoff:{...rich.occupationPayoff,expected:{grain:1e9,gold:1e9,manpower:1e9},expectedCaptives:100}};
 assert.equal(scoreCapturePurpose(huge,prediction).score,scoreCapturePurpose(rich,prediction).score,'purpose satisfaction saturates instead of pursuing unlimited loot');
 assert.deepEqual(f,before);
});
test('purpose scoring separately penalizes losses, long commitments, unfinished work and uncertainty',()=>{
 const f=facts(),base=scoreCapturePurpose(f,prediction);
 for(const risk of [{duration:160},{work:[{remaining:20}]},{opposition:{staleMargin:.3}}])assert.ok(scoreCapturePurpose({...f,...risk},prediction).score<base.score);
 assert.ok(scoreCapturePurpose(f,{...prediction,estimatedLosses:15000}).score<base.score);
});
const group=(id,n)=>({c:{id},units:Array.from({length:n},(_,i)=>({id:id+i,troops:4500}))});
test('joint formations reject isolated rear officers and balance full armies without duplicate personnel',()=>{
 assert.equal(jointFormations([group('front',7),group('rear',1)],10),null);
 assert.equal(jointFormations([group('front',7)],6),null,'six plus one is not two fighting armies');
 const input=[group('front',13),group('second',8)],before=structuredClone(input),columns=jointFormations(input,10);
 assert.deepEqual(columns.map(c=>c.units.length),[7,6,8]);assert.deepEqual(input,before);
 const ids=columns.flatMap(c=>c.units.map(u=>u.id));assert.equal(ids.length,21);assert.equal(new Set(ids).size,21);
 assert.ok(columns.every(c=>c.units.every(u=>u.id.startsWith(c.c.id))),'each column consists of actual colocated people');
});
