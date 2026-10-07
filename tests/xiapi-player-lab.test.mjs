import test from 'node:test';import assert from 'node:assert/strict';
import {xiapiState,plans,adaptedPlans,fixedOwnAI,playerCommand,simulateXiapi,DEV_SEEDS,XIAPI_IDS} from '../scripts/xiapi-player-lab.mjs';
import {sideBonds} from '../bonds.mjs';import {generateBattle} from '../battle-generator.mjs';import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {validateSave,COMMAND_RESOURCE,fillSlots,reserveDeploymentUnit,stepBattle} from '../engine.mjs';

test('human starter swaps use six real historical units and preserve the fixed enemy plan, kits and budget',()=>{
 const before=xiapiState(plans.find(p=>p.id==='default'),DEV_SEEDS[0]),after=xiapiState(plans.find(p=>p.id==='beauty-north'),DEV_SEEDS[0]);
 assert.deepEqual(after.battle.sides[1],before.battle.sides[1]);assert.equal(after.battle.sides[0].units.reduce((n,u)=>n+u.initial,0),38000);
 assert.deepEqual(sideBonds(after.battle,0).bondBeauty,{points:2,tier:1});assert.deepEqual(sideBonds(after.battle,0).bondValor,{points:3,tier:1});
 assert.equal(after.battle.sides[0].units.filter(u=>u.status==='active').length,6);assert.equal(after.battle.sides[0].units.find(u=>u.id===XIAPI_IDS.diao).status,'active');
 assert.doesNotThrow(()=>validateSave(structuredClone(after)));
});
test('concentration and pressure cases obey actual capacity, minimum unit sizes and total troop budgets',()=>{
 const plan=adaptedPlans.find(p=>p.id==='concentrated-center');
 for(const ratio of [1,.9,.8]){const state=xiapiState(plan,DEV_SEEDS[0],{ratio,lock:false}),us=state.battle.sides[0].units;assert.equal(us.reduce((n,u)=>n+u.initial,0),38000*ratio);assert.ok(us.every(u=>u.initial>=1000));assert.equal(state.battle.deploymentLocked,false);assert.doesNotThrow(()=>validateSave(structuredClone(state)));}
});
test('fixed own AI projects only legal positions, changes neither enemy state nor RNG, and yields valid saves',()=>{
 const state=generateBattle(historicalBattleDraft('xiapi')),b=state.battle,enemy=structuredClone(b.sides[1]),seed=b.seed;fixedOwnAI(b);
 assert.equal(b.seed,seed);assert.deepEqual(b.sides[1],enemy);assert.ok(b.sides[0].units.filter(u=>u.status==='active').every(u=>u.x>=0&&u.x<=4&&u.y>=0&&u.y<=7));assert.doesNotThrow(()=>validateSave(structuredClone(state)));
});
test('player command decisions read current public state without spending gauge or advancing RNG',()=>{
 const b=xiapiState(adaptedPlans.find(p=>p.id==='concentrated-center'),DEV_SEEDS[0]).battle;b.commandProgress=COMMAND_RESOURCE.capacity;
 const before=structuredClone(b);playerCommand(b);assert.deepEqual(b,before);
});
test('a legal tactical battle records actual hits and orders and resumes identically at the saved boundary',()=>{
 const row=simulateXiapi(adaptedPlans.find(p=>p.id==='concentrated-center'),DEV_SEEDS[0],{replay:true});
 assert.ok(row.metrics.damage.every(n=>n>0));assert.ok(row.metrics.diaoAttacks>0);assert.ok(row.metrics.orders.length>0);assert.equal(row.diagnostic,false);assert.equal(row.opening.units[0].filter(u=>u.status==='active').length,6);
});

test('both AI sides use existing reserve ranking while normal player games retain their queue',()=>{
 const state=generateBattle(historicalBattleDraft('xiapi'));assert.equal(reserveDeploymentUnit(state.battle,XIAPI_IDS.lu),null);
 const player=structuredClone(state),ai=structuredClone(state),order=state.battle.sides[0].units.map(u=>u.id);
 fillSlots(player.battle,0);fillSlots(ai.battle,0,{ai:true});
 assert.equal(player.battle.sides[0].units.find(u=>u.id===XIAPI_IDS.wei).status,'active');assert.equal(player.battle.sides[0].units.find(u=>u.id===XIAPI_IDS.lu).status,'reserve');
 assert.equal(ai.battle.sides[0].units.find(u=>u.id===XIAPI_IDS.lu).status,'active');assert.deepEqual(ai.battle.sides[0].units.map(u=>u.id),order);assert.deepEqual(player.battle.sides[0].units.map(u=>u.id),order);
 assert.doesNotThrow(()=>validateSave(ai));assert.doesNotThrow(()=>validateSave(player));
});
test('AI audit controls spend completed-step command gauge on either side while the player stays manual by default',()=>{
 const state=xiapiState(plans.find(p=>p.id==='default'),DEV_SEEDS[0]),manual=structuredClone(state.battle),ai=structuredClone(state.battle);manual.commandProgress=ai.commandProgress=COMMAND_RESOURCE.capacity;
 stepBattle(manual);stepBattle(ai,{aiSides:[0,1]});assert.equal(manual.commandSerial,0);assert.equal(ai.commandSerial,1);assert.equal(ai.lastCommand.tick,1);assert.equal(ai.commandProgress,0);
 const copy=structuredClone(ai);for(let i=0;i<8;i++){stepBattle(ai,{aiSides:[0,1]});stepBattle(copy,{aiSides:[0,1]});}assert.deepEqual(ai,copy);
});
