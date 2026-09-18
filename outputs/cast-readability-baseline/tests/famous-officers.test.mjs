import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMOUS_OFFICERS,famousPassiveId} from '../famous-officers.mjs';
import {makeOfficer,stepBattle,lockDeployment,validateSave,settleBattle} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,availableTactics,unitTactics,tacticTarget,famousTargets,readyTactic,hasStatus,shieldAmount,setStatus} from '../tactics.mjs';
import {hasPassive,passiveDamageMultiplier,passiveAttributes,supportMultiplier} from '../passives.mjs';
import {officerDetailMarkup} from '../officer-roster.mjs';

function fixture(id){
 const state=createScenario('officer-lab',713,20,[id]),b=state.battle,u=b.sides[0].units[0],d=b.sides[1].units[0];
 b.sides[0].units=[u];b.sides[1].units=[d];
 Object.assign(u,{x:4,y:3,level:10,hp:2400,intent:100,cooldown:999,statuses:{},skillReady:{}});
 Object.assign(d,{x:5,y:3,hp:3000,maxHp:3000,intent:100,cooldown:999,statuses:{}});
 const ally={...structuredClone(u),id:'support-fixture',x:3,y:3,hp:900,intent:0};
 b.sides[0].units.push(ally);
 for(const a of [u,d,ally])a.skillReady=Object.fromEntries(unitTactics(a).map(s=>[s.id,999]));
 const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];u.skillReady[s.id]=0;
 lockDeployment(b);return {state,b,u,d,ally,s};
}

test('41 owners have five growth nodes, their exclusive loadout and visible descriptions; others cannot equip them',()=>{
 assert.equal(Object.keys(FAMOUS_OFFICERS).length,41);
 assert.equal(Object.keys(SPECIAL_TACTICS).length,41);
 for(const id of Object.keys(FAMOUS_OFFICERS)){
  const u=makeOfficer(id),special=SPECIAL_TACTICS[id];
  assert.equal(unitTactics(u)[0].id,special);
  assert.equal(unitTactics(u).length,3);
  assert.ok(availableTactics({...u,type:'archer'}).some(s=>s.id===special));
  assert.ok(!availableTactics({id:'ordinary',type:u.type}).some(s=>s.id===special));
  assert.ok(officerDetailMarkup(id).includes(TACTICS_BOOK[special].name));
 }
});

test('every exclusive tactic resolves through the real engine and enters only its own cooldown',()=>{
 for(const id of Object.keys(FAMOUS_OFFICERS)){
  const {b,u,d,ally,s}=fixture(id);
  if(s.effect==='terror')d.x=6;
  if(s.effect==='protect')Object.assign(ally,{x:5,y:4});
  const before=d.hp;
  stepBattle(b);
  assert.equal(u.tacticCasts[s.id],1,id+' should cast');
  assert.equal(u.skillReady[s.id],b.tick+s.cooldown,id+' cooldown');
  assert.ok(b.effects.some(e=>e.from===id&&e.skillId===s.id)||b.effects.some(e=>e.from===id&&e.label===s.name),id+' visible event');
  if(s.mode==='attack')assert.ok(d.hp<before,id+' damage');
  if(s.mode==='support'&&s.shield)assert.ok(shieldAmount(b,ally)>0,id+' support');
  stepBattle(b);assert.equal(u.tacticCasts[s.id],1,id+' cannot repeat');
 }
});

test('area AI selects the larger cluster and includes the anchor despite enemy array order',()=>{
 const {b,u,d,s}=fixture('person-603');
 Object.assign(d,{x:5,y:0});
 const a={...structuredClone(d),id:'cluster-a',x:6,y:3},c={...structuredClone(d),id:'cluster-c',x:6,y:4};
 b.sides[1].units.push(a,c);
 const target=tacticTarget(b,u,s,3);assert.notEqual(target.id,d.id);
 const selected=famousTargets(b,u,s,target);assert.equal(selected[0],target);assert.equal(selected.length,2);
 assert.ok(selected.every(t=>t.id!==d.id));
 stepBattle(b);assert.equal(d.hp,3000);assert.ok(a.hp<3000&&c.hp<3000);
});

test('multi-hit and multi-target exclusive attacks do not charge the caster',()=>{
 for(const id of ['person-390','person-603']){
  const {b,u,d,s}=fixture(id);u.level=1;u.intent=s.threshold;
  b.sides[1].units.push({...structuredClone(d),id:'second-target',x:5,y:4});
  stepBattle(b);assert.equal(u.intent,Math.min(100,s.threshold));
 }
});

test('support AI avoids idle shields, prioritizes cleansing, and skips a useless high-priority slot',()=>{
 const {b,u,d,ally,s}=fixture('yu');
 u.hp=ally.hp=3000;d.x=12;
 assert.equal(tacticTarget(b,u,s,3),null);
 setStatus(b,ally,'seal',4);
 assert.equal(tacticTarget(b,u,s,3),ally);
 stepBattle(b);assert.ok(!hasStatus(b,ally,'seal'));assert.ok(hasStatus(b,ally,'resolve'));
 const q=fixture('person-636');q.u.hp=q.ally.hp=3000;q.ally.intent=100;q.d.x=8;
 q.u.type='crossbow';q.u.tactics=[q.s.id,'seal','pierce'];q.u.skillReady={};
 assert.equal(readyTactic(q.b,q.u,4).skill.id,'seal');
});

test('exclusive control respects resolve and discipline; deaths do not acquire new statuses',()=>{
 const x=fixture('person-433');setStatus(x.b,x.d,'resolve',5);
 stepBattle(x.b);assert.ok(!hasStatus(x.b,x.d,'stun'));assert.ok(x.d.hp<3000);
 const y=fixture('person-425');y.d.politics=100;stepBattle(y.b);
 assert.ok(hasStatus(y.b,y.d,'confuse'));assert.ok(y.d.statuses.confuse.until-y.b.tick<=4);
 const z=fixture('person-99');z.d.hp=1;stepBattle(z.b);
 assert.equal(z.d.hp,0);assert.ok(!z.d.statuses.armorBreak);
});

test('personal passives unlock at ten and their conditional bonuses expire or fail correctly',()=>{
 const x=fixture('person-99');x.u.hp=3000;
 x.u.level=9;assert.ok(!hasPassive(x.u,famousPassiveId(x.u.id)));
 const without=passiveDamageMultiplier(x.b,x.u,x.d,'force');
 x.u.level=10;assert.ok(passiveDamageMultiplier(x.b,x.u,x.d,'force')>without);
 x.u.hp=1000;assert.equal(passiveDamageMultiplier(x.b,x.u,x.d,'force'),without);
 const z=fixture('person-246');const plain=passiveDamageMultiplier(z.b,z.u,z.d,'intellect');
 setStatus(z.b,z.d,'burn',3,{amount:10,sourceId:z.u.id});assert.ok(passiveDamageMultiplier(z.b,z.u,z.d,'intellect')>plain);
 z.b.tick=z.d.statuses.burn.until;assert.equal(passiveDamageMultiplier(z.b,z.u,z.d,'intellect'),plain);
 const a=fixture('person-396');a.u.hp=3000;assert.ok(passiveAttributes(a.b,a.u).defense);a.u.hp=1000;assert.equal(passiveAttributes(a.b,a.u).defense,undefined);
 const c=fixture('person-636');assert.ok(supportMultiplier(c.u,c.ally,'shield')>supportMultiplier(c.u,c.u,'shield'));
});

test('burn stacks retain the strongest snapshot, refresh duration, and cap at three',()=>{
 const {b,d}=fixture('person-246');
 setStatus(b,d,'burn',3,{amount:40,sourceId:'strong'});assert.equal(d.statuses.burn.stacks,1);
 setStatus(b,d,'burn',8,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.amount,80);assert.equal(d.statuses.burn.sourceId,'strong');assert.equal(d.statuses.burn.until,b.tick+9);
 setStatus(b,d,'burn',5,{amount:45,sourceId:'stronger'});assert.equal(d.statuses.burn.sourceId,'stronger');assert.equal(d.statuses.burn.amount,135);setStatus(b,d,'burn',6,{amount:10,sourceId:'weak'});assert.equal(d.statuses.burn.amount,135);
 b.tick=d.statuses.burn.until;setStatus(b,d,'burn',3,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.sourceId,'weak');
});

test('self-cost bypasses shields, preserves one survivor and updates the casualty ledger without extra intent',()=>{
 for(const id of ['person-164','person-494']){
  const {b,u,s}=fixture(id);u.level=1;u.intent=s.threshold;
  u.initial=u.hp;u.battleDamage=0;u.healed=0;
  setStatus(b,u,'shield',9,{amount:500,source:'self-test'});
  const before=u.hp;stepBattle(b);
  assert.equal(before-u.hp,Math.floor(before*s.selfCost));assert.equal(u.battleDamage,before-u.hp);
  assert.equal(shieldAmount(b,u),500);assert.equal(u.intent,s.threshold);
  const low=fixture(id);low.u.hp=1;low.u.initial=1;low.u.battleDamage=0;low.u.healed=0;
  stepBattle(low.b);assert.equal(low.u.hp,1);assert.equal(low.u.battleDamage,0);
 }
});

test('new exclusive effects resume deterministically and settle with conserved troops for all 41 officers',()=>{
 const ids=Object.keys(FAMOUS_OFFICERS);
 for(let i=0;i<ids.length;i+=6){
  const state=createScenario('officer-lab',81+i,20,ids.slice(i,i+6));
  lockDeployment(state.battle);for(let n=0;n<50&&!state.battle.result;n++)stepBattle(state.battle);
  const saved=validateSave(structuredClone(state));
  while(!state.battle.result){stepBattle(state.battle);stepBattle(saved.battle);}
  assert.deepEqual(saved.battle,state.battle);
  const report=settleBattle(state);validateSave(state);
  for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);
 }
});
