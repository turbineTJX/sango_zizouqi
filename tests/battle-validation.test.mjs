import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PROTOCOL, casesFor, variantsFor, allowedBattlePath, battleDraft } from '../scripts/battle-validation/protocol.mjs';
import { judgeBattle } from '../scripts/battle-validation/judge.mjs';
import { initialize, assertRunnerMatches } from '../scripts/battle-validation/cli.mjs';
import { fingerprint, snapshot, assertPolicyChanges, promoteFiles } from '../scripts/ai-validation/storage.mjs';
import { OFFICER_DESIGNS } from '../data/design/officers.mjs';
import { BATTLE_MAPS } from '../data/design/battle-maps.mjs';
import { generateBattle } from '../battle-generator.mjs';
import { validateSave, planBattleCouncilsAI } from '../engine.mjs';

function evidence(){
  const validationSeeds=Array.from({length:PROTOCOL.independentSeeds},(_,i)=>i+1);
  const proposal={validationSeeds,metric:'remainingMargin',delta:0.04};
  const rows={baseline:[],candidate:[]};
  for(const seed of validationSeeds)for(const spec of casesFor('validation'))for(const side of ['baseline','candidate'])rows[side].push({
    key:`${spec.id}:${seed}`,seed,spec,inputHash:spec.id,engineHash:'one-engine',opponentHash:'fixed-opponent',
    metrics:{missionRate:.5,remainingMargin:side==='baseline'?.1:.2,remainingFraction:.4,timeoutRate:0,ticks:120,
      advantageMarginGain:.1,advantageMissionGain:0,playerMarginLift:.2,playerMissionLift:.25,playerArrangedMission:.75},
  });
  return {proposal,stage:'validation',rows,checks:[{status:'passed'}],complete:true,sourceStable:true,changedFiles:['battle-ai.mjs']};
}
test('battle protocol separates strategy and common effects from candidate policy',()=>{
  assert.ok(allowedBattlePath('battle-ai.mjs'));
  for(const file of ['strategic-ai.mjs','engine.mjs','data/design/bonds.mjs','data/design/tactics.mjs','scripts/battle-validation/judge.mjs','tests/battle-validation.test.mjs'])assert.equal(allowedBattlePath(file),false,file);
  const before={hashes:{'battle-ai.mjs':'a','strategic-ai.mjs':'a'}};
  assert.throws(()=>assertPolicyChanges(before,{hashes:{...before.hashes,'battle-ai.mjs':'b'}}));
  assert.deepEqual(assertPolicyChanges(before,{hashes:{...before.hashes,'battle-ai.mjs':'b'}},allowedBattlePath),['battle-ai.mjs']);
  assert.throws(()=>assertPolicyChanges(before,{hashes:{...before.hashes,'strategic-ai.mjs':'b'}},allowedBattlePath));
});
test('registered lawful scenarios retain unique people, integer and paired troop budgets',()=>{
  for(const c of [...casesFor('development'),...casesFor('validation')])for(const variant of variantsFor(c)){
    const draft=battleDraft(c,417,OFFICER_DESIGNS,BATTLE_MAPS,variant),all=[...draft.ownTeam,...draft.enemyTeam];
    assert.equal(new Set(all.map(u=>u.id)).size,all.length,c.id);
    assert.ok(all.every(u=>Number.isSafeInteger(u.troops)&&u.troops>0));
    assert.equal(draft.ownTeam.reduce((s,u)=>s+u.troops,0),draft.enemyTeam.reduce((s,u)=>s+u.troops,0)*(variant==='more-troops'?1.5:1));
    const s=generateBattle(draft);planBattleCouncilsAI(s.battle,[0,1]);validateSave(structuredClone(s));
  }
});
test('paired improvement may qualify locally without claiming integrated playability',()=>{
  const d=judgeBattle(evidence());assert.equal(d.status,'improved');assert.ok(d.promotable);assert.equal(d.integration,'not-run');assert.equal(d.playerExperience,'not-observed');
});
test('unchanged policies and losses are never manufactured into improvement',()=>{
  const e=evidence();e.rows.candidate=structuredClone(e.rows.baseline);
  assert.equal(judgeBattle(e).status,'insufficient');
  e.rows.candidate.forEach(r=>r.metrics.remainingMargin=.1);assert.equal(judgeBattle(e).status,'insufficient');
});
test('development, incomplete, failed and drifted evidence cannot promote',()=>{
  for(const edit of [e=>e.stage='development',e=>e.complete=false,e=>e.checks=[],e=>e.checks=[{status:'skipped'}],e=>e.checks=[{status:'failed'}],e=>e.sourceStable=false,e=>e.changedFiles=[]]){
    const e=evidence();edit(e);assert.equal(judgeBattle(e).promotable,false);
  }
});
test('missing, duplicate and input-mismatched cases fail pairing',()=>{
  for(const edit of [e=>e.rows.candidate.pop(),e=>e.rows.candidate[1]=e.rows.candidate[0],e=>e.rows.candidate[0].inputHash='different']){
    const e=evidence();edit(e);assert.equal(judgeBattle(e).promotable,false);
  }
});
test('missing metrics and changing the supposedly fixed opponent are rejected',()=>{
  const e=evidence();e.rows.candidate[0].metrics.remainingMargin=null;
  assert.equal(judgeBattle(e).status,'rejected');
  const f=evidence();f.rows.candidate[0].opponentHash='changed';assert.equal(judgeBattle(f).status,'rejected');
});
test('maps sharing a seed do not create additional independent samples',()=>{
  const e=evidence();e.proposal.validationSeeds=e.proposal.validationSeeds.slice(0,4);
  for(const side of ['baseline','candidate'])e.rows[side]=e.rows[side].filter(r=>r.seed<=4);
  assert.equal(judgeBattle(e).status,'insufficient');
});
test('repeated subgroup loss cannot be hidden by better aggregate results',()=>{
  const e=evidence();e.rows.candidate.filter(r=>r.spec.id==='wu-ridges').forEach(r=>r.metrics.remainingMargin=-.4);
  const d=judgeBattle(e);assert.equal(d.status,'rejected');assert.equal(d.findings[0].metric,'remainingMargin');
});

test('one unlucky seed does not veto a broadly better policy',()=>{
  const e=evidence();e.rows.candidate[0].metrics.remainingMargin=-.9;
  assert.equal(judgeBattle(e).status,'improved');
});

test('more casts and faster battles alone never count as better AI',()=>{
  const e=evidence();e.rows.candidate=structuredClone(e.rows.baseline);
  e.rows.candidate.forEach(r=>{r.metrics.supportCasts=100;r.metrics.ticks=1;});
  assert.equal(judgeBattle(e).promotable,false);
});

test('an improvement that erases player arrangement benefits is rejected',()=>{
  const e=evidence();e.rows.candidate.filter(r=>r.spec.kind==='player').forEach(r=>{r.metrics.playerMarginLift=.01;r.metrics.playerMissionLift=0;});
  const d=judgeBattle(e);assert.equal(d.status,'rejected');assert.ok(d.findings.some(f=>f.reason==='player-margin-benefit-eroded'));
});

test('failure to realize a clear troop advantage prevents domain qualification',()=>{
  const e=evidence();e.rows.candidate.filter(r=>r.spec.kind==='advantage').forEach(r=>r.metrics.advantageMarginGain=-.1);
  const d=judgeBattle(e);assert.equal(d.promotable,false);assert.ok(d.reasons.includes('battle-standard-not-established'));
});

async function fixture(t){
  const parent=resolve('.local');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'battle-validation-test-'));
  t.after(async()=>{const rel=relative(parent,resolve(root));assert.ok(rel&&!rel.startsWith('..'));await rm(root,{recursive:true,force:true});});
  const workspace=join(root,'workspace');await mkdir(workspace);
  await writeFile(join(workspace,'battle-ai.mjs'),'export const value = 1;\n');
  await writeFile(join(workspace,'strategic-ai.mjs'),'export const strategy = 1;\n');
  return {root,workspace};
}
test('battle-aware promotion uses the shared recovery journal and preserves foreign writes',async t=>{
  const {root,workspace}=await fixture(t),baseline=await snapshot(workspace,join(root,'baseline'));
  await writeFile(join(workspace,'battle-ai.mjs'),'export const value = 2;\n');
  const candidate=await snapshot(workspace,join(root,'candidate'));await writeFile(join(workspace,'battle-ai.mjs'),'export const value = 1;\n');
  const journal=await promoteFiles({workspace,baseline,candidate,journalPath:join(root,'adopt.json'),allowed:allowedBattlePath});
  assert.equal(journal.status,'adopted');assert.equal((await fingerprint(workspace)).hash,candidate.hash);
  await writeFile(join(workspace,'strategic-ai.mjs'),'export const strategy = 3;\n');
  await assert.rejects(promoteFiles({workspace,baseline,candidate,journalPath:join(root,'reject.json'),allowed:allowedBattlePath}),/Workspace has changed/);
  assert.match(await readFile(join(workspace,'strategic-ai.mjs'),'utf8'),/= 3/);
});
test('battle round deadline includes setup time and cannot start in the future',async t=>{
  const {workspace}=await fixture(t),startedAt=Date.now()-60000;
  const out=join(workspace,'.local','run');const s=await initialize({root:workspace,out,startedAt});
  assert.equal(Date.parse(s.deadline),startedAt+8*3600000);
  await assert.rejects(initialize({root:workspace,out:join(workspace,'.local','future'),startedAt:Date.now()+60000}),/Invalid round start/);
});

test('running judge and shared tool changes are rejected even when protocol values stay the same',async t=>{
  const {root,workspace}=await fixture(t);
  const judge=join(workspace,'scripts/battle-validation/judge.mjs'),shared=join(workspace,'scripts/ai-validation/storage.mjs');
  await mkdir(join(workspace,'scripts/battle-validation'),{recursive:true});
  await mkdir(join(workspace,'scripts/ai-validation'),{recursive:true});
  await writeFile(judge,'export const judge = 1;\n');await writeFile(shared,'export const storage = 1;\n');
  const baseline=await snapshot(workspace,join(root,'frozen'));
  await assertRunnerMatches(baseline,workspace);
  await writeFile(join(workspace,'strategic-ai.mjs'),'export const strategy = 2;\n');
  await assertRunnerMatches(baseline,workspace);
  for(const file of [judge,shared]){
    const before=await readFile(file);await writeFile(file,'export const changed = true;\n');
    await assert.rejects(assertRunnerMatches(baseline,workspace),/frozen toolchain/);
    await writeFile(file,before);
  }
  const extra=join(workspace,'scripts/battle-validation/new-judge.mjs');await writeFile(extra,'export const extra = 1;\n');
  await assert.rejects(assertRunnerMatches(baseline,workspace),/frozen toolchain/);
  await rm(extra);await rm(judge);
  await assert.rejects(assertRunnerMatches(baseline,workspace),/frozen toolchain/);
  await assertRunnerMatches(baseline,baseline.root);
});

test('mixed controller routing changes only the selected side and shares common dependencies',async t=>{
  const {root,workspace}=await fixture(t),candidate=join(root,'candidate');await mkdir(candidate);
  const policy=label=>"import {value} from './shared.mjs';export const COMMAND_TRIGGER_ORDER=['heal'];export function chooseEnemyCommand(){return null;}export function planEnemyArmy(b,side=1){b.sides[side]={label:"+JSON.stringify(label)+",value};}export function rankEnemyReserves(){return [];}";
  await writeFile(join(workspace,'battle-ai.mjs'),policy('baseline'));await writeFile(join(candidate,'battle-ai.mjs'),policy('candidate'));
  await writeFile(join(workspace,'shared.mjs'),"export const value='baseline-engine';");await writeFile(join(candidate,'shared.mjs'),"export const value='wrong-engine';");
  await writeFile(join(workspace,'runner.mjs'),"export {planEnemyArmy} from './battle-ai.mjs';");
  const module=pathToFileURL(resolve('scripts/battle-validation/controllers.mjs')).href;
  const code='import assert from "node:assert/strict";import {installPolicyRouter} from '+JSON.stringify(module)+';const r=await installPolicyRouter('+JSON.stringify({baselineRoot:workspace,candidateRoot:candidate})+');const e=await r.load("runner.mjs");for(const side of [0,1]){r.select(side);const b={sides:[{},{}]};e.planEnemyArmy(b,0);e.planEnemyArmy(b,1);assert.equal(b.sides[side].label,"candidate");assert.equal(b.sides[1-side].label,"baseline");assert.ok(b.sides.every(s=>s.value==="baseline-engine"));}r.close();';
  await promisify(execFile)(process.execPath,['--input-type=module','-e',code],{windowsHide:true});
});

test('baseline routed through the common engine matches ordinary real combat exactly',async()=>{
  const project=resolve('.'),url=file=>JSON.stringify(pathToFileURL(join(project,file)).href);
  const setup='const draft={seed:41029,terrain:"land",mapId:"plain-open",battleKind:"field",limit:120,shieldPercent:0,ownTeam:[{id:"person-99",type:"spear",troops:3000,level:10}],enemyTeam:[{id:"person-99",type:"spear",troops:3000,level:10}]};';
  // The second identity must be a different real officer, even in a routing test.
  const body=setup+'const {OFFICER_DESIGNS:O}=await load("data/design/officers.mjs");draft.enemyTeam[0].id=Object.values(O).find(u=>u.name==="颜良").id;const {generateBattle}=await load("battle-generator.mjs"),E=await load("engine.mjs");const s=generateBattle(draft);E.planBattleCouncilsAI(s.battle,[0,1]);E.lockDeployment(s.battle);while(!s.battle.result)E.stepBattle(s.battle,{aiSides:[0,1],pauseForReinforcements:false});const {createHash}=await import("node:crypto");console.log(createHash("sha256").update(JSON.stringify(s)).digest("hex"));';
  const normal='const load=file=>import('+JSON.stringify(pathToFileURL(project+'/').href)+'+file);'+body;
  const routed='import {installPolicyRouter} from '+url('scripts/battle-validation/controllers.mjs')+';const r=await installPolicyRouter('+JSON.stringify({baselineRoot:project,candidateRoot:project})+');r.select(0);const load=r.load;'+body;
  const run=promisify(execFile);
  const a=await run(process.execPath,['--input-type=module','-e',normal],{windowsHide:true});
  const b=await run(process.execPath,['--input-type=module','-e',routed],{windowsHide:true});
  assert.equal(a.stdout.trim(),b.stdout.trim());
});
