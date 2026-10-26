import {chooseStratagemPoint} from '../stratagem-area.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {STRATAGEMS,battleStratagems,COMMAND_RESOURCE} from '../engine.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {makeOfficer,validateSave,lockDeployment,stepBattle,issueCommand,settleBattle} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';

test('command and merit define individual capacity; fielded troops are independent',()=>{
 const lv=makeOfficer('person-661',8500,0,8),diao=makeOfficer('person-425',2000,0,8);
 assert.equal(troopCapacity(lv),8700);assert.equal(troopCapacity(diao),4900);
 assert.equal(troopCapacity({...lv,level:10}),9100);
 assert.throws(()=>makeOfficer('person-661',8701,0,8),/带兵/);
 for(const soldiers of [-1,NaN,2.5])assert.throws(()=>makeOfficer('cao',soldiers));
 const s=generateBattle({...defaultCustomBattle(),seed:1,ownTeam:[{id:'person-661',type:'cavalry',troops:8500,level:8}],enemyTeam:[{id:'cao',type:'spear',troops:3000,level:8}]});validateSave(structuredClone(s));
 for(const mutate of [s=>s.armies[0].units[0].troops=99999,s=>s.armies[0].units[0].wounded=99999,s=>s.battle.sides[1].units[0].initial=99999]){
  const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateSave(bad));
 }
});

test('outnumbered defense enforces a real hold objective and retreat still fails',()=>{
 // Author a 100% opening shield through the public scenario setting to isolate
 // hold timing from trait balance; surviving units and real commands remain required.
 const entry=id=>({id,type:'rattan',troops:3000,level:1});
 const c={seed:1,terrain:'land',battleKind:'defense',holdUntil:12,shieldPercent:100,ownTeam:[entry('jin')],enemyTeam:[entry('shao'),entry('yan')]},s=generateBattle(c),b=s.battle;
 assert.ok(c.enemyTeam.length>c.ownTeam.length&&c.enemyTeam.length<=10);
 lockDeployment(b);
 while(!b.result&&b.tick<c.holdUntil){
  if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key)assert.equal(issueCommand(b,key,chooseStratagemPoint(b,STRATAGEMS[key],0)),null);}
  stepBattle(b);
 }
 assert.equal(b.result.reason,'坚守成功');assert.equal(b.tick,c.holdUntil);assert.equal(b.result.winner,0);
 assert.ok(b.sides[0].units.some(u=>u.hp>0&&u.status==='active'));
 assert.ok(b.sides[1].units.some(u=>u.hp>0));
 const report=settleBattle(s);assert.ok(report.gate.remaining>0);validateSave(structuredClone(s));
 const bad=structuredClone(s);bad.report.tick=c.holdUntil-1;assert.throws(()=>validateSave(bad));
 const missing=generateBattle(c);delete missing.battle.holdUntil;assert.throws(()=>validateSave(missing));
 const retreat=generateBattle(c);lockDeployment(retreat.battle);assert.equal(issueCommand(retreat.battle,'retreat'),null);
 while(!retreat.battle.result)stepBattle(retreat.battle);
 assert.equal(retreat.battle.result.winner,1);
 // A normal guard scenario never inherits the special hold goal.
 const normal=generateBattle({...defaultCustomBattle(),battleKind:'field'});normal.battle.holdUntil=240;assert.throws(()=>validateSave(normal));
});
