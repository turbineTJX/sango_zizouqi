import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {planStrategicAI,planStrategicPersonnel,initializeStrategicAI,validateStrategicAI,factionStrategicProfile} from '../strategic-ai.mjs';
import {drawFactionTemperament} from '../strategic-temperament.mjs';
import {progressStrategicStaffing,staffingOfficer} from '../strategic-staffing.mjs';
import {requestFactionOrder,resolveStrategicOrders} from '../strategic-orders.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {assignmentFor,assignDomestic,ACTIONS,beginDomesticTurn,finishDomesticDay} from '../domestic.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {personnelCityProfile,staffingDepartureError} from '../strategic-personnel.mjs';
import {strategicDepartureError} from '../strategic-ai.mjs';
import {gateDurability} from '../building-durability.mjs';

function distribution({residents=0}={}){
 const {s,home,rear,target}=planningFront();target.owner='neutral';target.domestic.owner='neutral';target.units=[];
 s.roads=[[home.id,rear.id]];home.governor='shao';
 rear.units=['person-263','person-420','person-533'].slice(0,residents).map(id=>({...makeOfficer(id,1000,0,3),homeCity:rear.id}));
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>!rear.units.some(u=>u.id===p.id));
 initializeVision(s);initializeStrategicAI(s);return {s,home,rear};
}

function transfer(){
 const {s,home,rear}=planningFront(),u=home.units.find(u=>u.id==='ju');
 home.units=home.units.filter(x=>x!==u);u.troops=0;
 s.campaign.idle.push({unit:u,faction:'yuan',location:home.id,destination:null,remainingDays:0});
 const result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:[u.id],target:rear.id,cargo:{gold:0,grain:0,manpower:0},route:[rear.id],safeOnly:true},'now');
 assert.ok(result.applied);
 s.campaign.ai.staffing.push({faction:'yuan',officerId:u.id,cityId:rear.id,direction:'commerce',createdDay:1,arrivedDay:null,phase:'travel'});
 for(const [faction,p] of Object.entries(s.campaign.ai.factions)){drawFactionTemperament(s.campaign.ai,faction,s.turn,factionStrategicProfile(s,faction),0);p.lastReviewTurn=s.turn;}
 return {s,home,rear,id:u.id};
}
function arrive(s,id){for(let i=0;i<30&&s.campaign.idle.find(o=>o.unit.id===id)?.destination;i++)advancePersonnel(s,s.campaign.idle.find(o=>o.unit.id===id));}

test('a staffing promise survives real travel and reload, appoints on arrival and completes only after actual work',()=>{
 const {s,id,rear}=transfer();progressStrategicStaffing(s);assert.ok(staffingOfficer(s,id));assert.equal(assignmentFor(s,id),undefined);validateStrategicAI(s);
 const copy=JSON.parse(serializeCampaign(s));
 for(const world of [s,copy]){arrive(world,id);world.campaign.day++;progressStrategicStaffing(world);assert.equal(assignmentFor(world,id).cityId,rear.id);assert.equal(assignmentFor(world,id).direction,'commerce');assert.equal(world.campaign.ai.staffing[0].phase,'work');beginDomesticTurn(world);assert.ok(assignmentFor(world,id).action);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));validateStrategicAI(s);
 for(let i=0;i<30&&staffingOfficer(s,id);i++)for(const world of [s,copy]){world.campaign.day++;finishDomesticDay(world);progressStrategicStaffing(world);}
 assert.equal(staffingOfficer(s,id),false);assert.ok(s.campaign.domestic.workHistory[id].some(h=>h.status!=='interrupted'));assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('ordinary logistics preserves an arrived staffing appointment until its first real work attempt',()=>{
 const {s,home,rear,id}=transfer();arrive(s,id);s.campaign.day++;progressStrategicStaffing(s);home.gold=0;
 planStrategicAI(s);assert.ok(staffingOfficer(s,id));assert.equal(s.campaign.idle.find(o=>o.unit.id===id).destination,null);assert.equal(assignmentFor(s,id).cityId,rear.id);validateStrategicAI(s);
});

test('urgent real food transport may release staffing while lost ownership and duplicate claims invalidate it',()=>{
 const {s,home,id}=transfer();arrive(s,id);s.campaign.day++;progressStrategicStaffing(s);home.grain=0;home.hunger=1;
 planStrategicAI(s);assert.equal(staffingOfficer(s,id),false);const o=s.campaign.idle.find(o=>o.unit.id===id);assert.equal(o.destination,home.id);assert.ok(o.cargo.grain>0);assert.ok(s.campaign.ai.decisions.some(d=>d.reason.startsWith('口粮救急优先')));validateStrategicAI(s);
 const lost=transfer();lost.rear.owner='cao';progressStrategicStaffing(lost.s);assert.equal(lost.s.campaign.ai.staffing.length,0);
 const duplicate=transfer();duplicate.s.campaign.ai.staffing.push(structuredClone(duplicate.s.campaign.ai.staffing[0]));assert.throws(()=>validateStrategicAI(duplicate.s),/战略AI/);
});

test('AI redistributes an idle prepared garrison to a small city that already has three residents, then performs real work',()=>{
 const {s,home,rear}=distribution({residents:3});assert.equal(rear.citySize,'small');
 const before=home.units.reduce((n,u)=>n+u.troops+u.wounded,0),gold=home.gold;
 const copy=JSON.parse(serializeCampaign(s));
 for(const world of [s,copy])planStrategicPersonnel(world,'yuan');
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const p=s.campaign.ai.staffing.find(p=>p.cityId===rear.id);assert.ok(p);assert.notEqual(p.officerId,home.governor);
 const o=s.campaign.idle.find(o=>o.unit.id===p.officerId);assert.equal(o.location,home.id);assert.equal(o.destination,rear.id);assert.ok(o.unit.troops>0);
 assert.equal(home.units.reduce((n,u)=>n+u.troops+u.wounded,0)+o.unit.troops+o.unit.wounded,before);assert.equal(home.gold,gold);
 planStrategicPersonnel(s,'yuan');assert.equal(s.campaign.ai.staffing.filter(p=>p.cityId===rear.id).length,1);
 arrive(s,o.unit.id);s.campaign.day++;progressStrategicStaffing(s);assert.equal(assignmentFor(s,o.unit.id).cityId,rear.id);
 beginDomesticTurn(s);assert.ok(assignmentFor(s,o.unit.id).action);assert.equal(home.governor,'shao');
});

test('AI staffing uses available work rather than an unavailable higher attribute and can add a second economic worker',()=>{
 const {s,rear}=distribution({residents:3});
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction!=='agriculture')rear.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(s,rear.id,'agriculture',rear.units[0].id,{faction:'yuan',scheduled:true}),null);
 planStrategicPersonnel(s,'yuan');const p=s.campaign.ai.staffing.find(p=>p.cityId===rear.id);assert.ok(p);assert.equal(p.direction,'agriculture');
 arrive(s,p.officerId);s.campaign.day++;progressStrategicStaffing(s);assert.equal(assignmentFor(s,p.officerId).direction,'agriculture');
 assert.equal(s.campaign.domestic.assignments.filter(a=>a.cityId===rear.id&&a.direction==='agriculture').length,2);
});

test('AI staffing leaves productive local appointments in place and sends nobody to a city without real work',()=>{
 for(const blocked of ['destination','source']){
  const {s,home,rear}=distribution();
  if(blocked==='destination')for(const key of Object.keys(ACTIONS))rear.domestic.cooldowns[key]=1000;
  else for(const [i,u]of home.units.filter(u=>u.id!==home.governor).entries())assert.equal(assignDomestic(s,home.id,i<3?'agriculture':'commerce',u.id,{faction:'yuan',scheduled:true}),null);
  const ids=home.units.map(u=>u.id);planStrategicPersonnel(s,'yuan');
  assert.equal(s.campaign.ai.staffing.length,0);assert.deepEqual(home.units.map(u=>u.id),ids);
 }
});

test('AI staffing preserves the source defenders and checks destination rations for a prepared unit',()=>{
 for(const blocked of ['guard','food']){
  const {s,home,rear}=distribution();
  if(blocked==='food')rear.grain=0;
  else{const target=s.cities.find(c=>c.id==='town-5');target.owner='cao';target.domestic.owner='cao';target.units=['cao','dun','chu'].map(id=>({...makeOfficer(id,8000,0,10),homeCity:target.id}));s.roads.push([home.id,target.id]);approachDestination(s,fieldFromCity(s,target.id,{target:home.id}));initializeVision(s);}
  const ids=home.units.map(u=>u.id);planStrategicPersonnel(s,'yuan');assert.equal(s.campaign.ai.staffing.length,0);assert.deepEqual(home.units.map(u=>u.id),ids);
 }
});

function specializedDistribution(front){
 const {s,home,rear}=distribution(),foe=s.cities.find(c=>c.id==='town-5');
 home.units=home.units.slice(0,4);home.governor=home.units[0].id;
 for(const [i,u]of home.units.entries())Object.assign(u,{politics:i?1:30,charm:1,intellect:1,leadership:30,force:30});
 const [warrior,civil]=home.units.slice(1,3);
 Object.assign(warrior,{leadership:95,force:95,politics:80});Object.assign(civil,{leadership:20,force:20,politics:90});
 if(front){foe.owner='cao';foe.domestic.owner='cao';s.roads=[[home.id,rear.id],[rear.id,foe.id]];s.roadSegments[[rear.id,foe.id].sort().join(':')]={distance:1};}
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction!=='commerce')rear.domestic.cooldowns[key]=1000;
 initializeVision(s);initializeStrategicAI(s);return {s,home,rear,warrior,civil};
}

test('AI personnel sends military aptitude toward the front and civil aptitude toward the rear through real transfers',()=>{
 for(const front of [false,true]){
  const {s,home,rear,warrior,civil}=specializedDistribution(front);assert.equal(personnelCityProfile(s,home).role,'rear');assert.equal(personnelCityProfile(s,rear).role,front?'front':'rear');
  const copy=JSON.parse(serializeCampaign(s));for(const world of [s,copy])planStrategicPersonnel(world,'yuan');
  const p=s.campaign.ai.staffing.find(p=>p.cityId===rear.id);assert.ok(p);assert.equal(p.officerId,front?warrior.id:civil.id);
  assert.ok(s.campaign.idle.some(o=>o.unit.id===p.officerId&&o.destination===rear.id));assert.equal(serializeCampaign(s),serializeCampaign(copy));
 }
});

test('frontline personnel retains leading military officers and two actual guard units even behind strong walls',()=>{
 const {s,home,rear}=distribution(),foe=s.cities.find(c=>c.id==='town-5');foe.owner='cao';foe.domestic.owner='cao';s.roads.push([home.id,foe.id]);initializeVision(s);
 gateDurability(home).hp=1000000;
 home.units.forEach((u,i)=>Object.assign(u,{leadership:i<2?95:20,force:i<2?95:20,intellect:10,politics:60}));
 const profile=personnelCityProfile(s,home);assert.equal(profile.role,'front');assert.equal(profile.keepOfficerIds.length,2);
 for(const id of profile.keepOfficerIds)assert.match(staffingDepartureError(s,home,[id]),/军事人才/);
 const other=home.units.filter(u=>!profile.keepOfficerIds.includes(u.id));
 assert.match(staffingDepartureError(s,home,other.map(u=>u.id).concat(profile.keepOfficerIds[1])),/军事人才/);
 // Leave the two top officers unprepared: their aptitude cannot stand in for
 // the actual bodies remaining after a real prepared unit transfer.
 for(const u of home.units.filter(u=>profile.keepOfficerIds.includes(u.id)))u.troops=0;
 home.units=home.units.slice(0,4);const candidate=home.units[2];
 assert.match(staffingDepartureError(s,home,[candidate.id]),/实际驻城守备/);
 s.campaign.ai.staffing.push({faction:'yuan',officerId:candidate.id,cityId:rear.id,direction:'commerce',createdDay:1,arrivedDay:null,phase:'travel'});
 assert.match(strategicDepartureError(s,{kind:'transfer',faction:'yuan',cityId:home.id,target:rear.id,officerIds:[candidate.id]}),/实际驻城守备/);
 const third={...makeOfficer('person-263',500,0,3),homeCity:home.id,leadership:20,force:20,intellect:10};home.units.push(third);home.units[3].troops=500;
 assert.equal(personnelCityProfile(s,home,{departing:[candidate.id]}).guards.length,3);assert.match(staffingDepartureError(s,home,[candidate.id]),/实际驻城守备/);
});

test('personnel roles update with own borders and ignore hidden enemy strength orders and random state',()=>{
 const {s,home,rear}=specializedDistribution(true),copy=JSON.parse(serializeCampaign(s));
 const foe=copy.cities.find(c=>c.id==='town-5');foe.units=[];copy.seed^=12345;copy.campaign.domestic.orders=[];
 assert.deepEqual(personnelCityProfile(s,home),personnelCityProfile(copy,copy.cities.find(c=>c.id===home.id)));
 foe.owner='yuan';foe.domestic.owner='yuan';assert.equal(personnelCityProfile(copy,copy.cities.find(c=>c.id===rear.id)).role,'rear');
 const before=serializeCampaign(s);personnelCityProfile(s,rear);assert.equal(serializeCampaign(s),before);
 const quiet=specializedDistribution(false);quiet.s.campaign.ai.plans.push({faction:'yuan',phase:'consolidate',staging:quiet.home.id,target:quiet.rear.id,officerIds:[]});
 assert.equal(personnelCityProfile(quiet.s,quiet.home).role,'rear');assert.equal(personnelCityProfile(quiet.s,quiet.rear).role,'front');
});

test('a saved waiting staffing transfer rechecks newly exposed frontline talent before departure',()=>{
 const {s,home,rear}=specializedDistribution(false),candidate=home.units[1];candidate.troops=0;
 home.units.forEach((u,i)=>{if(i!==1)Object.assign(u,{leadership:10,force:10,intellect:10});});
 assert.equal(assignDomestic(s,home.id,'technology',candidate.id,{scheduled:true,faction:'yuan'}),null);beginDomesticTurn(s);assert.ok(assignmentFor(s,candidate.id).action);
 assert.ok(requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:[candidate.id],target:rear.id,cargo:{gold:0,grain:0,manpower:0},route:[rear.id],safeOnly:true},'after').queued);
 s.campaign.ai.staffing.push({faction:'yuan',officerId:candidate.id,cityId:rear.id,direction:'commerce',createdDay:1,arrivedDay:null,phase:'travel'});
 const foe=s.cities.find(c=>c.id==='town-5');foe.owner='cao';foe.domestic.owner='cao';s.roads=[[home.id,rear.id],[home.id,foe.id]];initializeVision(s);
 const copy=JSON.parse(serializeCampaign(s));for(const world of [s,copy]){resolveStrategicOrders(world);progressStrategicStaffing(world);}
 assert.equal(s.campaign.domestic.orders.length,0);assert.ok(home.units.includes(candidate));assert.ok(assignmentFor(s,candidate.id).action);assert.equal(staffingOfficer(s,candidate.id),false);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});
