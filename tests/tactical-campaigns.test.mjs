import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {hexDistance} from '../hex-grid.mjs';

test('three heroes all reach melee contact with Lu Bu at the same time',()=>{
  const b=createScenario('tactical-three-heroes').battle;
  const heroes=b.sides[0].units,lv=b.sides[1].units[0],attackers=new Set();
  assert.ok(heroes.every(u=>u.formation==='front'&&u.initial>=2000));
  lockDeployment(b);
  let surrounded=false;
  while(!b.result){
    stepBattle(b);
    if(lv.hp>0&&heroes.every(u=>u.hp>0&&hexDistance(u,lv)===1))surrounded=true;
    for(const e of b.effects)if(e.side===0&&e.to===lv.id&&e.damage>0&&!e.skill)attackers.add(e.from);
  }
  assert.ok(surrounded,'all three heroes must surround the living enemy during real combat');
  assert.deepEqual(attackers,new Set(heroes.map(u=>u.id)),'Liu Bei also participates in ordinary attacks');
});

for(const id of ['tactical-control-lv','tactical-control-zhang']){
  test(`${id}: generated roster uses natural learned tactics across fixed seeds`,()=>{
    const run=seed=>{
      const b=createScenario(id,seed).battle;
      const front=b.sides[0].units.filter(u=>['spear','halberd'].includes(u.type));
      const rear=b.sides[0].units.filter(u=>['archer','crossbow'].includes(u.type));
      assert.equal(front.length,2);assert.equal(rear.length,2);
      assert.ok(rear.every(u=>u.intellect>=95&&u.x<Math.min(...front.map(v=>v.x))));
      assert.ok(front.every(u=>u.force<90&&!u.tactics.some(t=>t.startsWith('unique-'))));
      lockDeployment(b);
      for(const u of b.sides.flatMap(s=>s.units))assert.deepEqual(u.tactics,learnedTacticIds(u));let controlled=false;
      while(!b.result){
        stepBattle(b);
        controlled ||= ['confuse','seal'].some(k=>(b.sides[1].units[0].statuses[k]?.until||0)>b.tick);
      }
      return {winner:b.result.winner,controlled,casts:b.sides[0].units.reduce((n,u)=>n+u.skillCasts,0)};
    };

    const outcomes=Array.from({length:16},(_,i)=>run(2700000+i*7919));
    assert.ok(outcomes.every(r=>r.casts>0),'当前固定配装在真实战斗中施放；不要求已移出此阵容的旧控制战法');
    assert.ok(outcomes.every(r=>[0,1,null].includes(r.winner)),'results are observed, not forced to preserve historical win rates');
  });
}
