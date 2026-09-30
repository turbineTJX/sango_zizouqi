import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,makeOfficer} from '../engine.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,tacticOpening} from '../tactics.mjs';
import {validTacticLearning} from '../tactic-learning.mjs';
import {skillRoute} from '../passives.mjs';
import {HERO_CASES,heroDraft} from '../scripts/hero-redesign-cases.mjs';

test('荀彧保留内政特性，专属资格严格按当前16人表',()=>{const u=makeOfficer('person-255',3000,0,5,440211);assert.equal(SPECIAL_TACTICS[u.id],undefined);assert.equal(u.tacticLearning.special,false);assert.ok(validTacticLearning(u));assert.ok(skillRoute(u).includes('xunTalent'));for(const p of Object.values(u.tacticLearning.byTroop))assert.ok(p.low.length+p.high.length<=3);});

test('条件加成只读取施放前已有状态和战意，不把本次破甲或受击收益算作铺垫',()=>{
 const b={tick:10},target={intent:59,statuses:{armorBreak:{until:10}}};
 const guan=TACTICS_BOOK['unique-person-99'],sima=TACTICS_BOOK['unique-person-226'];
 assert.equal(tacticOpening(b,guan,target).scale,0);
 target.statuses.armorBreak.until=11;assert.equal(tacticOpening(b,guan,target).scale,.9);
 assert.equal(tacticOpening(b,sima,target).highIntent,false);
 target.intent=60;assert.equal(tacticOpening(b,sima,target).scale,.65);
 assert.equal(tacticOpening(b,sima,target).drain,16);
 delete target.statuses.armorBreak;assert.equal(tacticOpening(b,guan,target).scale,0);
});

for(const [id,name,type] of HERO_CASES.filter(([id])=>SPECIAL_TACTICS[id]))test(`${name}：合法自定义战役自然发动专属，遵守消耗、目标与续战`,()=>{
 const seed=440211,draft=heroDraft([[id,type],['person-646','spear'],['person-123','halberd']],seed,8);
 const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;
 lockDeployment(b);const u=b.sides[0].units[0],s=TACTICS_BOOK[SPECIAL_TACTICS[id]],learning=JSON.stringify(u.tacticLearning);
 assert.equal(u.intent,u.bondEntry.intent);assert.ok(u.tactics.includes(s.id));
 let resumed,casts=0,last=-Infinity;
 while(!b.result){
   const before=u.tacticCasts[s.id]||0;stepBattle(b);if(resumed)stepBattle(resumed.battle);
   if((u.tacticCasts[s.id]||0)>before){
     casts++;assert.ok(b.tick-last>=4);last=b.tick;
     const events=b.effects.filter(e=>e.from===id&&e.label===s.name),payment=events.find(e=>e.intentPayment)?.intentPayment;
     assert.ok(payment);assert.equal(payment.cost,s.intentCost);assert.equal(payment.after,Math.max(0,payment.before-s.intentCost));
     if(s.excludeSelf)assert.ok(events.every(e=>e.to!==id));
     if(s.selfRiposte&&u.hp>0)assert.equal(u.statuses.riposte.sourceId,id);
   }
   if(b.tick===24)resumed=validateSave(structuredClone(state));
 }
 assert.ok(casts>0,`${name} has a usable role in a real three-unit team`);
 assert.equal(JSON.stringify(u.tacticLearning),learning);assert.deepEqual(resumed.battle,b);
});

