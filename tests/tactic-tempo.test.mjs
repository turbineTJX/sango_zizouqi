import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {TACTICS_BOOK,unitTactics} from '../tactics.mjs';
import {tacticPools,LEARNING_TROOPS} from '../tactic-learning.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

test('ordinary learning pools retain low/high slots and exclusive roles have distinct costs',()=>{
  for(const type of LEARNING_TROOPS){
    const p=tacticPools(type);
    
    for(const id of p.low){assert.equal(TACTICS_BOOK[id].learningTier,'low');assert.ok(TACTICS_BOOK[id].intentCost<=5);}
    for(const id of p.high){assert.equal(TACTICS_BOOK[id].learningTier,'high');assert.ok(TACTICS_BOOK[id].threshold>=45&&TACTICS_BOOK[id].threshold<=65);}
  }
  assert.equal(TACTICS_BOOK.protect,undefined);
  assert.equal(TACTICS_BOOK.undermine.tempoRole,'持续专属');
  assert.equal(TACTICS_BOOK['unique-person-661'].intentCost,70);
  assert.equal(TACTICS_BOOK.passage,undefined);
});

test('earned casts pay fixed intent, recover between spells, still attack and resume during recovery',()=>{
  const state=createScenario('officer-lab',17,20,['person-661','person-246','person-603','person-404','yu','shao']);
  const b=state.battle;lockDeployment(b);
  const last=new Map(),roles=new Set();let resumed,paid=0,attacksDuringRecovery=0;
  assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===(u.bondEntry?.intent||0)));
  while(!b.result){
    const recovery=new Set(b.sides.flatMap(s=>s.units).filter(u=>u.tacticRecoveryUntil>b.tick+1).map(u=>u.id));
    const oldCounts=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,u.skillCasts]));
    stepBattle(b);if(resumed)stepBattle(resumed.battle);
    for(const u of b.sides.flatMap(s=>s.units))if(u.skillCasts>oldCounts.get(u.id)){
      if(last.has(u.id))assert.ok(b.tick-last.get(u.id)>=4);
      last.set(u.id,b.tick);
      assert.equal(u.tacticRecoveryUntil,b.tick+4);
    }
    for(const e of b.effects){
      if(e.intentPayment){const p=e.intentPayment;assert.equal(p.after,p.before-p.cost);paid++;}
      if(recovery.has(e.from)&&e.damage>0&&!e.skill&&!e.ongoing)attacksDuringRecovery++;
    }
    for(const u of b.sides.flatMap(s=>s.units))for(const s of unitTactics(u))if(u.tacticCasts[s.id])roles.add(s.tempoRole);
    if(!resumed&&b.sides[0].units.some(u=>u.tacticRecoveryUntil>b.tick))resumed=validateSave(structuredClone(state));
  }
  assert.ok(paid>0);assert.ok(attacksDuringRecovery>0);
  assert.ok(roles.has('基础铺垫'));assert.ok(roles.has('进阶交锋'));assert.ok(roles.has('决胜专属'));
  assert.deepEqual(resumed.battle,b);
  const old=structuredClone(state);old.rulesVersion=RULES_VERSION-1;assert.throws(()=>validateSave(old),/重新开始/);
  const invalid=structuredClone(state);invalid.battle.sides[0].units[0].tacticRecoveryUntil=-1;assert.throws(()=>validateSave(invalid),/调息/);
});
