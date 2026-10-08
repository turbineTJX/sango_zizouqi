import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,STRATAGEMS} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

for(const side of [0,1])test('镇静只检查有无可清除状态，不比较严重度：阵营'+side,()=>{
  const b=createScenario('field').battle;lockDeployment(b);
  const allies=b.sides[side].units.filter(u=>u.status==='active');
  const resource=side===0?b:b.enemyCommand;
  const choose=()=>chooseEnemyCommand(b,['cleanse','fortify'],STRATAGEMS,side);
  assert.equal(choose(),'fortify');
  assert.equal(chooseEnemyCommand(b,['cleanse'],STRATAGEMS,side),null);
  for(const status of [{despair:{until:b.tick+1}},{confuse:{until:b.tick+6}},{intentSuppression:{until:b.tick+6,fraction:.1}},{intentSuppression:{until:b.tick+6,fraction:.8}}]){
    allies[0].statuses=status;
    assert.equal(choose(),'cleanse','固定顺序不因状态轻重改变');
    assert.equal(chooseEnemyCommand(b,['cleanse'],STRATAGEMS,side),'cleanse','有可清除状态即满足条件');
  }
  resource.commandReady.fortify=b.tick+10;
  assert.equal(choose(),'cleanse','前项冷却则检查后项');
  resource.commandReady.cleanse=b.tick+10;
  assert.equal(choose(),null);
});
