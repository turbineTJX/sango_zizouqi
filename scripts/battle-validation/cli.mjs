import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { PROTOCOL, CASES, CHECK_CASES, casesFor, allowedBattlePath } from './protocol.mjs';
import { judgeBattle } from './judge.mjs';
import { parseArguments, runWorker } from '../ai-validation/cli.mjs';
import { sha, readJSON, writeJSON, exists, inside, fingerprint, snapshot, verifySnapshot, assertPolicyChanges, promoteFiles, recoverPromotion } from '../ai-validation/storage.mjs';

const PROJECT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const protocolHash=()=>sha(JSON.stringify({PROTOCOL,CASES,CHECK_CASES}));
const identifier=id=>{assert.match(id||'',/^[a-z][a-z0-9-]{0,63}$/);return id;};
const cdir=(path,id)=>join(path,'candidates',identifier(id));
const digestWrite=async(path,value)=>{await writeJSON(path,value);await writeJSON(path+'.seal',{hash:sha(JSON.stringify(value))});};
async function digestRead(path){const value=await readJSON(path);assert.equal(sha(JSON.stringify(value)),(await readJSON(path+'.seal')).hash,'Registration/evidence changed: '+path);return value;}
export async function assertRunnerMatches(baseline,root=PROJECT){
  // The protocol object alone does not attest the loaded judge implementation.
  // Include shared runner dependencies; unrelated game/UI work may continue.
  const select=hashes=>Object.fromEntries(Object.entries(hashes).filter(([path])=>path.startsWith('scripts/battle-validation/')||path.startsWith('scripts/ai-validation/')).sort(([a],[b])=>a.localeCompare(b)));
  const current=await fingerprint(root);
  assert.equal(sha(JSON.stringify(select(current.hashes))),sha(JSON.stringify(select(baseline.hashes))),
    'Running validator differs from the frozen toolchain; use baseline/scripts/battle-validation/cli.mjs inside this session for its original evidence');
}
async function session(path){
  const s=await readJSON(join(path,'session.json'));
  assert.equal(s.protocolHash,protocolHash(),'Protocol changed; freeze a new session');
  await verifySnapshot(s.baseline);await assertRunnerMatches(s.baseline);return s;
}
async function lock(path,fn){const p=join(path,'battle.lock');await writeFile(p,JSON.stringify({pid:process.pid,at:new Date().toISOString()}),{flag:'wx'});try{return await fn();}finally{await unlink(p);}}
export async function initialize({root=PROJECT,out,startedAt=Date.now()}){
  assert.ok(Number.isFinite(startedAt)&&startedAt<=Date.now(),'Invalid round start');
  const path=resolve(out||join(root,'.local/ai-iterations','battle-'+new Date().toISOString().replaceAll(/[:.]/g,'-')));
  inside(join(root,'.local'),path);assert.ok(!await exists(path),'Use a new directory');
  await mkdir(path,{recursive:true});const baseline=await snapshot(root,join(path,'baseline'));
  const s={format:'sango-battle-iteration',version:1,workspace:resolve(root),protocolHash:protocolHash(),baseline,
    startedAt,deadline:startedAt+PROTOCOL.budgetHours*3600000,candidates:[]};
  await writeJSON(join(path,'session.json'),s);return {session:path,baselineHash:baseline.hash,deadline:new Date(s.deadline).toISOString()};
}
function taskSet(path,s,{stage,id,proposal,candidate,integration=false}){
  const out=integration?join(cdir(path,id),'integration'):stage==='probe'?join(path,'probe'):join(cdir(path,id),stage);
  const roots=stage==='probe'?{baseline:s.baseline}:{baseline:proposal.baseline,candidate};
  const tasks=[];
  const add=(name,side,body)=>tasks.push({id:name,source:roots[side].root,sourceHash:roots[side].hash,baselineSource:s.baseline.root,baselineHash:s.baseline.hash,out:join(out,name),side,...body});
  if(integration){
    add('integration-tests','candidate',{kind:'tests',integration:true});
    return tasks;
  }
  for(const side of Object.keys(roots))add('mechanisms-'+side,side,{kind:'tests'});
  const group=stage==='validation'?'validation':'development',seeds=stage==='validation'?proposal.validationSeeds:PROTOCOL.developmentSeeds;
  for(const seed of seeds)for(const spec of casesFor(group))for(const side of Object.keys(roots))add(`${spec.id}-${seed}-${side}`,side,{kind:'battle',seed,spec});
  return tasks;
}
async function receipt(task){
  const path=join(task.out,'receipt.json');if(!await exists(path))return null;
  const r=await digestRead(path);assert.equal(r.taskHash,sha(JSON.stringify(task)),'Task registration changed');
  for(const [file,hash] of Object.entries(r.hashes))assert.equal(sha(await readFile(inside(task.out,join(task.out,file)))),hash,'Evidence bytes changed: '+file);
  if(r.status==='passed')assert.ok(r.hashes['result.json']);return r;
}
async function executeTasks(s,tasks,deadline){
  for(const task of tasks){
    const previous=await receipt(task);
    if(previous?.status==='passed')continue;
    if(previous?.status==='failed'||Date.now()>=deadline)break;
    await verifySnapshot(s.baseline);
    assert.equal((await fingerprint(task.source)).hash,task.sourceHash,'Worker source changed');
    await mkdir(task.out,{recursive:true});
    if(previous){
      const attempts=join(task.out,'attempts',String(Date.now()));await mkdir(attempts,{recursive:true});
      for(const file of await readdir(task.out))if(file.endsWith('.json')||file.endsWith('.seal')||file==='run.log')await writeFile(join(attempts,file),await readFile(join(task.out,file)));
    }
    const taskFile=join(task.out,'task.json');await writeJSON(taskFile,task);
    console.log(JSON.stringify({event:'start',id:task.id,secondsRemaining:Math.floor((deadline-Date.now())/1000)}));
    const worker=join(s.baseline.root,task.kind==='campaign'?'scripts/ai-validation/worker.mjs':'scripts/battle-validation/worker.mjs');
    const outcome=await runWorker({worker,taskFile,cwd:s.baseline.root,timeoutMs:Math.max(1,deadline-Date.now()),logPath:join(task.out,'run.log')});
    await verifySnapshot(s.baseline);assert.equal((await fingerprint(task.source)).hash,task.sourceHash);
    const hashes={};for(const file of await readdir(task.out))if(file.endsWith('.json')&&!['receipt.json','task.json'].includes(file))hashes[file]=sha(await readFile(join(task.out,file)));
    assert.ok(outcome.status!=='passed'||hashes['result.json'],'Worker produced no evidence');
    await digestWrite(join(task.out,'receipt.json'),{...outcome,taskHash:sha(JSON.stringify(task)),hashes,sourceHash:task.sourceHash});
    console.log(JSON.stringify({event:'finish',id:task.id,status:outcome.status}));
    if(outcome.status!=='passed')break;
  }
}
async function collect(tasks){
  const rows={baseline:[],candidate:[]},checks=[],jobs=[];let complete=true;
  for(const task of tasks){
    const r=await receipt(task);jobs.push({id:task.id,status:r?.status||'pending'});
    if(r?.status!=='passed'){complete=false;if(r?.status==='failed')checks.push({id:task.id,status:'failed'});continue;}
    const result=await readJSON(join(task.out,'result.json'));
    if(result.status!=='passed'){checks.push({id:task.id,status:'failed'});complete=false;continue;}
    if(task.kind==='tests')checks.push({id:task.id,status:result.status,passed:result.passed});else rows[task.side].push(result);
  }
  return {rows,checks,jobs,complete};
}
async function registered(path,id){
  const s=await session(path),proposal=await digestRead(join(cdir(path,id),'proposal.json'));
  assert.equal(proposal.protocolHash,s.protocolHash);assert.equal(proposal.baseline.hash,s.baseline.hash);
  const candidate=await digestRead(join(cdir(path,id),'candidate.json'));await verifySnapshot(candidate);
  const changedFiles=assertPolicyChanges(proposal.baseline,candidate,allowedBattlePath);
  assert.equal(candidate.review.sourceHash,candidate.hash);assert.deepEqual(candidate.changedFiles,changedFiles);
  return {s,proposal,candidate,changedFiles};
}
async function report(path,id,stage){
  const {s,proposal,candidate,changedFiles}=await registered(path,id),tasks=taskSet(path,s,{stage,id,proposal,candidate});
  const evidence=await collect(tasks);
  const decision=judgeBattle({proposal,stage,...evidence,sourceStable:true,changedFiles});
  const integrationTasks=taskSet(path,s,{stage,id,proposal,candidate,integration:true}),integration=await collect(integrationTasks);
  const integrated=integration.complete&&integration.checks.length>0&&integration.checks.every(c=>c.status==='passed');
  decision.integration=integrated?'passed-policy-interface-tests':integration.jobs.some(j=>j.status==='failed')?'failed':'incomplete';
  const value={id,stage,sourceHash:candidate.hash,baselineHash:proposal.baseline.hash,protocolHash:s.protocolHash,
    hypothesis:proposal.hypothesis,metric:proposal.metric,delta:proposal.delta,decision,...evidence,integration,
    adoptable:decision.promotable&&integrated,
    limitations:['Only designated battle AI changes against frozen opposition in one frozen public engine.',
      'Player benefit measures fixed legal opening arrangements; full human decisions and skill/bond balance remain untested.',
      'Hashes and source review are not an operating-system sandbox against hostile code.',
      'Pure-policy interface tests do not establish nationwide pacing, strategic calibration or unification.']};
  const directory=join(cdir(path,id),stage);await mkdir(directory,{recursive:true});await writeJSON(join(directory,'report.json'),value);
  const lines=['# 战斗循环验证结果','',`候选：${id}`,`假设：${proposal.hypothesis}`,
    `- 判定：${decision.status}`,`- 原因：${decision.reasons.join('；')||'达到登记的局部改善条件'}`,
    `- 实际集成：${decision.integration}`,`- 可采用：${value.adoptable}`,`- 任务：${evidence.jobs.filter(j=>j.status==='passed').length}/${tasks.length}`,
    `- 基线：${proposal.baseline.hash}`,`- 候选：${candidate.hash}`,'',...value.limitations.map(x=>'- '+x)];
  await writeFile(join(directory,'report.md'),lines.join('\n')+'\n');return value;
}
export async function main(argv){
  const {command,args}=parseArguments(argv);
  if(command==='help')return {commands:['init','probe','propose','seal','run','report','integrate','adopt','recover'],scope:'Battle policy loop; effects and strategic rules remain protected'};
  if(command==='init')return initialize({out:args.out,startedAt:args['started-at']?Date.parse(args['started-at']):Date.now()});
  assert.ok(args.session,'Supply --session');const path=resolve(args.session);
  return lock(path,async()=>{
    const s=await session(path);
    if(command==='recover'){assert.ok(args.journal);return recoverPromotion(resolve(args.journal));}
    if(command==='probe'){
      const tasks=taskSet(path,s,{stage:'probe'});await executeTasks(s,tasks,Math.min(s.deadline,args.seconds?Date.now()+Number(args.seconds)*1000:Infinity));
      const value={sourceHash:s.baseline.hash,...await collect(tasks)};await writeJSON(join(path,'probe','report.json'),value);return {complete:value.complete,jobs:value.jobs,report:join(path,'probe','report.json')};
    }
    const id=identifier(args.id),dir=cdir(path,id);
    if(command==='propose'){
      assert.ok(Date.now()<s.deadline,'Round budget exhausted');assert.ok(s.candidates.length<PROTOCOL.maximumCandidates,'Candidate limit reached');
      assert.ok(!await exists(dir),'Candidate IDs are immutable');assert.ok(PROTOCOL.objectives.includes(args.metric));
      assert.ok(args.hypothesis?.trim()&&Number(args.delta)>0&&Number.isFinite(Number(args.delta)));
      const pilot=await readJSON(join(path,'probe','report.json'));assert.ok(pilot.complete&&pilot.checks.every(c=>c.status==='passed'),'Complete baseline probe first');
      // Candidate always branches from the immutable baseline, even while
      // unrelated work continues in the shared checkout.
      const seeds=new Set();while(seeds.size<PROTOCOL.independentSeeds){const seed=randomBytes(4).readUInt32LE();if(!PROTOCOL.developmentSeeds.includes(seed))seeds.add(seed);}
      const edit=await snapshot(s.baseline.root,join(dir,'edit'));
      const p={id,hypothesis:args.hypothesis,metric:args.metric,delta:Number(args.delta),protocolHash:s.protocolHash,
        baseline:s.baseline,editRoot:edit.root,validationSeeds:[...seeds],integrationSeed:417,createdAt:new Date().toISOString()};
      await digestWrite(join(dir,'proposal.json'),p);s.candidates.push(id);await writeJSON(join(path,'session.json'),s);return {id,editRoot:p.editRoot,metric:p.metric,delta:p.delta};
    }
    if(command==='seal'){
      assert.ok(Date.now()<s.deadline,'Round budget exhausted');const p=await digestRead(join(dir,'proposal.json'));
      assert.equal(p.protocolHash,s.protocolHash);assert.ok(args.review?.trim(),'Supply concrete boundary review');
      const edit=await fingerprint(p.editRoot),changedFiles=assertPolicyChanges(s.baseline,edit,allowedBattlePath);
      const frozen=await snapshot(p.editRoot,join(dir,'frozen'));
      const c={...frozen,changedFiles,review:{sourceHash:frozen.hash,explanation:args.review,scope:'Coding-agent review; not OS isolation'}};
      await digestWrite(join(dir,'candidate.json'),c);return {sourceHash:c.hash,changedFiles};
    }
    const stage=args.stage||'development';assert.ok(['development','validation'].includes(stage));
    if(command==='report')return report(path,id,stage);
    if(command==='run'||command==='integrate'){
      const {proposal,candidate}=await registered(path,id);
      if(command==='integrate')assert.ok((await report(path,id,'validation')).decision.promotable,'Independent improvement required before integration');
      const seconds=args.seconds===undefined?Infinity:Number(args.seconds);assert.ok(seconds>0);
      await executeTasks(s,taskSet(path,s,{stage,id,proposal,candidate,integration:command==='integrate'}),Math.min(s.deadline,Date.now()+seconds*1000));
      const value=await report(path,id,command==='integrate'?'validation':stage);
      return {decision:value.decision,complete:value.complete,adoptable:value.adoptable,report:join(dir,command==='integrate'?'validation':stage,'report.json')};
    }
    if(command==='adopt'){
      const value=await report(path,id,'validation');assert.ok(value.adoptable,'Required improvement/integration evidence missing');
      const {proposal,candidate}=await registered(path,id);
      return promoteFiles({workspace:s.workspace,baseline:proposal.baseline,candidate,journalPath:join(dir,'adoption.json'),allowed:allowedBattlePath});
    }
    throw Error('Unknown command: '+command);
  });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});
