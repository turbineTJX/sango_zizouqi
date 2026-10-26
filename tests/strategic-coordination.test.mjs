import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {offensiveFacts,evaluateOffensive,planStrategicAI,validateStrategicAI,strategicColumnTravelDays,strategicTravelDays} from '../strategic-ai.mjs';
import {serializeCampaign,launchExpedition,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {requestFactionOrder} from '../strategic-orders.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor} from '../domestic.mjs';
import {forecastRouteSupply,forecastCoordinatedSupply,withRouteSupplyQueries} from '../strategic-route-supply.mjs';
import {cityForce} from '../city-units.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';

function waitingFront(){
 const f=planningFront(),{s,home,rear}=f;home.grain=2500;rear.grain=20000;
 const courier={...makeOfficer('gao',0,0,3),homeCity:rear.id};s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==courier.id);
 s.campaign.idle.push({unit:courier,faction:'yuan',location:rear.id,destination:null,remainingDays:0});
 assert.ok(requestFactionOrder(s,'yuan',{kind:'transfer',cityId:rear.id,officerIds:[courier.id],target:home.id,cargo:{gold:0,grain:6000,manpower:0},route:[home.id],safeOnly:true},'now').applied);
 planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.equal(p.phase,'prepare');
 return {...f,p,courier};
}
const next=s=>{s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;planStrategicAI(s);};

test('central assembly budgets replenishment at its real return depot before reserving distant troops',()=>{
 const {s,home,rear,target}=planningFront();rear.units=home.units.splice(3,2);rear.units.forEach(u=>u.homeCity=rear.id);rear.gold=500000;rear.manpower=500000;
 const before=serializeCampaign(s),facts=offensiveFacts(s,{faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,2),days:0},{c:rear,units:rear.units,days:2}],assaultDays:1,siegeDays:2}).facts;
 assert.deepEqual(facts.recoveryInputs.cities.map(c=>c.cityId),[home.id]);
 assert.ok(facts.recoveryInputs.cities[0].gold<home.gold);assert.ok(facts.recoveryInputs.cities[0].manpower<=home.manpower);
 assert.equal(serializeCampaign(s),before,'a remote stockpile cannot be transferred by evaluation');
});

test('coordinated forecasts share real depot stocks and daily road throughput between columns',()=>{
 const {s,home,target}=planningFront();home.units.forEach(u=>u.troops=9000);home.grain=150000;home.granary=6;initializeVision(s);
 const columns=[home.units.slice(0,3),home.units.slice(3)].map(units=>({army:{...cityForce(home),units},path:[target.id],days:140,delay:0})),before=serializeCampaign(s);
 assert.ok(columns.every(c=>forecastRouteSupply(s,c.army,c.path,c.days,{attack:true}).feasible),'each force can use the corridor on its own');
 assert.equal(forecastCoordinatedSupply(s,columns).feasible,false,'two simultaneous columns cannot each claim all 360 rations per day');
 home.units.forEach(u=>u.troops=3000);const light=columns.map(c=>({...c,army:{...c.army,units:c.army.units.map(u=>({...u,troops:3000}))}}));initializeVision(s);
 assert.equal(forecastCoordinatedSupply(s,light).feasible,true,'a genuinely affordable shared corridor remains usable');
 home.units.forEach(u=>u.troops=9000);initializeVision(s);assert.equal(serializeCampaign(s),before);
});

test('coordinated departures retain grain already reserved by a real waiting transport',()=>{
 const {s,home,rear,target}=planningFront();home.grain=20000;home.governor='shao';
 const proposal=[{army:{...cityForce(home),units:home.units.slice(0,3)},path:[target.id],days:6,delay:0}];
 assert.equal(forecastCoordinatedSupply(s,proposal).feasible,true);
 assert.equal(assignDomestic(s,home.id,'technology','ju',{scheduled:true,faction:'yuan'}),null);beginDomesticTurn(s);assert.ok(assignmentFor(s,'ju').action);
 const order=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:['ju'],target:rear.id,cargo:{gold:0,grain:18000,manpower:0},route:[rear.id],safeOnly:true},'after');assert.ok(order.queued,JSON.stringify(order));
 const before=serializeCampaign(s);assert.equal(forecastCoordinatedSupply(s,proposal).feasible,false,'the waiting cargo cannot also load a new army');
 assert.equal(serializeCampaign(s),before);assert.equal(home.grain,20000,'earmarking cargo does not spend it early');
});

test('candidate scopes reuse only read-only connectivity while each duration and column set keeps its own stock ledger',()=>{
 const {s,home,target}=planningFront();home.grain=150000;home.granary=6;home.units.forEach(u=>u.troops=3000);initializeVision(s);
 const inputs=[40,70,100].map(days=>[home.units.slice(0,3),home.units.slice(3)].map(units=>({army:{...cityForce(home),units},path:[target.id],days,delay:0})));
 const expected=inputs.map(columns=>forecastCoordinatedSupply(s,columns)),before=serializeCampaign(s);
 assert.deepEqual(withRouteSupplyQueries(s,()=>inputs.map(columns=>forecastCoordinatedSupply(s,columns))),expected);assert.equal(serializeCampaign(s),before);
 home.grain=0;initializeVision(s);assert.equal(withRouteSupplyQueries(s,()=>forecastCoordinatedSupply(s,inputs[0])).feasible,false);
});

test('coordinated mixed land and water timing matches real ship speeds and daily road arrivals',()=>{
 const {s,home,rear}=planningFront(),ports=[{id:'timing-port-a',name:'水路甲',kind:'port',x:1,y:0},{id:'timing-port-b',name:'水路乙',kind:'port',x:2,y:0}];
 s.junctions=ports;s.roads=[[home.id,ports[0].id],[ports[0].id,ports[1].id],[ports[1].id,rear.id]];
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:edge.includes(home.id)||edge.includes(rear.id)?7.5:150};
 const u=home.units[0];u.equipment.ship='ship';const path=[...ports.map(p=>p.id),rear.id];
 assert.equal(launchExpedition(s,{cityId:home.id,officerIds:[u.id],leader:u.id,advisor:u.id,target:rear.id,route:path,policy:'auto'},{scheduled:true,faction:'yuan'}),null);
 const army=s.armies.find(a=>a.units.some(v=>v.id===u.id)),expected=strategicColumnTravelDays(s,army,path),start=s.campaign.day;
 assert.notEqual(expected,strategicTravelDays(s,army,path),'a water leg cannot use its land troop speed');
 for(let i=0;i<60&&army.location!==rear.id;i++){s.campaign.ai.lastPlanDay=s.campaign.day;if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(army.location,rear.id);assert.equal(s.campaign.day-start,expected);
});

test('a recoverable staffing gap retains its original objective and resumes only after real replacement and delivery',()=>{
 const {s,home,p,courier}=waitingFront(),ids=[...p.officerIds];
 assert.equal(assignDomestic(s,home.id,'agriculture',ids[0],{scheduled:true,faction:'yuan'}),null);next(s);
 assert.equal(p.phase,'prepare');assert.match(p.reason,/农业负责人/);assert.ok(p.repairUntil>s.campaign.day);assert.deepEqual(p.officerIds,ids);
 const backup=home.units.find(u=>!ids.includes(u.id));assert.ok(backup);assert.equal(assignDomestic(s,home.id,'agriculture',backup.id,{scheduled:true,faction:'yuan'}),null);
 const moving=s.campaign.idle.find(o=>o.unit.id===courier.id);for(let i=0;i<10&&moving.destination;i++)advancePersonnel(s,moving);
 next(s);assert.equal(p.phase,'attack',p.reason);assert.equal(p.repairUntil,null);assert.deepEqual(p.officerIds,ids);validateStrategicAI(s);
});

test('a persistent preparation gap expires without extending the original deadline or creating troops',()=>{
 const {s,home,p}=waitingFront(),deadline=p.deadline,ids=[...p.officerIds];
 assert.equal(assignDomestic(s,home.id,'agriculture',ids[0],{scheduled:true,faction:'yuan'}),null);next(s);const until=p.repairUntil;
 assert.ok(until!==null&&until<=deadline&&until<=s.campaign.day+20);const saved=serializeCampaign(s),resumed=JSON.parse(saved);
 s.campaign.day=until;resumed.campaign.day=until;s.turn=resumed.turn=Math.floor((until-1)/10)+1;
 for(const world of [s,resumed])planStrategicAI(world);
 assert.equal(p.phase,'cancelled');assert.equal(p.deadline,deadline);assert.equal(serializeCampaign(resumed),serializeCampaign(s));
 assert.ok(ids.every(id=>home.units.some(u=>u.id===id)));validateStrategicAI(s);
});

test('active plan guard repairs can reference a real source depot without borrowing another plans request',()=>{
 const {s,rear,p}=waitingFront(),g=s.campaign.ai.factions.yuan.strategy.goal;
 p.requirements.push({cityId:rear.id,gold:0,grain:2500,manpower:0,defensePower:1000});g.requirements=structuredClone(p.requirements);validateStrategicAI(s);
 const bad=JSON.parse(serializeCampaign(s));bad.campaign.ai.factions.yuan.strategy.goal.requirements.find(r=>r.cityId===rear.id).defensePower=2000;
 assert.throws(()=>validateStrategicAI(bad),'the goal cannot manufacture a different guard request from its actual plan');
});

test('a marginal military gap can add real available troops to the same objective only at the next turn review',()=>{
 const {s,home,rear,target,p,courier}=waitingFront(),moving=s.campaign.idle.find(o=>o.unit.id===courier.id),ids=[...p.officerIds],deadline=p.deadline;
 // Controlled repair precondition: these are already present real units in a
 // friendly depot. The AI must move them normally; they are not forecast men.
 rear.units=['person-637','person-626'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:rear.id}));
 for(let i=0;i<10&&moving.destination;i++)advancePersonnel(s,moving);
 let assessment;
 for(let men=1000;men<6000;men+=50){target.units.forEach(u=>u.troops=men);initializeVision(s);
  assessment=evaluateOffensive(s,{faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.filter(u=>ids.includes(u.id)),days:0}],assaultDays:1,siegeDays:2});
  if(assessment.reason==='预计攻守优势不足'&&assessment.advantage>=assessment.requiredAdvantage-.2)break;
 }
 assert.equal(assessment.reason,'预计攻守优势不足');assert.ok(assessment.advantage>=assessment.requiredAdvantage-.2);
 next(s);assert.notEqual(p.phase,'cancelled');assert.ok(p.repairUntil!==null);assert.deepEqual(p.officerIds,ids,'daily execution cannot select additional troops');
 const men=()=>s.cities.flatMap(c=>c.units).concat(s.armies.flatMap(a=>a.units)).reduce((n,u)=>n+u.troops+u.wounded,0),before=men();
 s.campaign.day=11;s.turn=2;updateVision(s);planStrategicAI(s);
 assert.equal(p.target,target.id);assert.equal(p.deadline,deadline);assert.ok(p.officerIds.length>ids.length,JSON.stringify({reason:p.reason,phase:p.phase,ids:p.officerIds,repairUntil:p.repairUntil,military:p.military}));
 assert.equal(men(),before);assert.equal(p.phase,'assemble',p.reason);assert.ok(s.armies.some(a=>a.homeCity===rear.id&&a.target===home.id));validateStrategicAI(s);
});

test('an imminent real home threat still cancels a preparing attack instead of waiting for promised guards',()=>{
 const {s,home,target,p}=waitingFront(),units=target.units;
 const army={...cityForce(target),id:'a'+s.nextId++,units,route:[home.id],target:home.id,travel:{from:target.id,to:home.id,road:'main',progress:0},supply:9000,supplyCapacity:9000};delete army.cityForce;target.units=[];units.forEach(u=>u.troops=30000);s.armies.push(army);initializeVision(s);
 next(s);assert.equal(p.phase,'cancelled');assert.ok(!s.armies.some(a=>a.faction==='yuan'&&a.target===target.id));
});
