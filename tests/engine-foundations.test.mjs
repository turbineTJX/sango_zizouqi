import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {battleStratagems,chooseArmyAdvisor,lockDeployment,stepBattle,validateSave,unitAttributes} from '../engine.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {canOccupy} from '../battlefield.mjs';
import {formationAura} from '../support-rules.mjs';
import {validLoadout} from '../tactics.mjs';

const unit=(id,type,troops=3000)=>({id,type,troops,level:5});
const make=(ownTeam,enemyTeam,terrain='land',seed=123)=>createScenario('custom-battle',seed,20,null,{seed,terrain,ownTeam,enemyTeam});
const ordinary=[unit('person-46','spear'),unit('person-439','archer'),unit('person-408','crossbow')];

test('自定义战役双方使用相同战略姿态，自动军师补充已有军略',()=>{
 const team=[unit('person-99','cavalry',6000),unit('person-512','crossbow',1500),unit('liao','spear',1500)];
 const s=make(team,ordinary),b=s.battle,reverse=make(ordinary,team);
 for(const [state,i] of [[s,0],[reverse,1]]){
  const army=state.armies[i];
  assert.ok(state.armies.every(a=>a.tactic==='balanced'));assert.ok(state.battle.sides.every(a=>a.tactic==='balanced'));
  assert.equal(army.advisor,'liao');assert.deepEqual(battleStratagems(state.battle,i),['haste','cycle','range']);
 }
 const a=unitAttributes(b.sides[0].units[0],b),z=unitAttributes(reverse.battle.sides[1].units[0],reverse.battle);
 assert.equal(a.attack,z.attack);assert.equal(a.defense,z.defense);
 const snapshot=structuredClone(s.armies[0]);assert.equal(chooseArmyAdvisor(s.armies[0]),'liao');assert.deepEqual(s.armies[0],snapshot);
 const noCommands=make([unit('person-99','cavalry'),unit('person-512','crossbow')],ordinary);
 assert.equal(noCommands.armies[0].advisor,'person-512');assert.deepEqual(battleStratagems(noCommands.battle),[]);
 assert.equal(createScenario('field',123).battle.sides[1].tactic,'aggressive','历史/战略场景的姿态保持原设定');
});

test('非均分兵力改变主辅判断，但不重抽或更换已学战法',()=>{
 for(const team of [[unit('person-396','cavalry',6000),unit('person-646','spear',500),unit('person-242','halberd',500)],[unit('jin','spear',100),unit('person-646','spear',3000),unit('yuanxia','archer',1500)]]){
  const b=make(ordinary,team).battle;for(const u of b.sides[1].units)assert.deepEqual(u.tactics,learnedTacticIds(u));
 }
});

test('辅兵围绕实际主力布阵并覆盖协阵，不凭空改变战意或随机数',()=>{
 const s=make(ordinary,[unit('person-396','cavalry',6000),unit('person-641','spear',500),unit('person-123','logistics',500)]),b=s.battle;
 const own=structuredClone(b.sides[0]),seed=b.seed,core=b.sides[1].units[0],aux=b.sides[1].units[2];
 assert.ok(hexDistance(core,aux)<=1);if(aux.tactics.includes('passage'))assert.equal(formationAura(b,core)?.source.id,aux.id);else assert.equal(formationAura(b,core),null);
 assert.ok(aux.x>=core.x,'辅助不挡在主力前面');
 const snapshot=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,snapshot);
 assert.deepEqual(b.sides[0],own);assert.equal(b.seed,seed);assert.ok(b.sides[1].units.every(u=>u.intent===0));
 validateSave(structuredClone(s));
});

test('骑兵侧翼响应可见枪戟兵力分布，锁定后不偷偷重排',()=>{
 const enemy=[unit('person-396','cavalry',6000),unit('person-646','spear',1500),unit('person-123','logistics',1500)];
 const s=make([unit('jin','spear',3000)],enemy),b=s.battle,foe=b.sides[0].units[0];
 foe.x=4;foe.y=0;planEnemyArmy(b);assert.ok(b.sides[1].units[0].y>=6,'避开上翼枪阵');
 foe.y=7;planEnemyArmy(b);assert.ok(b.sides[1].units[0].y<=1,'避开下翼枪阵');
 const copy=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,copy);
 lockDeployment(b);const locked=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,locked);
});

test('非均分主辅配置跨地形真实战斗：合法行动、施法和确定性续战',()=>{
 for(const terrain of ['land','forest','hill','marsh','river']){
  const enemy=[unit('person-396','cavalry',6000),unit('person-646','spear',1500),unit('person-123','logistics',1500)];
  const s=make(ordinary,enemy,terrain),b=s.battle;lockDeployment(b);let resumed;
  while(!b.result){
   stepBattle(b);if(resumed)stepBattle(resumed.battle);
   const living=b.sides.flatMap(side=>side.units).filter(u=>u.status==='active');
   assert.equal(new Set(living.map(u=>`${u.x},${u.y}`)).size,living.length);
   for(const u of living){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(validLoadout(u,u.tactics));assert.ok(Number.isFinite(u.hp)&&u.hp>0);}
   if(b.tick===20)resumed=validateSave(structuredClone(s));assert.ok(b.tick<=480);
  }
  assert.ok(resumed);assert.deepEqual(resumed.battle,b);validateSave(structuredClone(s));
  assert.ok(b.sides[1].units[0].skillCasts>0,'主力能接敌并自然获得战意施法');
 }
});
