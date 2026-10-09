import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle,customParticipants,swapCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {lockDeployment,stepBattle,validateSave,fillSlots,deployUnit,battleStratagems,openReinforcementCouncil,confirmReinforcementCouncil} from '../engine.mjs';
import {frontlineCapacity} from '../army-trait-rules.mjs';
import {newScenarioSetup,scenarioSetupDraft,changeScenarioSetup,newBattleSetup,applyBattleSetup} from '../scenario-setup.mjs';
const entry=id=>({id,type:'spear',troops:3000,level:10,retreatAt:null});
function draft(){const d=defaultCustomBattle();d.ownTeam=[entry('yu')];d.enemyTeam=[entry('shao')];d.shieldPercent=0;d.reinforcements=[{side:0,name:'援军',tick:4,team:[entry('cao'),entry('chu')],roles:{leader:'cao',advisor:'cao',}}];return d;}

test('multiple distinct legal armies can exceed thirty battle units while retaining ten units per army',()=>{
 const d=draft(),ids=Object.keys(OFFICER_BY_ID).filter(id=>!['yu','shao'].includes(id));
 d.reinforcements=Array.from({length:4},(_,i)=>({side:i===3?1:0,name:'援军'+i,tick:24*(i+1),team:ids.slice(i*10,i*10+10).map(entry)}));
 d.ownTroopBudget=93000;const s=generateBattle(d);assert.equal(s.armies.length,6);assert.equal(s.battle.sides[0].units.length,31);assert.ok(s.armies.every(a=>a.units.length<=10));
 assert.equal(new Set(customParticipants(d).map(u=>u.id)).size,42);validateSave(s);
 assert.equal(s.battle.sides[0].units.filter(u=>u.status==='active').length,1);
 for(const mutate of [d=>d.reinforcements[0].team.push(entry('chu')),d=>d.reinforcements[0].team[0]=d.ownTeam[0],d=>d.reinforcements[0].side=2,d=>d.reinforcements[0].tick=d.limit??480,d=>d.reinforcements[0].roles={leader:'shao',advisor:'shao'}]){const bad=structuredClone(d);mutate(bad);assert.throws(()=>validateCustomBattle(bad));}
});

test('unarrived commanders give neither military stratagems nor the seventh slot, and arrival enters council before replacement',()=>{
 const s=generateBattle(draft()),b=s.battle;assert.equal(frontlineCapacity(b,0),6);assert.ok(!battleStratagems(b).includes('cao-wuchao'));
 const u=b.sides[0].units.find(u=>u.id==='cao');assert.match(deployUnit(b,u.id,0,0),/尚未抵达/);lockDeployment(b);
 for(let n=0;n<4;n++)stepBattle(b);assert.equal(b.tick,4);assert.equal(u.arrivalConfirmed,false);assert.equal(u.status,'reserve');
 const fronts=structuredClone(b.sides[0].units.filter(u=>u.status==='active')),seed=b.seed;stepBattle(b);
 assert.equal(b.tick,4);assert.equal(b.seed,seed);assert.equal(b.reinforcementCouncil,'pending');assert.equal(u.arrivalConfirmed,true);assert.equal(u.status,'reserve');
 assert.equal(frontlineCapacity(b,0),7);assert.ok(battleStratagems(b).includes('cao-wuchao'));assert.deepEqual(b.sides[0].units.filter(u=>u.status==='active'),fronts);
 assert.equal(openReinforcementCouncil(b),null);const copy=validateSave(structuredClone(s));
 confirmReinforcementCouncil(b);confirmReinforcementCouncil(copy.battle);
 for(let n=0;n<16;n++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);assert.equal(u.status,'active');validateSave(s);
});

test('opposing AI uses the same arrival restrictions and does not request a player council',()=>{
 const d=swapCustomBattle(draft()),s=generateBattle(d),b=s.battle;lockDeployment(b);
 for(let n=0;n<5;n++)stepBattle(b);assert.equal(b.reinforcementCouncil,null);assert.equal(b.sides[1].units.find(u=>u.id==='cao').arrivalConfirmed,true);validateSave(s);
});

test('army editor isolates a reinforcement column, blocks duplicates and preserves all other columns',()=>{
 const d=validateCustomBattle(draft()),p=newScenarioSetup(d,'ownTeam',0);assert.deepEqual(p.selected,['cao','chu']);
 changeScenarioSetup(p,'unit-main','yu');assert.notEqual(p.editorId,'yu');changeScenarioSetup(p,'selected','shao',true);assert.ok(!p.selected.includes('shao'));
 changeScenarioSetup(p,'troops','chu',2000);const edited=scenarioSetupDraft(p);assert.equal(edited.reinforcements[0].team[1].troops,2000);assert.deepEqual(edited.ownTeam,d.ownTeam);assert.deepEqual(edited.enemyTeam,d.enemyTeam);assert.equal(d.reinforcements[0].team[1].troops,3000);
 const s=generateBattle(d),setup=newBattleSetup(s,'a1'),before=structuredClone(s.battle.sides[0].units.filter(u=>u.armyId!=='a1'));
 changeScenarioSetup(setup,'type','yu','crossbow');const changed=applyBattleSetup(s,setup);assert.deepEqual(changed.battle.sides[0].units.filter(u=>u.armyId!=='a1'),before);assert.equal(changed.testScenario.customBattle.reinforcements.length,1);validateSave(changed);
});

test('save validation rejects forged arrivals, foreign army provenance and early entry',()=>{
 const s=generateBattle(draft());
 for(const mutate of [u=>u.arrivalConfirmed=true,u=>u.reinforcementIndex=1,u=>{delete u.reinforcementIndex;delete u.arrivalTick;delete u.wave;delete u.arrivalConfirmed;},u=>u.arrivalTick=0,u=>u.armyId='a1',u=>u.wave=99,u=>u.hp--]){const bad=structuredClone(s),u=bad.battle.sides[0].units.find(u=>u.id==='cao');mutate(u);assert.throws(()=>validateSave(bad),/援军/);}
});

test('swapping preserves every army and arrival time, and defender hold goals work on either side',()=>{
 const d=draft();d.battleKind='defense';d.holdUntil=8;d.gateHp=999999;
 const swapped=swapCustomBattle(d);assert.equal(swapped.holdUntil,8);assert.equal(swapped.reinforcements[0].side,1);assert.equal(swapped.reinforcements[0].tick,4);
 assert.deepEqual(swapCustomBattle(swapped),validateCustomBattle(d));
 for(const input of [d,swapped]){const s=generateBattle(input);lockDeployment(s.battle);while(!s.battle.result)stepBattle(s.battle,{aiSides:[0,1]});assert.equal(s.battle.result.reason,'坚守成功');assert.equal(s.battle.result.winner,s.battle.siege.gate.side);validateSave(s);}
});
