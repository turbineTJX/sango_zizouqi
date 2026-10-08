import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,settleBattle} from '../engine.mjs';
import {battleMerit,battleMeritResult,meritNeeded} from '../progression.mjs';

test('real battle contributions survive reload and settle by actual work exactly once',()=>{
  const s=createScenario('field',817);lockDeployment(s.battle);
  for(let i=0;i<20&&!s.battle.result;i++)stepBattle(s.battle);
  const copy=validateSave(structuredClone(s));
  while(!s.battle.result){stepBattle(s.battle);stepBattle(copy.battle);}
  assert.deepEqual(s.battle,copy.battle);
  const units=s.battle.sides.flatMap(x=>x.units),winner=s.battle.result.winner;
  assert.ok(units.some(u=>u.contribution.damage>0));
  assert.ok(units.some(u=>u.contribution.taken>0));
  assert.ok(new Set(units.map(u=>battleMerit(u,u.side===winner).award)).size>1);
  const battle=s.battle;const report=settleBattle(s);assert.deepEqual(report,settleBattle(copy));
  for(const g of report.growth){const u=units.find(u=>u.id===g.id);assert.equal(g.gained,battleMeritResult(u,battle).net);}
  const settled=structuredClone(s);assert.equal(settleBattle(s),null);assert.deepEqual(s,settled);validateSave(s);
});

test('current saves reject missing or forged contribution counters and old rules',()=>{
  const s=createScenario('field',818);
  for(const mutate of [x=>delete x.battle.sides[0].units[0].contribution,x=>x.battle.sides[0].units[0].contribution.damage=-1,x=>x.battle.sides[0].units[0].contribution.healing=.5,x=>x.rulesVersion--]){
    const copy=structuredClone(s);mutate(copy);assert.throws(()=>validateSave(copy));
  }
});


test('battle awards are reduced and marginal upgrade costs accelerate',()=>{
 assert.equal(battleMerit({contribution:{damage:6000}},false).award,100);
 assert.equal(battleMerit({contribution:{damage:6000}},true).award,125);
 assert.equal(battleMerit({},true).award,0);
 const costs=Array.from({length:9},(_,i)=>meritNeeded(i+1));
 assert.equal(costs.reduce((a,b)=>a+b,0),16500);
 for(let i=2;i<costs.length;i++)assert.ok(costs[i]-costs[i-1]>costs[i-1]-costs[i-2]);
});
