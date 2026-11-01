import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseMacroDefense} from './helpers/macro-defense.mjs';
test('defense musters before comparing strength, sends real aid and only reassesses each turn',()=>{
 for(const [name,passed] of Object.entries(exerciseMacroDefense()))assert.equal(passed,true,name);
});
