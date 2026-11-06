import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exercise} from '../scripts/ai-validation/cases/faction-authorization.mjs';
test('only the current parent can issue commands for an authorized capture roster',async()=>{
 const checks=await exercise({source:fileURLToPath(new URL('..',import.meta.url))});
 for(const [name,passed]of Object.entries(checks))assert.equal(passed,true,name);
});
