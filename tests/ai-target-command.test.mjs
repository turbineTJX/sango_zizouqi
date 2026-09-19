import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,STRATAGEMS,battleWounded,issueCommand} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {routeTo} from '../tactics.mjs';

const unit=(id,type)=>({id,type,troops:3000,level:5});
const custom=enemyTeam=>createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[unit('cao','spear')],enemyTeam});

for(const defenderSide of [0,1])test(`守军 ${defenderSide} 不追出守区，转向可达的攻城兵器并确定性续战`,t=>{
 const defense=[{...unit('person-46','spear'),tactics:['phalanx','strike','thrust']}],attack=[unit('person-512','archer'),unit('person-439','siege')];
 const fixture={...SCENARIOS.find(s=>s.id==='siege'),id:`ai-target-defense-${defenderSide}`,defending:defenderSide===0,ownName:'目标选择我军',enemyName:'目标选择敌军',ownAdvisor:defenderSide===0?'person-46':'person-512',enemyAdvisor:defenderSide===0?'person-512':'person-46',ownTeam:defenderSide===0?defense:attack,enemyTeam:defenderSide===0?attack:defense,gateHp:60000,limit:480,waves:[]};
 SCENARIOS.push(fixture);t.after(()=>SCENARIOS.splice(SCENARIOS.indexOf(fixture),1));
 const state=createScenario(fixture.id,123),b=state.battle,defender=b.sides[defenderSide].units[0],[near,far]=b.sides[1-defenderSide].units;
 const position=(u,x,y)=>Object.assign(u,defenderSide===1?{x,y}:{x:13-x,y:7-y});
 position(near,7,0);position(far,10,7);position(defender,9,0);
 validateSave(structuredClone(state));lockDeployment(b);
 assert.equal(routeTo(b,defender,near,112,{charging:false}),null);
 assert.ok(routeTo(b,defender,far,112,{charging:false})?.length);
 const resumed=validateSave(structuredClone(state)),start=[defender.x,defender.y];let hitSiege=false;
 for(let i=0;i<12&&!b.result;i++){
  stepBattle(b);stepBattle(resumed.battle);
  assert.ok(defenderSide===1?defender.x>=9:defender.x<=4,'始终遵守守区');
  hitSiege ||= b.effects.some(e=>e.from===defender.id&&e.to===far.id&&e.damage>0);
 }
 assert.notDeepEqual([defender.x,defender.y],start,'不盯着不可达近目标原地停留');assert.ok(hitSiege,'实际攻击可达的兵器');
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
});

test('单队疾行有接敌路线时可选，已接敌或不能移动时不浪费军略',()=>{
 const state=custom([unit('dun','cavalry')]),b=state.battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),'haste');
 assert.match(issueCommand(b,'haste',null,1),/尚未蓄满/);
 b.enemyCommand.commandReady.haste=b.tick+8;assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);b.enemyCommand.commandReady.haste=0;
 b.sides[1].hasteUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);b.sides[1].hasteUntil=0;
 const u=b.sides[1].units[0];u.statuses.stun={until:b.tick+3};assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);delete u.statuses.stun;
 Object.assign(u,{x:4,y:3});Object.assign(b.sides[0].units[0],{x:3,y:3});assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);
});

test('单队休养承认自然伤兵，立即救疗同收益时仍优先即时治疗',()=>{
 const state=custom([unit('jin','spear')]),b=state.battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);
 while(!b.result&&!battleWounded(b.sides[1].units[0]))stepBattle(b);
 assert.ok(battleWounded(b.sides[1].units[0])>0);validateSave(structuredClone(state));
 assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),'regenerate');
 assert.equal(chooseEnemyCommand(b,['heal','regenerate'],STRATAGEMS),'heal');
 assert.match(issueCommand(b,'regenerate',null,1),/尚未蓄满/);
 b.sides[1].recoveryUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);b.sides[1].recoveryUntil=0;
 b.enemyCommand.commandReady.regenerate=b.tick+8;assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);
});

test('单队自然蓄满后自动下达休养，实际救治且保持确定性续战',()=>{
 const state=createScenario('custom-battle',1,20,null,{seed:1,terrain:'land',ownTeam:[unit('person-443','logistics')],enemyTeam:[unit('jin','logistics')]}),b=state.battle;
 lockDeployment(b);let resumed,serial=0,cast=false,healing=0;
 while(!b.result){
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  if(b.enemyCommand.commandSerial!==serial){
   serial=b.enemyCommand.commandSerial;
   if(b.enemyCommand.lastCommand.key==='regenerate'){cast=true;assert.equal(b.enemyCommand.commandProgress,0);}
  }
  healing+=b.effects.filter(e=>e.from==='jin'&&e.label==='救治伤兵'&&e.ongoing).reduce((n,e)=>n+(e.healing||0),0);
  if(b.tick===20)resumed=validateSave(structuredClone(state));
 }
 assert.ok(cast,'无需注入军略槽');assert.ok(healing>0,'不是只记录军略名称');
 assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
});
