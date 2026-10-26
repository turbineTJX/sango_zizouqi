import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename,access} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {warTempoReport} from './war-tempo-report.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
assert.ok(args.snapshot,'Pass an immutable snapshot directory');
const snapshot=resolve(args.snapshot),manifest=JSON.parse(await readFile(join(snapshot,'manifest.json'),'utf8')),runtime=manifest.runtime;
const {NATIONAL_SCENARIOS}=await import(pathToFileURL(join(runtime,'national-scenarios.mjs')));
const scenarios=args.scenarios?args.scenarios.split(','):NATIONAL_SCENARIOS.map(s=>s.id),seeds=(args.seeds||'20261019,30361019').split(',').map(Number);
const through=Number(args.turns||70),concurrency=Number(args.concurrency||2),stages=[...new Set([6,20,60,through].filter(n=>n<=through))].sort((a,b)=>a-b);
assert.ok(scenarios.length&&scenarios.every(id=>NATIONAL_SCENARIOS.some(s=>s.id===id))&&new Set(scenarios).size===scenarios.length);
assert.ok(seeds.length&&new Set(seeds).size===seeds.length&&seeds.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=0xffffffff));
assert.ok(Number.isSafeInteger(through)&&through>=1&&Number.isSafeInteger(concurrency)&&concurrency>=1&&concurrency<=4);
const out=resolve(args.out||join(snapshot,'natural')),config={sourceHash:manifest.sourceHash,scenarios,seeds,through,stages};await mkdir(out,{recursive:true});
const exists=path=>access(path).then(()=>true,()=>false),read=async path=>JSON.parse(await readFile(path,'utf8'));
const matrixPath=join(out,'matrix.json');let matrix;
if(await exists(matrixPath)){matrix=await read(matrixPath);assert.deepEqual(matrix.config,config,'Never combine different sources, seeds or observation windows');}
else matrix={config,createdAt:new Date().toISOString(),status:'running',cases:scenarios.flatMap(scenario=>seeds.map(seed=>({scenario,seed,status:'pending',phases:[]})))};
let writes=Promise.resolve();
function publish(){matrix.updatedAt=new Date().toISOString();const bytes=JSON.stringify(matrix,null,2);writes=writes.then(async()=>{await writeFile(matrixPath+'.tmp',bytes);await rename(matrixPath+'.tmp',matrixPath);});return writes;}

export function mergeCampaignWindows(windows){
 const first=windows[0],last=windows.at(-1),departures=new Map(),battles=new Map(),starts=new Map(),hunger=new Map(),joint=new Map(),captures=[],planTrace=[];
 for(const run of windows){
  for(const row of run.departures)if(!departures.has(row.id))departures.set(row.id,row);
  for(const row of run.battles)battles.set(row.id,{id:row.id,startedDay:row.startedDay,endedDay:row.endedDay});
  for(const row of run.battleStarts)starts.set(row.id,row);
  for(const row of run.hunger)if(row.day>=run.metrics.startDay&&row.day<run.metrics.completedDay)hunger.set(`${row.day}:${row.kind}:${row.id}`,row);
  for(const row of run.jointParticipation||[])joint.set(`${row.day}:${row.battleId}:${row.side}`,row);
  captures.push(...run.captures);planTrace.push(...run.planTrace.map(p=>({id:p.id,day:p.day,faction:p.faction,phase:p.phase,tasks:p.tasks})));
 }
 const merged={metrics:{startDay:first.metrics.startDay,completedDay:last.metrics.completedDay},departures:[...departures.values()],battles:[...battles.values()],battleStarts:[...starts.values()],hunger:[...hunger.values()],jointParticipation:[...joint.values()],captures,planTrace};
 return {finished:last.metrics.finished,completedDay:last.metrics.completedDay,departures:merged.departures.filter(a=>!a.existingAtStart).length,settledBattles:merged.battles.length,captures:captures.length,cityHungerDays:merged.hunger.filter(h=>h.kind==='city').length,armyHungerDays:merged.hunger.filter(h=>h.kind==='army').length,deterministicCheckpoints:windows.reduce((n,r)=>n+r.metrics.deterministicCheckpoints,0),tempo:warTempoReport(merged)};
}
async function runPhase(row,endTurn){
 const previous=row.phases.at(-1);if(previous?.finished||previous?.throughTurn>=endTurn)return;
 const from=previous?.completedDay||1,days=endTurn*10+1-from;if(days<=0)return;
 const base=join(out,`${row.scenario}-${row.seed}`,`through-${endTurn}`),directory=await exists(base)?base+'-retry-'+Date.now():base;await mkdir(directory,{recursive:true});
 row.status='running';row.running={throughTurn:endTurn,out:directory};await publish();
 const script=join(runtime,'scripts/audit-all-ai-decisions.mjs'),command=[script,'--source='+runtime,'--scenario='+row.scenario,'--seed='+row.seed,'--days='+days,'--out='+directory];
 if(previous)command.push('--save='+join(previous.out,'campaign-save.json'));
 console.log(JSON.stringify({event:'phase-start',scenario:row.scenario,seed:row.seed,throughTurn:endTurn}));
 const log=createWriteStream(join(directory,'run.log'));
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,command,{cwd:runtime,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.once('error',reject);child.once('close',resolve);});
 await new Promise(resolve=>log.end(resolve));
 if(code!==0){row.status='failed';row.failure={throughTurn:endTurn,out:directory,exitCode:code};delete row.running;await publish();return;}
 const report=await read(join(directory,'campaign-audit.json'));
 for(const [file,hash]of Object.entries(report.sourceHashes))assert.equal(hash,manifest.hashes[file.replaceAll('\\','/')],'Audit source differs from snapshot: '+file);
 row.phases.push({throughTurn:endTurn,out:directory,...report.metrics});delete row.running;
 row.summary=mergeCampaignWindows(await Promise.all(row.phases.map(p=>read(join(p.out,'campaign-audit.json')))));
 row.status=row.summary.finished||endTurn===through?'complete':'pending';await publish();
 console.log(JSON.stringify({event:'phase-finish',scenario:row.scenario,seed:row.seed,throughTurn:endTurn,...row.summary,tempo:undefined}));
}
await publish();
for(const stage of stages){
 const queue=matrix.cases.filter(r=>r.status!=='failed'&&r.status!=='complete'&&!(r.phases.at(-1)?.throughTurn>=stage));let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,queue.length)},async()=>{while(next<queue.length){const row=queue[next++];try{await runPhase(row,stage);}catch(error){row.status='failed';row.failure={...row.running,error:error.stack};delete row.running;await publish();console.error(error.stack);}}}));
}
matrix.status=matrix.cases.some(r=>r.status==='failed')?'failed':matrix.cases.every(r=>r.status==='complete')?'complete':'incomplete';await publish();await writes;
console.log(JSON.stringify({event:'matrix-finish',status:matrix.status,path:matrixPath,complete:matrix.cases.filter(r=>r.status==='complete').length,failed:matrix.cases.filter(r=>r.status==='failed').length}));
if(matrix.status!=='complete')process.exitCode=1;
