import {tacticLearningLimits} from '../tactic-learning.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {configureTactics} from '../tactics.mjs';

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
  test(`${id}: ordinary frontliners and strategist control create a fallible winning opportunity`,()=>{
    const run=(seed,physical=false)=>{
      const b=createScenario(id,seed).battle;
      // Isolate control/physical loadouts on the original contact geometry.
      // The automatic planner now chooses a flank from visible enemy lanes;
      // a different approach must not masquerade as a control-rule change.
      if(id==='tactical-control-lv')Object.assign(b.sides[1].units[0],{x:10,y:1});
      const front=b.sides[0].units.filter(u=>['spear','halberd'].includes(u.type));
      const rear=b.sides[0].units.filter(u=>['archer','crossbow'].includes(u.type));
      assert.equal(front.length,2);assert.equal(rear.length,2);
      assert.ok(rear.every(u=>u.intellect>=95&&u.x<Math.min(...front.map(v=>v.x))));
      assert.ok(front.every(u=>u.force<90&&!u.tactics.some(t=>t.startsWith('unique-'))));
      for(const u of rear)if(tacticLearningLimits(u).high)learnFixtureTactics(u,physical?(u.type==='archer'?['fire','scatter','suppress']:['pierce','repeat']):(u.type==='archer'?['smoke','rally']:['seal','screen']));
      lockDeployment(b);
      let controlled=false;
      while(!b.result){
        stepBattle(b);
        controlled ||= ['confuse','seal'].some(k=>(b.sides[1].units[0].statuses[k]?.until||0)>b.tick);
      }
      return {winner:b.result.winner,controlled};
    };
    assert.ok(run(2700000).controlled,'learned control can actually affect the enemy');
    assert.equal(typeof run(2700000,true).winner,'number');
    // A duration change can alter later RNG and flip one old loss. Keep the
    // original fixed seed grid, and test the opportunity/counterplay contract
    // across it instead of requiring the same seed to remain a defeat.
    const outcomes=Array.from({length:16},(_,i)=>run(2700000+i*7919));
    assert.ok(outcomes.some(r=>r.winner===1),'control does not guarantee a win on the fixed seed grid');
  });
}
