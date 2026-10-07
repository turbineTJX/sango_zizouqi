import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {RULES_VERSION} from '../combat-rules.mjs';
import {ALLOCATIONS,ROUTES,ENEMIES,VALIDATION_SEEDS,playerCase,runCase,summarize} from './balance-objectives-lib.mjs';
const out=new URL('../docs/balance-objectives/allocations/',import.meta.url);mkdirSync(out,{recursive:true});
const selected=JSON.parse(readFileSync(new URL('../selection.json',out),'utf8')).selected,rows=[],runs=[];
const files=['engine.mjs','tactics.mjs','scenarios.mjs','battle-ai.mjs','combat-rules.mjs','famous-officers.mjs','scripts/balance-objectives-lib.mjs','scripts/audit-balance-allocations.mjs'];
const hash=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')])),hashes=hash();
for(const choice of selected)for(const allocation of Object.keys(ALLOCATIONS)){
 const route=ROUTES.find(a=>a.id===choice.route),enemy=ENEMIES.find(a=>a.id===choice.enemy),id=`${choice.route}/${choice.enemy}/${allocation}`;
 const samples=VALIDATION_SEEDS.map((seed,i)=>runCase(playerCase(route,enemy,allocation,choice.plan),seed,{resume:i===0}));
 rows.push({id,...summarize(samples)});runs.push(...samples.map(r=>({id,...r})));console.log(id,rows.at(-1).wins);
}
assert.deepEqual(hash(),hashes);
writeFileSync(new URL('results.json',out),JSON.stringify({rulesVersion:RULES_VERSION,seeds:VALIDATION_SEEDS,total:runs.length,hashes,rows},null,2));
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(runs)));console.log('COMPLETE',runs.length);
