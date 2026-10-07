import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,commandIntellect} from '../engine.mjs';
import {advanceBonds,bondCommandMultiplier,bondStratagemStrength,grantBondEntries,bondEntryIgnoresZoc,bondAttributes} from '../bonds.mjs';
import {stratagemProfile} from '../stratagems.mjs';
const unit=(id,type='spear')=>({id,type,level:10,troops:3000});
function scenario(ids){return createScenario('custom-battle',773,20,null,{seed:773,terrain:'land',ownTeam:ids.map(id=>unit(id)),enemyTeam:['person-661','person-433','person-371'].map(id=>unit(id))});}
test('rare roster is genuinely scarce and personal budgets range from one to six',()=>{
 assert.equal(Object.keys(BOND_DESIGNS).length,31);
 for(const [id,d] of Object.entries(BOND_DESIGNS).filter(([,d])=>d.category==='rare')){
  const holders=Object.values(BOND_ASSIGNMENTS).filter(a=>a[id]);assert.ok(holders.length>=3&&holders.length<=4);assert.ok(holders.every(a=>a[id]===1));assert.deepEqual(d.thresholds,[1,2,3]);
 }
 const totals=Object.values(BOND_ASSIGNMENTS).map(a=>Object.values(a).reduce((x,y)=>x+y,0));
 assert.ok(totals.every(n=>n>=1&&n<=6));assert.equal(totals.filter(n=>n===10).length,0);assert.ok(totals.filter(n=>n<=3).length>100);
});
test('low-budget officers can gain nothing on upgrades but finish their own preset at ten',()=>{
 let empty=0;
 for(let seed=0;seed<30;seed++){
  const u={id:'person-705',level:1};advanceBonds(u,seed);u.level=2;if(!advanceBonds(u).length)empty++;u.level=10;advanceBonds(u);assert.deepEqual(u.bondGrowth.levels,BOND_ASSIGNMENTS[u.id]);
 }
 assert.ok(empty>0);
});
test('entry records contain only actual arrival ticks and resume deterministically',()=>{
 const s=scenario(['cao','person-99','liao']),b=s.battle,u=b.sides[0].units[0];
 grantBondEntries(b);assert.equal(u.bondEntry,undefined);lockDeployment(b);
 assert.deepEqual(u.bondEntry,{tick:b.tick});assert.equal(bondEntryIgnoresZoc(b,u),false);
 const snapshot=structuredClone(u.bondEntry);grantBondEntries(b);assert.deepEqual(u.bondEntry,snapshot);
 assert.equal(bondCommandMultiplier(b,u),1);assert.equal(bondStratagemStrength(b,0),0);
 const bad=structuredClone(s);bad.battle.sides[0].units[0].bondEntry.power=.4;assert.throws(()=>validateSave(bad));
 const copy=validateSave(structuredClone(s));for(let i=0;i<25&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);
});
