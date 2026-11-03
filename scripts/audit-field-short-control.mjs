// Bounded playtest comparison. Shared current engine and assignments; A restores only pre-change tactics.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {snapshot,readJSON,writeJSON,sha,verifySnapshot,exists} from './ai-validation/storage.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
if(args.task){
 const task=await readJSON(resolve(args.task)),reg=await readJSON(join(task.out,'registration.json')),source=task.source;
 const load=file=>import(pathToFileURL(join(source,file)));
 const data=await load('data/design/tactics.mjs'),assign=await load('data/design/assignments.mjs');
 if(task.arm==='A'){
  const old=await import(pathToFileURL(join(reg.baseline.root,'data/design/tactics.mjs'))),oldAssign=await import(pathToFileURL(join(reg.baseline.root,'data/design/assignments.mjs')));
  for(const id of ['ward','unique-person-99'])data.TACTIC_DESIGNS[id]=structuredClone(old.TACTIC_DESIGNS[id]);
  assign.INTELLECT_TACTIC_POOLS.baier=[...oldAssign.INTELLECT_TACTIC_POOLS.baier];
 }
 const [E,G,T,D,O,P]=await Promise.all(['engine.mjs','battle-generator.mjs','tactics.mjs','battle-deployment.mjs','officer-catalog.mjs','scripts/battle-design-ab/protocol.mjs'].map(load));
 const family=P.FAMILIES.control,positions={...P.POSITIONS,aligned:[[4,3],[3,3],[3,2],[4,4],[4,2],[3,4]]};
 const id=name=>O.OFFICER_CATALOG.find(o=>o.name===name).id,coreId=id('关羽'),entries=team=>team.map(([name,type,troops])=>({id:id(name),type,troops,level:10,retreatAt:null}));
 const rows=[];
 for(const context of reg.cases)for(const seed of reg.validationSeeds)for(const side of reg.sides)for(const layout of task.layouts)for(const enemyLayout of reg.enemyLayouts){
  const own=entries(family.team),foe=entries(P.CONTEXTS[context].team),ctx=P.CONTEXTS[context],roles=team=>({leader:team[0].id,advisor:team[1].id});
  const input={seed,terrain:ctx.terrain,mapId:ctx.mapId,battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:own,enemyTeam:side?own:foe,ownTeamRoles:roles(side?foe:own),enemyTeamRoles:roles(side?own:foe)};
  const state=G.generateBattle(input),b=state.battle;E.planBattleCouncilsAI(b,[0,1]);
  for(const [s,team,profile]of [[side,own,layout],[1-side,foe,enemyLayout]]){
   for(const u of b.sides[s].units)assert.equal(E.reserveDeploymentUnit(b,u.id,null,s),null);
   team.forEach((u,i)=>{const [x,y]=positions[profile][i];assert.equal(D.deployBattleUnit(b,u.id,s?13-x:x,y,s),null);});
  }
  if(task.arm==='B'&&context==='physical'&&seed===reg.validationSeeds[0]&&side===0&&layout==='aligned'&&enemyLayout==='compact'){
   E.validateSave(structuredClone(state));await writeJSON(join(task.out,'short-control-start.json'),state);await writeJSON(join(task.out,'short-control-draft.json'),input);
  }
  assert.equal(E.lockDeployment(b),null);E.validateSave(structuredClone(state));let shadow=null,until=0,deterministic=false;
  const metrics={stunUnitTicks:0,ordinaryStunOnlyOpenings:0,stunOnlyOpenings:0,ordinaryStunSetup:0,setup:0,firstSpecial:null};
  while(!b.result){
   const before=new Map(b.sides[1-side].units.map(u=>[u.id,{stun:T.hasStatus(b,u,'stun'),ordinary:u.statuses.stun?.sourceSkillName===T.TACTICS_BOOK.ward.name&&u.statuses.stun?.sourceId!==coreId,other:['armorBreak','confuse','slow'].some(k=>T.hasStatus(b,u,k))}]));
   E.stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});
   if(shadow){E.stepBattle(shadow.battle,{aiSides:[0,1],pauseForReinforcements:false});if(b.tick>=until||b.result){assert.deepEqual(shadow.battle,b);deterministic=true;shadow=null;}}
   if(!deterministic&&!shadow&&b.tick>=20&&!b.result){shadow=E.validateSave(structuredClone(state));until=b.tick+8;}
   for(const u of b.sides[1-side].units)if(u.status==='active'&&u.hp>0&&T.hasStatus(b,u,'stun'))metrics.stunUnitTicks++;
   for(const e of b.effects.filter(e=>e.from===coreId&&e.openingTrigger==='setup')){metrics.setup++;const p=before.get(e.to);if(p?.stun){if(!p.other)metrics.stunOnlyOpenings++;if(p.ordinary){metrics.ordinaryStunSetup++;if(!p.other)metrics.ordinaryStunOnlyOpenings++;}}}
   if(metrics.firstSpecial===null&&b.sides[side].units.find(u=>u.id===coreId).tacticCasts['unique-person-99'])metrics.firstSpecial=b.tick;
  }
  E.validateSave(structuredClone(state));const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0);
  rows.push({arm:task.arm,context,seed,side,layout,enemyLayout,win:b.result.winner===side,winner:b.result.winner,ticks:b.tick,margin:(hp(side)-hp(1-side))/18000,deterministic,...metrics});
  if(rows.length%16===0)console.log(JSON.stringify({arm:task.arm,completed:rows.length}));
 }
 await writeJSON(join(task.dest,'results.json'),rows);console.log(JSON.stringify({arm:task.arm,battles:rows.length,wins:rows.filter(r=>r.win).length,ordinaryStunOnlyOpenings:rows.reduce((n,r)=>n+r.ordinaryStunOnlyOpenings,0)}));
}else{
 assert.ok(args.out);const out=resolve(root,args.out),reg=await readJSON(join(out,'registration.json'));assert.equal(sha(JSON.stringify(reg)),(await readJSON(join(out,'registration.seal.json'))).sha);
 assert.ok(!await exists(join(out,'candidate')),'Use a new immutable output for another run');
 const source=await snapshot(root,join(out,'candidate'));await writeJSON(join(out,'candidate.json'),source);
 const harness={sourceHash:source.hash,baselineHash:reg.baseline.hash,seeds:reg.validationSeeds,layouts:['compact','aligned','spread'],cases:reg.cases,arms:['A','B'],scope:'Current combined engine/AI/officer and stratagem assignments shared by both arms. A restores original spear control, Guan setup and Baier small-slot definitions. Added aligned support layout before any outcome; no in-battle intervention.',sha:sha(await readFile(fileURLToPath(import.meta.url)))};
 await writeJSON(join(out,'validation-harness.json'),harness);
 for(const arm of harness.arms){const dest=join(out,arm);await mkdir(dest,{recursive:false});const task={out,dest,arm,source:source.root,layouts:harness.layouts};await writeJSON(join(dest,'task.json'),task);
  const child=spawnSync(process.execPath,[join(source.root,'scripts/audit-field-short-control.mjs'),'--task='+join(dest,'task.json')],{encoding:'utf8',windowsHide:true,timeout:15*60*1000,maxBuffer:2000000});await writeFile(join(dest,'run.log'),child.stdout+child.stderr);process.stdout.write(child.stdout);assert.equal(child.status,0,child.stderr);
 }
 await verifySnapshot(source);const rows=[...await readJSON(join(out,'A/results.json')),...await readJSON(join(out,'B/results.json'))],summary=[];
 for(const context of reg.cases)for(const arm of harness.arms)for(const layout of harness.layouts){const rs=rows.filter(r=>r.context===context&&r.arm===arm&&r.layout===layout),mean=k=>rs.reduce((n,r)=>n+(r[k]||0),0)/rs.length;summary.push({context,arm,layout,n:rs.length,wins:rs.filter(r=>r.win).length,margin:mean('margin'),stun:mean('stunUnitTicks'),setup:rs.reduce((n,r)=>n+r.setup,0),ordinaryStunOnlyOpenings:rs.reduce((n,r)=>n+r.ordinaryStunOnlyOpenings,0)});}
 const result={sourceHash:source.hash,battles:rows.length,deterministic:rows.filter(r=>r.deterministic).length,groups:summary,limitations:'Local effect and layout diagnosis, 4 independent seeds; not a human fun verdict or national balance acceptance.'};await writeJSON(join(out,'summary.json'),result);console.log(JSON.stringify(result));
}
