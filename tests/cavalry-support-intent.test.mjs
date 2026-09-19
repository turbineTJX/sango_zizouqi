import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,configureUnitTactics,validateSave} from '../engine.mjs';
import {supportAnchor,SPECIAL_TACTICS,roleTacticIds} from '../tactics.mjs';
import {setupRulePlayer,unit} from '../scripts/custom-playability-lib.mjs';

for(const id of ['person-661','person-396','person-99'])test(`${id}: 攻击骑兵携带策应仍接敌，零战意实战与续战一致`,()=>{
 const seed=12100000,draft={seed,terrain:'land',ownTeam:[unit(id,'cavalry',6000,5),unit('person-646','spear',1500,5),unit('person-123','logistics',1500,5)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]};
 const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;b.sides.forEach(s=>s.tactic='balanced');setupRulePlayer(state);
 const rider=b.sides[0].units[0];learnFixtureTactics(rider,[SPECIAL_TACTICS[id],'gallop','relay']);syncFixtureLearning(state);lockDeployment(b);
 const main=b.sides[0].units[0],recentDamage=[];let resumed=null,earned=false;
 while(!b.result){
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  recentDamage.push([0,1].map(side=>b.effects.filter(e=>e.damage>0&&b.sides[side].units.some(u=>u.id===e.from)).reduce((n,e)=>n+e.damage,0)));
  if(recentDamage.length>12)recentDamage.shift();
  if(main.status==='active'){
   assert.notEqual(main.action,'策应队友');assert.equal(supportAnchor(b,main),null);
   if(!earned&&main.intent>=25){
    earned=true;
    // This comparison uses the actually earned intent and live friendly line.
    const support={...structuredClone(main),id:'ordinary-support-fixture'};learnFixtureTactics(support,['relay','harass','lure']);support.skillReady={};assert.ok(supportAnchor(b,support),'已学纯医辅组合仍可跟随前排');
   }
  }
  if(b.tick===20)resumed=validateSave(structuredClone(state));
  assert.ok(b.tick<=480);
 }
 // Planner changes may alter the winner. The regression contract is useful
 // movement, real offensive/support casts and a completed deterministic fight.
 // Useful single-unit recovery can extend fighting to the deadline. In that
 // case require continuing mutual damage, not a particular time-to-victory.
 assert.ok(earned);assert.ok(main.tacticCasts[SPECIAL_TACTICS[id]]>0);assert.ok(main.tacticCasts.relay>0,'没有禁用实际治疗');
 if(b.result.reason==='久战收兵')for(const side of [0,1])assert.ok(recentDamage.reduce((n,d)=>n+d[side],0)>0,'时限收兵前双方仍有实际伤害，不是停滞');
 assert.deepEqual(resumed.battle,b);
 const old=structuredClone(state);old.rulesVersion=33;assert.throws(()=>validateSave(old),/重新开始/);
});
