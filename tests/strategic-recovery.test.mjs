import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRecoveryCapacity,recoveryAdvantageRequirement} from '../strategic-recovery.mjs';
import {assessCombatForce} from '../strategic-combat-assessment.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {offensiveFacts,evaluateOffensive} from '../strategic-ai.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn} from '../domestic.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';

function depot(changes={}){return {cityId:'ye',men:6000,trainingRate:.5,gold:0,manpower:0,grain:20000,dailyFood:100,income:{gold:1000,grain:2000,manpower:1000},recurringGold:100,
 quota:1000,nextQuota:1000,manpowerCapacity:30000,grainCapacity:30000,operations:[],incoming:[],workRemaining:{gold:500,grain:3000,manpower:1500},workLimit:{gold:500,grain:3000,manpower:1500},...changes};}
const recovery=(city,loss=2000,returnDays=2)=>assessRecoveryCapacity({day:1,returnDays,cities:[city]},loss);
const proposal=f=>({faction:'yuan',staging:f.home,target:f.target,groups:[{c:f.home,units:f.home.units.slice(0,3),days:0}],assaultDays:1,siegeDays:2});

test('recovery forecasts use actual later income and quota without spending current stocks',()=>{
 const city=depot(),before=structuredClone(city),result=recovery(city);
 assert.equal(result.currentCoverage,0);assert.equal(result.feasible,true);assert.equal(result.readyDay,21);assert.ok(result.projectedCoverage>=1);assert.deepEqual(city,before);
 const poor=recovery({...city,income:{gold:0,grain:2000,manpower:0}});assert.equal(poor.feasible,false);
});
test('unused recruitment quotas do not accumulate before the army really returns',()=>{
 const result=recovery(depot({gold:10000,manpower:10000,income:{gold:0,grain:2000,manpower:0},quota:0,nextQuota:1000}),3500,32);
 assert.equal(result.feasible,false,'the current remaining quota plus two new quotas cannot replace 3500 men');
 const small=recovery(depot({gold:10000,manpower:10000,quota:0,nextQuota:1000}),2000,32);assert.equal(small.readyDay,41);
});
test('replacement capacity includes grain survival, commitments, real prices and shared work limits',()=>{
 const base=depot({gold:5000,manpower:5000,quota:5000,nextQuota:5000});assert.equal(recovery(base).feasible,true);
 assert.equal(recovery({...base,grain:100,income:{...base.income,grain:0}}).feasible,false);
 assert.equal(recovery({...base,gold:0,income:{...base.income,gold:100},recurringGold:500}).feasible,false);
 assert.equal(recovery({...base,payments:[{afterDays:21,gold:20000}]}).feasible,false,'signed later debts cannot be spent on a new campaign');
 const work=depot({income:{gold:0,grain:2000,manpower:0},operations:[{afterDays:2,key:'gold',amount:5000},{afterDays:2,key:'manpower',amount:5000}]});
 assert.equal(recovery(work).feasible,false,'a started operation cannot exceed its real remaining allowance');
 assert.equal(recovery({...base,gold:1200,trainingRate:2,income:{...base.income,gold:0}}).feasible,false);
});
test('economic depth changes risk tolerance but never gives unknown or stale opponents a discount',()=>{
 const rich=recovery(depot({gold:10000,manpower:10000,quota:10000,nextQuota:10000})),fresh={known:true,observedDay:1};
 assert.equal(recoveryAdvantageRequirement(1.7,rich,fresh,1),1.2);
 assert.equal(recoveryAdvantageRequirement(1.7,rich,{known:false,observedDay:null},1),1.7);
 assert.equal(recoveryAdvantageRequirement(1.7,rich,fresh,10),1.7);
 assert.equal(recoveryAdvantageRequirement(1.7,recovery(depot()),fresh,1),1.7);
});
test('same current military force can be admitted or held by actual refill resources',()=>{
 const f=planningFront();f.target.gold=0;f.target.manpower=0;let rich;
 for(let men=1200;men<=3000;men+=100){f.target.units.forEach(u=>u.troops=men);initializeVision(f.s);rich=evaluateOffensive(f.s,proposal(f));if(rich.advantage>1.4&&rich.advantage<1.7&&rich.accepted)break;}
 assert.ok(rich.accepted&&rich.advantage<1.7,'the funded force should pass below the base style threshold');
 const before=serializeCampaign(f.s);f.home.manpower=0;const poor=evaluateOffensive(f.s,proposal(f));
 assert.equal(poor.military.attackPower,rich.military.attackPower);assert.equal(poor.military.defensePower,rich.military.defensePower);assert.equal(poor.accepted,false);
 f.home.manpower=20000;assert.equal(serializeCampaign(f.s),before,'forecasts themselves leave resources unchanged');
});
test('equal soldier counts reflect observed officer quality throughout strategic summaries',()=>{
 const f=planningFront(),weak=f.target.units.map(u=>({...u,leadership:20,force:20,intellect:20,politics:20,aptitudes:{...u.aptitudes,spear:'C'}}));
 const strong=weak.map(u=>({...u,leadership:95,force:95,intellect:95,politics:95,aptitudes:{...u.aptitudes,spear:'S'}}));
 assert.ok(assessCombatForce({units:strong}).power>assessCombatForce({units:weak}).power);
 f.target.units=weak;initializeVision(f.s);const first=strategicContext(f.s,'yuan').reports.find(c=>c.id===f.target.id).power;
 f.target.units=strong;initializeVision(f.s);const second=strategicContext(f.s,'yuan').reports.find(c=>c.id===f.target.id).power;assert.ok(second>first);
 // The stronger hidden replacement must not overwrite the stored weak report.
 f.target.units=weak;f.target.x=500;initializeVision(f.s);f.s.campaign.vision.factions.yuan.cities[f.target.id]={day:1,owner:'cao',data:structuredClone(f.target)};
 const observation=offensiveFacts(f.s,proposal(f));f.target.units=strong;f.target.gold=999999;f.s.seed+=999;
 assert.deepEqual(offensiveFacts(f.s,proposal(f)),observation);
});
test('idle appointments create no fictional work loss while started work keeps its real remaining cost',()=>{
 const f=planningFront();f.target.gold=0;f.target.manpower=0;
 assert.equal(assignDomestic(f.s,f.home.id,'military','shao',{faction:'yuan'}),null);
 const idle=evaluateOffensive(f.s,proposal(f));assert.equal(idle.workCost,0);
 beginDomesticTurn(f.s);const job=assignmentFor(f.s,'shao');assert.ok(job.action);const active=evaluateOffensive(f.s,proposal(f));assert.ok(active.workCost>0);
 job.action.remaining=1;const nearlyDone=evaluateOffensive(f.s,proposal(f));assert.ok(nearlyDone.workCost<active.workCost);
});
