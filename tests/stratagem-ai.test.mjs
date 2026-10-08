import test from 'node:test';
import assert from 'node:assert/strict';
import {STRATAGEMS} from '../stratagems.mjs';
import {COMMAND_TRIGGER_ORDER,chooseEnemyCommand} from '../battle-ai.mjs';
import {COMMAND_RESOURCE,stepBattle,battleStratagems,validateSave} from '../engine.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
import {AI_TEST_SEEDS,stratagemAiFixture,runStratagemAiProbe,freezeAiProbe,militaryResource} from './helpers/stratagem-ai.mjs';

test('all fifteen strategies explicitly configure an implemented simple AI condition',()=>{
 assert.equal(Object.keys(STRATAGEMS).length,15);for(const [key,s]of Object.entries(STRATAGEMS)){assert.ok(COMMAND_TRIGGER_ORDER.includes(s.ai),key);assert.equal(s.ai,s.effect);}
 for(const change of [d=>{delete d.stratagems.heal.ai;},d=>{d.stratagems.storm.ai='predict-best-value';},d=>{d.stratagems.refresh.ai='heal';}]){const d=structuredClone(DESIGN_TABLES);change(d);assert.ok(validateDesignTables(d).some(e=>e.includes('.ai')));}
});
for(const key of Object.keys(STRATAGEMS))for(const side of [0,1]){
 for(const seed of [AI_TEST_SEEDS.development[0],AI_TEST_SEEDS.validation[0]])test(STRATAGEMS[key].name+' AI automatically casts after real charging, side '+side+', seed '+seed,()=>{
  const state=stratagemAiFixture(key,side,seed);runStratagemAiProbe(state,key,side);
 });
 test(STRATAGEMS[key].name+' AI holds its full gauge when the condition fails, side '+side,()=>{
  const state=stratagemAiFixture(key,side,AI_TEST_SEEDS.validation[1],false);runStratagemAiProbe(state,key,side,{positive:false});
 });
 if(STRATAGEMS[key].maxUses)test(STRATAGEMS[key].name+' exhausted AI command stays unavailable after natural recharging, side '+side,()=>{
  const state=stratagemAiFixture(key,side,AI_TEST_SEEDS.development[1]),b=state.battle;runStratagemAiProbe(state,key,side);freezeAiProbe(b);
  const resource=militaryResource(b,side),serial=resource.commandSerial;
  for(let n=0;n<180&&resource.commandProgress<COMMAND_RESOURCE.capacity&&!b.result;n++)stepBattle(b,{aiSides:[side]});
  assert.equal(b.result,null);assert.equal(resource.commandProgress,COMMAND_RESOURCE.capacity);assert.equal(resource.commandSerial,serial);assert.equal(b.sides[side].stratagemUses[key],1);
  assert.equal(chooseEnemyCommand(b,battleStratagems(b,side),STRATAGEMS,side),null);validateSave(structuredClone(state));
 });
}
