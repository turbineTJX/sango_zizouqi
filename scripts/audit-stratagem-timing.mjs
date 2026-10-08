import {mkdir,writeFile} from 'node:fs/promises';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,validateSave,battleStratagems,COMMAND_RESOURCE,battleWounded} from '../engine.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {chooseStratagemPoint,stratagemAreaTargets} from '../stratagem-area.mjs';
import {hasStatus} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';

const out='outputs/stratagem-timing-108',seeds={development:[10811,10817],validation:[10831,10847]},rows=[];
await mkdir(out,{recursive:true});
const weaker=[['person-636','spear'],['person-668','archer'],['person-46','spear'],['person-610','archer'],['person-68','halberd'],['person-77','cavalry']];
const stronger=[['liao','cavalry'],['person-291','halberd'],['jin','spear'],['person-567','archer'],['person-99','spear'],['person-119','archer']];
const entry=([id,type])=>({id,type,troops:3000,level:10,retreatAt:null});
function manualOrder(b,side){
 const r=side?b.enemyCommand:b;if(r.commandProgress<COMMAND_RESOURCE.capacity)return null;
 const own=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0),foes=b.sides[1-side].units.filter(u=>u.status==='active'&&u.hp>0),known=battleStratagems(b,side);
 for(const key of ['invincible','heal']){
  if(!known.includes(key)||(r.commandReady[key]||0)>b.tick)continue;const s=STRATAGEMS[key];
  const eligible=own.filter(u=>key==='invincible'?!hasStatus(b,u,'commandInvincible')&&foes.some(e=>e.intent>=55&&hexDistance(u,e)<=3):battleWounded(u)>u.maxHp*.1);
  if(!eligible.length)continue;
  // Observe current wounds, intent and proximity only. No future RNG or search.
  const candidates=eligible.map(u=>({point:{x:u.x,y:u.y},score:stratagemAreaTargets(b,s,{x:u.x,y:u.y},side).reduce((n,a)=>n+(key==='heal'?battleWounded(a):foes.filter(e=>e.intent>=55&&hexDistance(a,e)<=3).length),0)})).sort((a,c)=>c.score-a.score);
  return {key,point:candidates[0].point};
 }
 return null;
}
for(const [group,list] of Object.entries(seeds))for(const seed of list)for(const side of [0,1])for(const controller of ['none','fixed','manual']){
 const roles={leader:'person-636',advisor:'person-668'},enemyRoles={leader:'liao',advisor:'person-567'};
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:(side?stronger:weaker).map(entry),enemyTeam:(side?weaker:stronger).map(entry),ownTeamRoles:side?enemyRoles:roles,enemyTeamRoles:side?roles:enemyRoles,ownTroopBudget:18000});
 const b=state.battle;planEnemyArmy(b,0);planEnemyArmy(b,1);lockDeployment(b);let copy,casts=[];
 while(!b.result){
  const aiSides=controller==='fixed'?[0,1]:[1-side];stepBattle(b,{aiSides,pauseForReinforcements:false});if(copy)stepBattle(copy.battle,{aiSides,pauseForReinforcements:false});
  if(!b.result&&controller==='manual'){const command=manualOrder(b,side);if(command){const error=issueCommand(b,command.key,command.point,side);if(error)throw Error(error);if(copy)issueCommand(copy.battle,command.key,command.point,side);casts.push({tick:b.tick,...command});}}
  if(!copy&&b.tick>=20)copy=validateSave(structuredClone(state));
 }
 if(copy&&JSON.stringify(copy.battle)!==JSON.stringify(b))throw Error('Deterministic replay diverged');validateSave(structuredClone(state));
 const r=side?b.enemyCommand:b,row={group,seed,side,controller,winner:b.result.winner,won:b.result.winner===side,tick:b.tick,casts,serial:r.commandSerial,ownRemaining:b.sides[side].units.reduce((n,u)=>n+u.hp,0),enemyRemaining:b.sides[1-side].units.reduce((n,u)=>n+u.hp,0)};rows.push(row);
 // Preserve every final result, including losses and draws; no selective export.
 await writeFile(out+'/'+group+'-'+seed+'-'+side+'-'+controller+'.json',JSON.stringify(state));
}
const summary=Object.fromEntries(['none','fixed','manual'].map(controller=>{const selected=rows.filter(r=>r.controller===controller);return [controller,{runs:selected.length,wins:selected.filter(r=>r.won).length,meanRemaining:Math.round(selected.reduce((n,r)=>n+r.ownRemaining,0)/selected.length)}];}));
await writeFile(out+'/result.json',JSON.stringify({rules:108,scope:'diagnostic only; equal 18000 soldiers, same level, kits, formations and opponents; compare command timing without stat/resource privilege',seeds,summary,rows},null,2));console.log(JSON.stringify(summary));
