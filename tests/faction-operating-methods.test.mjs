import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exercise} from '../scripts/ai-validation/cases/faction-operating-methods.mjs';
test('faction operating methods produce real conquest continuation and captured-city work in the registered local campaign',async()=>{
 const checks=await exercise({source:fileURLToPath(new URL('../',import.meta.url))});
 assert.deepEqual(Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),[]);
});
