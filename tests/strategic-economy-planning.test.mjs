import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {assignDomestic,assignmentFor,actionCandidates,beginDomesticTurn} from '../domestic.mjs';
import {cityGoldCommitment} from '../city-budget.mjs';
import {strategicCityBudget,planStrategicAI,validateStrategicAI,observeStrategicThreat} from '../strategic-ai.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {forecastStrategicPreparation} from '../strategic-forecast.mjs';
import {plannedOfficer,offensivePlans} from '../strategic-intent.mjs';
import {requestFactionOrder} from '../strategic-orders.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {initializeVision} from '../strategic-vision.mjs';

test('waiting officers share the real construction slot and optional work cannot veto military funding',()=>{
 const {s,home}=planningFront();
 for(const u of home.units)assert.equal(assignDomestic(s,home.id,'commerce',u.id,{faction:'yuan'}),null);
 const before=JSON.stringify(s),cost=actionCandidates(s,assignmentFor(s,home.units[0].id),{ignoreFunds:true})[0].cost;
 assert.ok(cost>0);assert.ok(cityGoldCommitment(s,home,{includeWork:true}).work<cost*home.units.length);
 assert.equal(strategicCityBudget(s,home).goldNeed,500);
 assert.equal(JSON.stringify(s),before);
 planStrategicAI(s);assert.ok(offensivePlans(s).some(p=>p.faction==='yuan'));
});

test('real war preparation protects its money while the resident commercial officer continues operating',()=>{
 const {s,home}=planningFront();home.gold=800;
 assert.equal(assignDomestic(s,home.id,'commerce','ju',{faction:'yuan'}),null);
 s.campaign.ai.factions.yuan.strategy.goal={kind:'capture',staging:home.id,status:'preparing',requirements:[{cityId:home.id,gold:800,grain:2500,manpower:0}]};
 const candidates=actionCandidates(s,assignmentFor(s,'ju'));assert.ok(candidates.some(p=>p.key==='fair'));assert.ok(!candidates.some(p=>p.key==='build_commerce'));
 beginDomesticTurn(s);assert.equal(assignmentFor(s,'ju').action.key,'fair');assert.equal(home.gold,800);
});

test('an underfunded opening city can earn money without lowering its reserve or creating resources',()=>{
 const {s,home}=planningFront();home.gold=155;
 assert.equal(assignDomestic(s,home.id,'commerce','ju',{faction:'yuan'}),null);
 beginDomesticTurn(s);assert.equal(home.gold,155);assert.equal(home.budget.goldReserve,500);assert.equal(assignmentFor(s,'ju').action.key,'fair');
});

function consolidationFront(){
 const {s,home,target,rear}=planningFront();planStrategicAI(s);const old=s.campaign.ai.plans.find(p=>p.faction==='yuan');
 const troops=s.armies.filter(a=>a.faction==='yuan').flatMap(a=>a.units);s.armies=[];home.units.push(...troops);
 target.owner='yuan';target.domestic.owner='yuan';target.units=[];
 rear.owner='cao';rear.domestic.owner='cao';rear.units=['cao','dun','chu','yu','liao','jia'].map((id,i)=>({...makeOfficer(id,5000,i,3),homeCity:rear.id}));rear.x=16;
 const next=s.cities.find(c=>c.id==='chenliu');Object.assign(next,{owner:'cao',x:0,y:8,commerce:10});next.domestic.owner='cao';next.units=[];
 s.roads=[[home.id,target.id],[target.id,rear.id],[home.id,next.id]];for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:7.5};
 s.campaign.day=91;s.turn=10;initializeVision(s);planStrategicAI(s);
 return {s,home,target,old,next};
}

test('long consolidation keeps its real defense check but releases the main front and officer commitments',()=>{
 const {s,target,old,next}=consolidationFront();
 assert.equal(old.phase,'consolidate');assert.ok(s.campaign.day>old.deadline);
 const current=offensivePlans(s).find(p=>p.faction==='yuan');assert.ok(current);assert.notEqual(current.id,old.id);assert.equal(current.target,next.id);
 assert.ok(old.officerIds.some(id=>!current.officerIds.includes(id)&&!plannedOfficer(s,id)));
 assert.equal(s.campaign.ai.cities[target.id].role,'recovery');validateStrategicAI(s);
});

test('losing an old consolidation target cannot recall officers already fighting on the new main front',()=>{
 const {s,target,old,next}=consolidationFront(),current=offensivePlans(s).find(p=>p.faction==='yuan');
 const army=s.armies.find(a=>a.faction==='yuan'&&a.units.some(u=>current.officerIds.includes(u.id)));
 assert.ok(army);assert.ok(army.units.some(u=>old.officerIds.includes(u.id)));assert.equal(army.target,next.id);
 assert.ok(old.tasks.every(t=>!t.refs.includes('army:'+army.id)));
 target.owner='cao';target.domestic.owner='cao';s.campaign.day++;initializeVision(s);planStrategicAI(s);
 assert.equal(old.phase,'cancelled');assert.equal(current.phase,'attack');assert.equal(army.target,next.id);
 assert.ok(old.tasks.every(t=>!t.refs.includes('army:'+army.id)));
 assert.equal(s.campaign.ai.factions.yuan.stance,'attack');assert.equal(s.campaign.ai.factions.yuan.strategy.goal.planId,current.id);validateStrategicAI(s);
});

test('independent neighboring factions are not added into an imaginary combined counterattack',()=>{
 const {s,home,target,rear}=planningFront();rear.owner='sunce';rear.domestic.owner='sunce';rear.units=[{...makeOfficer('person-371',6000,0,3),homeCity:rear.id}];
 initializeVision(s);const combined=observeStrategicThreat(s,home).nearby;
 const first=structuredClone(s);first.cities.find(c=>c.id===rear.id).units=[];initializeVision(first);
 const second=structuredClone(s);second.cities.find(c=>c.id===target.id).units=[];initializeVision(second);
 assert.equal(combined,Math.max(observeStrategicThreat(first,home).nearby,observeStrategicThreat(second,home).nearby));
});

test('preparation sees started production, respects the shared allowance and never reads a random result',()=>{
 const {s,home}=planningFront();home.gold=155;
 for(const id of ['ju','tian'])assert.equal(assignDomestic(s,home.id,'commerce',id,{faction:'yuan'}),null);
 beginDomesticTurn(s);for(const a of s.campaign.domestic.assignments)a.action.remaining=3;
 const context=strategicContext(s,'yuan'),city=context.ownCities.find(c=>c.id===home.id);city.income.gold=0;city.costs.gold=0;
 const before=JSON.stringify(context),requirements=[{cityId:home.id,gold:home.gold+city.workRemaining.gold,grain:0,manpower:0}];
 assert.equal(forecastStrategicPreparation(context,requirements).readyDay,4);
 requirements[0].gold++;assert.equal(forecastStrategicPreparation(context,requirements).feasible,false);assert.equal(JSON.stringify(context),before);assert.equal(home.gold,155);
 const copy=structuredClone(s);copy.seed+=999;copy.campaign.domestic.random+=999;for(const a of copy.campaign.domestic.assignments)a.action.researchRoll=.999;
 assert.deepEqual(strategicContext(copy,'yuan'),strategicContext(s,'yuan'));
});

test('preparation counts only the current loaded safe shipment on arrival, with no early credit',()=>{
 const {s,home,rear}=planningFront();home.gold=0;const u=home.units.find(u=>u.id==='ju');home.units=home.units.filter(x=>x!==u);
 s.campaign.idle.push({unit:{...u,troops:0,wounded:0,homeCity:rear.id},faction:'yuan',location:rear.id,destination:null,remainingDays:0});
 const result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:rear.id,officerIds:[u.id],target:home.id,cargo:{gold:800,grain:0,manpower:0},route:[home.id],safeOnly:true},'now');assert.equal(result.error,undefined);
 const courier=s.campaign.idle.find(o=>o.unit.id===u.id),context=strategicContext(s,'yuan'),city=context.ownCities.find(c=>c.id===home.id);city.income.gold=0;city.costs.gold=0;
 const requirements=[{cityId:home.id,gold:800,grain:0,manpower:0}];assert.equal(forecastStrategicPreparation(context,requirements).readyDay,context.day+city.incoming[0].afterDays);assert.equal(home.gold,0);
 courier.journey.blocked='敌军封路';const blocked=strategicContext(s,'yuan');blocked.ownCities.find(c=>c.id===home.id).income.gold=0;assert.equal(forecastStrategicPreparation(blocked,requirements).feasible,false);
 courier.journey.blocked='';advancePersonnel(s,courier,[]);assert.equal(home.gold,800);
});

test('preparation does not repeatedly charge a one-time budget and still rejects a shortage before harvest',()=>{
 const {s,home}=planningFront(),context=strategicContext(s,'yuan'),city=context.ownCities.find(c=>c.id===home.id);
 Object.assign(city,{gold:0,income:{gold:600,grain:0,manpower:0},costs:{gold:600,grain:0},oneTimeGold:600});
 const requirements=[{cityId:home.id,gold:100,grain:0,manpower:0}];assert.equal(forecastStrategicPreparation(context,requirements).readyDay,21);
 city.grain=5;city.costs.grain=100;assert.equal(forecastStrategicPreparation(context,requirements).feasible,false);
});
