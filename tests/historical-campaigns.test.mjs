import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORICAL_CAMPAIGNS} from '../historical-campaigns.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,battleStratagems,STRATAGEMS,validateSave,settleBattle} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {canOccupy} from '../battlefield.mjs';

for(const config of HISTORICAL_CAMPAIGNS)test(`${config.name}: historical roster, real command accumulation and saved replay`,()=>{
  const state=createScenario(config.id),b=state.battle;
  assert.equal(b.terrain,config.terrain);
  for(const [side,entries] of [[0,config.ownTeam],[1,config.enemyTeam]]){
    assert.deepEqual(new Set(b.sides[side].units.map(u=>u.id)),new Set(entries.map(u=>u.id)));
    for(const u of b.sides[side].units){assert.equal(u.type,entries.find(e=>e.id===u.id).type);assert.ok(canOccupy(b,u,u.x,u.y));}
  }
  assert.ok(battleStratagems(b).length>=3,'every playable commander offers decisions');
  assert.equal(b.commandProgress,0);
  assert.ok(issueCommand(b,battleStratagems(b)[0]),'commands must not bypass deployment or resource costs');
  lockDeployment(b);
  for(let i=0;i<35;i++)stepBattle(b);
  const resumed=validateSave(JSON.parse(JSON.stringify(state)));
  let orders=0;
  while(!b.result){
    if(b.commandProgress>=12000){
      // Choose legal player orders from visible combat data; never inject intent or resources.
      const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
      if(key){assert.equal(issueCommand(b,key),null);assert.equal(issueCommand(resumed.battle,key),null);orders++;}
    }
    stepBattle(b);stepBattle(resumed.battle);
  }
  assert.ok(orders>0);
  assert.deepEqual(resumed.battle,b);
  assert.equal(b.result.winner,0,'default scenario must be winnable with real player orders');
  const report=settleBattle(state);
  if(config.defending){assert.equal(report.gate.side,0);assert.ok(report.gate.remaining>0);}
  validateSave(JSON.parse(JSON.stringify(state)));
});

test('introductory Guandu is completable without a player command; Yiling uses the Shu Zhang Nan',()=>{
  const b=createScenario('history-guandu').battle;lockDeployment(b);
  while(!b.result)stepBattle(b);
  assert.equal(b.result.winner,0);
  const yiling=createScenario('history-yiling').battle;
  assert.ok(yiling.sides[1].units.some(u=>u.id==='person-430'));
  assert.ok(!yiling.sides[1].units.some(u=>u.id==='person-429'));
});
