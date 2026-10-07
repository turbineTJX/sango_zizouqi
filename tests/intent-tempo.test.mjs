import {currentBattle} from './helpers/current-battle.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {unitTactics} from '../tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {configureTactics,setStatus,TACTICS_BOOK} from '../tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function duel(){
  const b=createScenario('field',751).battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];
  for(const [u,id,x] of [[a,'cao',4],[d,'target',6]]){
    Object.assign(u,{id,level:1,type:'crossbow',x,y:2,hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,intent:0,statuses:{},cooldown:999});
    initializeTacticLearning(u,751);u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
  }
  lockDeployment(b);return {b,a,d};
}

test('repeating shots grant one surviving-hit award and no caster recharge',()=>{
  const {b,a,d}=duel();d.intent=50;primeTactic(a,'repeat');stepBattle(b);
  assert.equal(b.effects.filter(e=>e.from===a.id&&e.damage>0).length,2);
  assert.equal(a.intent,TACTICS_BOOK.repeat.threshold-TACTICS_BOOK.repeat.intentCost);assert.equal(d.intent,51);
  a.cooldown=0;stepBattle(b);assert.equal(a.intent,TACTICS_BOOK.repeat.threshold-TACTICS_BOOK.repeat.intentCost+5);assert.equal(d.intent,52);
});

test('a fully blocked first segment does not consume the surviving-hit award',()=>{
  const reference=duel();primeTactic(reference.a,'repeat');stepBattle(reference.b);
  const first=reference.b.effects.find(e=>e.from===reference.a.id&&e.damage>0).damage;
  const {b,a,d}=duel();d.intent=50;setStatus(b,d,'shield',10,{amount:first,source:'test'});primeTactic(a,'repeat');stepBattle(b);
  const hits=b.effects.filter(e=>e.from===a.id);
  assert.equal(hits[0].damage,0);assert.ok(hits[1].damage>0);assert.equal(d.intent,51);
});

test('separate attacks grant reduced surviving-hit awards',()=>{
  const {b,a,d}=duel(),ally={...structuredClone(a),id:'ally',y:3,cooldown:0};
  b.sides[0].units.push(ally);a.cooldown=0;d.intent=50;stepBattle(b);
  assert.equal(a.intent,5);assert.equal(ally.intent,5);assert.equal(d.intent,52);
});

test('damage tactics against a gate do not charge the caster, basic siege attacks do',()=>{
  const {b,u:a}=currentBattle('ram','ram',{requireS:true});b.sides[0].units=[a];b.sides[1].units=[];a.cooldown=999;a.intent=0;
  primeTactic(a,'ram');stepBattle(b);assert.equal(a.tacticCasts.ram,1);assert.equal(a.intent,TACTICS_BOOK.ram.threshold-TACTICS_BOOK.ram.intentCost);
  a.cooldown=0;let hit=false;for(let i=0;i<8&&!hit;i++){stepBattle(b);hit=b.effects.some(e=>e.from===a.id&&!e.skill&&e.damage>0);}assert.ok(hit);assert.equal(a.intent,TACTICS_BOOK.ram.threshold-TACTICS_BOOK.ram.intentCost+6);
});

test('zero-intent support and frontlines remain active, and save continuation is deterministic',()=>{
  const state=createScenario('eight-arms',713),b=state.battle;lockDeployment(b);
  for(let i=0;i<25;i++)stepBattle(b);
  assert.ok(b.sides.flatMap(s=>s.units).filter(u=>u.type==='halberd').every(u=>u.skillCasts>0));
  assert.ok(b.sides.flatMap(s=>s.units).filter(u=>['spear','halberd'].includes(u.type)).every(u=>u.skillCasts>0));
  const resumed=validateSave(structuredClone(state));
  while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
  assert.deepEqual(resumed.battle,b);
  const old=structuredClone(state);old.rulesVersion=17;assert.throws(()=>validateSave(old),/重新开始/);
});
