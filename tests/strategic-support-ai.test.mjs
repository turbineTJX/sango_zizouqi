import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,supplyConnection} from './helpers/auto-domestic-campaign.mjs';
import {initializeStrategicAI,planStrategicAI,validateStrategicAI,safeStrategicTransportRoute} from '../strategic-ai.mjs';
import {strategicSupportObjectives} from '../strategic-support-ai.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';
import {makeOfficer} from '../engine.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {gateDurability} from '../building-durability.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {hasStrategicTrait} from '../strategic-traits.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {requestFactionOrder,resolveStrategicOrders} from '../strategic-orders.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor} from '../domestic.mjs';

// Compact legal roads fix contact conditions, not battle outcomes or resources.
function scene({alternative=false}={}){
 const s=newCampaign(517,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];s.campaign.diplomacy.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.gold=6000;c.grain=12000;c.manpower=20000;c.project=null;gateDurability(c).hp=0;}
 const [source,front,rear,enemy]=['ye','town-5','town-8','xuchang'].map(id=>s.cities.find(c=>c.id===id)),node=s.junctions.find(n=>n.kind==='junction');
 for(const c of [source,front,rear]){c.owner='yuan';c.domestic.owner='yuan';}enemy.owner='cao';enemy.domestic.owner='cao';
 for(const [c,x,y]of [[source,0,0],[node,10,0],[front,20,0],[rear,10,10],[enemy,30,0]])Object.assign(c,{x,y});front.grain=900;rear.grain=0;source.grain=20000;
 s.roads=[[source.id,node.id],[node.id,front.id],[enemy.id,node.id],...(alternative?[[source.id,rear.id],[rear.id,front.id]]:[])];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};
 source.units=['shao','yan','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:source.id}));front.units=[{...makeOfficer('wen',1000,0,3),homeCity:front.id}];enemy.units=[{...makeOfficer('cao',1000,0,3),homeCity:enemy.id}];
 const client=fieldFromCity(s,front.id),foe=fieldFromCity(s,enemy.id);foe.location=node.id;
 initializeVision(s);initializeStrategicAI(s);for(const p of Object.values(s.campaign.ai.factions))p.lastReviewTurn=s.turn;for(const p of Object.values(s.campaign.diplomacy.policies))p.feeBudget=0;
 return {s,source,front,rear,enemy,node,client,foe};
}
const next=s=>{s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;planStrategicAI(s);};
function worker(s,source,effect){const id=Object.keys(OFFICER_BY_ID).find(id=>hasStrategicTrait({id},effect)&&!s.cities.flatMap(c=>c.units).concat(s.armies.flatMap(a=>a.units)).some(u=>u.id===id));s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);const o={unit:{...makeOfficer(id,0,0,3),homeCity:source.id},faction:'yuan',location:source.id,destination:null,remainingDays:0};s.campaign.idle.push(o);return o;}

test('a visible blockade of an actual supply corridor dispatches real guards and retains city rations',()=>{
 const {s,source,node,client}=scene();assert.equal(supplyConnection(s,client),null);assert.ok(strategicSupportObjectives(s,'yuan').some(q=>q.kind==='guard'&&q.target===node.id));
 const men=source.units.reduce((n,u)=>n+u.troops,0);planStrategicAI(s);const mission=s.campaign.ai.supports.find(q=>q.kind==='guard');assert.ok(mission);const guard=s.armies.find(a=>a.target===node.id&&a.faction==='yuan');assert.ok(guard);assert.ok(guard.route.length);assert.ok(source.grain>2500);assert.equal(source.units.reduce((n,u)=>n+u.troops,0)+guard.units.reduce((n,u)=>n+u.troops,0),men);validateStrategicAI(s);
 const count=s.armies.length,copy=JSON.parse(serializeCampaign(s));next(s);next(copy);assert.equal(s.armies.length,count);assert.equal(serializeCampaign(s),serializeCampaign(copy));validateStrategicAI(s);
});

test('hidden enemies, their losses and secret destinations do not influence guard decisions',()=>{
 const {s,foe,enemy}=scene();enemy.x=800;foe.location=enemy.id;initializeVision(s);const copy=JSON.parse(serializeCampaign(s));copy.armies.find(a=>a.id===foe.id).target=s.junctions[0].id;copy.armies.find(a=>a.id===foe.id).units[0].troops=1;
 assert.deepEqual(strategicSupportObjectives(s,'yuan'),strategicSupportObjectives(copy,'yuan'));
});

test('a hopeless guard expedition leaves the real home garrison and food intact',()=>{
 const {s,source,foe}=scene();foe.units[0].troops=30000;updateVision(s);const grain=source.grain,ids=source.units.map(u=>u.id);planStrategicAI(s);assert.equal(s.campaign.ai.supports.length,0);assert.equal(source.grain,grain);assert.deepEqual(source.units.map(u=>u.id),ids);
});

test('AI reinforcements walk to an ongoing field battle and enter its actual reserve pool',()=>{
 const {s,source,client,foe}=scene();foe.units[0].troops=4500;client.units[0].troops=3000;client.route=[foe.location,source.id];client.target=source.id;s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
 const r=activeBattles(s)[0];assert.ok(r);if(r.awaiting)chooseEncounter(s,r.id,false);s.campaign.ai.lastPlanDay=0;updateVision(s);planStrategicAI(s);
 const mission=s.campaign.ai.supports.find(q=>q.kind==='reinforce'&&q.battleId===r.id);assert.ok(mission);const reinforcement=s.armies.find(a=>a.units.some(u=>mission.officerIds.includes(u.id)));assert.ok(reinforcement);assert.ok(!r.armyIds.includes(reinforcement.id));
 const copy=JSON.parse(serializeCampaign(s));for(let i=0;i<6&&!r.armyIds.includes(reinforcement.id);i++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);for(const battle of activeBattles(world).filter(r=>r.awaiting))chooseEncounter(world,battle.id,false);advanceCampaignDay(world);}
 assert.ok(r.armyIds.includes(reinforcement.id));assert.ok(r.battle.sides.flatMap(side=>side.units).some(u=>u.armyId===reinforcement.id));assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('safe detours are executed by actual transport instead of silently using the blocked shortest road',()=>{
 const {s,source,front,rear}=scene({alternative:true}),o=worker(s,source,'relayCargo'),path=safeStrategicTransportRoute(s,source.id,front.id,'yuan');assert.deepEqual(path,[rear.id,front.id]);
 const before=source.grain;assert.ok(requestFactionOrder(s,'yuan',{kind:'transfer',cityId:source.id,officerIds:[o.unit.id],target:front.id,route:path,relay:rear.id,cargo:{gold:100,grain:500,manpower:300},safeOnly:true},'now').applied);assert.deepEqual(o.journey.route,[rear.id]);assert.deepEqual(o.relayRoute,[front.id]);assert.equal(source.grain,before-500);
 for(let i=0;i<10&&o.destination;i++)advancePersonnel(s,o);assert.equal(o.location,front.id);assert.equal(o.destination,null);assert.equal(front.grain,500);assert.equal(front.gold,6100);assert.equal(front.manpower,20300);
});

test('AI plans bounded repeat grain shipments, counts future batches and takes each batch from its source',()=>{
 const {s,source,front,foe}=scene({alternative:true});foe.units[0].troops=30000;const o=worker(s,source,'cycleCargo');planStrategicAI(s);assert.ok(o.convoyCycle);assert.equal(o.convoyCycle.target,front.id);assert.ok(o.convoyCycle.remaining>=2&&o.convoyCycle.remaining<=5);const batch=o.convoyCycle.batch,initial=source.grain,people=s.campaign.idle.length;next(s);assert.equal(s.campaign.idle.length,people);
 const copy=JSON.parse(serializeCampaign(s)),other=copy.campaign.idle.find(x=>x.unit.id===o.unit.id);for(let i=0;i<50&&o.destination;i++){advancePersonnel(s,o);advancePersonnel(copy,other);}assert.equal(o.destination,null);assert.ok(source.grain<initial);assert.ok(front.grain>=batch*2);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('waiting transports recheck the saved route and do not spend resources after a new visible blockade',()=>{
 const {s,source,front,rear,foe}=scene({alternative:true}),o=worker(s,source,'relayCargo');assert.equal(assignDomestic(s,source.id,'technology',o.unit.id,{faction:'yuan'}),null);beginDomesticTurn(s);const work=assignmentFor(s,o.unit.id);assert.ok(work.action);
 const result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:source.id,officerIds:[o.unit.id],target:front.id,route:[rear.id,front.id],cargo:{gold:100,grain:500,manpower:0},safeOnly:true},'after');assert.ok(result.queued);const grain=source.grain;foe.location=rear.id;updateVision(s);resolveStrategicOrders(s);assert.equal(s.campaign.domestic.orders.length,0);assert.equal(source.grain,grain);assert.equal(o.destination,null);
});

test('support commitments reject duplicates on reload',()=>{
 const {s}=scene();planStrategicAI(s);assert.ok(s.campaign.ai.supports.length);const copy=JSON.parse(serializeCampaign(s));copy.campaign.ai.supports.push({...copy.campaign.ai.supports[0],id:copy.campaign.ai.nextSupportId++});assert.throws(()=>validateStrategicAI(copy),/战略AI/);
});

test('AI grain convoys actually hand off at an intermediate receiving node even when crossing several roads that day',()=>{
 const {s,source,front,rear,enemy,node,client,foe}=scene();front.grain=5000;rear.grain=5000;enemy.owner='yuan';enemy.domestic.owner='yuan';enemy.x=800;foe.location=enemy.id;
 const id=Object.keys(OFFICER_BY_ID).find(id=>hasStrategicTrait({id},'receiveGrain')&&!source.units.some(u=>u.id===id));s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);client.units=[{...makeOfficer(id,3000,0,3),homeCity:front.id}];client.leader=id;client.advisor=id;client.deputy=null;client.location=node.id;client.supply=100;initializeVision(s);const o=worker(s,source,'relayCargo');
 const total=source.grain+front.grain+client.supply;planStrategicAI(s);assert.ok(o.destination);assert.ok(o.journey.route.includes(node.id));assert.equal(client.supply,100);const loaded=o.cargo.grain;
 advancePersonnel(s,o);assert.equal(client.supply,100+loaded);assert.equal(source.grain+front.grain+client.supply,total);assert.equal(o.destination,null);
});

test('a water corridor guard buys legal ships with city gold before actual departure',()=>{
 const {s,source,front,enemy,node,foe}=scene(),port=s.junctions.find(n=>n.kind==='port');node.kind='port';Object.assign(port,{x:15,y:0});source.water=true;foe.location=port.id;
 s.roads=[[source.id,node.id],[node.id,port.id],[port.id,front.id],[enemy.id,port.id]];for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};initializeVision(s);const gold=source.gold;planStrategicAI(s);
 const guard=s.armies.find(a=>a.faction==='yuan'&&a.target===port.id);assert.ok(guard);assert.ok(guard.units.every(u=>u.equipment.ship));assert.ok(source.gold<gold);assert.ok(source.gold>=500);
});

test('guards return along real roads after their corridor threat disappears',()=>{
 const {s,source,foe}=scene();planStrategicAI(s);const q=s.campaign.ai.supports.find(q=>q.kind==='guard'),ids=[...q.officerIds];foe.units[0].troops=0;updateVision(s);beginExecution(s);
 for(let i=0;i<9;i++){for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.ok(!s.campaign.ai.supports.some(p=>p.id===q.id));assert.ok(ids.every(id=>s.cities.some(c=>c.owner==='yuan'&&c.units.some(u=>u.id===id))));validateStrategicAI(s);
});
