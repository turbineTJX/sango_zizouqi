import assert from 'node:assert/strict';
import {run} from 'node:test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLAYER_AI_DECISIONS} from '../player-ai-decisions.mjs';
import {AI_DECISION_TESTS} from '../ai-decision-tests.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const out=resolve(args.out||resolve(root,'work/ai-decision-tests'));
await mkdir(out,{recursive:true});
assert.deepEqual(Object.keys(AI_DECISION_TESTS).sort(),Object.keys(PLAYER_AI_DECISIONS).sort(),'Every AI decision must register named behavior tests');
const expected=Object.entries(AI_DECISION_TESTS).flatMap(([domain,cases])=>{
 assert.ok(cases.length,domain+' has no tests');return cases.map(c=>({domain,...c}));
});
const files=[...new Set(expected.map(c=>resolve(root,c.file)))];
for(const file of files)await readFile(file);
const passed=new Set(),failed=[],skipped=[],events=[];
const key=(file,name)=>file+'\0'+name;
for await(const event of run({files,concurrency:4,isolation:'process'})){
 if(!['test:pass','test:fail'].includes(event.type))continue;
 const d=event.data,file=d.file?relative(root,d.file).replaceAll('\\','/'):null;
 const row={type:event.type,file,name:d.name,skip:!!d.skip,todo:!!d.todo,error:d.details?.error?.stack||null};events.push(row);
 if(d.skip||d.todo)skipped.push(row);
 else if(event.type==='test:pass')passed.add(key(file,d.name));
 else failed.push(row);
}
const domains=Object.fromEntries(Object.entries(AI_DECISION_TESTS).map(([domain,cases])=>[domain,cases.map(c=>({...c,passed:passed.has(key(c.file,c.name))}))]));
const missing=expected.filter(c=>!passed.has(key(c.file,c.name)));
const report={decisionDomains:Object.keys(domains).length,files:files.length,passed:passed.size,failed,skipped,missing,domains,events};
await writeFile(resolve(out,'unit-tests.json'),JSON.stringify(report,null,2));
for(const row of [...failed,...missing])console.error(JSON.stringify(row));
console.log(JSON.stringify({decisionDomains:report.decisionDomains,files:report.files,passed:report.passed,failed:failed.length,requiredTestsMissing:missing.length,report:resolve(out,'unit-tests.json')}));
if(failed.length||missing.length)process.exitCode=1;
