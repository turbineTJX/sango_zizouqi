import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {evaluateOffensive} from '../strategic-ai.mjs';
import {recruitmentLimit} from '../domestic.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {occupationPayoff,validOccupationPayoff} from '../ai-policy/campaign-payoff.mjs';
import {assessRecoveryCapacity,validRecoveryEvidence} from '../ai-policy/pool-recovery.mjs';

test('conditional occupation gains raise value without funding departure or changing combat strength',()=>{
 const {s,home,target}=planningFront(),proposal={faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,-1),days:0}],assaultDays:1,siegeDays:0};
 target.drafted=recruitmentLimit(target);target.gold=0;target.grain=0;target.manpower=0;initializeVision(s);
 const poor=evaluateOffensive(s,proposal);
 target.gold=60000;target.grain=30000;target.manpower=30000;initializeVision(s);
 const before=serializeCampaign(s),rich=evaluateOffensive(s,proposal);
 assert.equal(serializeCampaign(s),before);assert.equal(poor.military.attackPower,rich.military.attackPower);assert.equal(poor.military.defensePower,rich.military.defensePower);
 assert.ok(rich.score>poor.score);assert.ok(rich.requiredAdvantage<=poor.requiredAdvantage);assert.ok(validOccupationPayoff(rich.payoff));assert.equal(rich.payoff.guaranteedRecruits,0);
 home.grain=0;const unfunded=evaluateOffensive(s,proposal);assert.equal(unfunded.accepted,false);assert.ok(unfunded.payoff.value>0);
});

test('captured city pools are independent of winning troop vacancies and hidden people have no talent value',()=>{
 const {s,home,target}=planningFront();target.wounded=8000;target.grain=90000;
 const args={intelligence:{known:true,visible:false,observedDay:s.campaign.day},day:s.campaign.day,units:home.units,foodUse:10,approachDays:10,siegeDays:2};
 const before=structuredClone(target),value=occupationPayoff(s,target,args);
 assert.ok(value.retainedPoolWounded>0);assert.ok(value.capturedWounded>0);assert.ok(validOccupationPayoff(value));
 assert.equal(value.talentValue,0);assert.equal(value.guaranteedRecruits,0);assert.deepEqual(target,before);
 const unknown=occupationPayoff(s,target,{...args,intelligence:{known:false,visible:false,observedDay:null}});
 assert.equal(unknown.value,0);assert.equal(unknown.capturedWounded,0);
});

const depot=()=>({cityId:'ye',men:6000,trainingRate:.5,gold:10000,manpower:1300,grain:20000,dailyFood:100,income:{gold:0,grain:2000,manpower:0},recurringGold:100,
 quota:3000,nextQuota:3000,manpowerCapacity:30000,grainCapacity:30000,operations:[],incoming:[],workRemaining:{gold:0,grain:0,manpower:0},workLimit:{gold:0,grain:0,manpower:0},poolWounded:0,treatmentPerDay:100});
test('returned wounds require actual treatment, reserve space, food, gold and recruitment quota',()=>{
 const city=depot(),input={day:1,returnDays:2,cities:[city]},before=structuredClone(input),result=assessRecoveryCapacity(input,2000);
 assert.equal(result.feasible,true);assert.ok(result.readyDay>=9);assert.ok(validRecoveryEvidence(result,1,()=>true));assert.deepEqual(input,before);
 for(const change of [{treatmentPerDay:0},{quota:0,nextQuota:0},{grain:0,income:{gold:0,grain:0,manpower:0}},{gold:0,income:{gold:0,grain:2000,manpower:0}},{manpower:0,manpowerCapacity:0}]){
  assert.equal(assessRecoveryCapacity({...input,cities:[{...city,...change}]},2000).feasible,false);
 }
});

test('large losses may use a longer solvent recovery period but cannot bank unused recruitment quotas',()=>{
 const c={...depot(),manpower:10000,quota:0,nextQuota:1000};
 const r=assessRecoveryCapacity({day:1,returnDays:32,cities:[c]},6000);
 assert.equal(r.feasible,true);assert.ok(r.horizonDays>20);assert.ok(r.readyDay>=81);assert.ok(validRecoveryEvidence(r,1,()=>true));
 assert.equal(assessRecoveryCapacity({day:1,returnDays:32,cities:[{...c,income:{gold:0,grain:0,manpower:0},grain:100}]},6000).feasible,false);
});
