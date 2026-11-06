import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exercise} from '../scripts/ai-validation/cases/frontline-duty.mjs';
test('an arrived force receives an actual front duty until a lawful operation or changed frontier releases it',async()=>{
 const checks=await exercise({source:fileURLToPath(new URL('..',import.meta.url))});
 for(const [name,passed]of Object.entries(checks))assert.equal(passed,true,name);
});
