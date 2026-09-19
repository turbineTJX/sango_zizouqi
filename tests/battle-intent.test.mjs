import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {battleIntent,configureBattleIntent,lockDeployment,stepBattle,validateSave,issueCommand} from '../engine.mjs';

test('battle intent is selected before combat and stays locked at tick zero and after save recovery',()=>{
  const state=createScenario('siege'),b=state.battle;
  for(const intent of ['annihilate','hold','siege']){
    assert.equal(configureBattleIntent(b,intent),null);
    assert.equal(battleIntent(b),intent);
  }
  assert.equal(lockDeployment(b),null);
  assert.equal(b.tick,0);
  assert.match(configureBattleIntent(b,'hold'),/锁定/);
  const copy=validateSave(structuredClone(state));
  assert.equal(battleIntent(copy.battle),'siege');
  assert.match(configureBattleIntent(copy.battle,'annihilate'),/锁定/);
  stepBattle(b);stepBattle(copy.battle);
  assert.deepEqual(copy.battle,b);
  assert.equal(issueCommand(b,'retreat'),null);
  assert.equal(battleIntent(b),'siege');
});

test('defenders cannot choose siege and invalid intent does not alter deployment',()=>{
  const b=createScenario('defense').battle;
  assert.equal(battleIntent(b),'hold');
  const before=structuredClone(b);
  assert.match(configureBattleIntent(b,'siege'),/攻城方/);
  assert.match(configureBattleIntent(b,'invalid'),/无效/);
  assert.deepEqual(b,before);
});
