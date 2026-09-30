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
test('rare roster is genuinely scarce and personal budgets range from two to ten',()=>{
 assert.equal(Object.keys(BOND_DESIGNS).length,18);
 for(const [id,d] of Object.entries(BOND_DESIGNS).filter(([,d])=>d.category==='rare')){
  const holders=Object.values(BOND_ASSIGNMENTS).filter(a=>a[id]);assert.ok(holders.length>=3&&holders.length<=4);assert.ok(holders.every(a=>a[id]===1));assert.deepEqual(d.thresholds,id==='bondPeach'?[2,3]:[1,2,3]);
 }
 const totals=Object.values(BOND_ASSIGNMENTS).map(a=>Object.values(a).reduce((x,y)=>x+y,0));
 assert.ok(totals.every(n=>n>=2&&n<=10));assert.equal(totals.filter(n=>n===10).length,0);assert.ok(totals.filter(n=>n<=3).length>100);
});
test('low-budget officers can gain nothing on upgrades but finish their own preset at ten',()=>{
 let empty=0;
 for(let seed=0;seed<30;seed++){
  const u={id:'person-705',level:1};advanceBonds(u,seed);u.level=2;if(!advanceBonds(u).length)empty++;u.level=10;advanceBonds(u);assert.deepEqual(u.bondGrowth.levels,BOND_ASSIGNMENTS[u.id]);
 }
 assert.ok(empty>0);
});
test('entry bonuses wait for lock, use the whole field and cannot be refreshed',()=>{
 const s=scenario(['cao','person-99','liao']),b=s.battle,u=b.sides[0].units[0];u.type='cavalry';
 grantBondEntries(b);assert.equal(u.bondEntry,undefined);const intent=u.intent;lockDeployment(b);
 assert.equal(u.intent,Math.min(100,intent+u.bondEntry.intent));assert.ok(u.bondEntry.intent>0);assert.equal(bondEntryIgnoresZoc(b,u),true);
 const snapshot=structuredClone(u.bondEntry);u.intent=0;grantBondEntries(b);assert.equal(u.intent,0);assert.deepEqual(u.bondEntry,snapshot);
 b.tick=snapshot.zocUntil;assert.equal(bondEntryIgnoresZoc(b,u),false);
});
test('three vanguards get a temporary entry effect and save resumes deterministically',()=>{
 const s=scenario(['person-70','person-119','person-126']),b=s.battle;lockDeployment(b);
 const u=b.sides[0].units[0];assert.equal(u.bondEntry.power,.4);assert.equal(u.bondEntry.attackSpeed,.15);
 assert.ok(bondAttributes(b,u).martialPower);const bad=structuredClone(s);bad.battle.sides[0].units[0].bondEntry.powerUntil+=100;assert.throws(()=>validateSave(bad));
 const copy=validateSave(JSON.parse(JSON.stringify(s)));
 for(let i=0;i<25&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);
 assert.equal(bondAttributes(b,u).martialPower?.some(m=>m.label==='先登入场')||false,false);
});
test('master retains its multiplier and unavailable providers stop support',()=>{
 const s=scenario(['person-290','jia','person-558']),b=s.battle;lockDeployment(b);const own=b.sides[0].units;
 assert.equal(bondCommandMultiplier(b,own[0]),1.5);assert.ok(commandIntellect(b)<=Math.round(own.reduce((n,u)=>n+u.intellect,0)*1.5));
 for(const u of own)u.withdrawing=true;assert.equal(bondCommandMultiplier(b,own[0]),1);assert.equal(commandIntellect(b),0);
});
test('command strengthens ordinary numerical effects only, never exclusive or duration',()=>{
 const s=scenario(['cao','person-246','person-603']),b=s.battle;lockDeployment(b);assert.equal(bondStratagemStrength(b,0),.3);
 const holder={id:'cao'},base=stratagemProfile('assault',holder),boost=stratagemProfile('assault',holder,.3);
 assert.equal(boost.strength,base.strength*1.3);assert.equal(boost.duration,base.duration);assert.equal(stratagemProfile('cao-wuchao',holder,.3).bondStrength,0);
 for(const u of b.sides[0].units)u.withdrawing=true;assert.equal(bondStratagemStrength(b,0),0);
});
import {issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
test('ordinary command is naturally charged, boosted, saved and resumed in real combat',()=>{
 const state=createScenario('custom-battle',7311,20,null,{seed:7311,terrain:'land',ownTeam:['cao','person-246','person-603','jia','liao','chu'].map(id=>({...unit(id),troops:5000})),enemyTeam:['shao','wen','yan','tian','gao','person-290'].map(id=>({...unit(id),troops:5000})),ownTeamRoles:{leader:'cao',advisor:'person-603'}});
 const b=state.battle;for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;lockDeployment(b);
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
 assert.equal(b.result,null);assert.equal(issueCommand(b,'assault'),null);assert.equal(b.lastCommand.source.bondStrength,.3);
 const copy=validateSave(structuredClone(state));for(let i=0;i<8;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(state,copy);
});

