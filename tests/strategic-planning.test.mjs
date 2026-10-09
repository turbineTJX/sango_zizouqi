import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {planStrategicAI,validateStrategicAI,evaluateOffensive} from '../strategic-ai.mjs';
import {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {initializeVision,updateVision,armyVisible} from '../strategic-vision.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {evaluateDiplomaticProposal,diplomaticCandidates,lordCity,assignDiplomat,prepareDiplomaticProposal} from '../diplomacy.mjs';
import {gateDurability} from '../building-durability.mjs';
import {makeOfficer} from '../engine.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {forecastStrategicPreparation} from '../strategic-forecast.mjs';
import {actionCandidates,assignDomestic,assignmentFor} from '../domestic.mjs';
import {chooseFactionStrategy,newFactionStrategy} from '../strategic-policy.mjs';

test('a ruler selects one main front and capture leaves bind actual armies, not speculative rewards',()=>{
 const {s,target,home}=planningFront(),gold=home.gold;planStrategicAI(s);
 const strategy=s.campaign.ai.factions.yuan.strategy,p=s.campaign.ai.plans.find(p=>p.faction==='yuan');
 assert.equal(strategy.neighbors.cao.mode,'attack');assert.equal(strategy.goal.targetCity,target.id);assert.equal(strategy.goal.planId,p.id);
 assert.equal(p.phase,'attack');assert.equal(p.tasks.find(t=>t.id==='assault').status,'running');
 assert.ok(p.tasks.find(t=>t.id==='assault').refs.some(ref=>s.armies.some(a=>'army:'+a.id===ref)));
 assert.equal(home.gold,gold);assert.equal(target.owner,'cao');validateStrategicAI(s);
});
test('force selection repairs post-capture defense shortfalls by considering larger legal groups',()=>{
 const {s,home,target,rear}=planningFront();target.units=[];target.commerce=10;rear.owner='cao';rear.domestic.owner='cao';rear.x=16;
 rear.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,6000,i,3),homeCity:rear.id}));s.roads=[[home.id,target.id],[target.id,rear.id]];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};initializeVision(s);
 assert.ok(evaluateOffensive(s,{faction:'yuan',staging:home,target,groups:[{c:home,units:home.units,days:0}],assaultDays:1,siegeDays:0}).accepted);
 planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.ok(p.officerIds.length>1);assert.ok(p.officerIds.length<=10);
});
test('a preparing objective waits for real gold delivery and the next ten-day review',()=>{
 const {s,home,rear}=planningFront();home.gold=600;home.units=home.units.slice(0,3);
 s.campaign.idle.push({unit:{...makeOfficer('ju',0,0,3),homeCity:rear.id},faction:'yuan',location:rear.id,destination:null,remainingDays:0});
 planStrategicAI(s);const g=s.campaign.ai.factions.yuan.strategy.goal;
 assert.equal(g.kind,'capture');assert.equal(g.status,'preparing');assert.equal(s.campaign.ai.plans.filter(p=>p.faction==='yuan').length,0);
 const courier=s.campaign.idle.find(o=>o.destination===home.id&&o.cargo?.gold);assert.ok(courier);assert.equal(home.gold,600);
 const cargo=courier.cargo.gold;for(let i=0;i<10&&courier.destination;i++)advancePersonnel(s,courier,[]);
 assert.equal(home.gold,600+cargo);const revision=s.campaign.ai.factions.yuan.strategy.revision;
 for(let day=2;day<=10;day++){s.campaign.day=day;planStrategicAI(s);assert.equal(s.campaign.ai.factions.yuan.strategy.revision,revision);assert.equal(s.campaign.ai.plans.filter(p=>p.faction==='yuan').length,0);}
 s.campaign.day=11;s.turn=2;updateVision(s);planStrategicAI(s);assert.ok(s.campaign.ai.plans.some(p=>p.faction==='yuan'&&p.phase==='attack'));
});
test('hidden enemy stocks, orders and battle RNG never enter strategic or diplomatic assessments',()=>{
 const s=newCampaign(417,'guandu-200'),f='yuan',source=s.cities.find(c=>c.owner==='cao'&&c.units.length&&!strategicContext(s,f).reports.some(r=>r.id===c.id&&r.visible));
 const a=fieldFromCity(s,source.id);a.location=s.cities.find(c=>c.owner==='cao'&&Math.hypot(c.x-lordCity(s,f).x,c.y-lordCity(s,f).y)>100).id;
 assert.equal(armyVisible(s,a,f),false);
 const p={goal:'peace',factions:[f,'cao'],clauses:[{kind:'peace',from:f,to:'cao',duration:30}]};
 const before={context:strategicContext(s,f),diplomacy:evaluateDiplomaticProposal(s,p,f),offers:diplomaticCandidates(s,{faction:f,direction:'negotiation',homeCity:lordCity(s,f).id})};
 a.target=lordCity(s,f).id;a.route=[a.target];a.units.forEach(u=>u.troops*=10);s.seed+=999;
 const hidden=s.cities.find(c=>c.owner==='cao'&&!before.context.reports.some(r=>r.id===c.id&&r.visible));hidden.gold=999999;hidden.grain=1;gateDurability(hidden).hp=999999;
 assert.deepEqual(strategicContext(s,f),before.context);assert.deepEqual(evaluateDiplomaticProposal(s,p,f),before.diplomacy);assert.deepEqual(diplomaticCandidates(s,{faction:f,direction:'negotiation',homeCity:lordCity(s,f).id}),before.offers);
});
test('current strategic goals and task progress survive reload and resume deterministically',()=>{
 const s=newCampaign(91,'guandu-200','cao',{allAI:true});advanceCampaignDay(s);
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved);
 assert.ok(s.campaign.ai.plans.some(p=>p.faction==='sunce'&&p.target==='atlas-guangling'),'a known executable opportunity survives bounded candidate pruning');
 advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 const broken=JSON.parse(serializeCampaign(s));broken.campaign.ai.factions.cao.strategy.version=0;assert.throws(()=>validateCampaign(broken),/战略AI/);
 const malformed=JSON.parse(serializeCampaign(s));malformed.campaign.ai.factions.cao.strategy.militarySignature='[[null],[]]';assert.throws(()=>validateCampaign(malformed),/战略AI/);
});
test('domestic candidate priorities never observe a hidden army or its secret objective',()=>{
 const {s,home,target}=planningFront();target.x=500;initializeVision(s);assert.equal(assignDomestic(s,home.id,'military','ju',{faction:'yuan'}),null);
 const before=actionCandidates(s,assignmentFor(s,'ju'));const a=fieldFromCity(s,target.id);a.target=home.id;a.route=[home.id];
 assert.equal(armyVisible(s,a,'yuan'),false);assert.deepEqual(actionCandidates(s,assignmentFor(s,'ju')),before);
});
test('preparation forecasting respects the actual harvest date and rejects starvation before income',()=>{
 const {s,home}=planningFront();home.gold=0;const context=strategicContext(s,'yuan'),c=context.ownCities.find(c=>c.id===home.id);
 c.income.gold=100;c.costs.gold=0;c.costs.grain=100;c.grain=1000;
 const requirements=[{cityId:home.id,gold:100,grain:0,manpower:0}],before=JSON.stringify(context),result=forecastStrategicPreparation(context,requirements);
 assert.equal(result.readyDay,11);assert.equal(JSON.stringify(context),before);
 c.grain=5;assert.equal(forecastStrategicPreparation(context,requirements).feasible,false);
});
test('strategic continuity keeps a feasible incumbent through small score changes and allows a clear opportunity',()=>{
 const {s,home,target,rear}=planningFront(),context=strategicContext(s,'yuan'),profile={style:'balanced'},previous=newFactionStrategy();
 const first={kind:'capture',targetFaction:'cao',targetCity:target.id,staging:home.id,ready:true,score:30,reason:'可行目标'};
 const initial=chooseFactionStrategy(context,profile,previous,[first]);
 const other={...first,targetCity:rear.id,score:35};assert.equal(chooseFactionStrategy(context,profile,initial,[first,other]).goal.targetCity,target.id);
 other.score=80;assert.equal(chooseFactionStrategy(context,profile,initial,[first,other]).goal.targetCity,rear.id);
});

test('default development and recovery cannot veto a better feasible offensive through the switching margin',()=>{
 const {s,home,target}=planningFront(),context=strategicContext(s,'yuan'),profile={style:'balanced'};
 const attack={kind:'capture',targetFaction:'cao',targetCity:target.id,staging:home.id,ready:true,score:3.3656,reason:'真实可行的边境机会'};
 const developed=chooseFactionStrategy(context,profile,newFactionStrategy(),[]);
 assert.equal(developed.goal.kind,'develop');
 assert.equal(chooseFactionStrategy(context,profile,developed,[attack]).goal.targetCity,target.id);
 assert.equal(chooseFactionStrategy(context,profile,developed,[{...attack,score:-1}]).goal.kind,'develop');
 const recovering=structuredClone(context);recovering.ownCities[0].shortages.gold=1;
 const old=chooseFactionStrategy(recovering,profile,newFactionStrategy(),[]);assert.equal(old.goal.kind,'recover');
 assert.equal(chooseFactionStrategy(recovering,profile,old,[attack]).goal.targetCity,target.id);
});

test('fresh observations cancel an unsafe existing attack without reselecting objectives within the turn',()=>{
 const {s,target}=planningFront();planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan'),revision=s.campaign.ai.factions.yuan.strategy.revision,turn=s.turn;
 assert.equal(p.phase,'attack');target.units.forEach(u=>u.troops=100000);
 s.campaign.day++;updateVision(s);planStrategicAI(s);
 assert.equal(s.turn,turn);assert.equal(p.phase,'cancelled');assert.equal(s.campaign.ai.factions.yuan.strategy.revision,revision);
 assert.match(p.reason,/优势消失/);
 const signature=s.campaign.ai.factions.yuan.strategy.militarySignature;
 for(let day=3;day<=10;day++){s.campaign.day=day;updateVision(s);planStrategicAI(s);assert.equal(s.campaign.ai.factions.yuan.strategy.revision,revision);assert.equal(s.campaign.ai.factions.yuan.strategy.militarySignature,signature);}
 s.campaign.day=11;s.turn=2;updateVision(s);planStrategicAI(s);
 assert.equal(s.campaign.ai.factions.yuan.strategy.revision,revision+1);assert.equal(s.campaign.ai.factions.yuan.strategy.updatedDay,11);
 assert.notEqual(s.campaign.ai.factions.yuan.strategy.militarySignature,signature);
 const repeated=JSON.stringify(s.campaign.ai.factions.yuan.strategy);planStrategicAI(s);assert.equal(JSON.stringify(s.campaign.ai.factions.yuan.strategy),repeated);
});

test('departure checks use the known foreign offer and defer hidden obligations to the actual meeting',()=>{
 const {s,home,target}=planningFront();assert.ok(assignDiplomat(s,'ju','commerce',{faction:'yuan'}).applied);
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId==='ju');
 const candidate={goal:'funding',other:'cao',targetCity:target.id,path:[target.id],score:35,reason:'请求接洽',clauses:[{kind:'gold',from:'cao',to:'yuan',amount:500}]};
 target.x=500;updateVision(s);const copy=structuredClone(s);
 copy.cities.find(c=>c.id===target.id).gold=0;copy.cities.find(c=>c.id===target.id).owner='lu';
 const first=prepareDiplomaticProposal(s,a,candidate),second=prepareDiplomaticProposal(copy,copy.campaign.diplomacy.assignments.find(a=>a.officerId==='ju'),candidate);
 assert.ok(first);assert.deepEqual(second,first);assert.equal(copy.cities.find(c=>c.id===home.id).gold,home.gold);
});
