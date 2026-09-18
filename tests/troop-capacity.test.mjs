import test from 'node:test';
import assert from 'node:assert/strict';
import {troopCapacity} from '../troop-capacity.mjs';
import {makeOfficer,validateSave,lockDeployment,stepBattle,issueCommand,settleBattle} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {TACTICAL_CAMPAIGNS,scenarioTroops} from '../tactical-campaigns.mjs';

test('command and experience define individual capacity; fielded troops are independent',()=>{
 const lv=makeOfficer('person-661',8500,0,8),diao=makeOfficer('person-425',2000,0,8);
 assert.equal(troopCapacity(lv),8700);assert.equal(troopCapacity(diao),4900);
 assert.equal(troopCapacity({...lv,level:10}),9100);
 assert.throws(()=>makeOfficer('person-661',8701,0,8),/带兵/);
 for(const soldiers of [-1,NaN,2.5])assert.throws(()=>makeOfficer('cao',soldiers));
 const s=createScenario('tactical-three-heroes');validateSave(structuredClone(s));
 for(const mutate of [s=>s.armies[0].units[0].troops=99999,s=>s.armies[0].units[0].wounded=99999,s=>s.battle.sides[1].units[0].initial=99999]){
  const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateSave(bad));
 }
 const preset=TACTICAL_CAMPAIGNS.find(c=>c.id==='tactical-three-heroes');
 assert.equal(scenarioTroops(preset,0),8500);assert.equal(scenarioTroops(preset,1),8500);
});

for(const c of TACTICAL_CAMPAIGNS)test(`${c.id}: current deployment, legal capacity and deterministic continuation`,()=>{
 const s=createScenario(c.id),b=s.battle;
 assert.equal(b.commandProgress,0);
 for(const side of b.sides)for(const u of side.units){assert.equal(u.intent,0);assert.ok(u.initial<=troopCapacity(u));}
 lockDeployment(b);for(let i=0;i<31;i++)stepBattle(b);
 const resumed=validateSave(JSON.parse(JSON.stringify(s)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(b,resumed.battle);
 const report=settleBattle(s);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.wounded+side.killed);
 validateSave(JSON.parse(JSON.stringify(s)));
});

test('outnumbered defense enforces a real hold objective and retreat still fails',()=>{
 const c=TACTICAL_CAMPAIGNS.find(c=>c.holdUntil),s=createScenario(c.id),b=s.battle;
 assert.ok(scenarioTroops(c,1)>scenarioTroops(c,0)*2);
 lockDeployment(b);
 while(!b.result&&b.tick<c.holdUntil)stepBattle(b);
 assert.equal(b.result.reason,'坚守成功');assert.equal(b.tick,c.holdUntil);assert.equal(b.result.winner,0);
 assert.ok(b.sides[0].units.some(u=>u.hp>0&&u.status==='active'));
 assert.ok(b.sides[1].units.some(u=>u.hp>0));
 const report=settleBattle(s);assert.ok(report.gate.remaining>0);validateSave(structuredClone(s));
 const bad=structuredClone(s);bad.report.tick=c.holdUntil-1;assert.throws(()=>validateSave(bad));
 const missing=createScenario(c.id);delete missing.battle.holdUntil;assert.throws(()=>validateSave(missing));
 const retreat=createScenario(c.id);lockDeployment(retreat.battle);assert.equal(issueCommand(retreat.battle,'retreat'),null);
 while(!retreat.battle.result)stepBattle(retreat.battle);
 assert.equal(retreat.battle.result.winner,1);
 // A normal guard scenario never inherits the special hold goal.
 const normal=createScenario('history-hefei');normal.battle.holdUntil=240;assert.throws(()=>validateSave(normal));
});
