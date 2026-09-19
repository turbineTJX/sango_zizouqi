import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,configureUnitTactics} from '../engine.mjs';
import {recoverableWounded} from '../tactics.mjs';

test('电脑自然充能后的军略在部队行动结束后下达，与玩家操作处于相同边界',()=>{
 const state=createScenario('field',123),b=state.battle;lockDeployment(b);
 let resumed;
 while(!b.result&&!b.enemyCommand.commandSerial){
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  if(b.tick===20)resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 }
 assert.ok(b.enemyCommand.commandSerial>0,'无需注入军略资源');
 assert.ok(b.logs[0].text.startsWith('敌军军略 ·'),'最新日志是步末军略，而非军略后的部队行动');
 assert.equal(b.logs[0].tick,b.enemyCommand.lastCommand.tick);
 assert.deepEqual(resumed.battle,b);
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);
});

test('自然击溃守军后，城门仍存时友军救护和名将支援继续使用真实伤兵与战意',t=>{
 const unit=(id,type,troops)=>({id,type,troops,level:5});
 // An authored siege fixture: enough gate durability to observe the period
 // after the defenders fall. No intent, cooldown or wounded ledger injection.
 const fixture={...SCENARIOS.find(s=>s.id==='siege'),id:'engine-gate-support',ownName:'攻城验证军',enemyName:'守城验证军',terrain:'land',gateHp:60000,limit:480,waves:[],ownAdvisor:'yu',enemyAdvisor:'jin',ownTeam:[unit('person-396','cavalry',6000),unit('person-636','spear',3000),unit('yu','crossbow',3000)],enemyTeam:[unit('jin','spear',1500),unit('yuanxia','archer',1500),unit('person-610','crossbow',1500)]};
 SCENARIOS.push(fixture);t.after(()=>SCENARIOS.splice(SCENARIOS.indexOf(fixture),1));
 const state=createScenario(fixture.id,4),b=state.battle;b.sides.forEach(s=>s.tactic='balanced');
 learnFixtureTactics(b.sides[0].units.find(u=>u.id==='person-636'),['unique-person-636','phalanx','strike']);
 learnFixtureTactics(b.sides[0].units.find(u=>u.id==='yu'),['screen','seal','ambush']);syncFixtureLearning(state);
 validateSave(structuredClone(syncFixtureLearning(state)));lockDeployment(b);
 while(!b.result&&b.sides[1].units.some(u=>u.status==='active'&&u.hp>0))stepBattle(b);
 assert.equal(b.result,null);assert.ok(b.siege.gate.hp>0);
 const liu=b.sides[0].units.find(u=>u.id==='person-636'),yu=b.sides[0].units.find(u=>u.id==='yu');
 const oldLiu=liu.tacticCasts['unique-person-636']||0,oldYu=yu.tacticCasts.screen||0;
 assert.ok(b.sides[0].units.some(u=>recoverableWounded(u)>0));
 const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);assert.ok(b.tick<=480);}
 assert.ok(liu.tacticCasts['unique-person-636']>oldLiu,'义勇兵不依赖敌方活部队');
 assert.ok(yu.tacticCasts.screen>oldYu,'基础救护不依赖敌方活部队');
 assert.equal(b.result.reason,'城门失守');assert.deepEqual(resumed.battle,b);validateSave(state);
});

test('本步已结算战果时不再追加电脑军略，即使自然充能恰好蓄满',t=>{
  // A shorter authored deadline, with the same actual combat and gauge income.
 const probe=createScenario('field',123).battle;lockDeployment(probe);while(!probe.result&&!probe.enemyCommand.commandSerial)stepBattle(probe);assert.ok(probe.enemyCommand.commandSerial);const deadline=probe.tick;
 const fixture={...SCENARIOS.find(s=>s.id==='field'),id:'engine-order-deadline',limit:deadline};
 SCENARIOS.push(fixture);t.after(()=>SCENARIOS.splice(SCENARIOS.indexOf(fixture),1));
 const state=createScenario(fixture.id,123),b=state.battle;lockDeployment(b);
 while(b.tick<deadline-1){stepBattle(b);assert.equal(b.enemyCommand.commandSerial,0);}
 const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 stepBattle(b);stepBattle(resumed.battle);
 assert.ok(b.result);assert.equal(b.enemyCommand.commandProgress,12000);
 assert.equal(b.enemyCommand.commandSerial,0);assert.equal(b.enemyCommand.lastCommand,null);
 assert.deepEqual(resumed.battle,b);
 const settled=structuredClone(b);stepBattle(b);assert.deepEqual(b,settled);
});
