import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,validateSave,stepBattle,deployUnit,reserveDeploymentUnit} from '../engine.mjs';
import {changeBattleCouncil} from '../battle-council.mjs';
function draft(){const d=defaultCustomBattle(),ids=Object.keys(OFFICER_BY_ID).filter(id=>id!=='shao');d.ownTeam=ids.slice(0,10).map(id=>({id,type:'spear',troops:3000,level:5}));return d;}
test('custom armies allow ten with six active, reject eleven, and configure either defending side',()=>{
 const d=draft();validateCustomBattle(d);
 for(const [battleKind,side] of [['field',null],['defense',0],['siege',1]]){
 const s=createScenario('custom-battle',3,20,null,{...d,battleKind,gateHp:18000});
 assert.equal(s.armies[0].units.length,10);assert.equal(s.battle.sides[0].units.filter(u=>u.status==='active').length,6);
 if(side===null)assert.ok(!s.battle.siege);else{assert.equal(s.battle.siege.gate.side,side);assert.equal(s.battle.siege.gate.hp,18000);}
 validateSave(s);
 }
 d.ownTeam.push({...d.ownTeam[0]});assert.throws(()=>validateCustomBattle(d),/10/);
});
test('council rejects posture changes, changes starters, respects arrivals and resumes deterministically',()=>{
 const s=createScenario('custom-battle',3,20,null,draft()),b=s.battle,learning=b.sides[0].units.map(u=>[u.id,JSON.stringify(u.tacticLearning)]);
 assert.match(changeBattleCouncil(b,{tactic:'defensive'}),/不支持/);
 const reserve=b.sides[0].units[6].id;assert.equal(changeBattleCouncil(b,{id:reserve,offset:-1}),null);
 assert.equal(b.sides[0].units[5].id,reserve);assert.equal(b.sides[0].units.filter(u=>u.status==='active').length,6);
 for(const [id,record] of learning)assert.equal(JSON.stringify(b.sides[0].units.find(u=>u.id===id).tacticLearning),record);
 validateSave(s);lockDeployment(b);assert.match(changeBattleCouncil(b,{tactic:'balanced'}),/战前/);
 const copy=JSON.parse(JSON.stringify(s));for(let i=0;i<12;i++){stepBattle(s.battle);stepBattle(copy.battle);}assert.deepEqual(s,copy);
});

test('reserve bench supports swaps, ordering, overflow validation and saved deployment',()=>{
 const s=createScenario('custom-battle',3,20,null,draft()),b=s.battle,units=b.sides[0].units;
 const active=units.find(u=>u.status==='active'),reserve=units.find(u=>u.status==='reserve'),x=active.x,y=active.y;
 assert.equal(deployUnit(b,reserve.id,x,y),null);assert.equal(active.status,'reserve');assert.equal(reserve.status,'active');
 assert.equal(reserveDeploymentUnit(b,reserve.id,active.id),null);assert.ok(units.indexOf(reserve)<units.indexOf(active));
 const positions=[];for(let y=0;y<8;y++)for(let x=0;x<5;x++)if(!units.some(u=>u.status==='active'&&u.x===x&&u.y===y))positions.push([x,y]);
 for(const u of [reserve,active]){const [x,y]=positions.shift();assert.equal(deployUnit(b,u.id,x,y),null);}
 assert.match(lockDeployment(b),/7/);const tick=b.tick;stepBattle(b);assert.equal(b.tick,tick);assert.equal(b.deploymentLocked,false);validateSave(JSON.parse(JSON.stringify(s)));
 for(const u of [...units].filter(u=>u.status==='active'))assert.equal(reserveDeploymentUnit(b,u.id),null);
 assert.match(lockDeployment(b),/0/);assert.equal(deployUnit(b,reserve.id,1,1),null);assert.equal(lockDeployment(b),null);assert.match(reserveDeploymentUnit(b,reserve.id),/开战前/);
});

 test('removed postures do not change attributes or field intent',async()=>{
 const {unitAttributes}=await import('../unit-stats.mjs');const {battleIntent}=await import('../engine.mjs');const {battleCouncilMarkup}=await import('../battle-council.mjs');
 const state=createScenario('custom-battle',3,20,null,draft()),b=state.battle,u=b.sides[0].units[0];
 delete b.sides[0].battleIntent;
 const values=['balanced','aggressive','defensive'].map(tactic=>{b.sides[0].tactic=tactic;return {attributes:unitAttributes(u,b),intent:battleIntent(b,0)};});
 assert.deepEqual(values[0],values[1]);assert.deepEqual(values[0],values[2]);assert.equal(values[0].intent,'annihilate');assert.doesNotMatch(battleCouncilMarkup(b),/council-tactic|全军策略/);
 });
