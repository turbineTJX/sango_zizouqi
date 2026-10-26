import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRecoveryCapacity,recoveryAdvantageRequirement,recoveryFailureReason,addRecoveryRequirements,validRecoveryEvidence} from '../strategic-recovery.mjs';
import {assessCombatForce} from '../strategic-combat-assessment.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {forecastStrategicPreparation} from '../strategic-forecast.mjs';
import {offensiveFacts,evaluateOffensive} from '../strategic-ai.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn} from '../domestic.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {armySupplyCapacity} from '../army-supply.mjs';

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
test('recovery reports the full sustained grain deficit and preparation cannot mistake it for recruitment money',()=>{
 // Detached own-depot measurements from the natural day-201 Suifang case.
 const city=depot({cityId:'atlas-suifang',men:22500,trainingRate:1114/1954,gold:1705,manpower:7548,grain:6508,dailyFood:270,
  income:{gold:200,grain:1070,manpower:394},recurringGold:111,quota:3000,nextQuota:3000,grainCapacity:20000,
  workRemaining:{gold:225,grain:1730,manpower:661},workLimit:{gold:225,grain:1730,manpower:661}});
 const inputs={day:201,returnDays:20,cities:[city]},before=structuredClone(inputs),result=assessRecoveryCapacity(inputs,1954),row=result.rows[0];
 assert.equal(result.feasible,false);assert.equal(row.repairable,true);
 assert.ok(row.shortfall.grain>2,'budget must cover the entire horizon, not only the first hungry day');
 assert.deepEqual([row.shortfall.gold,row.shortfall.manpower],[0,0]);assert.equal(recoveryFailureReason(result),'预计返城整补缺少持续口粮');
 const stock={gold:2500,grain:15000,manpower:9000},requirements=[{cityId:city.cityId,gold:3000,grain:14000,manpower:10000}];
 addRecoveryRequirements(requirements,result,()=>stock);
 assert.deepEqual(requirements[0],{cityId:city.cityId,gold:3000,grain:stock.grain+row.shortfall.grain,manpower:10000});
 const context={day:201,ownCities:[{...city,...stock,id:city.cityId,costs:{gold:111,grain:2700}}]};
 const oldRequirement=[{cityId:city.cityId,...stock}];
 assert.equal(forecastStrategicPreparation(context,oldRequirement).readyDay,201);
 addRecoveryRequirements(oldRequirement,result,()=>stock);
 assert.equal(forecastStrategicPreparation(context,oldRequirement).feasible,false,'unchanged declining stocks cannot immediately recreate the same ready plan');
 const funded=assessRecoveryCapacity({...inputs,cities:[{...city,grain:city.grain+row.shortfall.grain}]},1954);
 assert.equal(funded.feasible,true);assert.equal(assessRecoveryCapacity({...inputs,cities:[{...city,grain:city.grain+row.shortfall.grain-1}]},1954).feasible,false);
 assert.deepEqual(inputs,before);assert.equal(validRecoveryEvidence(result,201,id=>id===city.cityId),true);
 const old=structuredClone(result);old.version=1;assert.equal(validRecoveryEvidence(old,201,()=>true),false);
});
test('recovery separates stock shortages from quota and capacity limits without fictional work',()=>{
 const ample=depot({gold:5000,manpower:5000,quota:5000,nextQuota:5000});
 for(const [key,changes]of [['gold',{gold:0,income:{gold:0,grain:2000,manpower:1000}}],['manpower',{manpower:0,income:{gold:1000,grain:2000,manpower:0}}]]){
  const result=recovery({...ample,...changes});assert.equal(result.feasible,false);assert.ok(result.rows[0].shortfall[key]>0);assert.equal(result.rows[0].repairable,true);
 }
 const quota=recovery({...ample,quota:0,nextQuota:0});assert.equal(quota.rows[0].repairable,false);assert.match(recoveryFailureReason(quota),/期限或仓储容量/);
 const capacity=recovery({...ample,grain:100,grainCapacity:100,dailyFood:100,income:{gold:1000,grain:1000,manpower:1000}});
 assert.equal(capacity.feasible,false);assert.equal(capacity.rows[0].repairable,false,'a full but tiny granary cannot bridge the gap between harvests');
});
test('candidate and committed recovery forecasts deduct the same real departure load exactly once',()=>{
 const f=planningFront(),p=proposal(f),units=p.groups[0].units;
 const initial=offensiveFacts(f.s,p).facts.recoveryInputs,stock=f.home.grain;
 f.s.campaign.ai.plans.push({id:1,faction:'yuan',phase:'prepare',officerIds:units.map(u=>u.id),reserves:{[f.home.id]:armySupplyCapacity(units)},requirements:[],origins:[{cityId:f.home.id,officerIds:units.map(u=>u.id)}]});
 const committed=offensiveFacts(f.s,p).facts.recoveryInputs;
 assert.deepEqual(committed,initial,'creating a reservation must not reveal a grain deficit omitted at admission');
 assert.equal(f.home.grain,stock,'reserving the future load is not a real shipment');
 assert.deepEqual(assessRecoveryCapacity(committed,1500),assessRecoveryCapacity(initial,1500));
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
