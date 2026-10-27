import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {cityForce} from '../city-units.mjs';
import {gateDurability} from '../building-durability.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';
import {evaluateOffensive,offensiveFacts,planStrategicAI,strategicPower} from '../strategic-ai.mjs';
import {estimatedEmergencyDefense} from '../strategic-opposition.mjs';
import {serializeCampaign,validateCampaign,newCampaign,advanceCampaignDay} from '../strategic-campaign.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';

function front(){
 const f=planningFront(),{s,home,target,rear}=f;
 target.gold=0;target.manpower=0;
 rear.owner='cao';rear.domestic.owner='cao';rear.x=16;rear.y=0;rear.gold=0;rear.manpower=0;
 s.roads=[[home.id,target.id],[target.id,rear.id]];
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:1};
 initializeVision(s);return f;
}
const proposal=({home,target},units=home.units.slice(0,3))=>({faction:'yuan',staging:home,target,groups:[{c:home,units,days:0}],assaultDays:1,siegeDays:2});
function relief(f,{troops=6000,moving=false}={}){
 const {s,rear,target}=f,u={...makeOfficer('gao',troops,0,3),homeCity:rear.id};
 const a={...cityForce(rear),id:'a'+s.nextId++,cityForce:false,units:[u],leader:u.id,advisor:u.id,supply:900,supplyCapacity:900,route:[],target:null};
 if(moving)a.travel={from:rear.id,to:target.id,road:'main',progress:.9};
 s.armies.push(a);return a;
}

test('paid emergency defense is estimated from observed gold reserves and quota without creating soldiers',()=>{
 const f=front(),{s,target,home}=f;target.units=[];target.gold=500;target.manpower=9000;
 const before=serializeCampaign(s),muster=estimatedEmergencyDefense(target),result=evaluateOffensive(s,proposal(f,home.units.slice(0,1)));
 assert.equal(muster.men,2000);assert.equal(result.opposition.emergencyMen,2000);
 assert.ok(result.estimatedLosses>0);assert.equal(result.accepted,false);assert.equal(serializeCampaign(s),before);
 for(const resource of ['gold','manpower']){const old=target[resource];target[resource]=0;assert.equal(estimatedEmergencyDefense(target).men,0);target[resource]=old;}
 target.drafted=3000;assert.equal(estimatedEmergencyDefense(target).men,0);
});

test('timely nearby field reinforcements raise defense losses and can veto a previously viable attack',()=>{
 const f=front(),baseline=evaluateOffensive(f.s,proposal(f));assert.equal(baseline.accepted,true);
 const a=relief(f),result=evaluateOffensive(f.s,proposal(f));
 assert.ok(result.opposition.reinforcements.some(r=>r.id===a.id&&r.kind==='field'));
 assert.equal(result.opposition.reinforcementPower,strategicPower(f.s,a,{opponents:proposal(f).groups[0].units})*R.opposition.fieldSupportShare);
 assert.ok(result.estimatedLosses>baseline.estimatedLosses);assert.equal(result.accepted,false);assert.match(result.reason,/优势/);
 assert.equal(result.counterPower,0,'the same relief troops are not charged again as a post-capture counterattack');
});

test('observed approaching relief counts fully while armies too late on real roads do not count',()=>{
 const f=front(),a=relief(f,{moving:true}),first=evaluateOffensive(f.s,proposal(f));
 assert.equal(first.opposition.reinforcementPower,strategicPower(f.s,a,{opponents:proposal(f).groups[0].units}));
 assert.equal(first.opposition.reinforcements[0].kind,'approaching');
 a.travel.progress=0;f.s.roadSegments[[f.target.id,f.rear.id].sort().join(':')].distance=5000;
 const late=evaluateOffensive(f.s,proposal(f));assert.equal(late.opposition.reinforcementPower,0);
 assert.equal(late.opposition.reinforcements.length,0);
});

test('potential city relief retains half its garrison and includes arrival during the siege',()=>{
 const f=front(),{s,rear,target}=f;rear.units=[{...makeOfficer('gao',4000,0,3),homeCity:rear.id}];
 // Arrival is later than the one-day assault, but inside its battle window.
 s.roadSegments[[target.id,rear.id].sort().join(':')].distance=8;
 const result=evaluateOffensive(s,proposal(f)),row=result.opposition.reinforcements.find(r=>r.id==='city-force:'+rear.id);
 assert.ok(row);assert.ok(row.eta>1);assert.ok(row.eta<=result.opposition.window);
 assert.equal(row.power,strategicPower(s,cityForce(rear),{opponents:proposal(f).groups[0].units})*.5);
});

test('a known neutral objective includes a timely competing hostile force before treating occupation as free',()=>{
 const f=front(),{s,target}=f;target.owner='neutral';target.domestic.owner='neutral';target.units=[];
 const free=evaluateOffensive(s,proposal(f,f.home.units.slice(0,2)));assert.equal(free.estimatedLosses,0);
 const a=relief(f,{moving:true}),contested=evaluateOffensive(s,proposal(f,f.home.units.slice(0,2)));
 assert.ok(contested.opposition.contenders.some(r=>r.id===a.id));assert.ok(contested.opposition.contestingPower>0);
 assert.ok(contested.estimatedLosses>0);assert.equal(contested.accepted,false);
});

test('opposition estimates cannot read hidden city resources officers secret orders or random outcomes',()=>{
 const f=front(),{s,target,rear}=f;target.x=500;rear.x=510;initializeVision(s);
 s.campaign.vision.factions.yuan.cities[target.id]={day:1,owner:'cao',data:structuredClone(target)};
 const initial=offensiveFacts(s,proposal(f));
 target.gold=900000;target.manpower=900000;target.units.forEach(u=>u.troops*=8);rear.units.push(makeOfficer('gao',6000,0,3));
 s.campaign.idle.push({faction:'cao',location:target.id,unit:makeOfficer('person-72',0,0,3)});
 s.seed+=777;s.campaign.ai.factions.cao={strategy:{goal:{kind:'capture',targetCity:f.home.id}}};
 assert.deepEqual(offensiveFacts(s,proposal(f)),initial);
 s.campaign.day=11;s.turn=2;const older=offensiveFacts(s,proposal(f));
 assert.ok(older.facts.opposition.staleMargin>initial.facts.opposition.staleMargin);
 assert.ok(older.facts.defense>initial.facts.defense);
});

test('militarily inadequate small variants do not prevent assembling an actually superior legal force',()=>{
 const f=front(),{s,target,home}=f;target.units=[];target.gold=500;target.manpower=9000;gateDurability(target).hp=15000;
 home.units.forEach(u=>u.troops=1500);planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.ok(p.officerIds.length>3);
 const evidence=s.campaign.ai.factions.yuan.strategy.goal.military;
 assert.ok(evidence.attackPower>evidence.defensePower*evidence.requiredAdvantage);
 assert.ok(evidence.emergencyMen>0);assert.ok(evidence.estimatedLosses>0);
});

test('a launched operation rechecks newly observed timely relief before contact and really returns',()=>{
 const f=front(),{s,target}=f;target.units=[];planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(p.phase,'attack');
 relief(f,{troops:6000});s.campaign.day++;s.campaign.ai.lastPlanDay=0;updateVision(s);planStrategicAI(s);
 assert.equal(p.phase,'cancelled');assert.match(p.reason,/增援.*优势不足/);
 const armies=s.armies.filter(a=>a.faction==='yuan');assert.ok(armies.every(a=>a.target===p.staging||!a.route.length));
});

test('military evidence survives ordinary all AI save continuation and malformed forecasts fail validation',()=>{
 const s=newCampaign(20261010,'guandu-200','cao',{allAI:true});
 const evidence=()=>Object.values(s.campaign.ai.factions).flatMap(f=>f.strategy.trace).flatMap(t=>t.candidates).find(c=>c.military);
 for(let i=0;i<21&&!evidence();i++)advanceCampaignDay(s);
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved);
 const trace=Object.values(copy.campaign.ai.factions).flatMap(f=>f.strategy.trace).flatMap(t=>t.candidates).find(c=>c.military);
 assert.ok(trace);assert.equal(copy.campaign.ai.algorithms.battlePredictor,'attrition-v3');assert.equal(trace.military.model,'static-v2-no-bonds');
 trace.military.reinforcementPower=-1;assert.throws(()=>validateCampaign(copy),/战略/);
 const resumed=validateCampaign(JSON.parse(saved));advanceCampaignDay(s);advanceCampaignDay(resumed);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
});
