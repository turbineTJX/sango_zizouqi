import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,settleCityEconomy,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {cityPayroll,officerSalary} from '../officer-salaries.mjs';
import {cityMaintenance} from '../economy.mjs';
import {cityBudget,cityBudgetMarkup,cityGoldCommitment,updateCityBudgetAlerts} from '../city-budget.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {cityReserve} from '../talent-core.mjs';
import {actionCandidates} from '../domestic.mjs';
import {cityVisible,cityIntelligence,cityObservation,intelligenceWorld} from '../strategic-vision.mjs';
const zero={gold:0,grain:0,manpower:0};
function fixture(){
 const s=newCampaign(917),c=s.cities.find(c=>c.id==='xuchang'),units=c.units.slice(0,3);
 s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const t of s.cities)t.units=[];
 units.forEach((u,i)=>{u.level=[1,3,10][i];u.homeCity=c.id;});c.units=units;
 return {s,c,units};
}
test('official salaries use actual level for prepared, idle, marching and mission personnel once each',()=>{
 const {s,c,units}=fixture();assert.deepEqual(units.map(officerSalary),[5,15,100]);
 c.units=[units[0]];units[0].mission={type:'diplomacy',faction:c.owner,homeCity:c.id,location:'chenliu'};
 s.campaign.idle=[{unit:units[1],faction:c.owner,location:c.id}];units[1].troops=0;
 s.armies=[{id:'payroll-test',units:[units[2]],faction:c.owner,location:'chenliu',homeCity:c.id}];
 assert.equal(cityPayroll(s,c).gold,120);assert.equal(cityPayroll(s,c).officers.length,3);
 s.armies[0].homeCity='chenliu';assert.equal(cityPayroll(s,c).gold,120,'mixed-origin armies retain each officer home payroll');
 s.armies[0].returningOfficers=[s.campaign.idle[0]];assert.equal(cityPayroll(s,c).gold,120);
 assert.equal(s.cities.reduce((n,t)=>n+cityPayroll(s,t).gold,0),120);
 c.owner='yuan';assert.equal(s.cities.reduce((n,t)=>n+cityPayroll(s,t).gold,0),120,'away staff bill a surviving home treasury');
});
test('recurring income can fund salaries at settlement and unpaid wages carry forward without duplicate accrual',()=>{
 const {s,c}=fixture();c.gold=40;s.campaign.day=10;
 const first=settleCityEconomy(s,c,{income:zero});assert.equal(first.paidSalary,40);assert.equal(c.gold,0);assert.equal(c.payroll.arrears,80);
 assert.deepEqual(c.payroll,{arrears:80,lastTurn:1,lastDue:120,lastPaid:40});
 assert.equal(settleCityEconomy(s,c,{income:zero}).salaryDue,80);assert.equal(c.payroll.arrears,80);
 s.campaign.day=20;const second=settleCityEconomy(s,c,{income:{...zero,gold:300}});
 assert.equal(second.salaryDue,200);assert.equal(second.paidSalary,200);assert.equal(c.gold,100);assert.equal(c.payroll.arrears,0);
 assert.equal(cityMaintenance(s,c).gold,120);
});
test('budget, voluntary spending and player/AI proposals protect payroll and expose actual funding gaps',()=>{
 for(const allAI of [false,true]){
  const {s,c,units}=fixture();s.campaign.allAI=allAI;c.budget.goldReserve=0;c.gold=110;
  const b=cityBudget(s,c,{includeWork:false});assert.equal(b.payroll.gold,120);assert.equal(b.costs.gold,120);
  assert.equal(b.fundingShortages.gold,0,'settlement income covers wages without a false before-harvest warning');
  assert.equal(cityGoldCommitment(s,c).total,120);assert.equal(cityReserve(s,c),120);
  const a={officerId:units[0].id,cityId:c.id,direction:'construction',action:null,proposal:null};s.campaign.domestic.assignments=[a];
  assert.deepEqual(actionCandidates(s,a),[]);assert.match(cityBudgetMarkup(s,c),/官员俸禄 3 人，共 120 金／旬/);
  c.units.forEach(u=>u.level=10);c.gold=0;
  assert.equal(cityBudget(s,c,{includeWork:false}).fundingShortages.gold,100);
  updateCityBudgetAlerts(s);assert.equal(c.budget.warning,'gold');
 }
});
test('payroll persists with deterministic saves and rejects fractional or inconsistent debt',()=>{
 const s=newCampaign(917),c=s.cities.find(c=>c.id==='xuchang');c.gold=0;
 settleCityEconomy(s,c,{income:zero});syncResourceTotals(s);
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 for(const field of ['arrears','lastPaid','lastDue','lastTurn']){const bad=JSON.parse(saved);bad.cities.find(t=>t.id===c.id).payroll[field]+=.5;assert.throws(()=>validateCampaign(bad),/俸禄/);}
 const bad=JSON.parse(saved);bad.cities.find(t=>t.id===c.id).payroll.arrears++;assert.throws(()=>validateCampaign(bad),/俸禄/);
});
test('unobserved enemy payroll is absent from both city and world intelligence',()=>{
 const s=newCampaign(917,'guandu-200'),c=s.cities.find(t=>t.owner!=='cao'&&!cityVisible(s,t.id)&&!cityIntelligence(s,t.id).data);assert.ok(c);
 assert.equal(cityObservation(s,c.id).payroll,null);assert.equal(intelligenceWorld(s).cities.find(t=>t.id===c.id).payroll,null);
 c.payroll.arrears=9999;c.payroll.lastDue=9999;
 assert.equal(cityObservation(s,c.id).payroll,null);assert.equal(intelligenceWorld(s).cities.find(t=>t.id===c.id).payroll,null);
});
