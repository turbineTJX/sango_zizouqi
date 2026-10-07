import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle,swapCustomBattle,customBattleMarkup} from '../custom-battle.mjs';
import {removeCustomReinforcement,arrivalConditionMet} from '../reinforcement-arrival.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave,battleStratagems,confirmReinforcementCouncil,deployUnit} from '../engine.mjs';
import {frontlineCapacity} from '../army-trait-rules.mjs';
import {waveSummary} from '../battlefield.mjs';
import {battleCouncilMarkup} from '../battle-council.mjs';
import {battleUnitSummary} from '../battle-info.mjs';
import {newScenarioSetup,scenarioSetupDraft,changeScenarioSetup} from '../scenario-setup.mjs';

const entry=(id,troops=3000,level=10)=>({id,type:'spear',troops,level,retreatAt:null});
function draft(type='unit-defeated'){
 const d=defaultCustomBattle();d.ownTeam=[entry('yu',1000,1)];d.enemyTeam=[entry('shao',5000)];
 d.reinforcements=[{side:0,name:'后援军团',arrivalCondition:type==='unit-defeated'?{type,unitId:'yu'}:{type,armyId:'a1'},team:[entry('cao'),entry('chu')]}];return d;
}
const conditionalUnits=b=>b.sides.flatMap(s=>s.units).filter(u=>u.arrivalCondition);

test('a real defeat triggers the whole reinforcement army before a last-unit loss resolves, on either side',()=>{
 for(const type of ['unit-defeated','army-defeated'])for(const swapped of [false,true]){
  const d=swapped?swapCustomBattle(draft(type)):draft(type),s=generateBattle(d),b=s.battle,side=swapped?1:0;
  const reinforcements=conditionalUnits(b);assert.ok(reinforcements.every(u=>u.arrivalTick===null&&!u.arrivalConfirmed&&u.status==='reserve'));
  assert.equal(frontlineCapacity(b,side),6);assert.ok(!battleStratagems(b,side).includes('cao-wuchao'));
  if(!swapped)assert.match(deployUnit(b,'cao',0,0),/尚未抵达/);
  lockDeployment(b);
  const before=validateSave(JSON.parse(JSON.stringify(s)));
  while(!reinforcements[0].arrivalConfirmed&&!b.result){
   stepBattle(b);stepBattle(before.battle);assert.deepEqual(before.battle,b);validateSave(structuredClone(s));
  }
  const target=b.sides.flatMap(s=>s.units).find(u=>u.id==='yu');
  assert.equal(target.status,'defeated');assert.equal(target.hp,0);assert.equal(b.result,null);
  assert.ok(reinforcements.every(u=>u.arrivalConfirmed&&u.arrivalTick===b.tick));assert.equal(frontlineCapacity(b,side),7);
  assert.equal(b.logs.filter(l=>l.text.includes('援军抵达')).length,1);
  assert.equal(b.reinforcementCouncil,swapped?null:'pending');
  if(!swapped){assert.ok(reinforcements.every(u=>u.status==='reserve'));confirmReinforcementCouncil(b);}
  const resumed=validateSave(JSON.parse(JSON.stringify(s)));
  while(!b.result){stepBattle(b);stepBattle(resumed.battle);}assert.deepEqual(resumed.battle,b);validateSave(s);
  assert.equal(b.logs.filter(l=>l.text.includes('援军抵达')).length,1);
 }
});

test('army destruction waits for all real units, including its reserve, and ignores voluntary withdrawal',()=>{
 const d=draft('army-defeated');d.ownTeam.push({...entry('dun',2000,1),first:false});
 const s=generateBattle(d),b=s.battle;lockDeployment(b);let partial=false;
 while(!conditionalUnits(b)[0].arrivalConfirmed&&!b.result){
  stepBattle(b);const main=b.sides[0].units.filter(u=>u.armyId==='a1');
  if(main.some(u=>u.status==='defeated')&&main.some(u=>u.hp>0)){partial=true;assert.equal(conditionalUnits(b)[0].arrivalConfirmed,false);}
 }
 assert.ok(partial);assert.equal(conditionalUnits(b)[0].arrivalConfirmed,true);validateSave(s);
 for(const type of ['unit-defeated','army-defeated']){
  const d=draft(type);d.ownTeam[0].retreatAt=1000;const s=generateBattle(d),b=s.battle;lockDeployment(b);
  while(!b.result)stepBattle(b);
  assert.equal(b.sides[0].units[0].status,'withdrawn');assert.equal(arrivalConditionMet(b,d.reinforcements[0].arrivalCondition),false);
  assert.equal(conditionalUnits(b)[0].arrivalConfirmed,false);assert.equal(b.result.winner,1);validateSave(s);
 }
});

test('an unmet enemy-loss condition cannot prolong a wiped-out army or cause a phantom council',()=>{
 const d=draft();d.reinforcements[0].arrivalCondition.unitId='shao';const s=generateBattle(d),b=s.battle;lockDeployment(b);
 while(!b.result)stepBattle(b);
 assert.equal(b.result.winner,1);assert.ok(b.tick<b.maxTicks);assert.equal(b.reinforcementCouncil,null);
 assert.ok(conditionalUnits(b).every(u=>!u.arrivalConfirmed&&u.arrivalTick===null));validateSave(s);
});

test('conditions persist through isolated edits and swaps; removing armies preserves surviving target identities',()=>{
 const d=draft('army-defeated'),p=newScenarioSetup(d,'ownTeam',0);changeScenarioSetup(p,'troops','chu',2000);
 assert.deepEqual(scenarioSetupDraft(p).reinforcements[0].arrivalCondition,d.reinforcements[0].arrivalCondition);
 const swapped=swapCustomBattle(d);assert.equal(swapped.reinforcements[0].arrivalCondition.armyId,'a2');assert.deepEqual(swapCustomBattle(swapped),validateCustomBattle(d));
 d.reinforcements.push({side:1,name:'第二援军',tick:48,team:[entry('yan')]},{side:1,name:'第三援军',arrivalCondition:{type:'army-defeated',armyId:'a4'},team:[entry('wen')]});
 removeCustomReinforcement(d,0);assert.equal(d.reinforcements[1].arrivalCondition.armyId,'a3');validateCustomBattle(d);
 removeCustomReinforcement(d,0);assert.equal(d.reinforcements[0].arrivalCondition.armyId,'');assert.throws(()=>validateCustomBattle(d),/目标不存在/);
});

test('missing, self-referential, circular, ambiguous and forged conditions are rejected',()=>{
 for(const mutate of [d=>d.reinforcements[0].arrivalCondition=null,d=>d.reinforcements[0].arrivalCondition.type='other',d=>d.reinforcements[0].arrivalCondition.unitId='missing',d=>d.reinforcements[0].arrivalCondition.unitId='cao',d=>d.reinforcements[0].tick=24,d=>d.reinforcements[0].arrivalCondition={type:'army-defeated',armyId:'a3'}]){
  const d=draft();mutate(d);assert.throws(()=>validateCustomBattle(d),/援军/);
 }
 const cycle=draft();cycle.reinforcements[0].arrivalCondition.unitId='yan';cycle.reinforcements.push({side:1,name:'敌军后援',arrivalCondition:{type:'army-defeated',armyId:'a3'},team:[entry('yan')]});assert.throws(()=>validateCustomBattle(cycle),/互相等待/);
 const s=generateBattle(draft());lockDeployment(s.battle);
 for(const mutate of [u=>u.arrivalConfirmed=true,u=>u.arrivalTick=0,u=>delete u.arrivalCondition,u=>u.arrivalCondition.unitId='shao',u=>u.hp--,u=>u.status='active']){
  const copy=structuredClone(s);mutate(conditionalUnits(copy.battle)[0]);assert.throws(()=>validateSave(copy),/援军/);
 }
 while(!s.battle.reinforcementCouncil&&!s.battle.result)stepBattle(s.battle);
 const copy=structuredClone(s);conditionalUnits(copy.battle)[1].arrivalTick--;assert.throws(()=>validateSave(copy),/到达记录不一致/);
});

test('editor, council, wave summary and unit detail explain the configured condition without a fake date',()=>{
 const d=draft(),s=generateBattle(d),b=s.battle,u=conditionalUnits(b)[0];
 assert.match(customBattleMarkup(d),/指定部队被消灭/);assert.match(customBattleMarkup(d),/荀攸队被消灭后/);
 assert.match(battleCouncilMarkup(b),/荀攸队被消灭后/);assert.doesNotMatch(battleCouncilMarkup(b),/NaN/);
 assert.deepEqual(waveSummary(b,0)[0].arrivalCondition,d.reinforcements[0].arrivalCondition);
 assert.match(battleUnitSummary(b,u).find(([key])=>key==='入场条件')[1],/荀攸队被消灭后/);
});
