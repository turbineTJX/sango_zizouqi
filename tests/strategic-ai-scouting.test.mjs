import {gateDurability} from '../building-durability.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {makeOfficer} from '../engine.mjs';
import {cityForce} from '../city-units.mjs';
import {assignDomestic,assignmentFor} from '../domestic.mjs';
import {initializeVision,cityIntelligence,cityVisible,intelligenceWorld,updateVision,validateVision} from '../strategic-vision.mjs';
import {planStrategicScouting,waitingForStrategicScout} from '../strategic-scouting-ai.mjs';
import {advanceScouting,scoutAssignments,recallScout,scoutCandidates,dispatchScout,scoutRoute} from '../scouting.mjs';
import {initializeStrategicAI,planStrategicAI,evaluateOffensive,observeStrategicThreat,expeditionTiming} from '../strategic-ai.mjs';

// A real city/unit front with deliberately separated visibility circles.
function front(){
 const s=newCampaign(513,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];s.campaign.diplomacy.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.project=null;c.gold=50000;c.grain=50000;c.manpower=20000;gateDurability(c).hp=0;}
 const home=s.cities.find(c=>c.id==='ye'),targets=['town-5','town-8','xuchang'].map(id=>s.cities.find(c=>c.id===id));
 Object.assign(home,{owner:'yuan',x:0,y:0});home.domestic.owner='yuan';
 for(const [i,c]of targets.entries()){Object.assign(c,{owner:'cao',x:100,y:i*120});c.domestic.owner='cao';}
 home.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:home.id}));
 targets[0].units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:targets[0].id}));
 s.roads=targets.map(c=>[home.id,c.id]);
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:70};
 initializeVision(s);initializeStrategicAI(s);return {s,home,targets};
}
function assessment({s,home,targets}){
 return evaluateOffensive(s,{faction:'yuan',staging:home,target:targets[0],groups:[{c:home,units:home.units.slice(0,3),days:0}],assaultDays:1,siegeDays:2});
}
const ownTasks=s=>scoutAssignments(s).filter(t=>t.faction==='yuan');
function arrive(s){for(let days=0;ownTasks(s).some(t=>t.phase==='outbound')&&days<10;days++){s.campaign.day++;advanceScouting(s);validateVision(s);}assert.ok(ownTasks(s).every(t=>t.phase==='watch'));}

test('AI assigns at most two unique scout targets and uses eligible officers in intelligence order',()=>{
 const {s,home}=front(),candidates=scoutCandidates(s,home.id,'yuan'),before=home.units.reduce((n,u)=>n+u.troops,0);
 planStrategicScouting(s,'yuan');const tasks=ownTasks(s);
 assert.equal(tasks.length,2);assert.equal(new Set(tasks.map(t=>t.targetCity)).size,2);
 assert.deepEqual(tasks.map(t=>t.officerId),candidates.slice(0,2).map(o=>o.unit.id));
 assert.ok(tasks.every(t=>t.homeCity===home.id));assert.equal(home.units.reduce((n,u)=>n+u.troops,0),before);
 const saved=serializeCampaign(s);planStrategicScouting(s,'yuan');assert.equal(serializeCampaign(s),saved);
 for(const t of tasks)assert.match(expeditionTiming(s,home.id,[t.officerId]).error,/侦察/);
});

test('a main offensive objective takes priority over other unknown frontier cities',()=>{
 const {s,targets}=front();s.campaign.ai.plans.push({faction:'yuan',phase:'prepare',target:targets[2].id,officerIds:[]});
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s)[0].targetCity,targets[2].id);
});

test('a planned distant objective cannot make the AI scout through an intervening city',()=>{
 const {s,home,targets}=front(),far=targets[2];s.roads=s.roads.filter(edge=>!edge.includes(far.id));s.roads.push([targets[0].id,far.id]);s.roadSegments[[targets[0].id,far.id].sort().join(':')]={distance:70};
 s.campaign.ai.plans.push({faction:'yuan',phase:'prepare',target:far.id,officerIds:[]});planStrategicScouting(s,'yuan');
 assert.equal(ownTasks(s).length,2);assert.ok(ownTasks(s).every(t=>t.homeCity===home.id&&t.targetCity!==far.id));assert.equal(waitingForStrategicScout(s,'yuan',far.id),false);
});

test('completed frontier scouting is reassigned to a more important main offensive',()=>{
 const {s,targets}=front();planStrategicScouting(s,'yuan');arrive(s);
 assert.ok(ownTasks(s).every(t=>t.phase==='watch'&&t.contacts.some(c=>c.report)));
 const oldTargets=ownTasks(s).map(t=>t.targetCity),newTarget=targets.find(c=>!oldTargets.includes(c.id));
 s.campaign.ai.plans.push({faction:'yuan',phase:'prepare',target:newTarget.id,officerIds:[]});
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,2);assert.ok(ownTasks(s).some(t=>t.targetCity===newTarget.id));
});

test('ordinary scouting covers another unknown border after two observed days without daily reshuffling',()=>{
 const {s,targets}=front();planStrategicScouting(s,'yuan');advanceScouting(s);
 const old=ownTasks(s).map(t=>t.id),next=targets.find(c=>!ownTasks(s).some(t=>t.targetCity===c.id));assert.ok(next);
 s.campaign.day=2;advanceScouting(s);planStrategicScouting(s,'yuan');assert.deepEqual(ownTasks(s).map(t=>t.id),old);
 s.campaign.day=3;advanceScouting(s);planStrategicScouting(s,'yuan');
 assert.equal(ownTasks(s).length,2);assert.ok(ownTasks(s).some(t=>t.targetCity===next.id));assert.equal(ownTasks(s).filter(t=>old.includes(t.id)).length,1);
 const saved=serializeCampaign(s);planStrategicScouting(s,'yuan');assert.equal(serializeCampaign(s),saved);
 advanceScouting(s);assert.equal(cityVisible(s,next.id,'yuan'),true);
});

test('completed scouting refreshes a stale border even without an offensive plan',()=>{
 const {s,targets}=front();planStrategicScouting(s,'yuan');advanceScouting(s);
 const next=targets.find(c=>!ownTasks(s).some(t=>t.targetCity===c.id));
 s.campaign.vision.factions.yuan.cities[next.id]={day:1,owner:next.owner,data:structuredClone(next)};
 s.campaign.day=3;advanceScouting(s);planStrategicScouting(s,'yuan');assert.ok(!ownTasks(s).some(t=>t.targetCity===next.id),'two-day-old report is still fresh');
 s.campaign.day=4;advanceScouting(s);planStrategicScouting(s,'yuan');assert.ok(ownTasks(s).some(t=>t.targetCity===next.id));
 assert.equal(waitingForStrategicScout(s,'yuan',next.id),true);
 advanceScouting(s);assert.equal(waitingForStrategicScout(s,'yuan',next.id),false);
});

test('higher scouting priority can release waiting optional work while preserving paid work and food/cash staff',()=>{
 const {s,home}=front();home.governor='shao';
 for(const [id,direction]of [['shao','agriculture'],['yan','commerce'],['wen','military'],['he','technology'],['ju','technology'],['tian','talent']])assert.equal(assignDomestic(s,home.id,direction,id,{faction:'yuan'}),null);
 const paid=assignmentFor(s,'wen').action={id:999,key:'recruit',remaining:5,cost:500},before={gold:home.gold,grain:home.grain,manpower:home.manpower};
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,2);assert.deepEqual(ownTasks(s).map(t=>t.officerId).sort(),['ju','tian']);
 assert.equal(assignmentFor(s,'ju'),undefined);assert.equal(assignmentFor(s,'tian'),undefined);assert.strictEqual(assignmentFor(s,'wen').action,paid);
 assert.equal(assignmentFor(s,'shao').direction,'agriculture');assert.equal(assignmentFor(s,'yan').direction,'commerce');assert.equal(home.governor,'shao');
 assert.deepEqual({gold:home.gold,grain:home.grain,manpower:home.manpower},before);
});

test('AI never releases the only food and cash workers to obtain more scouting',()=>{
 const {s,home}=front();home.units=home.units.filter(u=>['ju','tian'].includes(u.id));
 assert.equal(assignDomestic(s,home.id,'agriculture','ju',{faction:'yuan'}),null);assert.equal(assignDomestic(s,home.id,'commerce','tian',{faction:'yuan'}),null);
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,0);assert.equal(s.campaign.domestic.assignments.length,2);
});

test('player and AI scouts travel 105 road points per day and cover a 210-point route in two days',()=>{
 const {s,home}=front();for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:210};
 const player=JSON.parse(serializeCampaign(s));player.campaign.playerFaction='yuan';planStrategicScouting(s,'yuan');const ai=ownTasks(s)[0];
 assert.equal(dispatchScout(player,home.id,ai.officerId,ai.targetCity),null);const human=ownTasks(player)[0];
 for(const state of [s,player])advanceScouting(state);
 for(const task of [ai,human]){assert.equal(task.phase,'outbound');assert.ok(Math.abs(task.progress-105)<1e-9);}
 for(const state of [s,player]){state.campaign.day++;advanceScouting(state);validateVision(state);}
 for(const task of [ai,human]){assert.equal(task.phase,'watch');assert.equal(task.location,ai.targetCity);assert.equal(task.progress,0);}
 assert.ok(home.units.some(u=>u.id===ai.officerId));assert.equal(s.armies.length,0);assert.equal(player.armies.length,0);
});

test('frequent scouting does not abandon an outbound scout to rotate toward another target',()=>{
 const {s,targets}=front();for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:500};
 planStrategicScouting(s,'yuan');advanceScouting(s);const old=ownTasks(s).map(t=>t.id),next=targets.find(c=>!ownTasks(s).some(t=>t.targetCity===c.id));
 s.campaign.ai.plans.push({faction:'yuan',phase:'prepare',target:next.id,officerIds:[]});s.campaign.day=4;planStrategicScouting(s,'yuan');assert.deepEqual(ownTasks(s).map(t=>t.id),old);
});

test('reassignment releases an officer in the actual departure city rather than stopping an unrelated scout',()=>{
 const {s,home,targets}=front(),rear=targets[1],main=s.cities.find(c=>c!==home&&!targets.includes(c));
 home.units=home.units.filter(u=>['tian','he'].includes(u.id));home.governor='he';Object.assign(rear,{owner:'yuan',x:200,y:0});rear.domestic.owner='yuan';
 rear.units=['ju','wen'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:rear.id}));rear.governor='wen';Object.assign(main,{owner:'cao',x:300,y:0});main.domestic.owner='cao';
 s.roads.push([rear.id,targets[2].id],[rear.id,main.id]);
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:70};initializeVision(s);
 assert.equal(dispatchScout(s,home.id,'tian',targets[0].id,{faction:'yuan'}),null);
 assert.equal(dispatchScout(s,rear.id,'ju',targets[2].id,{faction:'yuan'}),null);arrive(s);
 const keep=ownTasks(s).find(t=>t.homeCity===home.id).id;
 s.campaign.ai.plans.push({faction:'yuan',phase:'prepare',target:main.id,officerIds:[]});planStrategicScouting(s,'yuan');
 assert.equal(ownTasks(s).length,2);assert.ok(ownTasks(s).some(t=>t.id===keep));
 const replacement=ownTasks(s).find(t=>t.targetCity===main.id);assert.equal(replacement.homeCity,rear.id);assert.equal(replacement.officerId,'ju');
});

test('scouts remain watching hostile targets, and stop when friendly armies provide direct vision',()=>{
 const {s,home}=front();planStrategicScouting(s,'yuan');advanceScouting(s);
 const t=ownTasks(s)[0],before=t.id,target=s.cities.find(c=>c.id===t.targetCity);
 planStrategicScouting(s,'yuan');assert.ok(ownTasks(s).some(t=>t.id===before));
 const officer=home.units.find(u=>u.id!==t.officerId&&!u.scouting);
 s.armies.push({...cityForce(home),cityForce:false,id:'a999',units:[officer],location:target.id,travel:null});
 updateVision(s);planStrategicScouting(s,'yuan');assert.ok(!ownTasks(s).some(t=>t.id===before));
 assert.notEqual(home.units.find(u=>u.id===t.officerId).scouting,before);
 assert.ok(!ownTasks(s).some(t=>t.targetCity===target.id));
});

test('scouting is not assigned to besieged cities or officers with existing work',()=>{
 const {s,home,targets}=front();s.campaign.battles.push({settled:false,kind:'siege',cityId:home.id});
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,0);
 s.campaign.battles=[];s.campaign.domestic.assignments=home.units.map(u=>({officerId:u.id,cityId:home.id,direction:'commerce'}));
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,0);assert.equal(waitingForStrategicScout(s,'yuan',targets[0].id),false);
});

test('natural AI domestic appointments never make a scouting officer governor or assign another job',()=>{
 const s=newCampaign(2027,'all-heroes-251'),jobs=[['force-20','runan','person-144','xuchang'],['force-24','town-24','person-161','town-25']];
 for(const [faction,home,officer,target]of jobs)assert.equal(dispatchScout(s,home,officer,target,{faction}),null);
 for(let review=0;review<2;review++){
  prepareEnemyDomestic(s);
  for(const [,home,officer]of jobs){assert.notEqual(s.cities.find(c=>c.id===home).governor,officer);assert.ok(!s.campaign.domestic.assignments.some(a=>a.officerId===officer));assert.ok(scoutAssignments(s).some(t=>t.officerId===officer));}
  const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 }
});

test('two-officer AI cities retain a domestic worker and release an overcommitted scout',()=>{
 const s=newCampaign(2027,'all-heroes-251'),cities=[['force-20','runan'],['force-24','town-24']];
 for(const [faction,home]of cities){planStrategicScouting(s,faction);assert.equal(scoutAssignments(s).filter(t=>t.homeCity===home).length,1);}
 // A previous overcommitted scouting schedule must also free a city worker.
 const [faction,home]=cities[0],officer=scoutCandidates(s,home,faction)[0],target=s.cities.find(c=>!scoutAssignments(s).some(t=>t.targetCity===c.id)&&c.owner!==faction&&scoutRoute(s,home,c.id));
 assert.ok(target);assert.equal(dispatchScout(s,home,officer.unit.id,target.id,{faction}),null);assert.equal(scoutAssignments(s).filter(t=>t.homeCity===home).length,2);
 planStrategicScouting(s,faction);assert.equal(scoutAssignments(s).filter(t=>t.homeCity===home).length,1);prepareEnemyDomestic(s);
 for(const [,home]of cities){const tasks=scoutAssignments(s).filter(t=>t.homeCity===home);assert.equal(tasks.length,1);assert.ok(s.campaign.domestic.assignments.some(a=>a.cityId===home&&!tasks.some(t=>t.officerId===a.officerId)));}
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
});

test('AI waits for its actual scout to observe the target and sees exactly the player projection',()=>{
 const {s,home,targets}=front();planStrategicScouting(s,'yuan');const t=ownTasks(s)[0],target=s.cities.find(c=>c.id===t.targetCity);
 assert.equal(waitingForStrategicScout(s,'yuan',target.id),true);assert.equal(cityIntelligence(s,target.id,'yuan').data,null);
 advanceScouting(s);assert.equal(waitingForStrategicScout(s,'yuan',target.id),false);assert.ok(cityVisible(s,target.id,'yuan'));
 assert.equal(cityIntelligence(s,target.id,'yuan').data.grain,intelligenceWorld(s,'yuan').cities.find(c=>c.id===target.id).grain);
 assert.ok(home.units.find(u=>u.id===t.officerId));assert.equal(t.location,target.id);
});

test('unobserved city ownership, resources, defenders and hidden armies cannot change offensive estimates',()=>{
 const setup=front(),{s,targets}=setup,before=assessment(setup),threat=observeStrategicThreat(s,setup.home);
 Object.assign(targets[0],{owner:'wu',grain:0,garrison:999999,gateHp:999999,commerce:999});
 targets[0].units.forEach(u=>{u.troops=999999;u.leadership=100;});
 s.armies.push({...cityForce(targets[0]),cityForce:false,id:'a999',faction:'wu',target:setup.home.id,route:[setup.home.id]});
 updateVision(s);assert.deepEqual(assessment(setup),before);assert.deepEqual(observeStrategicThreat(s,setup.home),threat);
});

test('expired vision preserves the last city report without silently following hidden changes',()=>{
 const setup=front(),{s,targets}=setup;planStrategicScouting(s,'yuan');advanceScouting(s);
 const t=ownTasks(s).find(t=>t.targetCity===targets[0].id);assert.ok(t);recallScout(s,t.officerId,{faction:'yuan'});
 s.campaign.day=Math.max(...s.campaign.vision.factions.yuan.scouted.map(v=>v.expiresDay))+1;updateVision(s);
 assert.equal(cityVisible(s,targets[0].id,'yuan'),false);const before=assessment(setup),old=cityIntelligence(s,targets[0].id,'yuan').data.grain;
 targets[0].grain=0;targets[0].units.forEach(u=>u.troops*=20);gateDurability(targets[0]).hp=999999;updateVision(s);
 assert.deepEqual(assessment(setup),before);assert.equal(cityIntelligence(s,targets[0].id,'yuan').data.grain,old);
});

test('private enemy destinations, routes and future orders never affect observed threat',()=>{
 const {s,home,targets}=front(),enemy={...cityForce(targets[0]),cityForce:false,id:'a999',location:home.id,travel:{from:home.id,to:targets[0].id,progress:1}};
 s.armies.push(enemy);updateVision(s);const before=observeStrategicThreat(s,home);
 enemy.target=home.id;enemy.route=[targets[2].id,home.id];enemy.supplyLine={city:targets[2].id};enemy.task='秘密合围';
 s.campaign.domestic.orders.push({faction:'cao',kind:'march',armyId:enemy.id,officerIds:enemy.units.map(u=>u.id),target:home.id});
 assert.deepEqual(observeStrategicThreat(s,home),before);assert.equal(intelligenceWorld(s,'yuan').armies.find(a=>a.id===enemy.id).target,null);
});

test('scouting priorities do not follow unseen political changes and resume from identical saved state',()=>{
 const {s,targets}=front(),copy=JSON.parse(serializeCampaign(s));
 targets[0].owner='wu';targets[0].grain=1;targets[0].units.forEach(u=>u.troops*=50);
 planStrategicScouting(s,'yuan');planStrategicScouting(copy,'yuan');
 assert.deepEqual(ownTasks(s).map(t=>({target:t.targetCity,officer:t.officerId,route:t.route})),ownTasks(copy).map(t=>({target:t.targetCity,officer:t.officerId,route:t.route})));
 // Restore ownership to a faction initialized in this two-faction fixture.
 targets[0].owner='cao';updateVision(s);
 const resumed=JSON.parse(serializeCampaign(s));advanceScouting(s);advanceScouting(resumed);validateVision(s);validateVision(resumed);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
});

test('daily AI planning dispatches scouts and holds an unobserved offensive without consuming troops or grain',()=>{
 const {s,home}=front(),men=home.units.reduce((n,u)=>n+u.troops,0),grain=home.grain;
 planStrategicAI(s);assert.equal(ownTasks(s).length,2);assert.ok(s.campaign.ai.decisions.some(d=>d.faction==='yuan'&&/等待斥候/.test(d.reason)));
 assert.equal(home.units.reduce((n,u)=>n+u.troops,0),men);assert.equal(home.grain,grain);
 assert.ok(!s.campaign.ai.plans.some(p=>p.faction==='yuan'&&ownTasks(s).some(t=>t.targetCity===p.target)));
});

test('the complete military planner makes identical faction decisions when only hidden enemy state changes',()=>{
 const {s,targets}=front(),other=JSON.parse(serializeCampaign(s));
 targets[0].grain=1;gateDurability(targets[0]).hp=999999;targets[0].units.forEach(u=>u.troops*=20);
 const hidden={...cityForce(targets[0]),cityForce:false,id:'a999',target:'ye',route:['ye']};s.armies.push(hidden);
 planStrategicAI(s);planStrategicAI(other);
 assert.deepEqual(s.campaign.ai.decisions.filter(d=>d.faction==='yuan'),other.campaign.ai.decisions.filter(d=>d.faction==='yuan'));
 assert.deepEqual(s.campaign.ai.plans.filter(p=>p.faction==='yuan'),other.campaign.ai.plans.filter(p=>p.faction==='yuan'));
 assert.deepEqual(s.campaign.ai.cities.ye,other.campaign.ai.cities.ye);
});
