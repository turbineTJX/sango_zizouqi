import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,configureUnitTactics,configureBattleIntent,battleIntent,deployUnit,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {validLoadout,hasStatus,SPECIAL_TACTICS,TACTICS_BOOK} from '../tactics.mjs';
import {canOccupy} from '../battlefield.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {unit,archetypes,opponents,setupPlayer,playerOrder} from './custom-playability-lib.mjs';

export const TRAIN_SEEDS=[62000003,62104732,62209461,62314190];
export const VALIDATION_SEEDS=Array.from({length:16},(_,i)=>73000009+i*104729);
export const ALLOCATIONS={equal:[1500,1500,1500,1500,1500,1500],core:[6000,600,600,600,600,600],dual:[3500,3500,500,500,500,500],thin:[4116,2941,1765,60,59,59]};
export const ROUTES=archetypes.map(a=>({...a,team:a.team.map((u,i)=>({...u,type:a.id==='mixed'&&i===0?'cavalry':u.type}))}));
export const ENEMIES=opponents.slice(0,2);
export const HEROES=[['person-661','cavalry','valor'],['person-396','cavalry','valor'],['person-99','cavalry','valor'],['person-433','spear','thrust'],['person-290','crossbow','seal'],['person-246','archer','smoke']];
const kits={cavalry:['gallop','rush'],spear:['phalanx','strike'],crossbow:['screen','ambush'],archer:['wildfire','rally']};

export function heroCase(id,type,basic,level,mode){
 const support=['crossbow','archer'].includes(type),who=mode==='ordinary'?(support?'person-512':'person-457'):id;
 const ownTeam=support?[unit('person-396','cavalry',6000,level),unit('person-646','spear',1500,level),unit(who,type,1500,level)]:[unit(who,type,6000,level),unit('person-646','spear',1500,level),unit('person-123','logistics',1500,level)];
 return {draft:{terrain:'land',ownTeam,enemyTeam:[unit('jin','spear',3000,level),unit('yuanxia','archer',3000,level),unit('person-610','crossbow',3000,level)]},options:{controller:'rule',hero:who,setup(state){
  const b=state.battle;
  if(mode!=='recommended')assert.equal(configureUnitTactics(state,who,[mode==='full'?SPECIAL_TACTICS[id]:basic,...kits[type]]),null);
  // Identical legal positions for all three comparisons, including the replacement.
  const cells=support?[[4,2],[4,4],[3,3]]:[[4,3],[4,4],[3,3]];
  b.sides[0].units.forEach((u,i)=>assert.equal(deployUnit(b,u.id,...cells[i]),null));
 }}};
}

export function playerCase(route,enemy,allocation='equal',plan='default',ablation=null){
 const ownTeam=route.team.map((u,i)=>({...u,troops:ALLOCATIONS[allocation][i]}));
 if(ablation==='allocation')ownTeam.forEach(u=>u.troops=1500);
 // Same officer, slot, soldiers and level; give the auxiliary a frontline job.
 // This measures the support assignment, not the value of an absent/free unit.
 if(ablation==='support-role')ownTeam.find(u=>u.type==='logistics').type='spear';
 return {draft:{terrain:'land',ownTeam,enemyTeam:enemy.team.map(u=>({...u,troops:1500}))},options:{controller:ablation==='commands'?'off':'player',hero:ownTeam[0].id,setup(state){
  const before=structuredClone(state.battle.sides[0].units),intent=battleIntent(state.battle);
  setupPlayer(state,plan);
  if(ablation==='tactics')for(const u of before)assert.equal(configureUnitTactics(state,u.id,u.tactics),null);
  if(ablation==='deployment')for(const u of before)assert.equal(deployUnit(state.battle,u.id,u.x,u.y),null);
  if(ablation==='intent')assert.equal(configureBattleIntent(state.battle,intent),null);
 }}};
}

export function runCase({draft,options},seed,{resume=false}={}){
 for(const team of [draft.ownTeam,draft.enemyTeam])for(const u of team)assert.ok(u.troops<=troopCapacity({...OFFICER_BY_ID[u.id],level:u.level}),`${u.id} exceeds capacity`);
 assert.equal(draft.ownTeam.reduce((n,u)=>n+u.troops,0),draft.enemyTeam.reduce((n,u)=>n+u.troops,0));
 const state=createScenario('custom-battle',seed,20,null,{...draft,seed}),b=state.battle;
 options.setup?.(state);
 const opening=structuredClone({teams:b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,level:u.level,troops:u.initial,x:u.x,y:u.y,tactics:u.tactics}))),intents:[battleIntent(b,0),battleIntent(b,1)],commanders:b.sides.map(s=>s.commanders)});
 assert.equal(lockDeployment(b),null);
 const metrics=Object.fromEntries(b.sides.flatMap(s=>s.units).map(u=>[u.id,{damage:0,healing:0,absorbed:0,controlSteps:0,sealSteps:0,shakenSteps:0,hits:{},skillDamage:{},firstCasts:{},activeSteps:0,firstHit:null,defeatedAt:null}]));
 const commands=[],kills=[];let saved=null,previousSerial=0;
 const command=b=>{
  if(b.result||options.controller==='off'||b.commandProgress<COMMAND_RESOURCE.capacity)return null;
  return options.controller==='rule'?chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0):playerOrder(b);
 };
 while(!b.result){
  const key=command(b);
  if(saved)assert.equal(command(saved.battle),key);
  if(key){assert.equal(issueCommand(b,key),null);if(saved)assert.equal(issueCommand(saved.battle,key),null);commands.push({side:0,tick:b.tick,key});}
  stepBattle(b);if(saved)stepBattle(saved.battle);
  assert.ok(b.tick<=480);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active){
   assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp>0&&u.hp<=u.maxHp);assert.ok(validLoadout(u,u.tactics));
   metrics[u.id].activeSteps++;
   for(const k of ['stun','confuse','seal','shaken'])if(hasStatus(b,u,k)){
    const source=metrics[u.statuses[k].sourceId];
    if(source)source[k==='seal'?'sealSteps':k==='shaken'?'shakenSteps':'controlSteps']++;
   }
  }
  for(const e of b.effects){
   if(e.phase!=='impact'||e.combo)continue;
   const m=metrics[e.from];if(!m)continue;
   m.damage+=e.damage||0;m.healing+=e.healing||0;m.absorbed+=e.shieldAbsorbed||0;
   if(e.damage){
    m.firstHit??=b.tick;
    const skill=e.skill&&!e.ongoing?b.sides.flatMap(s=>s.units).find(u=>u.id===e.from)?.tactics.find(id=>TACTICS_BOOK[id].name===e.label):null;
    if(skill){m.hits[skill]=(m.hits[skill]||0)+1;m.skillDamage[skill]=(m.skillDamage[skill]||0)+e.damage;}
   }
  }
  for(const u of b.sides.flatMap(s=>s.units)){
   const m=metrics[u.id];for(const [id,n] of Object.entries(u.tacticCasts))if(n)m.firstCasts[id]??=b.tick;
   if(u.hp<=0&&m.defeatedAt===null){m.defeatedAt=b.tick;kills.push({tick:b.tick,id:u.id,side:u.side});}
  }
  if(b.enemyCommand.commandSerial!==previousSerial){commands.push({side:1,...b.enemyCommand.lastCommand});previousSerial=b.enemyCommand.commandSerial;}
  if(resume&&b.tick===20)saved=validateSave(structuredClone(state));
 }
 if(saved)assert.deepEqual(saved.battle,b);validateSave(structuredClone(state));
 return {seed,opening,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,commands,kills,remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)/s.units.reduce((n,u)=>n+u.initial,0)),coreAlive:b.sides[0].units.find(u=>u.id===options.hero)?.hp>0,units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,name:u.name,type:u.type,side:u.side,hp:u.hp,initial:u.initial,damageTaken:u.battleDamage,healed:u.healed,casts:u.tacticCasts,...metrics[u.id]}))};
}
const mean=xs=>+(xs.reduce((a,b)=>a+b,0)/Math.max(xs.length,1)).toFixed(4);
export function summarize(runs){
 const own=r=>r.units.filter(u=>u.side===0);
 return {n:runs.length,wins:runs.filter(r=>r.winner===0).length,timeout:runs.filter(r=>r.reason==='久战收兵').length,ticks:mean(runs.map(r=>r.ticks)),remaining:mean(runs.map(r=>r.remaining[0])),enemyRemaining:mean(runs.map(r=>r.remaining[1])),coreAlive:runs.filter(r=>r.coreAlive).length,damage:mean(runs.map(r=>own(r).reduce((n,u)=>n+u.damage,0))),healing:mean(runs.map(r=>own(r).reduce((n,u)=>n+u.healing,0))),sealSteps:mean(runs.map(r=>own(r).reduce((n,u)=>n+u.sealSteps,0))),shakenSteps:mean(runs.map(r=>own(r).reduce((n,u)=>n+u.shakenSteps,0)))};
}
