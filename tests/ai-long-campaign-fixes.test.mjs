import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,settleCityEconomy,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {settleMeritCapacity} from '../campaign-merit.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {activityBySource,activityByFaction,activityByDay} from '../activity-query-index.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {cityForce} from '../city-units.mjs';
import {forecastRouteSupply,withRouteSupplyQueries} from '../strategic-route-supply.mjs';
import {intelligenceWorld,updateVision} from '../strategic-vision.mjs';
import {observeStrategicThreat,strategicPower,planStrategicAI,manageStrategicEconomy,strategicCapabilities} from '../strategic-ai.mjs';
import {diplomaticCandidates,assignDiplomat,prepareDiplomaticProposal} from '../diplomacy.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';

test('returned real soldiers survive reserve production limits and current save continuation',()=>{
 const s=newCampaign(719,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.owner==='cao'&&c.units.length),u=c.units[0];
 u.wounded=0;u.troops=troopCapacity(u)+200;u.meritCapacity=u.troops;c.manpower=30000;
 const before=c.manpower+c.units.reduce((n,u)=>n+u.troops+u.wounded,0);
 settleMeritCapacity(s);assert.equal(c.manpower,30200);
 const result=settleCityEconomy(s,c,{income:{gold:0,grain:0,manpower:3000}});
 assert.equal(c.manpower,30200);assert.equal(c.manpower+c.units.reduce((n,u)=>n+u.troops+u.wounded,0),before);
 const ordinary=s.cities.find(x=>x.owner==='cao'&&x.id!==c.id);ordinary.manpower=29000;settleCityEconomy(s,ordinary,{income:{gold:0,grain:0,manpower:3000}});assert.equal(ordinary.manpower,30000);
 advanceCampaignDay(s);const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved);
 advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s));
});

test('factual query indexes preserve append order, live read flags, detached lists and reloads',()=>{
 const nodes=[{sourceId:'a',faction:'cao',day:1,read:false},{sourceId:'b',faction:'yuan',day:1,read:false}];
 for(let i=0;i<30;i++){
  for(const f of ['cao','yuan','sunce'])assert.deepEqual(activityByFaction(nodes,f),nodes.filter(n=>n.faction===f));
  assert.deepEqual(activityByDay(nodes,i),nodes.filter(n=>n.day===i));assert.equal(activityBySource(nodes,'a'),nodes[0]);
  nodes.push({sourceId:'x'+i,faction:i%2?'cao':'yuan',day:i,read:false});
 }
 const own=activityByFaction(nodes,'cao');own.pop();assert.equal(activityByFaction(nodes,'cao').length,nodes.filter(n=>n.faction==='cao').length);
 nodes[0].read=true;assert.equal(activityBySource(nodes,'a').read,true);
 const restored=JSON.parse(JSON.stringify(nodes));assert.deepEqual(activityByFaction(restored,'cao'),nodes.filter(n=>n.faction==='cao'));
 nodes.length=1;assert.deepEqual(activityByFaction(nodes,'yuan'),[]);
});

test('signed future renewals suppress duplicate offers and reject a stale proposal before paying',()=>{
 const {s,home,target}=planningFront();s.campaign.day=10;updateVision(s);
 const clauses=[{id:1,kind:'nonaggression',from:'yuan',to:'cao',duration:30,status:'active',startDay:1,effectiveDay:1,untilDay:30}];
 const old={id:901,status:'signed',failure:null,factions:['yuan','cao'],clauses,signedTerms:JSON.stringify({clauses})};s.campaign.diplomacy.contracts.push(old);
 assert.ok(assignDiplomat(s,'ju','negotiation',{faction:'yuan',choice:'now'}).applied);
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId==='ju'),candidate=diplomaticCandidates(s,a).find(c=>c.goal==='renew'&&c.clauses.some(c=>c.renews===old.id));assert.ok(candidate);
 s.campaign.diplomacy.contracts.push({id:902,status:'signed',failure:null,factions:['yuan','cao'],clauses:[{...clauses[0],status:'waiting',renews:old.id,startDay:31,untilDay:60}]});
 assert.equal(diplomaticCandidates(s,a).some(c=>c.goal==='renew'&&c.clauses.some(c=>c.renews===old.id)),false);
 const money=home.gold;assert.equal(prepareDiplomaticProposal(s,a,candidate),null);assert.equal(home.gold,money);assert.match(a.waiting,/已签署续约/);
});
test('returned reserve overflow does not block diplomacy without a net incoming shipment',()=>{
 const {s,home,target}=planningFront();home.manpower=30200;
 assert.ok(assignDiplomat(s,'ju','friendship',{faction:'yuan',choice:'now'}).applied);
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId==='ju');
 const p=prepareDiplomaticProposal(s,a,{goal:'friendship',other:'cao',targetCity:target.id,path:[target.id],score:60,reason:'实际小额赠礼',clauses:[{kind:'gold',from:'yuan',to:'cao',amount:50,gift:true}]});
 assert.ok(p,a.waiting);assert.equal(home.manpower,30200);
});

test('border threat estimates reserve part of city troops while real incoming armies remain full threats',()=>{
 const {s,home,target}=planningFront(),p=strategicPower(s,cityForce(target)),t=observeStrategicThreat(s,home);
 assert.ok(t.nearby>0&&t.nearby<p);
 const key=[home.id,target.id].sort().join(':'),distance=s.roadSegments[key].distance;
 s.roadSegments[key].distance=10000;
 assert.equal(observeStrategicThreat(s,home).nearby,0);
 s.roadSegments[key].distance=distance;
 const u=target.units.shift(),army={...cityForce(target),id:'a'+s.nextId++,units:[u],faction:'cao',location:target.id,travel:{from:target.id,to:home.id,progress:0,road:'main'},route:[home.id],target:home.id,disbanded:false};delete army.cityForce;s.armies.push(army);updateVision(s);
 assert.equal(observeStrategicThreat(s,home).power,strategicPower(s,army));
});

test('a route forecast uses real friendly depots but never captured grain or nonexistent deliveries',()=>{
 const {s,home,target,rear}=planningFront(),a={...cityForce(home),units:[home.units[0]]},before=serializeCampaign(s);
 const supplied=forecastRouteSupply(intelligenceWorld(s,'yuan'),a,[target.id],60,{attack:true});
 assert.ok(supplied.feasible);assert.ok(supplied.delivered>0);assert.ok(supplied.sourceRequirements.every(r=>s.cities.find(c=>c.id===r.cityId).owner==='yuan'));
 assert.equal(serializeCampaign(s),before);
 assert.deepEqual(withRouteSupplyQueries(s,()=>forecastRouteSupply(s,a,[target.id],60,{attack:true})),supplied);
 assert.deepEqual(forecastRouteSupply(s,a,[target.id],60,{attack:true}),supplied);
 home.grain=0;rear.grain=0;target.grain=1000000;
 assert.equal(forecastRouteSupply(intelligenceWorld(s,'yuan'),a,[target.id],60,{attack:true}).feasible,false);
});

test('preparing a capture sends real troop transfers without counting their future presence',()=>{
 const {s,home,target,rear}=planningFront();
 home.units=home.units.filter(u=>['shao','ju','tian'].includes(u.id));home.units.forEach(u=>u.troops=u.id==='shao'?1000:0);
 target.units.forEach(u=>u.troops=2500);target.manpower=0;
 rear.units=['yan','wen','he','gao','yu','jia'].map((id,i)=>({...makeOfficer(id,i<4?6000:0,i,3),homeCity:rear.id}));
 rear.governor='yan';
 updateVision(s);const before=home.units.reduce((n,u)=>n+u.troops,0);planStrategicAI(s);
 const g=s.campaign.ai.factions.yuan.strategy.goal;assert.equal(g.kind,'capture');assert.equal(g.status,'preparing');assert.ok(g.requirements.some(r=>r.defensePower>0));
 const o=s.campaign.idle.find(o=>o.faction==='yuan'&&o.destination===home.id&&o.unit.troops>0);assert.ok(o);
 assert.notEqual(o.unit.id,rear.governor);assert.ok(rear.units.some(u=>u.id===rear.governor));
 assert.equal(home.units.reduce((n,u)=>n+u.troops,0),before);const count=o.unit.troops;
 for(let i=0;i<20&&o.destination;i++)advancePersonnel(s,o,[]);
 assert.equal(o.destination,null);assert.equal(home.units.reduce((n,u)=>n+u.troops,0),before+count);
});

test('front cities prepare actual siege equipment before an attack plan exists',()=>{
 const {s,home,target}=planningFront();home.gold=100000;home.domestic.techs.push('siegeEngineering');
 const before=strategicCapabilities(s,cityForce(home)).siege;
 manageStrategicEconomy(s);
 assert.ok(home.units.some(u=>u.equipment.siege));assert.ok(home.gold<100000);
 assert.ok(strategicCapabilities(s,cityForce(home)).siege>before);assert.equal(s.campaign.ai.plans.length,0);
});

test('candidate ordering measures the whole junction route before truncating targets',()=>{
 const {s,home,target,rear}=planningFront();target.owner='neutral';target.domestic.owner='neutral';target.units=[];target.commerce=1;rear.owner='neutral';rear.domestic.owner='neutral';rear.units=[];rear.commerce=1;
 target.province=rear.province='test-region';
 const n={id:'test-link',name:'测试路口',kind:'junction',x:1,y:0};s.junctions=[n];s.roads=[[home.id,n.id],[n.id,target.id],[n.id,rear.id]];
 for(const [a,b,distance]of [[home.id,n.id,1],[n.id,target.id,2000],[n.id,rear.id,1]])s.roadSegments[[a,b].sort().join(':')]={distance};
 updateVision(s);planStrategicAI(s);
 const admission=s.campaign.ai.factions.yuan.strategy.trace.at(-1).admission;
 assert.ok(admission.length);assert.equal(admission[0].target,rear.id);
 assert.equal(target.owner,'neutral');assert.equal(rear.owner,'neutral');
});
