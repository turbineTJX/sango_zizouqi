import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {planStrategicAI,validateStrategicAI} from '../strategic-ai.mjs';
import {progressStrategicStaffing,staffingOfficer} from '../strategic-staffing.mjs';
import {requestFactionOrder} from '../strategic-orders.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {assignmentFor,beginDomesticTurn,finishDomesticDay} from '../domestic.mjs';

function transfer(){
 const {s,home,rear}=planningFront(),u=home.units.find(u=>u.id==='ju');
 home.units=home.units.filter(x=>x!==u);u.troops=0;
 s.campaign.idle.push({unit:u,faction:'yuan',location:home.id,destination:null,remainingDays:0});
 const result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:[u.id],target:rear.id,cargo:{gold:0,grain:0,manpower:0},route:[rear.id],safeOnly:true},'now');
 assert.ok(result.applied);
 s.campaign.ai.staffing.push({faction:'yuan',officerId:u.id,cityId:rear.id,direction:'commerce',createdDay:1,arrivedDay:null,phase:'travel'});
 for(const p of Object.values(s.campaign.ai.factions))p.lastReviewTurn=s.turn;
 return {s,home,rear,id:u.id};
}
function arrive(s,id){for(let i=0;i<30&&s.campaign.idle.find(o=>o.unit.id===id).destination;i++)advancePersonnel(s,s.campaign.idle.find(o=>o.unit.id===id));}

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
