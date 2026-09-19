import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {HEX_ASPECT,hexNeighbors,hexDistance,hexBeyond,hexCenter,insideHexGrid} from '../hex-grid.mjs';
import {routeTo,unitTactics} from '../tactics.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';

test('each offset-row neighbor is reciprocal, one step away, and equally spaced on screen',()=>{
  for(let y=0;y<8;y++)for(let x=0;x<14;x++) {
    const a={x,y},center=hexCenter(x,y),neighbors=hexNeighbors(a);
    assert.equal(new Set(neighbors.map(p=>p.join(','))).size,6);
    for(const [nx,ny] of neighbors) {
      const b={x:nx,y:ny},p=hexCenter(nx,ny);
      assert.equal(hexDistance(a,b),1);
      assert.equal(hexDistance(b,a),1);
      assert.ok(hexNeighbors(b).some(([px,py])=>px===x&&py===y));
      assert.ok(Math.abs(Math.hypot((p.x-center.x)*HEX_ASPECT,p.y-center.y)-HEX_ASPECT/14.5)<1e-10);
    }
  }
  assert.equal(hexDistance({x:4,y:3},{x:5,y:4}),1,'odd-row diagonal is adjacent');
  assert.equal(hexDistance({x:4,y:2},{x:5,y:3}),2,'opposite diagonal needs two steps');
});

test('hex paths use six neighbors and cannot cross a gate or an occupied ring',()=>{
  const a={x:4,y:3,hp:100,status:'active'},target={x:9,y:5,hp:100,status:'active'};
  const b={sides:[{units:[a]},{units:[target]}],siege:{gate:{x:6,y:4,hp:100}}};
  const route=routeTo(b,a,target,20);
  assert.ok(route.length>0);
  let prev=a;
  for(const p of route) {
    assert.equal(hexDistance(prev,p),1);assert.ok(insideHexGrid(p.x,p.y));
    assert.ok(p.x!==6||p.y!==4);prev=p;
  }
  assert.equal(hexDistance(prev,target),1);
  b.sides[0].units.push(...hexNeighbors(a).map(([x,y])=>({x,y,hp:100,status:'active'})));
  assert.equal(routeTo(b,a,target,20),null);
});

function duel(skill,id='chu') {
  const s=createScenario('field'),b=s.battle;
  lockDeployment(b);
  const a=b.sides[0].units.find(u=>u.id===id),d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];
  Object.assign(a,{x:4,y:3,type:'spear',cooldown:999,intent:100});
  learnFixtureTactics(a,[skill]);
  Object.assign(d,{x:5,y:4,type:'spear',cooldown:999,intent:0});
  for(const u of [a,d])for(const t of unitTactics(u))u.skillReady[t.id]=u===a&&t.id===skill?0:999;
  return {s,b,a,d};
}
function complete(b,a) { for(let i=0;i<8&&!a.skillCasts;i++)stepBattle(b); assert.equal(a.skillCasts,1); }

test('diagonal spear thrust hits the next hex on the same axial line',()=>{
  const {b,a,d}=duel('thrust');
  const behind={...structuredClone(d),id:'behind',type:'crossbow',...hexBeyond(a,d)};
  for(const t of unitTactics(behind))behind.skillReady[t.id]=999;
  assert.deepEqual({x:behind.x,y:behind.y},{x:5,y:5});
  b.sides[1].units.push(behind);complete(b,a);
  assert.ok(d.hp<d.maxHp);assert.ok(behind.hp<behind.maxHp);
});

test('diagonal protection knockback follows the hex line and stops before an occupied cell',()=>{
  for(const blocked of [false,true]) {
    const {b,a,d}=duel('protect');
    const ally={...structuredClone(a),id:'ally',x:4,y:2,intent:0};
    ally.skillReady.protect=999;b.sides[0].units.push(ally);
    Object.assign(d,{x:4,y:1});
    // From even row 2 through odd row 1, the next axial cell is (5,0).
    if(blocked)b.sides[0].units.push({...structuredClone(ally),id:'blocker',x:5,y:0});
    complete(b,a);
    assert.deepEqual({x:d.x,y:d.y},blocked?{x:4,y:1}:{x:5,y:0});
  }
});

test('missing grid type is rejected instead of upgrading a pre-hex battle',()=>{
  const s=createScenario('siege');
  delete s.battle.gridType;
  assert.throws(()=>validateSave(s),/网格/);
});
