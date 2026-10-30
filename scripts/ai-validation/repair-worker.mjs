import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {run} from 'node:test';
import {readJSON,writeJSON,sha} from './storage.mjs';
const task=await readJSON(process.argv[2]);
if(task.input)assert.equal(sha(await readFile(task.input.path)),task.input.sha256,'Registered input changed');
let result;
if(task.kind==='reproduction'){
 const {exercise}=await import(pathToFileURL(task.casePath));
 const checks=await exercise({source:task.source,save:task.input.path});
 assert.ok(checks&&Object.keys(checks).length);assert.ok(Object.values(checks).every(x=>typeof x==='boolean'));
 const failures=Object.keys(checks).filter(k=>!checks[k]).sort();
 assert.deepEqual(failures,[...task.expectedFailures].sort(),'Reproduction outcomes differ from preregistration');
 result={status:'passed',checks,expectedFailures:task.expectedFailures};
}else if(task.kind==='regressions'){
 const passed=[],failed=[],skipped=[];
 for await(const e of run({files:task.files.map(f=>join(task.source,f)),concurrency:1,isolation:'process'})){
  if(!['test:pass','test:fail'].includes(e.type))continue;
  const d=e.data,row={file:d.file?relative(task.source,d.file).replaceAll('\\','/'):'',name:d.name};
  if(d.skip||d.todo)skipped.push(row);else if(e.type==='test:fail')failed.push({...row,error:String(d.details?.error)});else passed.push(row);
 }
 result={status:failed.length||skipped.length||!passed.length?'failed':'passed',passed,failed,skipped};
}else if(task.kind==='window'){
 const audit=join(task.judgeRoot,'scripts/audit-all-ai-decisions.mjs');
 const args=[audit,'--source='+task.source,'--save='+task.input.path,'--scenario='+task.input.scenario,'--seed='+task.input.seed,'--days='+task.days,'--out='+task.out];
 const child=spawn(process.execPath,args,{cwd:task.source,windowsHide:true,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 assert.equal(code,0,'Natural continuation failed');
 const record=await readJSON(join(task.out,'campaign-audit.json')),state=await readJSON(join(task.out,'campaign-save.json'));
 assert.equal(record.metrics.completedDay-record.metrics.startDay,task.days,'Short window did not finish');
 assert.equal(record.inputSave.sha256,task.input.sha256);
 const {validateCampaign,serializeCampaign,advanceCampaignDay}=await import(pathToFileURL(join(task.source,'strategic-campaign.mjs')));
 const initial=validateCampaign(await readJSON(task.input.path)),reloaded=validateCampaign(JSON.parse(serializeCampaign(initial)));
 advanceCampaignDay(initial);advanceCampaignDay(reloaded);
 assert.equal(serializeCampaign(initial),serializeCampaign(reloaded),'Short-window save continuation differs');
 const troops=[...state.cities.flatMap(c=>c.units),...state.armies.filter(a=>!a.disbanded).flatMap(a=>a.units),...state.campaign.idle.map(o=>o.unit)].reduce((n,u)=>n+u.troops+u.wounded,0);
 const retained=new Set(record.captures.filter(c=>c.from!=='neutral'&&state.cities.find(x=>x.id===c.city)?.owner===c.to).map(c=>c.city)).size;
 result={status:'passed',metrics:record.metrics,troops,retained,inputSha256:task.input.sha256,replayed:true};
}else throw Error('Unknown repair task');
await writeJSON(join(task.out,'result.json'),{...result,sourceHash:task.sourceHash,kind:task.kind});
if(result.status!=='passed')process.exitCode=1;
