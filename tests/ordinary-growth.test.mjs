import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {makeOfficer,unitAttributes,lockDeployment,stepBattle,validateSave,settleBattle} from '../engine.mjs';
import {commonRouteKey,commonRouteName,skillRoute,passiveList,SKILL_ROUTES} from '../passives.mjs';
import {configureTactics,unitTactics,availableTactics,SPECIAL_TACTICS} from '../tactics.mjs';
import {createScenario} from '../scenarios.mjs';
import {rosterMarkup} from '../officer-roster.mjs';

test('ordinary officers may have no independent trait and never gain traits from levels',()=>{let checked=0;for(const p of OFFICER_CATALOG.filter(p=>!SPECIAL_TACTICS[p.id])){checked++;const a=makeOfficer(p.id,1000,0,1),b=makeOfficer(p.id,1000,0,10);assert.deepEqual(skillRoute(a),skillRoute(b));assert.equal(new Set(skillRoute(a)).size,skillRoute(a).length);assert.ok(unitTactics(a).length<=3);}assert.ok(checked>800);});

test('ordinary aptitude routes stay fixed through troop changes and keep specialization tradeoffs',()=>{
 for(const [id,key] of [['person-69','halberd'],['person-559','cavalry'],['person-46','archer'],['person-447','strategist'],['person-567','domestic']]){
  const u={...makeOfficer(id),level:10},route=skillRoute(u);assert.equal(commonRouteKey(u),key);assert.ok(commonRouteName(u));
  for(const type of ['spear','cavalry','archer','crossbow'])assert.deepEqual(skillRoute({...u,type,skillRouteType:type,intellect:0,politics:0}),route);
 }
 const wang={...makeOfficer('person-46'),level:10};assert.equal(unitAttributes(wang).attackInterval,unitAttributes({...wang,level:1}).attackInterval);
 assert.ok(!passiveList({...wang,type:'spear'}).some(s=>s.id==='rapid'));
 assert.match(rosterMarkup({query:'满宠'}),/满宠/);assert.doesNotMatch(rosterMarkup({query:'满宠'}),/技能待设计/);
});

test('ordinary officers fight with generated fixed kits and resume deterministically',()=>{const ids=['person-69','person-46','person-567','person-447','person-559','person-646'],state=createScenario('officer-lab',807,0,ids),b=state.battle;const kits=b.sides[0].units.map(u=>[...u.tactics]);lockDeployment(b);for(let i=0;i<12;i++)stepBattle(b);const copy=validateSave(structuredClone(state));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);assert.deepEqual(b.sides[0].units.map(u=>u.tactics),kits);assert.ok(b.sides[0].units.some(u=>u.skillCasts>0));const report=settleBattle(state);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);validateSave(state);});
