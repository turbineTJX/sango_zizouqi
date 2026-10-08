import {currentBattle} from './helpers/current-battle.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEMS as AREA_DESIGNS} from '../stratagems.mjs';
import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, orderArmy, advanceTurn, startBattle, lockDeployment, stepBattle, issueCommand, validateSave, lowerIntent } from '../engine.mjs';
import { TACTICS_BOOK, TROOP_TACTICS, unitTactics, hasStatus, tacticTarget } from '../tactics.mjs';
import { hexNeighbors } from '../hex-grid.mjs';
import {powerFactor} from '../tactic-power.mjs';
import {unitAttributes} from '../unit-stats.mjs';

function scene(type='spear',id=null){const skill=id==='liao'?'terror':type==='spear'?'thrust':type==='archer'?'scatter':type==='cavalry'?'rush':'repeat',x=currentBattle(skill,type,{requireS:!id});x.ally.x=0;x.ally.y=0;x.rear.x=13;x.rear.y=7;if(['archer','crossbow'].includes(type))x.target.x=6;return{state:x.state,b:x.b,a:x.u,d:x.target};}

function allowOnly(a,id) {primeTactic(a,id);}
function complete(b,a) {
  const before=a.skillCasts;
  for(let i=0;i<10 && a.skillCasts===before;i++)stepBattle(b);
  assert.equal(a.skillCasts,before+1);
}

test('unlearned units have no tactics and each learned slot belongs to the current troop or owner',()=>{
 for(const type of Object.keys(TROOP_TACTICS))assert.deepEqual(unitTactics({id:'ordinary-test',type}),[]);
 for(const u of newGame().armies.flatMap(a=>a.units))assert.deepEqual(unitTactics(u).map(s=>s.id),learnedTacticIds(u));
});

test('instant skills spend shared intent and recovery separates learned casts',()=>{
 const {b,a}=scene();learnFixtureTactics(a,['thrust','phalanx']);a.skillReady.thrust=0;a.skillReady.phalanx=0;a.intent=100;
 stepBattle(b);assert.equal(a.tacticCasts.thrust,1);assert.equal(a.intent,100-TACTICS_BOOK.thrust.intentCost);assert.equal(a.skillCasts,1);
 while(b.tick<a.tacticRecoveryUntil-1){stepBattle(b);assert.equal(a.skillCasts,1);}
 stepBattle(b);assert.equal(a.tacticCasts.phalanx,1);assert.equal(a.skillCasts,2);assert.equal(a.cast,null);
});

test('real intent loss clamps at zero and does not affect reserves',()=>{
  const {b,a,d}=scene();allowOnly(a,'thrust');a.intent=100;d.intent=30;
  const reserve={...structuredClone(d),id:'reserve-test',status:'reserve',x:-1,y:-1,intent:80};b.sides[1].units.push(reserve);
  lowerIntent(d,45);assert.equal(d.intent,0);assert.equal(reserve.intent,80);
  stepBattle(b);assert.equal(a.tacticCasts.thrust,1);assert.equal(a.cast,null);
  lowerIntent(a,100);a.skillReady.thrust=0;stepBattle(b);assert.equal(a.tacticCasts.thrust,1);
});
test('expired cooldown and restored intent cannot replenish an exhausted advanced tactic',()=>{
  const {b,a,d}=scene();allowOnly(a,'thrust');complete(b,a);
  const ready=a.skillReady.thrust;lowerIntent(a,100);a.cooldown=999;d.cooldown=999;
  while(b.tick<ready+1)stepBattle(b);
  assert.equal(a.cast,null);assert.equal(a.skillCasts,1);
  a.intent=TACTICS_BOOK.thrust.threshold;stepBattle(b);assert.equal(a.tacticCasts.thrust,1);assert.equal(a.cast,null);assert.equal(a.intent,TACTICS_BOOK.thrust.threshold-TACTICS_BOOK.thrust.intentCost);
});
test('fire burns without intent feedback and ranged skills have distinct real effects',()=>{
  const {b,a,d}=scene('archer');allowOnly(a,'fire');complete(b,a);assert.equal(d.statuses.burn,undefined);a.cooldown=0;stepBattle(b);
  assert.ok(hasStatus(b,d,'burn'));const hp=d.hp,ai=a.intent,di=d.intent;a.cooldown=999;
  stepBattle(b);assert.ok(d.hp<hp);assert.equal(a.intent,ai);assert.equal(d.intent,di);
  const x=scene('crossbow');allowOnly(x.a,'repeat');complete(x.b,x.a);
  assert.equal(x.b.effects.filter(e=>e.from===x.a.id&&e.damage>0).length,2);
  assert.equal(x.a.tacticCasts.repeat,1,'two projectiles count as one completed tactic');
});
test('thrust hits the unit directly behind; scatter hits several nearby targets',()=>{
  for(const [type,id] of [['spear','thrust'],['archer','scatter']]) {
    const {b,a,d}=scene(type);const back={...structuredClone(d),id:'back-test',x:type==='spear'?6:7};b.sides[1].units.push(back);
    allowOnly(a,id);complete(b,a);assert.ok(d.hp<d.maxHp);assert.ok(back.hp<back.maxHp);
    assert.equal(a.tacticCasts[id],1);
  }
});
test('formation and gallop grant real statuses; rush needs a legal path',()=>{
  for(const [type,id,status] of [['spear','phalanx','phalanx'],['cavalry','gallop','haste']]) {
    const {b,a,d}=scene(type);if(id==='gallop')d.x=9;
    allowOnly(a,id);complete(b,a);assert.ok(hasStatus(b,a,status));assert.ok(b.effects.some(e=>e.text));
  }
  const {b,a,d}=scene('cavalry');d.x=8;allowOnly(a,'rush');complete(b,a);assert.equal(a.x,7);assert.equal(a.y,3);assert.ok(d.hp<d.maxHp);

});
test('blocked displacement never overlaps units or crosses board limits',()=>{
  const {b,a,d}=scene('crossbow');a.x=0;a.y=0;d.x=1;d.y=0;
  const wall={...structuredClone(d),id:'wall',x:0,y:1};b.sides[1].units.push(wall);
  assert.equal(tacticTarget(b,a,TACTICS_BOOK.retreatShot,4),null);
  const r=scene('cavalry');r.d.x=8;
  hexNeighbors(r.a).forEach(([x,y],i)=>r.b.sides[1].units.push({...structuredClone(r.d),id:`wall-${i}`,x,y}));
  assert.equal(tacticTarget(r.b,r.a,TACTICS_BOOK.rush,1),null);
});
test('current rare tactical control requires its actual exclusive holder',()=>{let success=false;for(let seed=1;seed<=30&&!success;seed++){const x=currentBattle('terror','cavalry',{seed});x.target.x=6;x.rear.x=13;allowOnly(x.u,'terror');complete(x.b,x.u);success=hasStatus(x.b,x.target,'confuse');}assert.ok(success);const x=currentBattle('undermine','crossbow');x.target.intent=100;x.rear.intent=0;const hp=x.target.hp;allowOnly(x.u,'undermine');complete(x.b,x.u);assert.ok(x.target.intent<100);assert.equal(x.target.hp,hp);});
test('independent cooldowns, statuses and active casts survive save and resume identically',()=>{
  const {state,b,a}=scene('archer');allowOnly(a,'fire');complete(b,a);
  const resumed=validateSave(JSON.parse(JSON.stringify(syncFixtureLearning(state))));
  for(let i=0;i<12;i++){stepBattle(b);stepBattle(resumed.battle);}
  assert.deepEqual(b,resumed.battle);
  const broken=JSON.parse(JSON.stringify(state));broken.battle.sides[0].units[0].skillReady.unknown=3;
  assert.throws(()=>validateSave(broken));
});

test('formation mitigates actual damage and shields absorb before soldiers',()=>{function attack(statuses){const x=scene();x.a.cooldown=0;x.d.statuses=statuses;const before=x.d.hp;stepBattle(x.b);return{damage:before-x.d.hp,...x};}const normal=attack({}),fortified=attack({phalanx:{until:20}}),shielded=attack({shield:{until:20,amount:500,layers:[{until:20,amount:500,source:'test',label:'护盾'}]}});assert.ok(fortified.damage<normal.damage);assert.equal(shielded.damage,0);assert.ok(shielded.d.statuses.shield.amount<500);});
test('prepaid casts and previous save formats are rejected',()=>{
 const {state,a,d}=scene();a.intent=12;a.cast={targetId:d.id,remaining:2,cost:100};assert.throws(()=>validateSave(state));
 const old=scene().state;old.version=1;assert.throws(()=>validateSave(old));
});
test('new saves distinguish bows and crossbows and require current rules',()=>{
 const {state}=scene('archer');state.armies[0].units[0].type='archer';state.armies[0].units[0].tactics=['fire','scatter','suppress'];
 const copy=validateSave(structuredClone(syncFixtureLearning(state)));assert.equal(copy.armies[0].units[0].type,'archer');
 delete state.rulesVersion;assert.throws(()=>validateSave(state));
});
