import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {roleTacticIds,unitTactics,routeTo,tacticTarget,TACTICS_BOOK} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {holdsLine} from '../engagement.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function scene(type='cavalry',mirror=false){
  const state=createScenario('field',71),b=state.battle;
  const a=b.sides[0].units[0],front=b.sides[1].units[0],rear=b.sides[1].units[1];
  b.sides[0].units=[a];b.sides[1].units=[front,rear];
  Object.assign(a,{type,x:4,y:3,cooldown:0});
  Object.assign(front,{type:'spear',x:5,y:3,cooldown:999});
  Object.assign(rear,{type:'crossbow',x:5,y:4,cooldown:999,hp:300});
  for(const u of [a,front,rear]){
    learnFixtureTactics(u,roleTacticIds(u,'assault'));u.intent=0;
    u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
    u.statuses={};
  }
  // Stationary defenders still hold the line; the attacking unit uses real AI.
  for(const u of [front,rear])u.statuses.phalanx={until:999};
  if(mirror){b.sides.reverse();for(const side of [0,1])for(const u of b.sides[side].units){u.side=side;u.x=13-u.x;u.y=7-u.y;}}
  b.sides[a.side].focus=rear.id;b.sides[a.side].focusUntil=99;
  lockDeployment(b);return {state,b,a,front,rear};
}
const attacks=(b,a)=>b.effects.filter(e=>e.from===a.id&&e.damage>0);

test('engaged melee shares its attack with every adjacent troop despite explicit focus, on both sides',()=>{
  for(const type of ['spear','cavalry'])for(const mirror of [false,true]){
    const {b,a,front,rear}=scene(type,mirror),hp=rear.hp;
    stepBattle(b);assert.deepEqual(new Set(attacks(b,a).map(e=>e.to)),new Set([front.id,rear.id]));assert.ok(rear.hp<hp);
    assert.ok(attacks(b,a).every(e=>e.damageShare===.5));
  }
});

test('nearby front takes priority before contact; fast movement stops on contact',()=>{
  const {b,a,front,rear}=scene();a.x=3;rear.x=7;
  learnFixtureTactics(a,['gallop','harass','relay']); // Non-assassin cavalry must still engage the nearer front.
  a.skillReady={gallop:999,harass:999,relay:999};
  a.statuses.haste={until:99};
  stepBattle(b);assert.equal(hexDistance(a,front),1);assert.equal(a.x,4);
  stepBattle(b);assert.equal(attacks(b,a)[0]?.to,front.id);
});

test('rush cannot escape an engagement or charge through a blocking line',()=>{
  const {b,a,front,rear}=scene();rear.x=7;
  primeTactic(a,'rush');
  assert.equal(routeTo(b,a,rear,3),null);
  stepBattle(b);assert.equal(a.tacticCasts.rush,undefined);assert.equal(attacks(b,a)[0]?.to,front.id);
  a.x=3;
  assert.ok(routeTo(b,a,front,3)?.length);
  assert.equal(tacticTarget(b,a,TACTICS_BOOK.rush,1),front);
  const wall=Array.from({length:8},(_,y)=>({...structuredClone(front),id:`wall-${y}`,x:5,y}));
  b.sides[front.side].units=[...wall,rear];
  assert.equal(routeTo(b,a,rear,12),null);
});

test('an open flank allows a real rush to the rear without crossing a melee zone',()=>{
  const {b,a,front,rear}=scene();Object.assign(front,{x:10,y:0});Object.assign(rear,{x:7,y:4});
  primeTactic(a,'rush');const path=routeTo(b,a,rear,3);
  assert.ok(path?.length);assert.ok(path.every(p=>hexDistance(p,front)>1));
  stepBattle(b);assert.equal(a.tacticCasts.rush,1);assert.ok(attacks(b,a).some(e=>e.to===rear.id));
});

test('an unreachable rear focus advances into the blocking line instead of stalling',()=>{
  const {b,a,front,rear}=scene();a.x=1;rear.x=7;
  const wall=Array.from({length:8},(_,y)=>({...structuredClone(front),id:`wall-${y}`,x:5,y}));
  b.sides[front.side].units=[...wall,rear];
  stepBattle(b);assert.ok(a.x>1);
  for(let n=0;n<5&&!attacks(b,a).length;n++)stepBattle(b);
  assert.ok(attacks(b,a).some(e=>wall.some(w=>w.id===e.to)));
  assert.ok(a.x<=4);assert.equal(rear.hp,300);
});

test('disabled troops still share contact damage; removed troops no longer share it',()=>{
  for(const release of ['stun','defeated','reserve','withdrawn','dead','retreat','seal']){
    const {b,a,front,rear}=scene();
    if(['stun','seal'].includes(release))front.statuses[release]={until:99};
    else if(release==='dead')front.hp=0;
    else if(release==='retreat')b.sides[front.side].retreat=true;
    else front.status=release;
    // Remove reserve from the roster rather than allowing real reserve entry.
    if(release==='reserve')b.sides[front.side].units=[rear];
    stepBattle(b);
    const targets=new Set(attacks(b,a).map(e=>e.to));assert.ok(targets.has(rear.id),release);
    assert.equal(targets.has(front.id),['stun','seal','retreat'].includes(release),release);
  }
});

test('ranged troops share damage in contact while intellect tactics retain their target selection',()=>{
  for(const type of ['archer','crossbow']){
    const {b,a,front,rear}=scene(type);stepBattle(b);assert.deepEqual(new Set(attacks(b,a).map(e=>e.to)),new Set([front.id,rear.id]));
  }
  const {b,a,rear}=scene('spear');rear.intent=100;
  assert.equal(tacticTarget(b,a,TACTICS_BOOK.doubt,1),rear);
});

test('confusion and reserve status disable interception immediately; expiry restores it',()=>{
  const {b,a,front,rear}=scene('spear');
  assert.equal(tacticTarget(b,a,TACTICS_BOOK.strike,1),front);
  front.statuses.confuse={until:b.tick+1};
  assert.equal(holdsLine(b,front),false);
  front.statuses.confuse.until=b.tick;
  assert.equal(holdsLine(b,front),true);
  for(const status of ['reserve','withdrawn','defeated']){
    front.status=status;assert.equal(holdsLine(b,front),false,status);
  }
  front.status='active';front.type='crossbow';assert.equal(holdsLine(b,front),false);
  assert.ok(rear.hp>0);
});

test('a real retreat can leave contact',()=>{
  const {b,a}=scene();b.sides[a.side].retreat=true;
  const start=a.x;stepBattle(b);assert.ok(a.x<start);
});

test('current battle saves resume deterministically and rule 10 is rejected',()=>{
  const state=createScenario('field',91),b=state.battle;lockDeployment(b);
  for(let n=0;n<30;n++)stepBattle(b);
  const copy=validateSave(structuredClone(state));
  while(!b.result){stepBattle(b);stepBattle(copy.battle);}
  assert.deepEqual(copy.battle,b);
  const old=structuredClone(state);old.rulesVersion=10;
  assert.throws(()=>validateSave(old),/重新开始/);
});
