import test from 'node:test';
import assert from 'node:assert/strict';
import {staffingScene,foodScene,exerciseSameTurnCoherence,realMen,realGrain} from './helpers/same-turn-coherence.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {planStrategicAI,validateStrategicAI} from '../strategic-ai.mjs';
import {serializeCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {assignmentFor,beginDomesticTurn,finishDomesticDay,ACTIONS} from '../domestic.mjs';
import {progressStrategicStaffing,staffingOfficer} from '../strategic-staffing.mjs';

test('same-turn staffing and food relief preserve real commitments and resource totals',()=>{
 for(const [name,passed]of Object.entries(exerciseSameTurnCoherence()))assert.equal(passed,true,name);
});

test('an arrived staffing officer starts the promised real work before ordinary priority reassignment',()=>{
 const {s,id}=staffingScene(),copy=JSON.parse(serializeCampaign(s));
 for(const world of [s,copy]){beginDomesticTurn(world);assert.equal(assignmentFor(world,id).direction,'military');assert.ok(assignmentFor(world,id).action);assert.ok(staffingOfficer(world,id));validateStrategicAI(world);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const first=assignmentFor(s,id).action,budget=Math.ceil(first.remaining)+1;let completedDay=0;
 for(let day=1;day<=budget&&assignmentFor(s,id)?.action?.id===first.id;day++){
  s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;finishDomesticDay(s);completedDay=day;
  if(assignmentFor(s,id)?.action?.id===first.id){progressStrategicStaffing(s);assert.ok(staffingOfficer(s,id),'unfinished real work remains protected');}
 }
 assert.ok(s.campaign.domestic.workHistory[id]?.some(h=>h.actionId===first.id&&h.status!=='interrupted'));
 s.campaign.day=(Math.floor((completedDay-1)/10)+1)*10+1;s.turn=Math.floor((s.campaign.day-1)/10)+1;s.campaign.phase='planning';progressStrategicStaffing(s);assert.equal(staffingOfficer(s,id),false);
});

test('real local food danger may release an unstarted staffing promise with an explicit reason',()=>{
 const {s,rear,id}=staffingScene({grain:0});prepareEnemyDomestic(s);
 assert.equal(assignmentFor(s,id).direction,'agriculture');assert.equal(staffingOfficer(s,id),false);
 assert.ok(s.campaign.activity.nodes.some(n=>n.officerId===id&&n.result?.reason==='staffing-food-emergency'));assert.equal(rear.grain,0);
});

test('a staffing promise is released when its intended direction has no legal work',()=>{
 const {s,rear,id}=staffingScene();for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='military')rear.domestic.cooldowns[key]=1000;
 progressStrategicStaffing(s);assert.equal(staffingOfficer(s,id),false);prepareEnemyDomestic(s);assert.equal(assignmentFor(s,id).direction,'agriculture');
});

test('a timely real grain convoy protects staffing from a false emergency override',()=>{
 const {s,home,rear,id}=staffingScene({grain:40}),carrier=home.units.find(u=>u.id==='tian');
 assert.equal(transferOfficer(s,carrier.id,rear.id,{scheduled:true,faction:'yuan',cargo:{grain:1000,manpower:0,gold:0}}),null);
 const o=s.campaign.idle.find(o=>o.unit.id===carrier.id);assert.equal(o.destination,rear.id);assert.equal(o.cargo.grain,1000);
 prepareEnemyDomestic(s);assert.equal(assignmentFor(s,id).direction,'military');assert.ok(staffingOfficer(s,id));assert.equal(rear.grain,40);
});

test('an unrelated hungry town cannot cancel a newly admitted independent offensive',()=>{
 const {s,home,rear,target}=foodScene(),men=realMen(s),grain=realGrain(s);planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.ok(p.origins.every(g=>g.cityId!==rear.id));assert.equal(p.phase,'attack');
 assert.ok(s.armies.some(a=>a.homeCity===home.id&&a.target===target.id));assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='recover'&&d.target===rear.id));
 assert.equal(realMen(s),men);assert.equal(realGrain(s),grain);validateStrategicAI(s);
 const before=serializeCampaign(s);planStrategicAI(s);assert.equal(serializeCampaign(s),before);
});

test('timely actual food relief and independent attacks remain deterministic',()=>{
 const {s,target}=foodScene({grain:100}),copy=JSON.parse(serializeCampaign(s));
 for(const world of [s,copy]){planStrategicAI(world);assert.ok(world.campaign.ai.plans.some(p=>p.faction==='yuan'&&p.phase==='attack'&&p.target===target.id));validateStrategicAI(world);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
});
