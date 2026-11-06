import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exercise} from '../scripts/ai-validation/cases/single-base-legions.mjs';
test('one funded base may prepare two independent legions without a city-count unlock',async()=>{const checks=await exercise({source:fileURLToPath(new URL('../',import.meta.url))});for(const [name,passed]of Object.entries(checks))assert.equal(passed,true,name);});
