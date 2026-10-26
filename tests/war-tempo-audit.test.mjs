import test from 'node:test';
import assert from 'node:assert/strict';
import {warTempoReport,observedJointParticipation} from '../scripts/war-tempo-report.mjs';

test('actual joint participation requires two arrived living real armies on the same side',()=>{
 const unit=(armyId,extra={})=>({armyId,hp:1000,status:'active',arrivalConfirmed:true,...extra});
 const r={id:'b1',armyIds:['a1','a2','a3','a4','a5','a6','a7','city:x'],battle:{tick:20,sides:[{faction:'cao',units:[unit('a1'),unit('a1'),unit('a2',{status:'reserve'}),unit('a3',{arrivalConfirmed:false}),unit('a4',{arrivalTick:21}),unit('a5',{hp:0}),unit('a6',{withdrawing:true}),unit('a7',{retreatDispatched:true}),unit('city:x')]},{faction:'yuan',units:[unit('a3')]}]}};
 assert.deepEqual(observedJointParticipation(r),[{battleId:'b1',side:0,faction:'cao',armyIds:['a1','a2']}]);
 r.battle.sides[0].units.find(u=>u.armyId==='a2').status='withdrawn';assert.deepEqual(observedJointParticipation(r),[]);
});

test('natural war audit separates completed early, middle and late turns and army departures from battles',()=>{
 const operation=(day,id,refs,phase='attack')=>({day,id,phase,faction:'a',tasks:[{id:'assault',refs}]});
 const run={metrics:{startDay:1,completedDay:701},battles:[{startedDay:200,endedDay:203},{startedDay:600,endedDay:603}],battleStarts:[{startedDay:200},{startedDay:600},{startedDay:691}],departures:[{day:2},{day:210},{day:611},{day:701},{day:1,existingAtStart:true}],captures:[],hunger:[],
  planTrace:[operation(1,1,['army:a']),operation(202,1,[],'done'),operation(610,2,['army:b','army:c']),operation(620,3,['army:d']),operation(630,2,[],'done')]};
 const {phases,completedTurns}=warTempoReport(run);assert.equal(completedTurns,70);
 assert.deepEqual(phases.map(p=>[p.fromTurn,p.toTurn,p.observedTurns,p.startedBattles,p.settledBattles,p.departures]),[[1,20,20,1,0,1],[21,60,40,1,1,1],[61,70,10,1,1,1]]);
 assert.equal(phases[2].jointOperations,1);assert.equal(phases[2].maximumArmiesInOperation,2);assert.equal(phases[2].maximumParallelAttacks,2);
});

test('a six turn natural audit supplies only early evidence and leaves unobserved phases empty',()=>{
 const {phases}=warTempoReport({metrics:{startDay:1,completedDay:61},battles:[],departures:[],captures:[],hunger:[],planTrace:[]});
 assert.equal(phases[0].observedTurns,6);assert.equal(phases[1].observedTurns,0);assert.equal(phases[2].observedTurns,0);assert.equal(phases[1].battlesPerTenTurns,null);assert.equal(phases[2].fromTurn,null);
});
