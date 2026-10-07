import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {advanceBonds,bondLevels,bondCaps,sideBonds,activeBonds,bondAttributes,validBondGrowth} from '../bonds.mjs';
import {gainMerit} from '../progression.mjs';
import {makeOfficer,validateSave,lockDeployment,stepBattle} from '../engine.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {hasPassive,passiveList} from '../passives.mjs';
import {traitIgnoresZoc} from '../trait-mechanics.mjs';
test('all 832 personal growth ceilings complete at ten without exceeding caps',()=>{
 assert.equal(Object.keys(BOND_ASSIGNMENTS).length,832);
 for(const id of Object.keys(BOND_ASSIGNMENTS))for(const seed of [1,79,521]){
  const u={id,level:1};advanceBonds(u,seed);
  for(let level=2;level<=10;level++){u.level=level;advanceBonds(u);assert.ok(validBondGrowth(u));}
  assert.deepEqual(bondLevels(u),bondCaps(u));
 }
});
test('random progression survives save, bulk upgrades and changes of troop',()=>{
 const a=makeOfficer('cao',3000,0,1,14),b=structuredClone(a);
 gainMerit(a,400);const copy=JSON.parse(JSON.stringify(a));a.type='cavalry';
 gainMerit(a,2000);gainMerit(copy,2000);gainMerit(b,2400);
 assert.deepEqual(a.bondGrowth,copy.bondGrowth);assert.deepEqual(a.bondGrowth,b.bondGrowth);
 const outcomes=new Set(Array.from({length:25},(_,seed)=>JSON.stringify(makeOfficer('cao',3000,0,5,seed).bondGrowth.levels)));
 assert.ok(outcomes.size>1);
});
test('only live field units sum levels; reserve arrival and retreat immediately update tiers',()=>{
 const unit=(id,n,status='active')=>({id,side:0,type:'cavalry',status,hp:1000,level:10,bondGrowth:{levels:{bondGuard:n}}});
 const a=unit('a',3),b=unit('b',2),c=unit('c',2,'reserve');const battle={sides:[{units:[a,b,c]},{units:[]}]};
 assert.equal(sideBonds(battle,0).bondGuard.points,5);assert.equal(traitIgnoresZoc(battle,a),false);
 c.status='active';assert.equal(sideBonds(battle,0).bondGuard.points,7);assert.equal(traitIgnoresZoc(battle,a),false);
 c.status='retreated';assert.equal(sideBonds(battle,0).bondGuard.points,5);
 b.hp=0;assert.equal(sideBonds(battle,0).bondGuard.points,3);
 assert.equal(bondAttributes(battle,a).move,undefined);assert.deepEqual(activeBonds(battle,c),[]);
});
test('independent commander traits remain and replaced battle traits no longer activate',()=>{
 assert.equal(hasPassive(makeOfficer('cao',3000,0,1),'hero-cao'),true);
 assert.equal(hasPassive(makeOfficer('person-661',3000,0,10),'hero-person-661'),false);
 assert.ok(passiveList(makeOfficer('cao',3000,0,10)).some(t=>t.cap&&t.level===t.cap));
});
test('real combat and save validation preserve bond growth',()=>{
 const s=createScenario('field',817);lockDeployment(s.battle);for(let i=0;i<10;i++)stepBattle(s.battle);
 const copy=validateSave(JSON.parse(JSON.stringify(s)));
 for(let i=0;i<10;i++){stepBattle(s.battle);stepBattle(copy.battle);}assert.deepEqual(s,copy);
 const bad=structuredClone(s);bad.armies.flatMap(a=>a.units)[0].bondGrowth.levels.invalid=3;assert.throws(()=>validateSave(bad));
});
import {bondDamage,bondProtection} from '../bonds.mjs';
import {unitAttributes} from '../unit-stats.mjs';
test('retired troop synergies grant no cavalry damage or defense bonuses',()=>{
 const u=makeOfficer('cao',3000,0,10);Object.assign(u,{side:0,status:'active',hp:3000,maxHp:3000,type:'spear',statuses:{}});
 const b={tick:1,sides:[{units:[u]},{units:[]}]},t={side:1,type:'cavalry',hp:3000,status:'active'};
 assert.equal(bondDamage(b,u,t,'basic'),1);assert.equal(bondProtection(b,u,'basic'),1);
 assert.equal(bondAttributes(b,u).defense,undefined);
});
