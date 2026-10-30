import test from 'node:test';
import assert from 'node:assert/strict';
import {concentratedFront} from './helpers/strategic-concentration.mjs';
import {planStrategicAI,strategicDepartureError,validateStrategicAI,strategicPower} from '../strategic-ai.mjs';
import {activeConcentration,adoptConcentration,closeConcentration,progressConcentrations,concentrationResting,concentrationRetryBlocked} from '../strategic-concentration.mjs';
import {plannedOfficer} from '../strategic-intent.mjs';
import {cityForce} from '../city-units.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {serializeCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';

function partialFront(){const f=concentratedFront({rearDistance:1600});f.target.units.forEach(u=>u.troops=8000);updateVision(f.s);return f;}
const step=s=>{if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);};
const people=s=>[...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit),...s.armies.flatMap(a=>a.units)].map(u=>[u.id,u.troops,u.wounded]).sort((a,b)=>a[0].localeCompare(b[0]));
const checks=s=>({power:c=>strategicPower(s,cityForce(c)),unsafe:()=>false});

test('an insufficient assault force can fund one bounded real preparation without declaring war or inventing arrivals',()=>{
 const {s,home,target,sources}=partialFront(),before=people(s),relations=structuredClone(s.campaign.diplomacy.relations),local=home.units.map(u=>u.id);
 planStrategicAI(s);const p=activeConcentration(s,'yuan');assert.ok(p);assert.equal(p.full,false);assert.equal(p.officerIds.length,6);
 assert.deepEqual(home.units.map(u=>u.id),local);assert.deepEqual(people(s),before);assert.deepEqual(s.campaign.diplomacy.relations,relations);
 assert.equal(s.armies.some(a=>a.faction==='yuan'&&a.target===target.id),false);
 assert.ok(p.officerIds.every(id=>s.campaign.idle.some(o=>o.unit.id===id&&o.destination===home.id)&&plannedOfficer(s,id)));
 assert.ok(sources.every(c=>c.units.length>=1),'real source workers and troops remain');
 assert.equal(p.arrivedIds.length,0);validateStrategicAI(s);
});

test('partial concentration obeys real destination funding and safe donor roads',()=>{
 for(const missing of ['grain','gold','road']){
  const {s,home,sources}=partialFront();if(missing==='grain')home.grain=0;if(missing==='gold')home.gold=0;
  if(missing==='road')for(const c of sources.slice(1)){c.owner='cao';c.domestic.owner='cao';}updateVision(s);planStrategicAI(s);
  assert.equal(s.campaign.ai.decisions.some(d=>d.faction==='yuan'&&d.kind==='transfer'&&d.target===home.id&&d.reason.includes('主攻准备')),false,missing);
  assert.ok(!activeConcentration(s,'yuan')?.officerIds.length);validateStrategicAI(s);
 }
});

test('partial preparation rejects an assembled roster that cannot traverse its real water route',()=>{
 const {s,home,target,sources}=partialFront();
 const ports=[{id:'prep-port-a',name:'集结港甲',kind:'port',x:2,y:0},{id:'prep-port-b',name:'集结港乙',kind:'port',x:6,y:0}];
 s.junctions.push(...ports);s.roads=s.roads.filter(e=>!e.includes(target.id));
 s.roads.push([home.id,ports[0].id],[ports[0].id,ports[1].id],[ports[1].id,target.id]);
 for(const e of s.roads.filter(e=>e.some(id=>ports.some(p=>p.id===id))))s.roadSegments[[...e].sort().join(':')]={distance:1,terrain:e.every(id=>ports.some(p=>p.id===id))?'water':'land'};
 for(const c of sources)for(const u of c.units)u.equipment.ship='ship';
 const navigable=structuredClone(s);updateVision(navigable);planStrategicAI(navigable);assert.ok(activeConcentration(navigable,'yuan'),'the same funded route is usable when every proposed unit has a real ship');
 const withoutShip=sources.flatMap(c=>c.units).find(u=>u.id==='person-10');withoutShip.equipment.ship=null;
 updateVision(s);assert.doesNotThrow(()=>planStrategicAI(s));assert.equal(activeConcentration(s,'yuan'),undefined);
 assert.equal(s.campaign.ai.decisions.some(d=>d.faction==='yuan'&&d.kind==='transfer'&&d.target===home.id&&d.reason.includes('主攻准备')),false);
});

test('concentration arrivals stay reserved until a turn review and continuation preserves the fixed deadline',()=>{
 const {s,home}=partialFront();planStrategicAI(s);const original=activeConcentration(s,'yuan'),deadline=original.deadline,created=original.createdDay;
 const copy=JSON.parse(serializeCampaign(s));let sawArrival=false;
 for(let n=0;n<21;n++){
  step(s);step(copy);assert.equal(serializeCampaign(s),serializeCampaign(copy));
  const p=s.campaign.ai.concentrations.find(p=>p.faction==='yuan'&&p.createdDay===created);assert.equal(p.deadline,deadline);
  if(p.status==='active'&&p.arrivedIds.length){sawArrival=true;assert.ok(p.arrivedIds.every(id=>home.units.some(u=>u.id===id)&&plannedOfficer(s,id)));}
  validateStrategicAI(s);
 }
 assert.ok(sawArrival);const p=s.campaign.ai.concentrations.find(p=>p.faction==='yuan'&&p.createdDay===created);
 assert.equal(p.status,'complete');assert.ok(p.finishedDay<=deadline);assert.equal(p.officerIds.length,6);
 assert.ok(p.officerIds.every(id=>concentrationResting(s,id,'town-8')));
});

test('closing unsafe preparation releases claims without teleporting real journeys and prevents immediate shuffling',()=>{
 const {s,home,target}=partialFront();planStrategicAI(s);const p=activeConcentration(s,'yuan'),journeys=structuredClone(s.campaign.idle);
 progressConcentrations(s,{...checks(s),unsafe:()=>true});assert.equal(p.status,'cancelled');assert.deepEqual(s.campaign.idle,journeys);
 assert.ok(p.officerIds.every(id=>!plannedOfficer(s,id)&&concentrationResting(s,id,'town-8')&&!concentrationResting(s,id,home.id)));
 assert.equal(concentrationRetryBlocked(s,'yuan',home.id,target.id),true);
 s.campaign.day=p.finishedDay+21;assert.equal(concentrationRetryBlocked(s,'yuan',home.id,target.id),false);assert.equal(concentrationResting(s,p.officerIds[0],'town-8'),false);
});

test('a ready attack on the same objective releases concentration claims before reserving its soldiers',()=>{
 const {s,home,target}=partialFront();planStrategicAI(s);const p=activeConcentration(s,'yuan');
 assert.equal(adoptConcentration(s,'yuan',{staging:home.id,targetCity:target.id,ready:true}),null);
 assert.equal(p.status,'cancelled');assert.equal(activeConcentration(s,'yuan'),undefined);assert.ok(p.officerIds.every(id=>!plannedOfficer(s,id)));
});

test('a delayed concentration departure rechecks funding and its remaining fixed travel window',()=>{
 const {s,home,target,sources}=concentratedFront({rearDistance:1600});target.units.forEach(u=>u.troops=5000);updateVision(s);planStrategicAI(s);const p=activeConcentration(s,'yuan');
 // Use another still resident intended officer to exercise the shared checker
 // invoked both before orders are accepted and when queued work completes.
 const from=sources.find(c=>c!==home&&c.units.some(u=>p.intendedIds.includes(u.id))),u=from.units.find(u=>p.intendedIds.includes(u.id));
 const q={kind:'transfer',faction:'yuan',cityId:from.id,target:home.id,officerIds:[u.id],cargo:{gold:0,grain:0,manpower:0}};
 home.grain=0;assert.match(strategicDepartureError(s,q),/钱粮/);home.grain=100000;
 s.campaign.day=p.deadline;assert.match(strategicDepartureError(s,q),/固定期限/);
});

test('hidden enemy stocks and battle randomness cannot alter a partial concentration choice',()=>{
 const {s,target}=partialFront(),copy=structuredClone(s),hidden=copy.cities.find(c=>c.owner==='neutral'&&c.id!==target.id);
 hidden.gold=999999;hidden.grain=999999;copy.seed^=12345;
 planStrategicAI(s);planStrategicAI(copy);assert.deepEqual(activeConcentration(s,'yuan'),activeConcentration(copy,'yuan'));
});

test('fixed preparation expiry cancels without refreshing itself or moving travelling troops',()=>{
 const {s}=partialFront();planStrategicAI(s);const p=activeConcentration(s,'yuan'),journeys=structuredClone(s.campaign.idle),deadline=p.deadline;
 s.campaign.day=deadline+1;progressConcentrations(s,checks(s));assert.equal(p.status,'cancelled');assert.equal(p.deadline,deadline);assert.deepEqual(s.campaign.idle,journeys);
 progressConcentrations(s,checks(s));assert.equal(p.finishedDay,deadline+1);assert.equal(activeConcentration(s,'yuan'),undefined);
});

test('concentration validation rejects fractional requirements duplicate claims and deadline resets',()=>{
 const {s}=partialFront();planStrategicAI(s);validateStrategicAI(s);
 for(const mutate of [p=>p.deadline++,p=>p.requirements[0].grain+=.5,p=>p.officerIds.push(p.officerIds[0]),p=>p.arrivedIds.push('cao')]){
  const copy=structuredClone(s);mutate(activeConcentration(copy,'yuan'));assert.throws(()=>validateStrategicAI(copy),/战略AI/);
 }
 const copy=structuredClone(s),p=activeConcentration(copy,'yuan');copy.campaign.ai.concentrations.push(structuredClone(p));assert.throws(()=>validateStrategicAI(copy),/战略AI/);
});
