import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,lockDeployment,stepBattle,validateSave,unitAttributes} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {officerTraits} from '../officer-traits.mjs';
import {passiveList,passiveAttributes,passiveDamageTaken,passiveDamageMultiplier,supportMultiplier,intentIncome} from '../passives.mjs';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {sideBonds,bondCaps,bondLevels} from '../bonds.mjs';
import {TROOP_INTENT} from '../combat-rules.mjs';
const entry=(id,type='spear',level=10)=>({id,type,troops:3000,level});
function scene(){const state=createScenario('custom-battle',91,20,null,{seed:91,terrain:'land',ownTeam:['cao','liao','person-99'].map(id=>entry(id,'cavalry')),enemyTeam:['shao','wen','yan'].map(id=>entry(id))});lockDeployment(state.battle);return state;}
test('independent traits remain fixed while bond levels grow to actual personal caps',()=>{
 for(const id of ['cao','person-661','person-290','person-533']){const a=makeOfficer(id,3000,0,1,91),b=makeOfficer(id,3000,0,10,91);assert.deepEqual(officerTraits(a),officerTraits(b));assert.deepEqual(bondLevels(b),bondCaps(b));assert.ok(passiveList(b).filter(t=>t.cap).every(t=>t.level<=t.cap));}
});
test('troop income has no removed personal denial or support multiplier',()=>{
 for(const id of ['cao','jia','person-661','yu'])for(const type of Object.keys(TROOP_INTENT)){const u={...makeOfficer(id,3000),type};assert.deepEqual(intentIncome(u),TROOP_INTENT[type]);assert.equal(supportMultiplier({},u),1);}
});
test('actual holders contribute only while on field and do not regain retired troop-family bonds',()=>{
 const state=scene(),b=state.battle,u=b.sides[0].units[0],points=sideBonds(b,0).bondSong.points;
 assert.equal(points,b.sides[0].units.reduce((n,v)=>n+(BOND_ASSIGNMENTS[v.id].bondSong||0),0));
 u.status='reserve';assert.equal(sideBonds(b,0).bondSong?.points||0,points-(BOND_ASSIGNMENTS[u.id].bondSong||0));assert.deepEqual(passiveAttributes(b,u),{});u.status='active';
 const before=sideBonds(b,0);u.type='longbow';assert.deepEqual(sideBonds(b,0),before);assert.equal(sideBonds(b,0).bondHorse,undefined);
});

test('ordinary and upgraded legal battles preserve actual damage and current snapshots',()=>{
 for(const level of [1,10]){const state=createScenario('custom-battle',71,20,null,{seed:71,terrain:'land',ownTeam:['cao','liao','jin'].map(id=>entry(id,'cavalry',level)),enemyTeam:['shao','wen','yan'].map(id=>entry(id,'spear',level))}),b=state.battle;lockDeployment(b);for(let i=0;i<20;i++)stepBattle(b);const copy=validateSave(structuredClone(state));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(state,copy);for(const u of b.sides.flatMap(s=>s.units))assert.ok(u.hp>=0&&u.hp<=u.maxHp);assert.ok(b.journal?.events?.length||b.tick>0);}
});
