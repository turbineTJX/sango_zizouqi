import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {battleStratagems,officerStratagems,validateSave} from '../engine.mjs';
test('自定义军团长与军师独立于队列，军略按指定人选带入并保存',()=>{
 const d=defaultCustomBattle();d.ownTeam.push({id:'person-255',level:8,type:'halberd',troops:3000});d.ownTeamRoles={leader:'person-255',advisor:'cao'};d.enemyTeamRoles={leader:'shao',advisor:'shao'};
 const s=createScenario('custom-battle',d.seed,20,null,d),b=s.battle;
 assert.equal(s.armies[0].leader,'person-255');assert.equal(s.armies[0].advisor,'cao');
 assert.deepEqual(new Set(battleStratagems(b)),new Set(['person-255','cao'].flatMap(officerStratagems)));
 assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))).testScenario.customBattle.ownTeamRoles,d.ownTeamRoles);
 d.ownTeamRoles.advisor='shao';assert.throws(()=>validateCustomBattle(d),/必须来自本军团/);
});
