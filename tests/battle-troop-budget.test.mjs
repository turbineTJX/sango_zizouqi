import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle,customReserveTroops,customTroopBudget,swapCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {newScenarioSetup,scenarioAvailableTroops,scenarioTroopsMax,scenarioSetupOfficer,changeScenarioSetup,saveScenarioUnit,scenarioSetupDraft,scenarioSetupMarkup} from '../scenario-setup.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {highestAptitudeTroop,battleTroopTypes} from '../troop-choice.mjs';
import {troopAptitude} from '../tactic-learning.mjs';
const entry=(id,troops)=>({id,type:'spear',troops,level:5});
function draft(){
 const d=defaultCustomBattle();d.ownTroopBudget=5000;d.ownTeam=[entry('cao',3000),entry('yu',1000)];
 d.reinforcements=[{side:0,name:'我军后援',tick:24,team:[entry('liao',1000)]},{side:1,name:'敌军后援',tick:48,team:[entry('chu',3000)]}];return validateCustomBattle(d);
}

test('all friendly armies share one finite troop pool; enemy armies do not consume it',()=>{
 const d=draft();assert.equal(customTroopBudget(d),5000);assert.equal(customReserveTroops(d),0);
 const main=newScenarioSetup(d,'ownTeam'),relief=newScenarioSetup(d,'ownTeam',0),enemy=newScenarioSetup(d,'enemyTeam',1);
 assert.equal(scenarioAvailableTroops(main),0);assert.equal(scenarioTroopsMax(main,scenarioSetupOfficer(main,'cao')),3000);
 assert.equal(scenarioTroopsMax(relief,scenarioSetupOfficer(relief,'liao')),1000);assert.equal(scenarioAvailableTroops(enemy),Infinity);
 changeScenarioSetup(relief,'troops','liao',1001);assert.throws(()=>scenarioSetupDraft(relief),/总预备兵/);
 const bad=structuredClone(d);bad.reinforcements[1].side=0;assert.throws(()=>validateCustomBattle(bad),/总预备兵/);
});

test('reducing or disbanding units releases their exact soldiers for drafts; cancellation leaves the source untouched',()=>{
 const d=draft(),before=structuredClone(d),p=newScenarioSetup(d,'ownTeam');
 assert.match(scenarioSetupMarkup(p).body,/scenario-unit-new" disabled/);
 changeScenarioSetup(p,'troops','cao',2000);assert.equal(scenarioAvailableTroops(p),1000);
 changeScenarioSetup(p,'unit-main','jia');assert.equal(p.entries.jia.troops,1000);assert.equal(scenarioTroopsMax(p,scenarioSetupOfficer(p,'jia')),1000);
 assert.equal(saveScenarioUnit(p),'');assert.equal(scenarioAvailableTroops(p),0);
 changeScenarioSetup(p,'selected','yu',false);assert.equal(scenarioAvailableTroops(p),1000);
 changeScenarioSetup(p,'troops','jia',2000);assert.equal(customReserveTroops(scenarioSetupDraft(p)),0);assert.deepEqual(d,before);
 p.editorId='cao';p.step='formation';const html=scenarioSetupMarkup(p).body;assert.match(html,/data-scenario-troops="cao"/);assert.match(html,/max="2000"/);
});

test('insufficient residual soldiers disable compilation and cannot be committed through direct calls',()=>{
 const d=draft();d.ownTroopBudget=5500;const p=newScenarioSetup(d,'ownTeam');changeScenarioSetup(p,'unit-main','jia');p.step='formation';
 assert.equal(p.entries.jia.troops,500);const markup=scenarioSetupMarkup(p);assert.match(markup.body,/可用预备兵不足1000/);assert.match(markup.footer,/scenario-unit-save" disabled/);
 assert.match(saveScenarioUnit(p),/兵力/);assert.ok(!p.selected.includes('jia'));
 for(const budget of [0,999,-1,1.5,NaN,Infinity,10000001,'5000'])assert.throws(()=>validateCustomBattle({...d,ownTroopBudget:budget}),/总预备兵/);
});

test('legal defaults use the highest real aptitude across all officers and respect water access and manual choices',()=>{
 for(const source of Object.values(OFFICER_BY_ID))for(const terrain of ['land','river']){
  const types=battleTroopTypes(terrain),chosen=highestAptitudeTroop(source,types);
  assert.ok(types.includes(chosen));assert.equal(troopAptitude(source,chosen),Math.max(...types.map(type=>troopAptitude(source,type))));
  if(types.includes(source.type)&&troopAptitude(source,source.type)===troopAptitude(source,chosen))assert.equal(chosen,source.type);
 }
 const d=defaultCustomBattle(),p=newScenarioSetup(d,'ownTeam');changeScenarioSetup(p,'unit-main','person-255');
 assert.equal(p.entries['person-255'].type,'halberd');changeScenarioSetup(p,'type','person-255','archer');
 changeScenarioSetup(p,'unit-main','jia');changeScenarioSetup(p,'unit-main','person-255');assert.equal(p.entries['person-255'].type,'archer');
 assert.equal(saveScenarioUnit(p),'');assert.equal(scenarioSetupDraft(p).ownTeam.find(u=>u.id==='person-255').type,'archer');
 d.terrain='river';const river=newScenarioSetup(d,'ownTeam');changeScenarioSetup(river,'unit-main','jia');assert.equal(river.entries.jia.type,'archer');
});

test('budgets survive swapping, deterministic battle continuation and retries; forged draft or army totals are rejected',()=>{
 const d=draft();d.ownTroopBudget=6500;const swapped=swapCustomBattle(d);
 assert.equal(customReserveTroops(swapped),1500);assert.deepEqual(swapCustomBattle(swapped),d);
 const s=generateBattle(d),b=s.battle;lockDeployment(b);for(let i=0;i<8;i++)stepBattle(b);
 const resumed=validateSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<20&&!b.reinforcementCouncil;i++){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);assert.equal(resumed.testScenario.customBattle.ownTroopBudget,6500);
 assert.equal(generateBattle(resumed.testScenario.customBattle).testScenario.customBattle.ownTroopBudget,6500);
 for(const mutate of [s=>s.testScenario.customBattle.ownTroopBudget=4999,s=>delete s.testScenario.customBattle.ownTroopBudget,s=>s.armies[0].units[0].troops+=2000,s=>s.battle.sides[0].units[0].initial+=2000]){
  const copy=structuredClone(s);mutate(copy);assert.throws(()=>validateSave(copy));
 }
});
