import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS,createScenario,scenarioDraft} from '../scenarios.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {validateCustomBattle,defaultCustomBattle} from '../custom-battle.mjs';
import {validateSave,lockDeployment,stepBattle} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {troopCapacity} from '../troop-capacity.mjs';

test('every playable preset is a legal editable custom draft and produces the same battle',()=>{
 for(const preset of SCENARIOS){
  const draft=scenarioDraft(preset.id),authored=createScenario(preset.id),custom=generateBattle(draft);
  for(const side of [0,1]){
   assert.ok(authored.battle.sides[side].units.length<=10,preset.id);
   assert.deepEqual(authored.battle.sides[side],custom.battle.sides[side],preset.id);
   for(const u of authored.battle.sides[side].units){
    assert.ok(OFFICER_BY_ID[u.id]);assert.ok(u.initial<=troopCapacity(u));assert.equal(u.intent,0);
   }
  }
  assert.deepEqual(authored.testScenario.customBattle,validateCustomBattle(draft));
  validateSave(authored);
 }
});

test('custom generator validates conditions and wave budgets',()=>{
 for(const patch of [{limit:0},{limit:2001},{holdUntil:20},{shieldPercent:101},{waves:[{count:1,tick:25}]}]){
  assert.throws(()=>generateBattle({...defaultCustomBattle(),...patch}));
 }
 const draft=scenarioDraft('reinforcements');draft.limit=100;draft.waves=[{count:4,tick:25}];
 const state=generateBattle(draft);lockDeployment(state.battle);
 assert.equal(state.battle.sides[1].units.filter(u=>u.arrivalTick===25).length,4);
 for(let i=0;i<15;i++)stepBattle(state.battle);
 const resumed=validateSave(structuredClone(state));
 while(!state.battle.result){stepBattle(state.battle);stepBattle(resumed.battle);}
 assert.deepEqual(state.battle,resumed.battle);
});

test('saved custom conditions are used for named-preset retries and save validation',()=>{
 const draft=scenarioDraft('history-hefei');draft.limit=80;draft.holdUntil=50;draft.gateHp=9000;draft.shieldPercent=0;
 const s=createScenario('history-hefei',undefined,null,null,draft);validateSave(s);
 assert.equal(s.battle.maxTicks,80);assert.equal(s.battle.holdUntil,50);
 const retry=createScenario(s.testScenario.id,s.testScenario.seed,s.testScenario.shieldPercent,null,s.testScenario.customBattle);
 assert.deepEqual(retry.battle,s.battle);
 const changed=scenarioDraft('defense');changed.battleKind='siege';delete changed.holdUntil;
 const switched=createScenario('defense',undefined,null,null,changed);
 assert.equal(switched.battle.siege.attackerSide,0);validateSave(switched);
});

test('曹操额外首发名额不挪用明确指定的延迟援军',()=>{
 const state=createScenario('tactical-shu-defense'),b=state.battle;
 assert.equal(b.sides[1].units.filter(u=>u.arrivalTick===90).length,2);assert.equal(b.sides[1].units.filter(u=>u.arrivalTick===180).length,2);
 lockDeployment(b);for(let i=0;i<4;i++)stepBattle(b);assert.ok(b.sides[1].units.filter(u=>u.arrivalTick>0).every(u=>u.status==='reserve'));validateSave(state);
});
