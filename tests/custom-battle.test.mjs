import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {canOccupy} from '../battlefield.mjs';
import {TROOPS} from '../unit-stats.mjs';

test('自由对战：所有兵种、双方配置、实际战斗及确定性存档重试',()=>{
  for(const type of Object.keys(TROOPS)){
    const draft=defaultCustomBattle();draft.terrain=type==='ship'?'river':'land';
    draft.ownTeam=[{id:'jia',type,troops:2000,level:8},{id:'cao',type:'spear',troops:2800,level:4}];
    draft.enemyTeam=[{id:'yu',type,troops:1900,level:6}];
    const state=createScenario('custom-battle',123,20,null,draft),b=state.battle;
    for(const [side,key] of [[0,'ownTeam'],[1,'enemyTeam']]){
      assert.equal(b.sides[side].units.length,draft[key].length);
      for(const [i,u] of b.sides[side].units.entries()){
        const entry=draft[key][i];assert.equal(u.id,entry.id);assert.equal(u.type,entry.type);assert.equal(u.initial,entry.troops);assert.equal(u.level,entry.level);assert.ok(canOccupy(b,u,u.x,u.y));
      }
    }
    assert.equal(state.armies[0].advisor,'cao','军师补充主将郭嘉尚未提供的军略');
    assert.deepEqual(createScenario('custom-battle',state.testScenario.seed,20,null,state.testScenario.customBattle).battle,b);
    lockDeployment(b);for(let i=0;i<12;i++)stepBattle(b);
    const resumed=validateSave(JSON.parse(JSON.stringify(state)));
    while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
    assert.deepEqual(resumed.battle,b);
  }
});
test('自由对战：无效配置被拒绝',()=>{
  for(const mutate of [d=>d.ownTeam=[],d=>d.enemyTeam=Array(7).fill(d.enemyTeam[0]),d=>d.ownTeam.push({...d.ownTeam[0]}),d=>d.enemyTeam[0].id='unknown',d=>d.ownTeam[0].type='unknown',d=>d.ownTeam[0].troops=99999,d=>d.ownTeam[0].level=0,d=>d.seed=-1,d=>d.ownTeam[0].type='ship']){
    const draft=defaultCustomBattle();mutate(draft);assert.throws(()=>validateCustomBattle(draft));
  }
  const state=createScenario('custom-battle');delete state.testScenario.customBattle;assert.throws(()=>validateSave(state));
});
