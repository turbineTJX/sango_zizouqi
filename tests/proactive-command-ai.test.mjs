import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,STRATAGEMS} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

test('军略不检查接敌距离，远近均按固定条件施放',()=>{
  const unit=id=>({id,type:'spear',troops:3000,level:5});
  const b=createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[unit('cao')],enemyTeam:[unit('liao')]}).battle;
  lockDeployment(b);
  Object.assign(b.sides[0].units[0],{x:4,y:3});
  const u=b.sides[1].units[0];Object.assign(u,{x:7,y:3});
  assert.equal(chooseEnemyCommand(b,['fortify'],STRATAGEMS),'fortify');
  assert.equal(chooseEnemyCommand(b,['fortify'],STRATAGEMS),'fortify');
  Object.assign(u,{x:12,y:3});
  assert.equal(chooseEnemyCommand(b,['fortify','disrupt'],STRATAGEMS),'disrupt');
  // Movement and weapon range do not affect the command trigger.
  Object.assign(b.sides[0].units[0],{type:'crossbow',x:4,y:3});
  Object.assign(u,{x:7,y:3});
  u.statuses.confuse={until:b.tick+4};
  assert.equal(chooseEnemyCommand(b,['fortify'],STRATAGEMS),'fortify');
});

test('伤兵数量不改变军略固定顺序，进攻冷却时触发救疗',()=>{
  const b=createScenario('field',123).battle;lockDeployment(b);
  const allies=b.sides[1].units.filter(u=>u.status==='active');
  const enemy=b.sides[0].units.find(u=>u.status==='active');
  Object.assign(enemy,{x:7,y:3});
  Object.assign(allies[0],{x:8,y:3});
  for(const u of allies){u.battleDamage=10;u.battleDeserted=0;u.healed=0;u.hp=u.maxHp-10;}
  assert.equal(chooseEnemyCommand(b,['fortify','heal','cleanse'],STRATAGEMS),'heal');
  for(const u of allies){u.battleDamage=u.initial*.7;u.hp=u.initial*.3;}
  assert.equal(chooseEnemyCommand(b,['fortify','heal','cleanse'],STRATAGEMS),'heal');
  b.enemyCommand.commandReady.heal=b.tick+10;
  assert.equal(chooseEnemyCommand(b,['fortify','cleanse','heal'],STRATAGEMS),'fortify');
});

for(const id of ['field','terrain','river'])test(`${id}：玩家全程不下军略，电脑自然充能并主动施放，读档一致`,()=>{
  const state=createScenario(id,123),b=state.battle;lockDeployment(b);
  let resumed,serial=0;const orders=[];
  while(!b.result){
    stepBattle(b);if(resumed)stepBattle(resumed.battle);
    if(b.tick===20)resumed=validateSave(structuredClone(state));
    if(b.enemyCommand.commandSerial!==serial){serial=b.enemyCommand.commandSerial;orders.push(b.enemyCommand.lastCommand.key);}
  }
  assert.equal(b.commandSerial,0,'不模拟玩家点击，也不注入资源或状态');
  assert.ok(orders.some(key=>['fortify','fortify','disrupt','firestorm','inspire','haste','range'].includes(key)),JSON.stringify(orders));
  assert.deepEqual(resumed.battle,b);
});
