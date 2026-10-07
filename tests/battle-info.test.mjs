import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics} from '../tactics.mjs';
import {battleUnitSummary,battleTacticConditions,battleTacticDetailMarkup} from '../battle-info.mjs';
const unit=(id,type,troops=3000)=>({id,type,troops,level:10});
export const scenario=()=>createScenario('custom-battle',73000009,20,null,{seed:73000009,terrain:'land',ownTeam:[unit('person-396','cavalry',6000),unit('person-646','spear',1500),unit('person-123','halberd',1500)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]});
test('inspection during real combat is read-only and preserves deterministic continuation',()=>{
 const s=scenario(),b=s.battle;lockDeployment(b);let exhausted=false,cooldown=false,action=false;
 for(let i=0;i<100&&!b.result;i++){
  stepBattle(b);const before=JSON.stringify(s);
  for(const u of b.sides.flatMap(side=>side.units)){
   const rows=battleUnitSummary(b,u);action||=rows.some(([key])=>key==='最近作用对象');assert.ok(!rows.some(([key])=>key==='在场羁绊'));
   for(const skill of unitTactics(u)){const reasons=battleTacticConditions(b,u,skill).join(' ');exhausted||=reasons.includes('次数已用尽');cooldown||=reasons.includes('冷却中');assert.doesNotMatch(battleTacticDetailMarkup(b,u,skill),/NaN|undefined/);}
  }
  assert.equal(JSON.stringify(s),before);
 }
 assert.ok(exhausted);assert.ok(cooldown);assert.ok(action);const copy=validateSave(structuredClone(s));for(let i=0;i<10&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
});
test('deployment and reserve inspection never claims a live grid position or cast readiness',()=>{
 const s=scenario(),u=s.battle.sides[0].units[0];assert.match(battleTacticConditions(s.battle,u,unitTactics(u)[0]).join(' '),/战前布阵/);
 const reserve={...u,status:'reserve',x:-1,y:-1,arrivalTick:20};assert.equal(battleUnitSummary(s.battle,reserve).find(([k])=>k==='战场位置')[1],'场外预备区');assert.match(battleUnitSummary(s.battle,reserve).find(([k])=>k==='入场条件')[1],/援军尚未抵达/);
 assert.ok(!battleUnitSummary(s.battle,reserve).some(([key])=>key==='在场羁绊'));
});
