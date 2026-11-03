import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {snapshot,fingerprint,sha,readJSON,writeJSON,verifySnapshot,changes,exists} from '../ai-validation/storage.mjs';
import {PROTOCOL,FAMILIES,CONTEXTS,POSITIONS} from './protocol.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
assert.ok(args.out,'Supply --out=.local/<new-experiment>');
const out=resolve(root,args.out),stage=args.stage||'init';
assert.ok(out.startsWith(join(root,'.local')+'\\')||out.startsWith(join(root,'.local')+'/'),'Keep experimental output in .local');
const config={PROTOCOL,FAMILIES,CONTEXTS,POSITIONS},protocolHash=sha(JSON.stringify(config));
async function patchSource(source){
  const enginePath=join(source,'engine.mjs');let engine=await readFile(enginePath,'utf8');
  const oldStatus="for(const t of targets){status(t,s.statusKey,s.steps,{sourceId:u.id,...(s.statusKey==='link'?{group:u.id+':'+b.tick}:{} )});signal(t);}";
  const newStatus="for(const t of targets){if(s.statusKey==='stun'){control(t,s.steps,'stun');continue;}if(s.statusKey==='magicImmune')for(const key of NEGATIVE_STATUSES)if(key!=='hunger')delete t.statuses[key];status(t,s.statusKey,s.steps,{sourceId:u.id,...(s.statusKey==='link'?{group:u.id+':'+b.tick}:{} ),...(s.statusKey==='magicImmune'?{sourceTactic:s.id,castTick:b.tick,duration:duration(s.steps)}:{})});signal(t);}";
  assert.ok(engine.includes(oldStatus));engine=engine.replace(oldStatus,newStatus);
  const oldHit='targets.forEach((t,i)=>hit(t,i?1.1:1.3,i===0));break;';
  assert.ok(engine.includes(oldHit));engine=engine.replace(oldHit,"targets.forEach((t,i)=>{hit(t,(i?1.1:1.3)*(s.scale??1),i===0);if(t.hp>0&&s.control)control(t,s.steps,s.control);});break;");
  const commandGuard="if(['magicImmune','rapidAdvance','commandInvincible'].includes(key)||status.sourceCommand){";
  assert.ok(engine.includes(commandGuard));
  const ordinaryGuard="if(key==='magicImmune'&&status.sourceTactic){const caster=b.sides.flatMap(s=>s.units).find(v=>v.id===status.sourceId),spell=TACTICS_BOOK[status.sourceTactic];require(spell?.effect==='status'&&spell.statusKey==='magicImmune'&&spell.mode==='support'&&spell.range===0&&caster?.id===u.id&&unitTactics(caster).some(t=>t.id===spell.id)&&(caster.tacticCasts[spell.id]||0)>0&&status.sourceSkillName===spell.name&&Number.isInteger(status.castTick)&&status.castTick>=0&&status.castTick<=b.tick&&Number.isInteger(status.duration)&&status.duration>=spell.steps&&status.duration<=spell.steps+1&&status.until===status.castTick+status.duration+1,'普通魔免来源或时长无效');}else "+commandGuard;
  engine=engine.replace(commandGuard,ordinaryGuard);
  await writeFile(enginePath,engine);
  const powerPath=join(source,'tactic-power.mjs');let power=await readFile(powerPath,'utf8');
  assert.ok(power.includes('Object.freeze({confuse:'));power=power.replace('Object.freeze({confuse:',"Object.freeze({stun:'眩晕',confuse:");
  assert.ok(power.includes('const checks=[];'));power=power.replace('const checks=[];',"const checks=[];if(s.statusKey==='stun'||s.control==='stun')checks.push('stun');");
  await writeFile(powerPath,power);
  const tacticsPath=join(source,'data/design/tactics.mjs');
  const patches=Object.fromEntries(Object.entries(FAMILIES).map(([id,f])=>[id,f.patch]));
  await writeFile(tacticsPath,(await readFile(tacticsPath,'utf8'))+'\n// Isolated experiment only; one registered configuration applies to both sides.\nfor(const id of [\'ward\',\'phalanx\',\'thrust\']){const key=\'lab-original-\'+id;TACTIC_DESIGNS[key]={...structuredClone(TACTIC_DESIGNS[id]),id:key};}\nconst lab=globalThis.__SANGO_BATTLE_DESIGN_AB;\nif(lab?.version===\'B\'){const patches='+JSON.stringify(patches)+';if(!patches[lab.family])throw Error(\'Unknown experiment\');for(const [id,patch]of Object.entries(patches[lab.family]))Object.assign(TACTIC_DESIGNS[id],patch);}\n');
}
if(stage==='init'){
  assert.ok(!await exists(out),'Use a fresh output directory');await mkdir(out,{recursive:true});
  const startedAt=Date.now();const baseline=await snapshot(root,join(out,'baseline'));
  const registration={format:'sango-local-effect-ab',createdAt:new Date().toISOString(),startedAt,deadline:startedAt+PROTOCOL.budgetHours*3600000,authority:'User requested bounded A/B comparisons of the two-character basic-effect and stronger-combination design; no adoption or general balance rewrite.',protocolHash,...config,baseline};
  // Save registration and its seal BEFORE creating/editing the candidate source.
  await writeJSON(join(out,'registration.json'),registration);await writeJSON(join(out,'registration.seal.json'),{sha:sha(JSON.stringify(registration))});
  const edit=await snapshot(baseline.root,join(out,'effect-source'));await patchSource(edit.root);
  const candidate=await fingerprint(edit.root),modified=changes(baseline,candidate);
  assert.deepEqual(modified.sort(),[...PROTOCOL.allowedChanges].sort());
  await writeJSON(join(out,'source.json'),{root:edit.root,...candidate,modified});
  console.log(JSON.stringify({out,baseline:baseline.hash,candidate:candidate.hash,modified,plannedBattles:576,stages:['mechanisms','development','validation','report']}));
}else{
  const registration=await readJSON(join(out,'registration.json'));
  assert.equal(sha(JSON.stringify(registration)),(await readJSON(join(out,'registration.seal.json'))).sha);
  assert.equal(protocolHash,registration.protocolHash,'Protocol changed; do not mix evidence');
  const candidate=await readJSON(join(out,'source.json'));await verifySnapshot(registration.baseline);await verifySnapshot(candidate);
  assert.ok(Date.now()<registration.deadline,'Registered budget exhausted');
  if(['development','validation','mechanisms'].includes(stage)){
    for(const family of Object.keys(FAMILIES))for(const version of ['A','B']){
      const dest=join(out,stage,family+'-'+version);assert.ok(!await exists(dest),'A completed/failed task is never overwritten');await mkdir(dest,{recursive:true});
      const task={out,stage,family,version,dest,source:candidate.root,sourceHash:candidate.hash,protocolHash};await writeJSON(join(dest,'task.json'),task);
      const worker=join(registration.baseline.root,'scripts/battle-design-ab/worker.mjs');
      const log=await new Promise((done,fail)=>{let text='';const child=spawn(process.execPath,[worker,join(dest,'task.json')],{cwd:registration.baseline.root,windowsHide:true,stdio:['ignore','pipe','pipe']});
        const timer=setTimeout(()=>{child.kill();},Math.max(1,registration.deadline-Date.now()));
        for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{text+=bytes;process.stdout.write(bytes);});child.on('error',fail);child.on('close',code=>{clearTimeout(timer);done({code,text});});});
      await writeFile(join(dest,'run.log'),log.text);assert.equal(log.code,0,'Experiment task failed; retain evidence and diagnose');
    }
    await verifySnapshot(candidate);await verifySnapshot(registration.baseline);
  }else if(stage==='report'){
    const rows=[];for(const phase of ['development','validation'])for(const f of Object.keys(FAMILIES))for(const v of ['A','B']){const file=join(out,phase,f+'-'+v,'results.json');if(await exists(file))rows.push(...await readJSON(file));}
    const groups=[];for(const f of Object.keys(FAMILIES))for(const context of FAMILIES[f].contexts)for(const v of ['A','B']){
      const rs=rows.filter(r=>r.phase==='validation'&&r.family===f&&r.context===context&&r.version===v);if(!rs.length)continue;
      const mean=key=>rs.reduce((n,r)=>n+(r[key]||0),0)/rs.length;
      const layoutMeans=Object.fromEntries(PROTOCOL.layouts.map(l=>[l,rs.filter(r=>r.layout===l).reduce((n,r)=>n+r.margin,0)/rs.filter(r=>r.layout===l).length]));
      groups.push({family:f,context,version:v,battles:rs.length,wins:rs.filter(r=>r.win).length,draws:rs.filter(r=>r.winner===null).length,meanMargin:mean('margin'),meanTicks:mean('ticks'),meanSkillCasts:mean('skillCasts'),meanHardControlTicks:mean('hardControlTicks'),maxConsecutiveLock:Math.max(...rs.map(r=>r.maxConsecutiveLock)),meanMagicTicks:mean('magicTicks'),meanMagicAttacks:mean('magicAttacks'),meanComboOpenings:mean('comboOpenings'),meanCoreDamage:mean('coreDamage'),meanFirstCoreSpecial:rs.filter(r=>r.firstCoreSpecial!==null).reduce((n,r)=>n+r.firstCoreSpecial,0)/(rs.filter(r=>r.firstCoreSpecial!==null).length||1),coreSpecialOpportunities:rs.filter(r=>r.firstCoreSpecial!==null).length,layoutMeans,layoutSensitivity:Math.abs(layoutMeans.compact-layoutMeans.spread),meanExperimentCasts:mean('experimentCasts'),meanExperimentDamage:mean('experimentDamage'),timeouts:rs.filter(r=>r.ticks>=PROTOCOL.limit).length});
    }
    const paired=[];for(const a of rows.filter(r=>r.version==='A')){const b=rows.find(r=>r.version==='B'&&r.key===a.key);if(b)paired.push({key:a.key,phase:a.phase,family:a.family,context:a.context,seed:a.seed,side:a.side,layout:a.layout,enemyLayout:a.enemyLayout,marginDelta:b.margin-a.margin,tickDelta:b.ticks-a.ticks,hardControlDelta:b.hardControlTicks-a.hardControlTicks,magicDelta:b.magicTicks-a.magicTicks,winChange:Number(b.win)-Number(a.win)});}
    const summary={protocolHash,sourceHash:candidate.hash,baselineHash:registration.baseline.hash,battles:rows.length,validationBattles:rows.filter(r=>r.phase==='validation').length,deterministicCheckpoints:rows.filter(r=>r.deterministic).length,groups,paired,limitations:PROTOCOL.interpretation};
    await writeJSON(join(out,'summary.json'),summary);console.log(JSON.stringify({battles:summary.battles,validationBattles:summary.validationBattles,groups}));
  }else throw Error('Unknown stage');
}
