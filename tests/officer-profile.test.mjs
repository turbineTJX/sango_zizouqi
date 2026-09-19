import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG,OFFICER_BY_ID,PROFILE_FIELDS,officerProfile,PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from '../officer-catalog.mjs';
import {makeOfficer,validateSave,stepBattle} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {officerProfileMarkup} from '../officer-roster.mjs';

test('effective scenario character traits are formal catalogue and runtime fields, preserving numeric zero',()=>{
 const mapping={personality:'personality',righteousness:'argumentation',compatibility:'compatibility',sex:'sex',birthYear:'yearBorn',deathYear:'yearDead'};
 for(const u of OFFICER_CATALOG){
  const runtime=makeOfficer(u.id);
  for(const [field,source] of Object.entries(mapping)){
   assert.equal(u[field],field==='sex'&&u.profileSource[source]===-1?null:u.profileSource[source]??null);assert.equal(runtime[field],u[field]);
  }
  assert.deepEqual(runtime.relations,u.relations);
 }
 assert.equal(PERSONALITY_NAMES[3],'刚胆');assert.equal(RIGHTEOUSNESS_NAMES[5],'不会背叛');
 const custom=makeOfficer('custom-1');assert.equal(custom.righteousness,0);assert.equal(custom.compatibility,0);assert.equal(custom.sex,1);
 const html=officerProfileMarkup(custom);assert.match(html,/未设置/);assert.match(html,/相性<\/dt><dd>0/);assert.match(html,/性别<\/dt><dd>女/);
});
test('sworn-sibling groups resolve all peers, exclude self, and keep directional likes unchanged',()=>{
 const ids=['person-636','person-99','person-433'];
 for(const id of ids){
  const u=OFFICER_BY_ID[id];
  assert.deepEqual([...u.relations.swornSiblingIds].sort(),ids.filter(x=>x!==id).sort());
  assert.equal(new Set(u.relations.swornSiblingIds).size,u.relations.swornSiblingIds.length);
 }
 const cao=OFFICER_BY_ID.cao;
 assert.ok(cao.relations.dislikedIds.every(id=>typeof id==='string'));
 assert.deepEqual(officerProfile('custom-1').relations,{fatherId:null,motherId:null,spouseIds:[],swornSiblingIds:[],likedIds:[],dislikedIds:[]});
 const html=officerProfileMarkup(makeOfficer('person-636'));
 assert.match(html,/data-id="person-99"/);assert.match(html,/data-id="person-433"/);assert.match(html,/关羽/);assert.match(html,/张飞/);
});
test('profile copies cannot mutate the shared catalogue or another officer instance',()=>{
 const a=makeOfficer('person-636'),b=makeOfficer('person-636'),before=structuredClone(OFFICER_BY_ID['person-636'].relations);
 a.relations.swornSiblingIds.pop();a.relations.spouseIds.push('person-1');
 assert.deepEqual(b.relations,before);assert.deepEqual(OFFICER_BY_ID['person-636'].relations,before);
 assert.deepEqual(officerProfile('not-in-library'),{personality:null,righteousness:null,compatibility:null,sex:null,birthYear:null,deathYear:null,relations:{fatherId:null,motherId:null,spouseIds:[],swornSiblingIds:[],likedIds:[],dislikedIds:[]}});
});
test('incomplete profile state is rejected without backfilling fields',()=>{
 for(const field of [...PROFILE_FIELDS,'relations']){
  const state=createScenario('officer-lab',33,20,['person-636','person-99','custom-1']);
  delete state.battle.sides[0].units[0][field];const before=structuredClone(state);
  assert.throws(()=>validateSave(state));assert.deepEqual(state,before);
 }
});
test('current saves reject invalid, missing and malformed profiles rather than silently changing them',()=>{
 for(const change of [
  u=>delete u.personality,u=>u.righteousness=-1,u=>u.compatibility='75',u=>u.sex=9,
  u=>u.birthYear=null,u=>u.deathYear=0,u=>u.relations=null,
  u=>u.relations.fatherId='custom-1',u=>u.relations.swornSiblingIds.push(u.id),
  u=>u.relations.spouseIds={},u=>u.relations.extra=[]
 ]){
  const s=createScenario('officer-lab',1,20,['person-636']);change(s.armies[0].units[0]);assert.throws(()=>validateSave(s),/资料|关系/);
 }
});
test('reserved profile fields do not affect combat decisions, numbers or historical death',()=>{
 const a=createScenario('officer-lab',15,20,['person-636','person-99','person-433']),b=structuredClone(a);
 for(const u of b.battle.sides.flatMap(s=>s.units)){u.personality=0;u.righteousness=0;u.compatibility=0;u.sex=1;u.birthYear=0;u.deathYear=1;}
 for(let i=0;i<25;i++){stepBattle(a.battle);stepBattle(b.battle);}
 for(const state of [a,b])for(const u of state.battle.sides.flatMap(s=>s.units))for(const key of [...PROFILE_FIELDS,'relations'])delete u[key];
 assert.deepEqual(a.battle,b.battle);
});
