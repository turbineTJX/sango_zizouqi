import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {RULES} from '../scripts/ai-validation/rules.mjs';
import {registerRepair,repairTasks,decideRepair} from '../scripts/ai-validation/repair.mjs';
import {sha,readJSON,writeJSON,exists} from '../scripts/ai-validation/storage.mjs';
import {initialize,main,runWorker} from '../scripts/ai-validation/cli.mjs';

function evidence(){
 const p={tier:'repair',baseline:{root:'baseline',hash:'b'},repair:{caseFile:'scripts/ai-validation/cases/fixture.mjs',
  reproduction:{sha256:'original'},expectedFailures:['arrival'],tests:RULES.repair.requiredTests,
  windows:[{input:{sha256:'one'},days:20},{input:{sha256:'two'},days:20}]}};
 const tasks=repairTasks('out',p,{root:'candidate',hash:'c'},{root:'judge'}),results={};
 for(const t of tasks)results[t.id]={status:'passed',sourceHash:t.sourceHash,kind:t.kind,...(
  t.kind==='reproduction'?{checks:{arrival:t.side==='candidate',deadline:true}}:
  t.kind==='regressions'?{passed:t.files.map(file=>({file,name:'actual check'})),failed:[],skipped:[]}:
  {inputSha256:t.input.sha256,troops:100000,retained:2,replayed:true,metrics:{startDay:601,completedDay:621,cityHungerDays:0,armyHungerDays:0}})};
 return {tasks,results};
}
test('repair promotion proves the registered defect without claiming global improvement or playability',()=>{
 const {tasks,results}=evidence(),d=decideRepair(tasks,results);
 assert.equal(d.promotable,true);assert.equal(d.status,'behavior-repaired');
 for(const k of ['globalImprovement','playability','unification'])assert.equal(d[k],'not-assessed');
});
test('empty, failed, skipped, missing and wrong-source evidence cannot promote a repair',()=>{
 assert.equal(decideRepair([],{}).promotable,false);
 for(const mutate of [r=>delete r['reproduction-baseline'],r=>r['reproduction-baseline'].checks.arrival=true,
  r=>r['reproduction-candidate'].checks.deadline=false,r=>r.regressions.status='failed',
  r=>r.regressions.skipped.push({file:'skipped'}),r=>r.regressions.passed.pop(),
  r=>r['window-0-candidate'].sourceHash='unrelated',r=>r['window-1-candidate'].replayed=false,
  r=>r['window-1-candidate'].metrics.completedDay=610]){
  const {tasks,results}=evidence();mutate(results);assert.equal(decideRepair(tasks,results).promotable,false);
 }
});
test('each short-window pair protects hunger, real troops and retained territory',()=>{
 for(const change of [{troops:89999},{retained:0},{troops:null},{troops:-1},{metrics:{startDay:601,completedDay:621,cityHungerDays:2,armyHungerDays:0}}]){
  const {tasks,results}=evidence();Object.assign(results['window-0-candidate'],change);
  assert.equal(decideRepair(tasks,results).promotable,false);
 }
});
test('different initial states cannot be compared even when both worker records pass',()=>{
 const {tasks,results}=evidence(),t=tasks.find(t=>t.id==='window-0-candidate');t.input={sha256:'other'};
 results[t.id].inputSha256='other';assert.equal(decideRepair(tasks,results).promotable,false);
});

async function registrationFixture(){
 const root=await mkdtemp(join(tmpdir(),'sango-repair-')),caseFile='scripts/ai-validation/cases/fixture.mjs';
 const s={judge:{hashes:Object.fromEntries([caseFile,...RULES.repair.requiredTests].map(f=>[f,'hash']))}};
 const directories=[];
 for(let i=0;i<3;i++){
  const directory=join(root,'origin-'+i),scenario=RULES.scenarios[i===2?1:0],seed=700+i;
  const task={kind:'campaign',scenario,seed,sourceHash:'source'},result={status:'passed',kind:'campaign',freshOrigin:true,scenario,seed};
  const save={campaign:{allAI:true,scenarioId:scenario}},resultBytes=JSON.stringify(result),saveBytes=JSON.stringify(save);
  await mkdir(directory);await writeJSON(join(directory,'task.json'),task);
  await writeFile(join(directory,'result.json'),resultBytes);await writeFile(join(directory,'campaign-save.json'),saveBytes);
  await writeJSON(join(directory,'receipt.json'),{status:'passed',sourceHash:'source',taskHash:sha(JSON.stringify(task)),evidenceHashes:{'result.json':sha(resultBytes),'campaign-save.json':sha(saveBytes)}});
  directories.push(directory);
 }
 const spec={id:'arrival',caseFile,tests:[...RULES.repair.requiredTests],expectedFailures:['arrival'],reproductionDirectory:directories[0],windows:directories.slice(1).map(directory=>({directory,days:20}))};
 return {root,s,spec};
}
test('repair inputs are frozen before proposal; repetition, seed leakage and corrupt provenance are rejected',async()=>{
 const {root,s,spec}=await registrationFixture();
 for(const change of [x=>x.tests.pop(),x=>x.windows[1]=x.windows[0],x=>x.windows[0].directory=x.reproductionDirectory,x=>x.windows[1].days=1]){
  const bad=structuredClone(spec);change(bad);await assert.rejects(registerRepair(root,s,bad));
  assert.equal(await exists(join(root,'repair-inputs','arrival')),false,'Rejected registration leaves no partial input');
 }
 const record=await registerRepair(root,s,spec);
 assert.equal(sha(await readFile(record.reproduction.path)),record.reproduction.sha256);
 await assert.rejects(registerRepair(root,s,spec));
 const other=await registrationFixture();await writeFile(join(other.spec.windows[0].directory,'campaign-save.json'),'{}');
 await assert.rejects(registerRepair(other.root,other.s,other.spec));
});
test('CLI seals the repair tier and refuses adoption without its independent evidence',async()=>{
 const {root,spec}=await registrationFixture();
 for(const file of [spec.caseFile,...spec.tests,'strategic-concentration.mjs']){const path=join(root,file);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,'// fixture\n');}
 const {session}=await initialize({root,out:join(root,'.local','session')});
 const manifest=join(root,'.local','repair.json');await writeJSON(manifest,spec);
 await main(['register-repair','--session='+session,'--file='+manifest]);
 const proposal=await main(['propose','--session='+session,'--id=arrival-v1','--tier=repair','--repair=arrival','--metric=planCompletion','--hypothesis=Arrived troops must complete preparation']);
 assert.equal((await readJSON(join(session,'candidates','arrival-v1','proposal.json'))).repair.id,'arrival');
 await writeFile(join(proposal.editRoot,'strategic-concentration.mjs'),'// repaired fixture\n');
 await main(['seal','--session='+session,'--id=arrival-v1','--review=Only preparation policy changed']);
 const report=await main(['report','--session='+session,'--id=arrival-v1','--stage=repair']);
 assert.equal(report.decision.promotable,false);
 await assert.rejects(main(['adopt','--session='+session,'--id=arrival-v1']),/not earned promotion/);
 assert.equal(await readFile(join(root,'strategic-concentration.mjs'),'utf8'),'// fixture\n');
});
test('actual repair worker cannot hide skipped tests behind a successful Node exit',async()=>{
 const root=await mkdtemp(join(tmpdir(),'sango-repair-worker-')),file='check.test.mjs';
 await writeFile(join(root,file),"import test from 'node:test'; test('real',()=>{}); test.skip('missing',()=>{});\n");
 const taskFile=join(root,'task.json');await writeJSON(taskFile,{kind:'regressions',source:root,sourceHash:'fixture',out:root,files:[file]});
 const result=await runWorker({worker:resolve('scripts/ai-validation/repair-worker.mjs'),taskFile,cwd:root,timeoutMs:20000,logPath:join(root,'run.log')});
 assert.equal(result.status,'failed');const r=await readJSON(join(root,'result.json'));assert.equal(r.skipped.length,1);assert.equal(r.passed.length,1);
});
