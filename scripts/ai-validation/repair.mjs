import assert from 'node:assert/strict';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {RULES} from './rules.mjs';
import {sha,readJSON,writeJSON,atomic,exists,inside,verifySnapshot,assertPolicyChanges} from './storage.mjs';

async function naturalInput(directory,destination){
 const receipt=await readJSON(join(resolve(directory),'receipt.json'));
 assert.equal(receipt.status,'passed','Input must have a completed natural receipt');
 const task=await readJSON(join(resolve(directory),'task.json'));
 assert.equal(receipt.taskHash,sha(JSON.stringify(task)));assert.equal(receipt.sourceHash,task.sourceHash);
 const result=await readFile(join(resolve(directory),'result.json')),save=await readFile(join(resolve(directory),'campaign-save.json'));
 assert.equal(sha(result),receipt.evidenceHashes['result.json']);assert.equal(sha(save),receipt.evidenceHashes['campaign-save.json']);
 const r=JSON.parse(result);assert.equal(r.status,'passed');assert.equal(r.kind,'campaign');assert.equal(r.freshOrigin,true,'Require traceable original natural campaign');
 assert.equal(task.kind,'campaign');assert.equal(task.scenario,r.scenario);assert.equal(task.seed,r.seed);
 assert.ok(Number.isSafeInteger(r.seed)&&r.seed>=0&&r.seed<=0xffffffff);
 const s=JSON.parse(save);assert.equal(s.campaign.allAI,true);assert.equal(s.campaign.scenarioId,r.scenario);
 return {bytes:save,input:{path:resolve(destination),sha256:sha(save),scenario:r.scenario,seed:r.seed,originSourceHash:receipt.sourceHash,originDirectory:resolve(directory)}};
}
export async function registerRepair(path,s,spec){
 assert.match(spec.id||'',/^[a-z][a-z0-9-]{0,63}$/);assert.ok(!(s.repairs||[]).some(r=>r.id===spec.id),'Repair IDs cannot be replaced');
 assert.match(spec.caseFile||'',/^scripts\/ai-validation\/cases\/[a-z0-9-]+\.mjs$/);assert.ok(s.judge.hashes[spec.caseFile]);
 assert.ok(Array.isArray(spec.expectedFailures)&&spec.expectedFailures.length&&new Set(spec.expectedFailures).size===spec.expectedFailures.length);
 assert.ok(spec.expectedFailures.every(k=>typeof k==='string'&&k.trim()));
 assert.ok(Array.isArray(spec.tests)&&spec.tests.length&&new Set(spec.tests).size===spec.tests.length);
 for(const f of spec.tests){assert.match(f,/^tests\/[a-z0-9/-]+\.test\.mjs$/);assert.ok(s.judge.hashes[f]);}
 for(const f of RULES.repair.requiredTests)assert.ok(spec.tests.includes(f),'Missing safety regression: '+f);
 assert.ok(Array.isArray(spec.windows)&&spec.windows.length>=RULES.repair.minimumWindows);
 const folder=join(path,'repair-inputs',spec.id);assert.ok(!await exists(folder));
 const reproductionFile=await naturalInput(spec.reproductionDirectory,join(folder,'reproduction.json')),reproduction=reproductionFile.input,files=[reproductionFile];
 const windows=[];for(const [i,w]of spec.windows.entries()){
  assert.ok(Number.isSafeInteger(w.days)&&w.days>=RULES.repair.minimumDays);
  const file=await naturalInput(w.directory,join(folder,'window-'+i+'.json'));files.push(file);windows.push({input:file.input,days:w.days});
 }
 const keys=windows.map(w=>w.input.scenario+':'+w.input.seed);
 assert.equal(new Set(keys).size,keys.length,'Duplicate natural windows');assert.ok(!keys.includes(reproduction.scenario+':'+reproduction.seed),'Reproduction is not independent validation');
 assert.ok(new Set(windows.map(w=>w.input.seed)).size>=RULES.repair.minimumWindows,'Independent seeds required');
 for(const scenario of RULES.scenarios)assert.ok(windows.some(w=>w.input.scenario===scenario),'Missing scenario: '+scenario);
 const record={id:spec.id,caseFile:spec.caseFile,expectedFailures:spec.expectedFailures,tests:spec.tests,reproduction,windows};
 for(const f of files)await atomic(f.input.path,f.bytes);
 (s.repairs??=[]).push(record);await writeJSON(join(path,'session.json'),s);return record;
}
export function repairTasks(directory,p,c,judge){
 assert.equal(p.tier,'repair');assert.ok(p.repair);
 const tasks=[],roots={baseline:p.baseline,candidate:c},append=(id,side,body)=>tasks.push({id,side,source:roots[side].root,sourceHash:roots[side].hash,out:join(directory,'repair',id),judgeRoot:judge.root,...body});
 for(const side of ['baseline','candidate'])append('reproduction-'+side,side,{kind:'reproduction',input:p.repair.reproduction,casePath:join(judge.root,p.repair.caseFile),expectedFailures:side==='baseline'?p.repair.expectedFailures:[]});
 append('regressions','candidate',{kind:'regressions',files:p.repair.tests});
 for(const [i,w]of p.repair.windows.entries())for(const side of ['baseline','candidate'])append('window-'+i+'-'+side,side,{kind:'window',window:i,input:w.input,days:w.days});
 return tasks;
}
async function checkedReceipt(task){
 const file=join(task.out,'receipt.json');if(!await exists(file))return null;
 const r=await readJSON(file);assert.equal(r.taskHash,sha(JSON.stringify(task)));assert.equal(r.sourceHash,task.sourceHash);
 for(const [f,hash]of Object.entries(r.evidenceHashes||{}))assert.equal(sha(await readFile(inside(task.out,join(task.out,f)))),hash,'Evidence changed: '+f);
 if(r.status==='passed')assert.ok(r.evidenceHashes['result.json']);return r;
}
export function decideRepair(tasks,results){
 const reasons=[],windows=[];
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length||tasks.length<3+2*RULES.repair.minimumWindows)reasons.push('incomplete-task-set');
 for(const side of ['baseline','candidate'])if(!tasks.some(t=>t.kind==='reproduction'&&t.side===side))reasons.push('missing-reproduction:'+side);
 if(!tasks.some(t=>t.kind==='regressions'&&t.side==='candidate'))reasons.push('missing-regressions');
 const baselineWindows=tasks.filter(t=>t.kind==='window'&&t.side==='baseline');
 if(baselineWindows.length<RULES.repair.minimumWindows)reasons.push('missing-independent-windows');
 const valid=new Set();
 for(const t of tasks){
  const r=results[t.id];
  if(r?.status!=='passed'||r.sourceHash!==t.sourceHash||r.kind!==t.kind){reasons.push('missing-or-failed:'+t.id);continue;}
  if(t.kind==='reproduction'){
   const checks=r.checks||{},failures=Object.keys(checks).filter(k=>!checks[k]).sort();
   if(!Object.keys(checks).length||!Object.values(checks).every(x=>typeof x==='boolean')||JSON.stringify(failures)!==JSON.stringify([...t.expectedFailures].sort())){reasons.push('invalid-reproduction:'+t.id);continue;}
  }else if(t.kind==='regressions'){
   if(!Array.isArray(r.passed)||!r.passed.length||!Array.isArray(r.failed)||r.failed.length||!Array.isArray(r.skipped)||r.skipped.length||t.files.some(f=>!r.passed.some(p=>p.file===f))){reasons.push('invalid-regressions');continue;}
  }else if(t.kind==='window'){
   const m=r.metrics,counts=[r.troops,r.retained,m?.cityHungerDays,m?.armyHungerDays];
   if(counts.some(n=>!Number.isSafeInteger(n)||n<0)||r.replayed!==true||r.inputSha256!==t.input.sha256||m.completedDay-m.startDay!==t.days||t.days<RULES.repair.minimumDays){reasons.push('invalid-window:'+t.id);continue;}
  }else {reasons.push('unknown-task:'+t.id);continue;}
  valid.add(t.id);
 }
 for(const t of baselineWindows){
  const peer=tasks.find(x=>x.kind==='window'&&x.window===t.window&&x.side==='candidate');
  if(!peer||!valid.has(t.id)||!valid.has(peer.id)){reasons.push('incomplete-pair:'+t.id);continue;}
  const b=results[t.id],c=results[peer.id];
  if(b.inputSha256!==c.inputSha256||t.days!==peer.days){reasons.push('different-initial-states:'+t.id);continue;}
  const hunger=x=>x.metrics.cityHungerDays+x.metrics.armyHungerDays;
  const violations=[];
  if(hunger(c)>hunger(b)+RULES.repair.maximumAddedHungerDays)violations.push('hunger');
  if(c.troops<b.troops*RULES.repair.minimumRemainingTroopsRatio)violations.push('troops');
  if(c.retained<b.retained-1)violations.push('territory');
  windows.push({id:t.id,baseline:b,candidate:c,violations});reasons.push(...violations.map(v=>t.id+':'+v));
 }
 return {tier:'behavior-repair',promotable:!reasons.length,status:reasons.length?'not-passed':'behavior-repaired',reasons,windows,
  globalImprovement:'not-assessed',playability:'not-assessed',unification:'not-assessed'};
}
export async function reportRepair(path,id,{loadSession,readProposal}){
 const s=await loadSession(path),p=await readProposal(path,id),directory=join(path,'candidates',id),c=await readJSON(join(directory,'candidate.json'));
 await verifySnapshot(p.baseline);await verifySnapshot(c);assertPolicyChanges(p.baseline,c);assert.equal(c.review.sourceHash,c.hash);assert.equal(c.review.constraintsPreserved,true);
 const tasks=repairTasks(directory,p,c,s.judge),results={},jobs=[];
 for(const t of tasks){if(t.input)assert.equal(sha(await readFile(t.input.path)),t.input.sha256);const r=await checkedReceipt(t);jobs.push({id:t.id,status:r?.status||'pending'});if(r?.status==='passed')results[t.id]=await readJSON(join(t.out,'result.json'));}
 const decision=decideRepair(tasks,results),report={protocolVersion:RULES.version,sourceHash:c.hash,baselineHash:p.baseline.hash,hypothesis:p.hypothesis,decision,jobs};
 await writeJSON(join(directory,'repair','report.json'),report);
 await atomic(join(directory,'repair','report.md'),[
  '# 战略 AI 行为修复验证', '', `结论：${decision.status}。本机采用资格：${decision.promotable?'通过':'未通过'}。`,
  `假设：${p.hypothesis}`, '', `基线：${p.baseline.hash}`, `候选：${c.hash}`, '',
  '全局策略收益、完整可玩性与自然统一：均未评估。自然窗口为已封存原始自然局的短期续行，不是本候选从开局到终局的证据。', '',
  ...jobs.map(j=>`- ${j.id}: ${j.status}`), '',
  ...decision.windows.map(w=>`${w.id}：缺粮单位日 ${w.baseline.metrics.cityHungerDays+w.baseline.metrics.armyHungerDays} → ${w.candidate.metrics.cityHungerDays+w.candidate.metrics.armyHungerDays}；现役及伤兵 ${w.baseline.troops} → ${w.candidate.troops}；保有新夺敌城 ${w.baseline.retained} → ${w.candidate.retained}。`), '',
  ...(decision.reasons.length?['未通过原因：',...decision.reasons.map(r=>'- '+r)]:[]),
 ].join('\n')+'\n');return report;
}
export async function executeRepair(path,args,{loadSession,readProposal,runWorker,adopt}){
 const s=await loadSession(path),p=await readProposal(path,args.id),directory=join(path,'candidates',args.id),c=await readJSON(join(directory,'candidate.json'));
 assert.equal(p.baseline.hash,s.champion.hash);assertPolicyChanges(p.baseline,c);
 const requested=args.seconds===undefined?Infinity:Number(args.seconds);assert.ok(requested>0&&(Number.isFinite(requested)||requested===Infinity));
 const deadline=Math.min(s.round.deadline,Date.now()+requested*1000),tasks=repairTasks(directory,p,c,s.judge);
 for(const t of tasks){
  const old=await checkedReceipt(t);if(old?.status==='passed')continue;if(old?.status==='failed'||Date.now()>=deadline)break;
  if(old){const attempts=join(t.out,'attempts',Date.now().toString());await mkdir(attempts,{recursive:true});for(const f of ['receipt.json','result.json','run.log'])if(await exists(join(t.out,f)))await atomic(join(attempts,f),await readFile(join(t.out,f)));}
  await verifySnapshot(s.judge);await verifySnapshot(t.side==='baseline'?p.baseline:c);if(t.input)assert.equal(sha(await readFile(t.input.path)),t.input.sha256);
  await mkdir(t.out,{recursive:true});const taskFile=join(t.out,'task.json');await writeJSON(taskFile,t);
  console.log(JSON.stringify({event:'start',job:t.id}));
  const outcome=await runWorker({worker:join(s.judge.root,'scripts/ai-validation/repair-worker.mjs'),taskFile,cwd:s.judge.root,timeoutMs:Math.max(1,deadline-Date.now()),logPath:join(t.out,'run.log')});
  await verifySnapshot(s.judge);await verifySnapshot(t.side==='baseline'?p.baseline:c);
  const evidenceHashes={};for(const f of await readdir(t.out))if(f.endsWith('.json')&&!['task.json','receipt.json'].includes(f))evidenceHashes[f]=sha(await readFile(join(t.out,f)));
  assert.ok(outcome.status!=='passed'||evidenceHashes['result.json'],'Worker exited without evidence');
  await writeJSON(join(t.out,'receipt.json'),{...outcome,taskHash:sha(JSON.stringify(t)),sourceHash:t.sourceHash,judgeHash:s.judge.hash,finishedAt:new Date().toISOString(),evidenceHashes});console.log(JSON.stringify({event:'finish',job:t.id,status:outcome.status}));if(outcome.status!=='passed')break;
 }
 const report=await reportRepair(path,args.id,{loadSession,readProposal});let adoption=null;
 if(report.decision.promotable)try{adoption=await adopt(path,args.id);}catch(e){adoption={status:'pending',reason:e.message};}
 else if(report.jobs.some(j=>j.status==='failed')||report.jobs.every(j=>j.status==='passed')){
  const counted=join(directory,'non-improvement-counted.json');
  if(!await exists(counted)){const current=await loadSession(path);current.round.rejections++;await writeJSON(join(path,'session.json'),current);await writeJSON(counted,{status:report.decision.status});}
 }
 return {report:join(directory,'repair','report.json'),decision:report.decision.status,adoption};
}
