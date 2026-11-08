import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {tacticPools} from '../tactic-learning.mjs';
import {TACTICS_BOOK,hasStatus,setStatus,unitTactics,tacticOpening} from '../tactics.mjs';
import {STATUS_DEFINITIONS} from '../data/design/battle-statuses.mjs';

test('field short control and guard taunt occupy the existing fixed intellect slot',()=>{
 assert.notEqual(TACTICS_BOOK.ward.name,STATUS_DEFINITIONS.stun.name);assert.equal(TACTICS_BOOK.ward.range,2);assert.equal(TACTICS_BOOK.ward.maxUses,2);
 assert.deepEqual(TACTICS_BOOK.ward.power.checks,['stun']);assert.notEqual(TACTICS_BOOK.phalanx.name,STATUS_DEFINITIONS.phalanx.name);
 for(const type of ['spear','qingzhou'])assert.ok(['phalanx','ward'].every(id=>tacticPools(type).low.includes(id)));
 assert.ok(['phalanx','taunt','bodyguard'].every(id=>tacticPools('baier').low.includes(id)));assert.equal(TACTICS_BOOK.taunt.range,5);
 assert.equal(TACTICS_BOOK.tremor.name,'震军');assert.equal(TACTICS_BOOK.bombard.control,undefined);
});
for(const side of [0,1]){
 test('ordinary field stun actually casts, provides control protection, costs a use and saves on side '+side,()=>{
  let successes=0;
  for(const seed of [91,92,93,97]){
   const x=currentBattle('ward','spear',{side,seed});readyCurrent(x,'ward');stepBattle(x.b,{aiSides:[]});
   const check=x.b.effects.find(e=>e.from===x.u.id&&e.resolution?.effect==='stun');assert.ok(check);
   const target=x.b.sides[1-side].units.find(u=>u.id===check.to);assert.equal(hasStatus(x.b,target,'stun'),check.resolution.success);
   assert.equal(x.u.tacticCasts.ward,1);assert.ok(!x.b.effects.some(e=>e.from===x.u.id&&e.damage>0));
   if(check.resolution.success){successes++;assert.ok(hasStatus(x.b,target,'resolve'));}
   resumeCurrent(x);
  }
  assert.ok(successes>0);
 });
 test('pure control skips protected or out-of-range targets without spending a use on side '+side,()=>{
  for(const kind of ['protected','far']){
   const x=currentBattle('ward','spear',{side});
   for(const [i,u]of x.b.sides[1-side].units.entries()){setStatus(x.b,u,'root',999);if(kind==='protected')setStatus(x.b,u,'resolve',30);else Object.assign(u,{x:x.u.x+3+i,y:x.u.y});}
   readyCurrent(x,'ward');stepBattle(x.b,{aiSides:[]});assert.equal(x.u.tacticCasts.ward,undefined);resumeCurrent(x);
  }
 });
 test('a real ordinary spear caster supplies existing stun for Guan Yu follow-up on side '+side,()=>{
  const id=name=>OFFICER_CATALOG.find(o=>o.name===name).id;let observed=false;
  for(const seed of [31,37,41,43,47,53,59,61]){
   const own=[{id:id('法正'),type:'spear',troops:3000,level:10},{id:id('关羽'),type:'spear',troops:3000,level:10}],enemy=[{id:id('李典'),type:'spear',troops:5000,level:10}];
   const state=generateBattle({seed,terrain:'land',mapId:'plain-open',battleKind:'field',limit:240,shieldPercent:0,events:[],ownTroopBudget:side?5000:6000,ownTeam:side?enemy:own,enemyTeam:side?own:enemy}),b=state.battle;assert.equal(lockDeployment(b),null);
   const [fa,guan]=b.sides[side].units,target=b.sides[1-side].units[0];
   for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
   Object.assign(fa,{x:3,y:3});Object.assign(guan,{x:4,y:3});Object.assign(target,{x:5,y:3});
   assert.ok(fa.tactics.includes('ward'));fa.intent=100;fa.skillReady.ward=0;stepBattle(b,{aiSides:[]});if(!hasStatus(b,target,'stun'))continue;
   assert.ok(!hasStatus(b,target,'armorBreak')&&!hasStatus(b,target,'confuse')&&!hasStatus(b,target,'slow'));
   assert.equal(tacticOpening(b,TACTICS_BOOK['unique-person-99'],target).setup,true);
   guan.intent=100;guan.skillReady['unique-person-99']=0;stepBattle(b,{aiSides:[]});assert.ok(b.effects.some(e=>e.from===guan.id&&e.openingTrigger==='setup'));
   const saved=validateSave(structuredClone(state));for(let i=0;i<8&&!b.result;i++){stepBattle(b,{aiSides:[]});stepBattle(saved.battle,{aiSides:[]});}assert.deepEqual(state,saved);
   const stale=structuredClone(state);stale.rulesVersion=138;assert.throws(()=>validateSave(stale),/重新开始/);observed=true;break;
  }
  assert.ok(observed,'Must observe a real successful ordinary cast and a real follow-up');
 });
}
