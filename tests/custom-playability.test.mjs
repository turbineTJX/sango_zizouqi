import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {validateCustomBattle} from '../custom-battle.mjs';
import {archetypes,opponents,allocations,playerTeam,setupRulePlayer,fight} from '../scripts/custom-playability-lib.mjs';

test('审计配兵保持六队同级总兵力，遵守武将带兵上限',()=>{
 for(const a of archetypes)for(const o of opponents)for(const allocation of allocations){
  const ownTeam=playerTeam(a,allocation,o);
  assert.equal(ownTeam.length,6);assert.equal(ownTeam.reduce((n,u)=>n+u.troops,0),18000);
  assert.ok(ownTeam.every(u=>u.level===5));
  validateCustomBattle({terrain:o.terrain,seed:123,ownTeam,enemyTeam:o.team});
 }
});
test('AI对战镜像布阵不修改敌军、随机数或战意，并能确定性续战',()=>{
 const draft={terrain:'hill',seed:123,ownTeam:archetypes[0].team,enemyTeam:opponents[0].team};
 const state=createScenario('custom-battle',123,20,null,draft),b=state.battle;
 const enemy=structuredClone(b.sides[1]),seed=b.seed;
 setupRulePlayer(state);assert.deepEqual(b.sides[1],enemy);assert.equal(b.seed,seed);
 assert.ok(b.sides[0].units.every(u=>u.intent===0&&u.x>=0&&u.x<=4));
 const run=fight(draft,{controller:'rule',resume:true});assert.ok(run.ticks>20&&run.ticks<=480);
});
test('建筑有无不改变已学战法，野战和攻城都不会由AI重新选装',()=>{
 const draft={terrain:'land',seed:123,ownTeam:archetypes[0].team,enemyTeam:opponents[0].team};
 const b=createScenario('custom-battle',123,20,null,draft).battle,before=b.sides[1].units.map(u=>[...u.tactics]);
 b.buildings.push({id:'friendly-building',name:'营垒',type:'building',kind:'camp',side:1,x:13,y:7,hp:1500,maxHp:2000});
 planEnemyArmy(b);assert.deepEqual(b.sides[1].units.map(u=>u.tactics),before);
 b.buildings[0].side=0;planEnemyArmy(b);assert.deepEqual(b.sides[1].units.map(u=>u.tactics),before);
});
