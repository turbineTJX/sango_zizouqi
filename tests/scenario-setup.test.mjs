import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {saveScenarioUnit,newScenarioSetup,newBattleSetup,changeScenarioSetup,scenarioSetupError,scenarioSetupDraft,scenarioSetupUnits,scenarioSetupMarkup,applyBattleSetup} from '../scenario-setup.mjs';
test('shared custom setup is an isolated draft and applies all commander and unit fields',()=>{
 const d=defaultCustomBattle(),before=JSON.stringify(d),p=newScenarioSetup(d,'ownTeam');
 changeScenarioSetup(p,'selected','person-255',true);changeScenarioSetup(p,'level','person-255',8);changeScenarioSetup(p,'troops','person-255',4000);changeScenarioSetup(p,'type','person-255','halberd');
 changeScenarioSetup(p,'role','advisor','person-255');changeScenarioSetup(p,'role','deputy','person-255');changeScenarioSetup(p,'tactic',null,'defensive');
 assert.equal(scenarioSetupError(p),'');assert.equal(JSON.stringify(d),before);
 const draft=scenarioSetupDraft(p),s=createScenario('custom-battle',draft.seed,20,null,draft);
 assert.equal(s.armies[0].deputy,'person-255');assert.equal(s.armies[0].tactic,'defensive');
 assert.deepEqual(scenarioSetupUnits(p).map(u=>u.tacticLearning),s.armies[0].units.map(u=>u.tacticLearning));
 assert.equal(validateSave(structuredClone(s)).armies[0].advisor,'person-255');
 changeScenarioSetup(p,'selected','shao',true);assert.ok(!p.selected.includes('shao'));
 changeScenarioSetup(p,'troops','person-255',999999);assert.match(scenarioSetupError(p),/兵力/);
});
test('ordinary picker, formation and comparison views render without a strategic campaign',()=>{
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam');
 for(const step of ['formation','unit-review','unit-select','commanders','review']){p.step=step;const html=scenarioSetupMarkup(p).body;assert.doesNotMatch(html,/undefined|NaN/);assert.match(html,/command-flow/);}
 p.step='formation';assert.doesNotMatch(scenarioSetupMarkup(p).body,/task-personnel/);p.choosingMain=true;assert.match(scenarioSetupMarkup(p).body,/type="radio"/);p.choosingMain=false;
 p.step='formation';assert.match(scenarioSetupMarkup(p).body,/command-formation/);assert.doesNotMatch(scenarioSetupMarkup(p).body,/data-scenario-role|data-scenario-first|combat-page/);
 p.step='unit-review';assert.match(scenarioSetupMarkup(p).body,/compiled-unit/);assert.doesNotMatch(scenarioSetupMarkup(p).body,/data-scenario-role|combat-page/);
 p.step='unit-select';assert.match(scenarioSetupMarkup(p).body,/友好度/);
 p.step='commanders';assert.match(scenarioSetupMarkup(p).body,/data-scenario-role/);assert.doesNotMatch(scenarioSetupMarkup(p).body,/data-scenario-role="deputy"|友好度|data-scenario-formation|data-scenario-first/);
});
test('historical setup preserves scenario resources, enemy, learning and deterministic continuation',()=>{
 const s=createScenario('history-guandu'),before=JSON.stringify(s),p=newBattleSetup(s,s.armies[0].id),id=p.selected[0];
 changeScenarioSetup(p,'type',id,'cavalry');changeScenarioSetup(p,'role','leader',p.selected[1]);
 changeScenarioSetup(p,'troops',id,1);changeScenarioSetup(p,'level',id,10);
 const next=applyBattleSetup(s,p);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(next.cities,s.cities);assert.equal(next.gold,s.gold);assert.deepEqual(next.battle.sides[1],s.battle.sides[1]);
 assert.deepEqual(next.armies[0].units.map(u=>[u.troops,u.level,u.tacticLearning]),s.armies[0].units.map(u=>[u.troops,u.level,u.tacticLearning]));
 assert.equal(next.battle.sides[0].units.find(u=>u.id===id).type,'cavalry');
 const restored=validateSave(structuredClone(next));lockDeployment(next.battle);lockDeployment(restored.battle);
 for(let i=0;i<16;i++){stepBattle(next.battle);stepBattle(restored.battle);}assert.deepEqual(restored.battle,next.battle);
 assert.throws(()=>applyBattleSetup(next,p),/开战后/);
 p.selected.pop();assert.match(scenarioSetupError(p),/不可增减/);
});
test('custom battle deployment adjustments survive save and same-seed retry',()=>{
 const s=createScenario('custom-battle'),p=newBattleSetup(s,s.armies[0].id);changeScenarioSetup(p,'type','cao','cavalry');
 const result=applyBattleSetup(s,p),restored=validateSave(structuredClone(result));
 const retried=createScenario('custom-battle',restored.testScenario.seed,20,null,restored.testScenario.customBattle);
 assert.equal(retried.armies[0].units[0].type,'cavalry');assert.deepEqual(retried.armies[0].units[0].tacticLearning,restored.armies[0].units[0].tacticLearning);
});

test('formation selects officers in place, army selects only compiled units',()=>{
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam');
 assert.equal(p.step,'unit-review');assert.match(scenarioSetupMarkup(p).body,/scenario-unit-edit/);p.step='formation';
 assert.doesNotMatch(scenarioSetupMarkup(p).body,/data-scenario-choice/);
 assert.match(scenarioSetupMarkup(p).body,/data-scenario-type/);
 p.step='unit-select';assert.doesNotMatch(scenarioSetupMarkup(p).body,/data-scenario-choice|data-scenario-type/);
 assert.match(scenarioSetupMarkup(p).body,/data-scenario-army-unit/);
});

test('army membership is independent of the compiled pool and cancel leaves source unchanged',()=>{
 const d=defaultCustomBattle(),before=structuredClone(d),p=newScenarioSetup(d,'ownTeam');
 changeScenarioSetup(p,'selected','person-255',true);
 p.step='unit-select';changeScenarioSetup(p,'army-selected','cao',false);
 assert.ok(p.selected.includes('cao'));
 assert.equal(scenarioSetupError(p),'');
 p.step='review';assert.deepEqual(scenarioSetupUnits(p).map(u=>u.id),['person-255']);
 assert.deepEqual(scenarioSetupDraft(p).ownTeam.map(u=>u.id),['person-255']);
 assert.deepEqual(d,before);
 p.step='unit-select';changeScenarioSetup(p,'army-selected','person-255',false);assert.match(scenarioSetupError(p),/已编制部队/);
});

test('single-unit editor chooses one commander and adds only on unit confirmation',()=>{
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam'),before=[...p.selected];p.step='formation';
 changeScenarioSetup(p,'unit-main','person-255',true);
 assert.deepEqual(p.selected,before);assert.equal(p.editorId,'person-255');
 assert.equal((scenarioSetupMarkup(p).body.match(/data-scenario-type=/g)||[]).length,1);
 changeScenarioSetup(p,'unit-main','liao',true);assert.equal(p.editorId,'liao');assert.deepEqual(p.selected,before);
 assert.equal(saveScenarioUnit(p),'');assert.ok(p.selected.includes('liao'));assert.ok(!p.selected.includes('person-255'));
});

test('custom unit management exposes disband and unlimited reserves, preset participants stay fixed',()=>{
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam');assert.match(scenarioSetupMarkup(p).body,/预备兵：inf/);assert.match(scenarioSetupMarkup(p).body,/scenario-unit-disband/);
 const s=createScenario('custom-battle'),locked=newBattleSetup(s,s.armies[0].id);assert.doesNotMatch(scenarioSetupMarkup(locked).body,/scenario-unit-disband/);
});
