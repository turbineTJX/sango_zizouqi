import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {TACTICS_BOOK,unitTactics,readyTactic,supportUtility} from '../tactics.mjs';
import {tacticUsesLeft,tacticUseLimit,useRecoveryTargets} from '../tactic-tempo.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {STRATAGEMS} from '../stratagems.mjs';

const unit=(id,type,troops=3000)=>({id,type,troops,level:8});
function scene(){return createScenario('custom-battle',440211,20,null,{seed:440211,terrain:'land',ownTeam:[unit('person-290','crossbow'),unit('person-255','halberd',1500),unit('person-368','spear',4500),unit('liao','cavalry')],enemyTeam:[unit('shao','spear'),unit('yan','cavalry'),unit('tian','archer'),unit('wen','halberd')],ownTeamRoles:{leader:'person-290',advisor:'person-255'}});}

test('limited stock covers every learned tier and only one authored burst spends intent',()=>{
 const costs=Object.values(TACTICS_BOOK).filter(s=>s.intentCost>0);
 assert.deepEqual(costs.map(s=>s.id),['unique-person-661']);
 for(const s of Object.values(TACTICS_BOOK)){
  assert.ok(s.passive?s.maxUses===0:s.maxUses>=1&&s.maxUses<=2);
  if(!s.special&&!s.passive)assert.equal(s.maxUses,s.learningTier==='low'?2:1);
  assert.equal(useRecoveryTargets({tacticCasts:{[s.id]:1}},[s]).length,s.passive||s.special||s.useEffect?0:1);
 }
});

test('real combat consumes finite stock, grants authored uses, preserves cooldown and resumes exactly',()=>{
 const state=scene(),b=state.battle;lockDeployment(b);
 let copy,expanded=0,restored=0,exhausted=0,ordinary=0;
 while(!b.result){
  const before=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,structuredClone(u)]));
  stepBattle(b);if(copy)stepBattle(copy.battle);
  for(const u of b.sides.flatMap(s=>s.units)){
   const old=before.get(u.id);
   for(const s of unitTactics(u)){
    assert.ok(tacticUsesLeft(u,s)<=tacticUseLimit(u,s));
    assert.ok((u.tacticCasts[s.id]||0)<=tacticUseLimit(u,s)+(u.tacticRestored[s.id]||0));
    const bonus=(u.tacticUseBonus[s.id]||0)-(old.tacticUseBonus[s.id]||0),refund=(u.tacticRestored[s.id]||0)-(old.tacticRestored[s.id]||0);
    if(bonus||refund){
     assert.ok(!s.special);
     assert.ok(!s.useEffect&&!s.passive);
     if((u.tacticCasts[s.id]||0)===(old.tacticCasts[s.id]||0))assert.ok((u.skillReady[s.id]||0)<=(old.skillReady[s.id]||0));
     expanded+=bonus;restored+=refund;
    }
    if(!s.passive&&tacticUsesLeft(u,s)===0){exhausted++;assert.notEqual(readyTactic(b,u,20)?.skill.id,s.id);}
   }
  }
  for(const e of b.effects)if(e.intentPayment?.cost===0){assert.equal(e.intentPayment.before,e.intentPayment.after);ordinary++;}
  if(!copy&&expanded&&restored)copy=validateSave(structuredClone(state));
 }
 assert.ok(expanded>0&&restored>0&&exhausted>0&&ordinary>0);
 assert.ok(copy);assert.deepEqual(copy.battle,b);
 const invalid=structuredClone(state);invalid.battle.sides[0].units[0].tacticUseBonus['unique-person-290']=1;
 assert.throws(()=>validateSave(invalid),/次数/);
 const fresh=scene();assert.ok(fresh.battle.sides.flatMap(s=>s.units).every(u=>Object.keys(u.tacticCasts).length===0&&Object.keys(u.tacticRestored).length===0));
});

test('army restoration is useful, once per battle, does not reset cooldown or restore specials',()=>{
 const state=scene(),b=state.battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['zhuge-eight'],STRATAGEMS,0),null);
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
 assert.equal(b.result,null);
 const before=structuredClone(b.sides[0].units);
 assert.equal(issueCommand(b,'zhuge-eight'),null);
 for(const u of b.sides[0].units){
  const old=before.find(v=>v.id===u.id);
  assert.deepEqual(u.skillReady,old.skillReady);
  assert.equal(u.tacticRecoveryUntil,old.tacticRecoveryUntil);
  for(const s of unitTactics(u))assert.equal(tacticUsesLeft(u,s),tacticUsesLeft(old,s)+(u.status==='active'&&useRecoveryTargets(old,[s]).length?1:0));
 }
 const copy=validateSave(structuredClone(state));
 while(!b.result){stepBattle(b);stepBattle(copy.battle);}
 assert.deepEqual(b,copy.battle);
 assert.equal(b.sides[0].useRecoveryCommands['zhuge-eight'],1);
 assert.equal(chooseEnemyCommand(b,['zhuge-eight'],STRATAGEMS,0),null);
});

test('recovery supports do not cast on full stock, themselves, or each other to form a loop',()=>{
 const b=scene().battle;lockDeployment(b);
 for(const u of b.sides[0].units)for(const s of unitTactics(u).filter(s=>s.useEffect)){
  for(const target of b.sides[0].units)assert.equal(supportUtility(b,u,target,s),0);
  assert.equal(useRecoveryTargets(u,[s]).length,0);
 }
});

