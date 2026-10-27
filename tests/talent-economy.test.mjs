import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,settleCityEconomy} from '../strategic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeTalent} from '../talent-lifecycle.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {cityIncomeBreakdown,cityBaseIncome,resourceValue} from '../economy.mjs';
import {officerSalary} from '../officer-salaries.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,domesticManagementEstimate,beginDomesticTurn,finishDomesticDay} from '../domestic.mjs';
import {directWorkTrial} from '../scripts/economy-balance-lib.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';

function fixture(ability=90,level=10,allAI=false){
 const s=newCampaign(417,'guandu-200','cao',{allAI}),c=s.cities.find(c=>c.id==='xuchang');
 const u=cityPersonnel(s,c.id).find(o=>o.unit.id==='person-715')?.unit||cityPersonnel(s,c.id).at(-1).unit;
 // Equal relevant ability and rank are deliberate mechanism-test inputs.
 u.politics=ability;u.level=level;c.governor=null;c.domestic.effects=[];c.gold=20000;c.grain=0;
 for(const key of ['commerce','farm','barracks'])setBuildingLevel(c,key,1);
 setBuildingLevel(c,'granary',5);s.campaign.domestic.assignments=[];s.campaign.domestic.incidents.enabled=false;
 return {s,c,u};
}

test('a capable resident governor adds more resource value than top-rank salary at basic facilities, without counting city base income',()=>{
 const {s,c,u}=fixture(80),base=cityBaseIncome(s,c);c.governor=u.id;
 const value=cityIncomeBreakdown(s,c);
 assert.deepEqual(value.base,base);assert.ok(resourceValue(value.governor)>officerSalary(u)*1.4);
 u.politics=90;assert.ok(resourceValue(cityIncomeBreakdown(s,c).governor)>resourceValue(value.governor));
 const resident=s.campaign.idle.find(o=>o.unit.id===u.id);if(resident)resident.location='chenliu';else {c.units=c.units.filter(x=>x!==u);s.cities.find(c=>c.id==='chenliu').units.push(u);}
 assert.deepEqual(cityIncomeBreakdown(s,c).governor,{gold:0,grain:0,manpower:0});
});

test('ordinary capable cash, food and reserve workers cover maximum salary in real completed work over independent outcomes',()=>{
 const seeds=Array.from({length:32},(_,i)=>9001+i*137);
 for(const ability of [80,90])for(const key of ['fair','cultivate','recruit']){
  const runs=seeds.map(seed=>directWorkTrial(seed,ability,key,{level:10,prepareCity:(s,c)=>{for(const field of ['commerce','farm','barracks'])setBuildingLevel(c,field,1);}}));
  const mean=runs.reduce((n,r)=>n+r.value,0)/runs.length;
  assert.ok(mean>officerSalary({level:10})*1.7,`${ability} ${key}: ${mean}`);
  assert.ok(runs.some(r=>r.factor<1),'keep partial results and failures');
 }
});

test('capable management covers its fee and maximum salary using incremental effects, with read-only public estimates',()=>{
 const {s,c,u}=fixture(90);
 for(const key of ['merchants','tax','irrigate','partnership']){
  const before=serializeCampaign(s),r=domesticManagementEstimate(s,c,u,ACTIONS[key]);
  assert.ok(r.afterSalary>0,`${key}: ${JSON.stringify(r)}`);assert.equal(serializeCampaign(s),before);
  u.politics=50;assert.ok(domesticManagementEstimate(s,c,u,ACTIONS[key]).gross<r.gross);u.politics=90;
 }
});

test('player and AI autonomous work reject wasteful management and full-warehouse irrigation, without granting predicted income',()=>{
 for(const allAI of [false,true]){
  const {s,c,u}=fixture(0,10,allAI);assert.equal(assignDomestic(s,c.id,'commerce',u.id,{scheduled:true,faction:c.owner}),null);
  const a=assignmentFor(s,u.id),before=serializeCampaign(s);
  assert.ok(!actionCandidates(s,a).some(x=>x.key==='merchants'));
  assert.ok(actionCandidates(s,a).some(x=>x.key==='fair'));
  assert.equal(serializeCampaign(s),before);
  const {s:ag,c:city,u:farmer}=fixture(90,10,allAI);city.grain=60000;
  assert.equal(assignDomestic(ag,city.id,'agriculture',farmer.id,{scheduled:true,faction:city.owner}),null);
  assert.ok(!actionCandidates(ag,assignmentFor(ag,farmer.id)).some(x=>x.key==='irrigate'));
 }
});

test('management ability changes only the actually completed effect and respects existing caps',()=>{
 const rows=[];
 for(const ability of [50,90]){
  const {s,c,u}=fixture(ability,10,true);for(const [id,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&id!=='merchants')c.domestic.cooldowns[id]=10000;
  // This checks one completed effect, independently of national AI staffing.
  for(const city of s.cities)city.units=[];s.armies=[];s.campaign.idle=[{unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0}];
  assert.equal(assignDomestic(s,c.id,'commerce',u.id,{scheduled:true,faction:c.owner}),null);
  const before=c.gold;beginDomesticTurn(s);const a=assignmentFor(s,u.id);assert.equal(a.action.key,'merchants');assert.equal(c.gold,before-ACTIONS.merchants.cost);assert.equal(c.domestic.effects.length,0);
  for(let i=0;i<9;i++){finishDomesticDay(s);s.campaign.day++;assert.equal(c.domestic.effects.length,0);}
  assert.equal(s.campaign.domestic.assignments.length,1);
  s.campaign.domestic.seed=1; // Same successful common roll for both abilities.
  finishDomesticDay(s);const completed=s.campaign.domestic.events.find(e=>e.officerId===u.id&&e.result.factor!==undefined);
  assert.ok(completed.result.factor>0);rows.push(c.domestic.effects.find(e=>e.key==='gold').amount);
  assert.ok(rows.at(-1)<=1);assert.equal(c.gold,before-ACTIONS.merchants.cost,'future income is not paid on effect completion');
 }
 assert.ok(rows[1]>rows[0]);
});

test('a capable top-rank commercial worker earns more than actual salary over a real multi-turn operating calendar',()=>{
 const s=newCampaign(9001,'guandu-200','cao'),c=s.cities.find(c=>c.id==='xuchang'),u=makeOfficer('person-715',0,0,10);u.politics=90;u.homeCity=c.id;
 for(const town of s.cities){town.units=[];town.governor=null;}s.armies=[];s.campaign.idle=[{unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0}];initializeTalent(s);
 s.campaign.domestic.assignments=[];s.campaign.domestic.incidents.enabled=false;s.campaign.domestic.autoApprove=true;c.gold=10000;
 for(const key of ['commerce','farm','barracks'])setBuildingLevel(c,key,1);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&!['fair','merchants','tax'].includes(key))c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'commerce',u.id,{scheduled:true,faction:c.owner}),null);
 const initial=c.gold,base=cityBaseIncome(s,c).gold;let paid=0;
 for(let t=0;t<18;t++){
  beginDomesticTurn(s);
  for(let day=0;day<10;day++){finishDomesticDay(s);if(day===9){const settlement=settleCityEconomy(s,c);paid+=settlement.paidGold;}s.campaign.day++;}
 }
 assert.equal(paid,1800);assert.equal(c.payroll.arrears,0);
 const personalAfterSalary=c.gold-initial-base*18;
 assert.ok(personalAfterSalary>1000,`incremental six-month net value ${personalAfterSalary}`);
 const outcomes=s.campaign.domestic.events.filter(e=>e.officerId===u.id&&e.result.factor!==undefined);
 assert.ok(outcomes.some(e=>e.result.factor<1),'retain actual imperfect outcomes');
 assert.ok(outcomes.some(e=>e.result.factor>0));
});
