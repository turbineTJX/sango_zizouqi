import assert from 'node:assert/strict';
import {createScenario} from '../../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,COMMAND_RESOURCE,battleStratagems,activeUnits} from '../../engine.mjs';
import {STRATAGEMS,officerStratagems} from '../../stratagems.mjs';
import {chooseEnemyCommand} from '../../battle-ai.mjs';
import {stratagemAreaContains} from '../../stratagem-area.mjs';
import {setStatus,hasStatus,unitTactics,shieldAmount} from '../../tactics.mjs';
import {tacticUsesLeft,tacticUseLimit} from '../../tactic-tempo.mjs';

export const AI_TEST_SEEDS={development:[11211,11217],validation:[11231,11237]};
export const militaryResource=(b,side)=>side?b.enemyCommand:b;
export function freezeAiProbe(b){
 for(const u of b.sides.flatMap(s=>s.units)){u.retreatAt=null;u.cooldown=10000;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,10000]));setStatus(b,u,'phalanx',10000);}
}
// Mechanism fixtures use real officers, fixed kits, legal troop counts and
// saved states. Only unrelated combat is held still; gauge/AI are never injected.
export function stratagemAiFixture(key,side=1,seed=11231,positive=true){
 const s=STRATAGEMS[key],holder=s.roster.find(id=>officerStratagems(id).length===1)||s.roster[0],entry=id=>({id,type:'spear',troops:4000,level:10,retreatAt:null});
 let ids=[holder,...['chu','dun','yuanxia','he','gao','yan','liao','jin','person-17'].filter(id=>id!==holder)].slice(0,10);
 if(!positive&&s.effect==='forceReserve')ids=ids.slice(0,6);
 let foes=['shao','wen','person-70','person-186','person-516','person-243','person-439','person-433','person-255','person-637'].filter(id=>!ids.includes(id));
 if(!positive&&s.effect==='blockade')foes=foes.slice(0,6);
 if(!positive&&s.effect==='catastrophe')foes=foes.slice(0,1);
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:(side?foes:ids).map(entry),enemyTeam:(side?ids:foes).map(entry),ownTeamRoles:{leader:side?foes[0]:holder,advisor:side?foes[0]:holder},enemyTeamRoles:{leader:side?holder:foes[0],advisor:side?holder:foes[0]}}),b=state.battle;
 assert.equal(lockDeployment(b),null);
 if(!(positive&&s.effect==='tacticRefresh'))freezeAiProbe(b);
 const own=activeUnits(b,side),enemy=activeUnits(b,1-side);
 if(positive&&s.effect==='heal'){own[0].hp-=1000;own[0].battleDamage+=1000;}
 if(positive&&s.effect==='cleanse')assert.notEqual(setStatus(b,own[0],'slow',10000,{sourceId:enemy[0].id,sourceName:enemy[0].name}),false);
 if(!positive){
  if(s.effect==='shield')for(const u of own)setStatus(b,u,'shield',10000,{amount:u.maxHp,source:'ai-condition-probe',label:'护盾'});
  if(['invincible','magicImmunity','ambush','rapidAdvance'].includes(s.effect))for(const u of own)setStatus(b,u,'stasis',10000);
  if(s.effect==='stun')for(const u of enemy)setStatus(b,u,'resolve',10000);
  if(['eightFormation','firestorm'].includes(s.effect))for(const u of enemy)setStatus(b,u,'stasis',10000);
 }
 assert.equal(militaryResource(b,side).commandProgress,0);assert.ok(battleStratagems(b,side).includes(key));validateSave(structuredClone(state));return state;
}
export function assertAiEffect(state,key,side){
 const b=state.battle,s=STRATAGEMS[key],r=militaryResource(b,side),record=r.lastCommand,own=b.sides[side],foe=b.sides[1-side];
 assert.equal(record?.key,key);assert.equal(r.commandSerial,1);assert.equal(r.commandProgress,0);assert.equal(r.commandReady[key],b.tick+s.cooldown);
 const targetSide=s.side===1?foe:own,targets=targetSide.units.filter(u=>u.status==='active'&&u.hp>0&&(!record.target||stratagemAreaContains(s,record.target,u)));
 const status={shield:'shield',cleanse:'resolve',invincible:'commandInvincible',ambush:'stealth',stun:'stun',magicImmunity:'magicImmune',rapidAdvance:'rapidAdvance'}[s.effect];
 let evidence;
 if(status){
  const applied=targets.filter(u=>hasStatus(b,u,status));assert.ok(applied.length,key+' has no actual status');
  assert.ok(applied.some(u=>status==='shield'?u.statuses.shield.layers.some(l=>l.sourceCommand===key):u.statuses[status].sourceCommand===key));
  if(record.target)for(const u of targetSide.units.filter(u=>u.status!=='active'||!stratagemAreaContains(s,record.target,u)))assert.ok(!hasStatus(b,u,status),key+' leaked outside its target area');
  if(s.effect==='cleanse')assert.ok(own.units.every(u=>!hasStatus(b,u,'slow')));
  evidence={affected:applied.length,status,...(s.effect==='shield'?{shield:applied.reduce((n,u)=>n+shieldAmount(b,u),0)}:{})};
 }
 if(s.effect==='heal'){const healed=own.units.reduce((n,u)=>n+u.healed,0);assert.equal(healed,350);evidence={healed};}
 if(s.effect==='firestorm'){const burning=foe.units.filter(u=>hasStatus(b,u,'burn'));assert.ok(burning.length);assert.ok(burning.every(u=>u.statuses.burn.amount>0&&stratagemAreaContains(s,record.target,u)));evidence={affected:burning.length,perTick:burning.reduce((n,u)=>n+u.statuses.burn.amount,0)};}
 if(s.effect==='eightFormation'){assert.equal(b.stratagemZones.length,1);assert.equal(b.stratagemZones[0].key,key);assert.equal(own.stratagemUses[key],1);evidence={zoneUntil:b.stratagemZones[0].until};}
 if(s.effect==='blockade'){assert.ok(foe.blockadeUntil>b.tick);assert.equal(foe.stratagemEffects.blockadeUntil.key,key);evidence={blockedUntil:foe.blockadeUntil};}
 if(s.effect==='forceReserve'){const e=own.stratagemEvents.find(e=>e.key===key);assert.ok(e.units.length);assert.ok(activeUnits(b,side).length>6);assert.ok(e.units.every(id=>own.units.some(u=>u.id===id&&u.status==='active')));evidence={entered:e.units,active:activeUnits(b,side).length};}
 if(s.effect==='tacticRefresh'){const e=own.stratagemEvents.find(e=>e.key===key);assert.ok(e.units.some(r=>Object.keys(r.restored).length));for(const u of own.units.filter(u=>['active','reserve'].includes(u.status)&&u.hp>0))for(const t of unitTactics(u).filter(t=>!t.passive))assert.equal(tacticUsesLeft(u,t),tacticUseLimit(u,t));evidence={restored:e.units.reduce((n,r)=>n+Object.values(r.restored).reduce((a,v)=>a+v,0),0)};}
 if(s.effect==='catastrophe'){const e=own.stratagemEvents.find(e=>e.key===key);assert.equal(e.strikes.length,8);evidence={strikes:8,hits:e.strikes.reduce((n,s)=>n+s.hits.length,0),damage:e.strikes.reduce((n,s)=>n+s.hits.reduce((a,h)=>a+h.damage,0),0)};}
 assert.ok(evidence,key+' lacks a real effect assertion');validateSave(structuredClone(state));return evidence;
}
export function runStratagemAiProbe(state,key,side,{positive=true}={}){
 const b=state.battle,s=STRATAGEMS[key],r=militaryResource(b,side);let before;
 for(let n=0;n<180&&!b.result;n++){
  before=structuredClone(state);stepBattle(b,{aiSides:[side]});
  if(r.commandSerial)break;
  if(!positive&&r.commandProgress===COMMAND_RESOURCE.capacity)break;
 }
 assert.equal(b.result,null,key+' ended before the AI check');
 if(!positive){
  assert.equal(r.commandSerial,0,key+' cast without the required condition');assert.equal(r.commandProgress,COMMAND_RESOURCE.capacity);
  assert.equal(chooseEnemyCommand(b,battleStratagems(b,side),STRATAGEMS,side),null,key+' selected an unusable command');
  const copy=validateSave(structuredClone(state));for(let n=0;n<3;n++){stepBattle(b,{aiSides:[side]});stepBattle(copy.battle,{aiSides:[side]});assert.equal(r.commandSerial,0);assert.equal(r.commandProgress,COMMAND_RESOURCE.capacity);assert.deepEqual(copy.battle,b);}
  return {key,name:s.name,side,seed:state.testScenario.customBattle.seed,condition:false,tick:b.tick,heldGauge:true};
 }
 const evidence=assertAiEffect(state,key,side),tick=b.tick,copy=validateSave(before);stepBattle(copy.battle,{aiSides:[side]});assert.deepEqual(copy.battle,b,'loading before natural charging must reproduce the AI command');
 const after=validateSave(structuredClone(state));for(let n=0;n<6&&!b.result;n++){stepBattle(b,{aiSides:[side]});stepBattle(after.battle,{aiSides:[side]});assert.deepEqual(after.battle,b);}
 if(s.effect==='eightFormation')assert.ok(foeStatuses(b,side,key)>0,'formation must cause real statuses');
 return {key,name:s.name,side,seed:state.testScenario.customBattle.seed,condition:true,tick,source:militaryResource(b,side).lastCommand.source.id,target:militaryResource(b,side).lastCommand.target||null,evidence,resumedBeforeCast:true,resumedAfterCast:true};
}
const foeStatuses=(b,side,key)=>b.sides[1-side].units.reduce((n,u)=>n+Object.values(u.statuses).filter(s=>s.sourceSkillName===STRATAGEMS[key].name).length,0);
