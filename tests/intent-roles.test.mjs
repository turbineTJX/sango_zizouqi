import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,makeOfficer,validateSave,issueCommand} from '../engine.mjs';
import {intentIncome,hasPassive,skillRoute} from '../passives.mjs';
import {configureTactics,unitTactics,roleTacticIds,setStatus,TACTICS_BOOK} from '../tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {world,fixture} from '../scripts/balance-v14-lib.mjs';

function duel(type='crossbow',id='tester',level=1){
 const b=createScenario(type==='ship'?'river':'field',751).battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
 b.sides[0].units=[a];b.sides[1].units=[d];
 for(const [u,name,x] of [[a,id,4],[d,'victim',5]]){
  Object.assign(u,{id:name,level:u===a?level:1,type,x,y:3,hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,intent:0,statuses:{},cooldown:999});
  initializeTacticLearning(u,751);u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
 }
 if(type==='siege')d.x=6;
 lockDeployment(b);return {b,a,d};
}

test('all current troops use their actual basic and surviving-hit income, with no timed regeneration',()=>{
 const expected={spear:[6,7],halberd:[5,8],cavalry:[10,3],archer:[6,3],crossbow:[10,3],siege:[11,2],ram:[11,2],tower:[11,2],ship:[8,5]};
 for(const [type,[attack,hit]]of Object.entries(expected)){
  const {b,a,d}=duel(type);a.cooldown=0;stepBattle(b);assert.equal(a.intent,attack,type);assert.equal(d.intent,hit,type);
  a.cooldown=999;for(let i=0;i<4;i++)stepBattle(b);assert.equal(a.intent,attack);assert.equal(d.intent,hit);
 }
});

test('interdict is fixed from level one and prevents the entire normal hit award, including endurance',()=>{
 for(const level of [1,10]){
  const {b,a,d}=duel('crossbow','liao',level);d.id='dun';d.level=3;d.type='spear';learnFixtureTactics(d,['thrust','phalanx','strike']);d.skillReady={thrust:999,phalanx:999,strike:999};
  a.cooldown=0;stepBattle(b);assert.equal(a.intent,10);assert.equal(d.intent,0);
  assert.equal(b.effects.find(e=>e.from===a.id).intentDenied,7);
  a.cooldown=999;d.cooldown=0;stepBattle(b);assert.equal(d.intent,6,'the target can generate intent through its own attack');
 }
});

test('stifle suppresses every victim once per damage tactic and does not suppress normal attacks',()=>{
 for(const level of [7,8]){
  const {b,a,d}=duel('crossbow','jia',level);primeTactic(a,'ambush');stepBattle(b);
  assert.equal(a.intent,TACTICS_BOOK.ambush.threshold-TACTICS_BOOK.ambush.intentCost);assert.equal(d.intent,0);
  assert.equal(b.effects.filter(e=>e.intentDenied).length,1);
  a.cooldown=0;stepBattle(b);assert.equal(d.intent,3);
 }
 const {b,a,d}=duel('archer','jia',8),other={...structuredClone(d),id:'second',y:4};b.sides[1].units.push(other);
 d.x=7;other.x=7;primeTactic(a,'fire');stepBattle(b);assert.equal(d.intent,0);assert.equal(other.intent,0);assert.equal(a.statuses.attackOrb?.skillId,'fire');assert.equal(b.effects.filter(e=>e.intentDenied).length,0,'持续火伤不产生直接受击战意');
});

test('suppression traits remain with their fixed holders after troop changes',()=>{for(const [id,trait]of [['liao','interdict'],['jia','stifle']]){const u=makeOfficer(id);assert.ok(hasPassive(u,trait));assert.deepEqual(skillRoute({...u,type:'ship',level:10}),skillRoute(u));}assert.ok(!hasPassive(makeOfficer('person-46'),'interdict'));});

test('denial neither drains stored intent nor blocks explicit support or fully shielded attacks',()=>{
 const {b,a,d}=duel('crossbow','liao',8);d.intent=19;a.cooldown=0;stepBattle(b);assert.equal(d.intent,19);
 a.cooldown=0;setStatus(b,d,'shield',10,{amount:1000,source:'test'});stepBattle(b);assert.equal(d.intent,19);assert.ok(!b.effects.some(e=>e.intentDenied));
 const s=createScenario('field'),battle=s.battle;lockDeployment(battle);battle.commandProgress=12000;
 appointBattleTestCommander(battle,'shao','leader');const before=battle.sides[0].units.map(u=>u.intent);assert.equal(issueCommand(battle,'inspire'),null);
 battle.sides[0].units.forEach((u,i)=>assert.equal(u.intent,Math.min(100,before[i]+Math.round(battle.lastCommand.source.strength))));
});

test('legal learned suppression repeatedly denies income and drains intent without disabling cheap defense',()=>{
 const seed=211,state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:[{id:'liao',type:'cavalry',troops:2500,level:8},{id:'person-119',type:'cavalry',troops:2500,level:8}],enemyTeam:[{id:'chu',type:'spear',troops:5000,level:8}]}),b=state.battle;
 const target=b.sides[1].units[0];learnFixtureTactics(target,['phalanx']);lockDeployment(b);let denied=0;
 while(!b.result){stepBattle(b);denied+=b.effects.filter(e=>e.intentDenied).length;}
 assert.ok(denied>=20);
 assert.ok(b.sides[0].units.find(u=>u.id==='person-119').tacticCasts['unique-person-119']>=2);
 assert.ok(target.tacticCasts.phalanx>0);
});

test('current suppression routes and troop incomes survive deterministic battle continuation',()=>{
 const state=createScenario('officer-lab',834,0,['liao','jia','person-119','person-226','person-46','person-447']),b=state.battle;
 lockDeployment(b);let denied=0;for(let i=0;i<30;i++){
  stepBattle(b);denied+=b.effects.filter(e=>e.intentDenied).length;
  if(b.effects.some(e=>e.intentDenied)){
   validateSave(structuredClone(syncFixtureLearning(state)));
   const bad=structuredClone(state);bad.battle.effects.find(e=>e.intentDenied).intentDenied=-1;
   assert.throws(()=>validateSave(bad),/战意压制/);
  }
 }
 assert.ok(denied>0);const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}assert.deepEqual(resumed.battle,b);
});
