import test from 'node:test';
import assert from 'node:assert/strict';
import {warTempoReport,observedJointParticipation,observedOffensiveBattle,mergeCampaignWindows} from '../scripts/war-tempo-report.mjs';

test('offensive classification uses actual attacking orders, including shared expedition orders',()=>{
 const r={attackSide:0,battle:{sides:[{units:[{armyId:'a1'}]},{units:[{armyId:'a2'}]}]},armies:[{id:'a1',task:'出征'},{id:'a2',task:'择敌出征'}]};
 assert.equal(observedOffensiveBattle(r),true);
 r.armies[0].task='行军';assert.equal(observedOffensiveBattle(r),false);
 assert.equal(observedOffensiveBattle(r,new Map([['a1',{purpose:'offensive'}]])),true);
 r.armies[0].defense=true;assert.equal(observedOffensiveBattle(r,new Map([['a1',{purpose:'offensive'}]])),false);
});

test('continued windows retain the original departure and attacking result across a stage boundary',()=>{
 const base={departures:[],battles:[],battleStarts:[],hunger:[],jointParticipation:[],captures:[],planTrace:[]};
 const first={...base,metrics:{startDay:1,completedDay:201,deterministicCheckpoints:1},departures:[{id:'a1',day:190,existingAtStart:false}],battleStarts:[{id:'b1',startedDay:200,offensive:true,attackSide:0}]};
 const next={...base,metrics:{startDay:201,completedDay:601,deterministicCheckpoints:2},departures:[{id:'a1',day:201,existingAtStart:true}],battleStarts:[{id:'b1',startedDay:200,endedDay:203,offensive:false,attackSide:0}],battles:[{id:'b1',startedDay:200,endedDay:203,offensive:false,attackSide:0,report:{winner:0}}]};
 const merged=mergeCampaignWindows([first,next]);assert.equal(merged.departures,1);assert.equal(merged.deterministicCheckpoints,3);assert.equal(merged.tempo.phases[1].offensiveWins,1);assert.equal(merged.tempo.phases[1].battleActiveTurns,.3);
});

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

test('quiet gaps count strategic turns and ongoing battles occupy their real calendar interval',()=>{
 const run={metrics:{startDay:1,completedDay:701},battles:[{id:'b1',startedDay:211,endedDay:220,offensive:true,attackSide:0,report:{winner:0}}],battleStarts:[{id:'b1',startedDay:211,endedDay:220},{id:'b2',startedDay:321,endedDay:330},{id:'b3',startedDay:431,endedDay:440},{id:'b4',startedDay:541,endedDay:550},{id:'b5',startedDay:611}],departures:[],captures:[{day:300,from:'neutral'}],hunger:[],planTrace:[]};
 const report=warTempoReport(run),middle=report.phases[1],late=report.phases[2];
 assert.equal(middle.longestQuietTurns,10);assert.equal(middle.assessment,'within_quiet_gap_target');
 assert.equal(middle.offensiveWins,1);assert.equal(middle.offensiveLosses,0);assert.equal(middle.neutralOccupations,1);
 assert.equal(late.longestQuietTurns,1);assert.equal(late.battleActiveTurns,9);assert.equal(late.activeBattlesAtPhaseEnd,1);
});

test('a quiet middle phase cannot pass using departures or neutral occupations as battle evidence',()=>{
 const report=warTempoReport({metrics:{startDay:1,completedDay:701},battles:[],departures:[{day:210}],captures:[{day:250,from:'neutral'}],hunger:[],planTrace:[]});
 assert.equal(report.phases[1].longestQuietTurns,40);assert.equal(report.phases[1].assessment,'quiet_gap_too_long');
 assert.equal(report.phases[2].assessment,'joint_combat_not_observed');
 const partial=warTempoReport({metrics:{startDay:201,completedDay:301},battles:[],departures:[],captures:[],hunger:[],planTrace:[]});
 assert.equal(partial.phases[1].assessment,'insufficient_observation');
});

test('bandit battles remain separate from wars and cannot conceal a quiet middle phase',()=>{
 const battle={id:'b1',banditCampId:'camp1',startedDay:202,endedDay:600,offensive:true,attackSide:0,report:{winner:0}};
 const report=warTempoReport({metrics:{startDay:1,completedDay:701},battles:[battle],battleStarts:[battle],departures:[],captures:[],hunger:[],planTrace:[]});
 assert.equal(observedOffensiveBattle(battle),false);assert.equal(report.phases[1].banditBattles,1);assert.equal(report.phases[1].startedBattles,0);assert.equal(report.phases[1].offensiveWins,0);assert.equal(report.phases[1].longestQuietTurns,40);assert.equal(report.phases[1].assessment,'quiet_gap_too_long');
});
