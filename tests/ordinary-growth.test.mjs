import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {makeOfficer,unitAttributes,lockDeployment,stepBattle,validateSave,settleBattle} from '../engine.mjs';
import {commonRouteKey,commonRouteName,skillRoute,passiveList,SKILL_ROUTES,SKILL_LEVELS} from '../passives.mjs';
import {configureTactics,unitTactics,availableTactics} from '../tactics.mjs';
import {createScenario} from '../scenarios.mjs';
import {rosterMarkup} from '../officer-roster.mjs';

test('all ordinary officers unlock five generic skills at the same levels as famous officers',()=>{
 for(const p of OFFICER_CATALOG.filter(p=>!SKILL_ROUTES[p.id])){
  const u=makeOfficer(p.id),route=skillRoute(u);assert.equal(route.length,5);assert.equal(new Set(route).size,5);
  for(const level of [1,2,3,5,8,10]){const skills=passiveList({...u,level});assert.equal(skills.filter(s=>s.unlocked).length,SKILL_LEVELS.filter(n=>n<=level).length);assert.ok(skills.every(s=>s.tier!=='专属'));}
  assert.equal(availableTactics(u).length,6);
 }
});

test('ordinary aptitude routes stay fixed through troop changes and keep specialization tradeoffs',()=>{
 for(const [id,key] of [['person-69','spear'],['person-559','cavalry'],['person-46','archer'],['person-447','strategist'],['person-567','domestic']]){
  const u={...makeOfficer(id),level:10},route=skillRoute(u);assert.equal(commonRouteKey(u),key);assert.ok(commonRouteName(u));
  for(const type of ['spear','cavalry','archer','crossbow'])assert.deepEqual(skillRoute({...u,type,skillRouteType:type,intellect:0,politics:0}),route);
 }
 const wang={...makeOfficer('person-46'),level:10};assert.ok(unitAttributes(wang).attackInterval<unitAttributes({...wang,level:1}).attackInterval);
 assert.ok(passiveList({...wang,type:'spear'}).some(s=>s.id==='rapid'&&s.state==='兵种不符'));
 assert.match(rosterMarkup({query:'满宠'}),/治政交涉/);assert.doesNotMatch(rosterMarkup({query:'满宠'}),/技能待设计/);
});

test('ordinary officers use legal support and damage builds in real combat and resume deterministically',()=>{
 const ids=['person-69','person-46','person-567','person-447','person-559','person-646'];
 const state=createScenario('officer-lab',807,0,ids),b=state.battle;
 const configs=[['spear',['phalanx','ward','cleanse']],['archer',['fire','wildfire','scatter']],['crossbow',['screen','seal','ambush']],['archer',['smoke','wildfire','rally']],['cavalry',['rush','gallop','valor']],['spear',['strike','thrust','doubt']]];
 for(const units of [state.armies[0].units,b.sides[0].units])units.forEach((u,i)=>{u.type=configs[i][0];assert.equal(learnFixtureTactics(u,configs[i][1]),null);});
 lockDeployment(b);for(let i=0;i<12;i++)stepBattle(b);const resumed=validateSave(structuredClone(syncFixtureLearning(state)));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}assert.deepEqual(resumed.battle,b);
 assert.ok(b.sides[0].units.every(u=>Object.keys(u.tacticCasts).length>0));
 assert.ok(b.sides[0].units[2].tacticCasts.screen>0);
 const report=settleBattle(state);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);validateSave(state);
 assert.ok(state.armies[0].units.every(u=>unitTactics(u).length===3));
});
