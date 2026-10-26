import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateCampaign} from '../strategic-campaign.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {PERFORMANCE_BUDGETS} from './performance-budgets.mjs';
const directories=process.argv.slice(2).map(path=>resolve(path));assert.ok(directories.length>=2,'At least two fresh natural completions are required');
const sha=value=>createHash('sha256').update(value).digest('hex'),scenarios=new Set(),seeds=new Set();
for(const directory of directories){
 const read=async file=>JSON.parse(await readFile(join(directory,file),'utf8')),config=await read('run-config.json'),result=await read('unification-result.json'),perf=await read('performance.json'),state=validateCampaign(await read('campaign-save.json'));
 assert.equal(config.inputSave,null,'Completion must start from the original scenario');assert.equal(config.startDay,1);assert.equal(config.rulesVersion,RULES_VERSION);
 assert.equal(result.status,'unified','A day limit, interruption or incomplete observation is not unification');assert.equal(result.sourceHash,config.sourceHash);assert.equal(result.scenario,config.scenario);assert.equal(result.seed,config.seed);
 assert.equal(sha(JSON.stringify(config.sourceHashes)),config.sourceHash);for(const [path,hash]of Object.entries(config.sourceHashes))assert.equal(sha(await readFile(resolve(path))),hash,'Completion belongs to different current runtime: '+path);
 const roots=(await readdir('.')).filter(p=>p.endsWith('.mjs'));assert.ok(roots.every(path=>Object.hasOwn(config.sourceHashes,path)),'Runtime module set changed');
 assert.equal(state.campaign.allAI,true);assert.equal(state.finished,'victory');assert.equal(state.campaign.day,result.completedDay);assert.ok(state.cities.every(c=>c.owner===result.winner&&c.owner!=='neutral'));
 assert.equal(perf.sourceHash,config.sourceHash);assert.ok(perf.p95DayMs<=PERFORMANCE_BUDGETS.desktop.dayMs,'Natural long-game day p95 exceeds budget');
 const storage=perf.storage;assert.ok(storage.length>=2);const first=storage[0],last=storage.at(-1);assert.ok((last.bytes-first.bytes)/Math.max(1,last.day-first.day)<=PERFORMANCE_BUDGETS.growth.averageBytesPerDay,'Natural full-history growth exceeds budget');
 assert.ok(storage.every(p=>p.bytes<=PERFORMANCE_BUDGETS.growth.maxSaveBytes&&p.serializeMs<=PERFORMANCE_BUDGETS.desktop.serializeMs&&p.loadMs<=PERFORMANCE_BUDGETS.desktop.validateMs),'Natural save timing/size budget exceeded');
 scenarios.add(config.scenario);seeds.add(config.seed);console.log('Verified natural unification: '+config.scenario+' / '+config.seed+' / day '+result.completedDay);
}
assert.ok(scenarios.size>=2&&seeds.size>=2,'Use multiple scenarios and multiple seeds');
