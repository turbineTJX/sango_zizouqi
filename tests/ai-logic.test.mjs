import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,issueCommand} from '../engine.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {validLoadout,routeTo} from '../tactics.mjs';
import {classicCases,unit} from '../scripts/custom-playability-lib.mjs';

const make=enemyTeam=>createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[unit('person-646','spear')],enemyTeam});

test('水战攻击舰船不会因无收益策应停手，实际行动与存读档一致',()=>{
 const c=classicCases.find(c=>c.id==='fleet'),seed=33104730;
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'river',ownTeam:c.z,enemyTeam:c.a}),b=state.battle;
 lockDeployment(b);let resumed,still=0,maxStill=0,damage=0;
 while(!b.result){
  if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key){assert.equal(issueCommand(b,key),null);if(resumed)assert.equal(issueCommand(resumed.battle,key),null);}}
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  const u=b.sides[1].units.find(u=>u.id==='person-246');
  still=u.status==='active'&&u.action==='策应队友'?still+1:0;maxStill=Math.max(maxStill,still);
  damage+=b.effects.filter(e=>e.from===u.id&&e.damage>0).reduce((n,e)=>n+e.damage,0);
  if(b.tick===20)resumed=validateSave(structuredClone(state));
 }
 assert.equal(maxStill,0,'没有支援可以施放时，不原地等候');assert.ok(damage>0);
 assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
});

test('单人和远程阵容仍携带已学战法，AI不会替换学习结果',()=>{
 const solo=make([unit('person-512','archer')]);
 assert.deepEqual(solo.battle.sides[1].units[0].tactics,learnedTacticIds(solo.battle.sides[1].units[0]));
 const ranged=make([unit('yuanxia','archer'),unit('he','crossbow'),unit('person-123','logistics')]);
 const aux=ranged.battle.sides[1].units[2];
 assert.deepEqual(aux.tactics,learnedTacticIds(aux));
 for(const state of [solo,ranged]){
  const b=state.battle,copy=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,copy);
  assert.ok(b.sides[1].units.every(u=>validLoadout(u,u.tactics)));validateSave(structuredClone(state));
 }
});

test('预备队状态和开场满血不改变所学战法',()=>{
 const s=make([unit('person-512','archer'),unit('person-123','logistics'),unit('person-46','spear')]),b=s.battle;
 // Planner boundary: an alive reserve is a future recipient, regardless of arrival time.
 const reserve=b.sides[1].units[2];Object.assign(reserve,{status:'reserve',x:-1,y:-1,arrivalTick:100});
 planEnemyArmy(b);
 for(const u of b.sides[1].units)assert.deepEqual(u.tactics,learnedTacticIds(u));
});

test('单舰对陆军不会把无友舰的接舷替换成无敌舰的艨冲',()=>{
 const state=createScenario('custom-battle',123,20,null,{seed:123,terrain:'river',ownTeam:[unit('person-646','spear')],enemyTeam:[unit('person-512','ship')]});
 const u=state.battle.sides[1].units[0];
 assert.deepEqual(u.tactics,learnedTacticIds(u));
 assert.ok(validLoadout(u,u.tactics));validateSave(structuredClone(state));
});

test('支援路径允许在接敌格施法，但不允许穿越有效拦截线',()=>{
 const b=make([unit('person-46','spear'),unit('person-123','logistics')]).battle;
 const [u,ally]=b.sides[1].units,e=b.sides[0].units[0];
 // Geometric boundary only: no combat resources or casts are injected.
 Object.assign(u,{x:5,y:3});Object.assign(ally,{x:8,y:3});Object.assign(e,{x:7,y:4});
 const approach=routeTo(b,u,ally,1,{range:2,charging:false,requireStrike:false});
 assert.deepEqual(approach,[{x:6,y:3}],'可走到接敌格，并在这里施放两格支援');
 Object.assign(u,{x:6,y:3});Object.assign(ally,{x:10,y:3});
 assert.equal(routeTo(b,u,ally,10,{range:2,charging:false,requireStrike:false}),null,'接敌后不能穿过拦截继续走向远方队友');
});

test('单队鼓舞有充分战意收益时可选；满战意、冷却和更优军略仍受约束',()=>{
 const b=make([unit('cao','spear')]).battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['inspire'],STRATAGEMS),'inspire');
 const u=b.sides[1].units[0];u.intent=100;assert.equal(chooseEnemyCommand(b,['inspire'],STRATAGEMS),null);
 u.intent=95;assert.equal(chooseEnemyCommand(b,['inspire'],STRATAGEMS),null,'不为极少战意浪费军略');
 u.intent=0;b.enemyCommand.commandReady.inspire=b.tick+8;assert.equal(chooseEnemyCommand(b,['inspire'],STRATAGEMS),null);
 b.enemyCommand.commandReady.inspire=0;u.statuses.stun={until:b.tick+3};
 assert.equal(chooseEnemyCommand(b,['inspire','cleanse'],STRATAGEMS),'cleanse');
 assert.match(issueCommand(b,'inspire',null,1),/尚未蓄满/,'评分改动不能绕过资源门槛');
});
