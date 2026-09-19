import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {makeOfficer,configureUnitTactics,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {SPECIAL_TACTICS,recommendedTacticIds,validLoadout,hasStatus} from '../tactics.mjs';
const unit=(id,type,troops=3000)=>({id,type,troops,level:5});

test('自由对战的所有名将专属均进入玩家初始配装，不依赖战法 ID 前缀',()=>{
 for(const [id,special] of Object.entries(SPECIAL_TACTICS)){
  const own=makeOfficer(id),enemy=id==='shao'?'cao':'shao';
  const state=createScenario('custom-battle',62000003,20,null,{seed:62000003,terrain:'land',ownTeam:[unit(id,own.type)],enemyTeam:[unit(enemy,'spear')]});
  assert.ok(state.battle.sides[0].units[0].tactics.includes(special),id);
  assert.ok(state.armies[0].units[0].tactics.includes(special),id+' army');
  assert.ok(validLoadout(state.battle.sides[0].units[0],state.battle.sides[0].units[0].tactics));
 }
});

test('名将骑兵按所学战法作战，专属额外携带且存读档不分歧',()=>{
 for(const id of ['person-661','person-396','person-99']){
  const state=createScenario('custom-battle',62000003,20,null,{seed:62000003,terrain:'land',ownTeam:[unit(id,'cavalry',6000),unit('person-646','spear',1500),unit('person-123','logistics',1500)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]}),b=state.battle,u=b.sides[0].units[0];
  assert.equal(configureUnitTactics(state,id,recommendedTacticIds(u)),null);
  assert.equal(u.intent,0);lockDeployment(b);stepBattle(b);
  assert.ok(validLoadout(u,u.tactics));
  const saved=validateSave(structuredClone(state));
  while(!b.result){stepBattle(b);stepBattle(saved.battle);}
  if(!u.tactics.includes('rush'))assert.equal(u.tacticCasts.rush,undefined);
  assert.ok(u.tacticCasts[SPECIAL_TACTICS[id]]>0,id+' actually uses exclusive');
  assert.deepEqual(saved.battle,b);
 }
});
