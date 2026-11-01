import {armySupplyCapacity} from '../army-supply.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,dailyConsumption,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {planStrategicAI,manageStrategicEconomy,planStrategicPersonnel} from '../strategic-ai.mjs';
import {planStrategicScouting} from '../strategic-scouting-ai.mjs';
import {planStrategicSupport} from '../strategic-support-ai.mjs';
import {manageArmyManagementAI} from '../strategic-management-ai.mjs';
import {manageTreasuresAI} from '../treasures.mjs';
import {progressStrategicStaffing} from '../strategic-staffing.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {planBanditExpedition} from '../bandits.mjs';
import {planDiplomaticAI,advanceDiplomacy,assignDiplomat,prepareDiplomaticProposal,evaluateDiplomaticProposal} from '../diplomacy.mjs';
import {requestFactionOrder,resolveStrategicOrders,validateStrategicOrders} from '../strategic-orders.mjs';
import {updateVision} from '../strategic-vision.mjs';

const opening=day=>(day-1)%10===0;
function controllers(s){
 manageStrategicEconomy(s);planStrategicAI(s);manageArmyManagementAI(s);manageTreasuresAI(s);progressStrategicStaffing(s);prepareEnemyDomestic(s);planDiplomaticAI(s);
 for(const f of Object.keys(s.campaign.ai.factions)){planStrategicPersonnel(s,f);planStrategicScouting(s,f);planBanditExpedition(s,f);planStrategicSupport(s,f,{});}
}
test('every strategic AI controller ignores daily changes and execution pauses until the next planning boundary',()=>{
 const s=newCampaign(417,'guandu-200','cao',{allAI:true});beginExecution(s);
 for(let day=1;day<=10;day++){
  s.campaign.day=day;updateVision(s);const before=serializeCampaign(s);controllers(s);assert.equal(serializeCampaign(s),before,`execution day ${day}`);
 }
 s.campaign.day=11;s.turn=2;s.campaign.phase='planning';controllers(s);
 assert.equal(s.campaign.ai.lastPlanDay,11);assert.equal(s.campaign.diplomacy.lastAIReview,11);
});
test('newly observed danger waits for the next turn before changing an existing strategic order',()=>{
 const {s,target}=planningFront();planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(p.phase,'attack');
 target.units.forEach(u=>u.troops=100000);s.campaign.day=2;s.campaign.phase='executing';updateVision(s);
 const before=serializeCampaign(s);planStrategicAI(s);assert.equal(serializeCampaign(s),before);assert.equal(p.phase,'attack');
 s.campaign.day=11;s.turn=2;s.campaign.phase='planning';planStrategicAI(s);assert.equal(p.phase,'cancelled');
});
test('a turn-start dated expedition preserves its chosen officers route and appointments through actual deferred execution',()=>{
 const {s,home,target}=planningFront(),ids=home.units.slice(0,2).map(u=>u.id),men=home.units.reduce((n,u)=>n+u.troops,0),grain=home.grain;
 const result=requestFactionOrder(s,'yuan',{kind:'expedition',cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,route:[target.id],policy:'auto',notBeforeDay:4},'now');
 assert.ok(result.queued);assert.equal(s.armies.length,0);assert.equal(home.grain,grain);validateStrategicOrders(s);
 const copy=JSON.parse(serializeCampaign(s));
 for(const world of [s,copy]){
  world.campaign.phase='executing';for(let day=1;day<4;day++){world.campaign.day=day;resolveStrategicOrders(world,{timedOnly:true});assert.equal(world.armies.length,0);}
  world.campaign.day=4;resolveStrategicOrders(world,{timedOnly:true});assert.equal(world.campaign.domestic.orders.length,0);
  const a=world.armies.find(a=>a.faction==='yuan');assert.deepEqual(a.units.map(u=>u.id),ids);assert.equal(a.leader,ids[0]);assert.equal(a.advisor,ids[1]);assert.equal(a.target,target.id);assert.deepEqual(a.route,[target.id]);
  assert.equal(world.cities.find(c=>c.id===home.id).units.reduce((n,u)=>n+u.troops,0)+a.units.reduce((n,u)=>n+u.troops,0),men);
  assert.equal(world.cities.find(c=>c.id===home.id).grain+a.supply,grain);
 }
 assert.equal(serializeCampaign(copy),serializeCampaign(s));
});
test('AI final diplomatic approval waits for the next planning boundary while negotiation keeps advancing daily',()=>{
 const {s,home,target}=planningFront();s.campaign.allAI=true;
 assert.ok(assignDiplomat(s,'ju','friendship',{faction:'yuan',choice:'now',scheduled:true}).applied);
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId==='ju');
 const candidate={goal:'friendship',other:'cao',targetCity:target.id,path:[target.id],score:35,reason:'actual gift',clauses:[{kind:'gold',from:'yuan',to:'cao',amount:150,gift:true}]};
 assert.ok(prepareDiplomaticProposal(s,a,candidate));const p=s.campaign.diplomacy.proposals.find(p=>p.officerId==='ju');
 const u=home.units.find(u=>u.id==='ju');u.mission.location=target.id;u.mission.route=[];u.mission.progress=0;u.mission.phase='work';u.mission.workStartDay=2;p.status='negotiating';p.progress=p.workDays;
 s.campaign.phase='executing';s.campaign.day=2;advanceDiplomacy(s);assert.equal(p.status,'pending');assert.deepEqual(p.approvals,{});
 for(let day=3;day<=10;day++){s.campaign.day=day;advanceDiplomacy(s);assert.deepEqual(p.approvals,{});assert.equal(p.status,'pending');}
 assert.ok(p.factions.every(f=>evaluateDiplomaticProposal(s,p,f).approve));s.campaign.day=11;s.turn=2;s.campaign.phase='planning';planDiplomaticAI(s);
 assert.equal(p.status,'approved');assert.ok(Object.values(p.approvals).every(a=>a.day===11));
});
test('an unmodified national all-AI campaign chooses only at turn starts and resumes deterministically across the boundary',()=>{
 const s=newCampaign(643,'guandu-200','cao',{allAI:true});let copy;
 for(let i=0;i<21;i++){
  const day=s.campaign.day,scouts=new Set(s.campaign.scouting.tasks.map(t=>t.id));
  advanceCampaignDay(s);if(copy)advanceCampaignDay(copy);
  assert.ok(s.campaign.ai.decisions.every(d=>opening(d.day)));
  assert.ok(Object.values(s.campaign.ai.factions).every(p=>opening(p.strategy.updatedDay)||p.strategy.updatedDay===0));
  assert.ok(s.campaign.scouting.tasks.filter(a=>!scouts.has(a.id)).every(()=>opening(day)));
  for(const p of [...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts])for(const a of Object.values(p.approvals))assert.ok(opening(a.day));
  validateCampaign(JSON.parse(serializeCampaign(s)));
  if(copy)assert.equal(serializeCampaign(s),serializeCampaign(copy));
  if(i===6)copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 }
 assert.equal(s.campaign.day,22);assert.equal(s.campaign.ai.lastPlanDay,21);
});


test('dated expeditions consume the same real rations on their saved departure day',()=>{
 const {s,home,target}=planningFront(),ids=home.units.slice(0,2).map(u=>u.id);
 s.roadSegments[[home.id,target.id].sort().join(':')].distance=5000;
 assert.ok(requestFactionOrder(s,'yuan',{kind:'expedition',cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,route:[target.id],notBeforeDay:2},'now').queued);
 s.campaign.phase='executing';advanceCampaignDay(s);assert.equal(s.campaign.day,2);assert.equal(s.armies.length,0);
 advanceCampaignStep(s);const a=s.armies.find(a=>a.faction==='yuan');assert.ok(a?.travel);
 assert.equal(a.supply,a.supplyCapacity-dailyConsumption(s,a),'a saved date cannot grant a free day of food');
});
test('invalid saved departure dates and failed execution cannot spend resources or choose a replacement army',()=>{
 const {s,home,target}=planningFront(),ids=home.units.slice(0,2).map(u=>u.id),q={kind:'expedition',cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,route:[target.id],minSupply:armySupplyCapacity(home.units.filter(u=>ids.includes(u.id)))};
 for(const notBeforeDay of [0,1.5,Infinity]){const before=serializeCampaign(s);assert.ok(requestFactionOrder(s,'yuan',{...q,notBeforeDay},'now').error);assert.equal(serializeCampaign(s),before);}
 assert.ok(requestFactionOrder(s,'yuan',{...q,notBeforeDay:4},'now').queued);const bad=structuredClone(s);bad.campaign.domestic.orders[0].notBeforeDay=3.5;assert.throws(()=>validateStrategicOrders(bad));
 home.grain=0;s.campaign.day=4;s.campaign.phase='executing';const men=home.units.map(u=>({id:u.id,troops:u.troops})),gold=home.gold;
 resolveStrategicOrders(s,{timedOnly:true});assert.equal(s.armies.length,0);assert.equal(home.grain,0);assert.equal(home.gold,gold);assert.deepEqual(home.units.map(u=>({id:u.id,troops:u.troops})),men);assert.equal(s.campaign.domestic.orders.length,0);
});
