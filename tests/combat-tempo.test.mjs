import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {CAMPAIGN} from '../strategic-campaign.mjs';

test('hold-position field battles inflict meaningful daily losses while leaving time for repeated tactics',()=>{
  for(const seed of [1,17,521200]){
    const {battle:b}=createScenario('field',seed);for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;lockDeployment(b);
    for(let i=0;i<CAMPAIGN.stepsPerDay;i++)stepBattle(b);
    const losses=b.sides.flatMap(s=>s.units).reduce((n,u)=>n+u.battleDamage,0);
    assert.ok(losses>=5000&&losses<=12000,`seed ${seed}: first-day casualties ${losses}`);
    while(!b.result)stepBattle(b);
    assert.ok(['击溃','久战收兵'].includes(b.result.reason));
    const days=Math.ceil(b.tick/CAMPAIGN.stepsPerDay);
    assert.ok(days>=5&&days<=10,`seed ${seed}: battle lasted ${days} campaign days`);
    assert.ok(b.sides[0].units.filter(u=>u.skillCasts>=2).length>=5,'frontline officers have repeated casting opportunities');
  }
});
