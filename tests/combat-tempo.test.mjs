import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {CAMPAIGN} from '../strategic-campaign.mjs';

test('standard field battles inflict meaningful daily losses while leaving time for repeated tactics',()=>{
  for(const seed of [1,17,521200]){
    const {battle:b}=createScenario('field',seed);lockDeployment(b);
    for(let i=0;i<CAMPAIGN.stepsPerDay;i++)stepBattle(b);
    const losses=b.sides.flatMap(s=>s.units).reduce((n,u)=>n+u.battleDamage,0);
    assert.ok(losses>=5000&&losses<=12000,`seed ${seed}: first-day casualties ${losses}`);
    while(!b.result)stepBattle(b);
    assert.equal(b.result.reason,'击溃');
    const days=Math.ceil(b.tick/CAMPAIGN.stepsPerDay);
    assert.ok(days>=5&&days<=10,`seed ${seed}: battle lasted ${days} campaign days`);
    assert.ok(b.sides[0].units.filter(u=>u.skillCasts>=2).length>=5,'frontline officers have repeated casting opportunities');
  }
});
