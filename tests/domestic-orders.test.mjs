import {expeditionFrom,invadeFromGuandu} from './helpers/field-campaign.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,splitCampaignArmy,mergeCampaignArmies} from '../strategic-campaign.mjs';
import {issueCommand} from '../engine.mjs';
import {ACTIONS,assignDomestic,assignmentFor,cancelDomestic,removeDomesticOrder,beginDomesticTurn} from '../domestic.mjs';
import {requestStrategicOrder,resolveStrategicOrders} from '../strategic-orders.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function advance(s,target){for(let i=0;i<500&&s.campaign.day<target;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
test('interruption prompt has no side effects; immediate reassignment archives the interrupted work',()=>{
 const {s,id}=busyFixture(),command={kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},before=serializeCampaign(s),action=assignmentFor(s,id).action;
 const result=requestStrategicOrder(s,command);assert.equal(result.confirmation.work[0].actionId,action.id);assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);assert.equal(assignmentFor(s,id).direction,'commerce');assert.equal(s.campaign.domestic.workHistory[id][0].status,'interrupted');assert.equal(s.campaign.domestic.workHistory[id][0].actionId,action.id);restore(s);
});
test('deferred reassignment persists and switches after real completion with deterministic continuation',()=>{
 const {s,id,c}=busyFixture(),actionId=assignmentFor(s,id).action.id,oldSeed=s.campaign.domestic.seed,gold=s.gold;
 assert.equal(requestStrategicOrder(s,{kind:'assign',cityId:c.id,officerIds:[id],direction:'commerce'},'after').queued,true);
 assert.equal(s.gold,gold);assert.equal(s.campaign.domestic.seed,oldSeed);assert.equal(assignmentFor(s,id).direction,'technology');
 const copy=restore(s);advance(s,61);advance(copy,61);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.domestic.orders.length,0);assert.equal(assignmentFor(s,id).direction,'commerce');
 const done=s.campaign.domestic.workHistory[id].find(r=>r.actionId===actionId);assert.equal(done.status,'completed');assert.ok(c.workshop>0);restore(s);
});
test('queued departure reserves the exact garrison and leaves only after its action completes',()=>{
 const {s,army,id}=busyFixture(),count=army.units.length;
 assert.equal(requestStrategicOrder(s,{...expeditionFrom(army),target:'chenliu',policy:'main'},'after').queued,true);
 assert.equal(army.route.length,0);assert.ok(splitCampaignArmy(s,army.id,[id]));assert.equal(s.armies.filter(a=>a.faction==='cao').length,0);
 beginDomesticTurn(s);assert.equal(army.units.length,count);restore(s);
 const copy=restore(s);advance(s,61);advance(copy,61);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.domestic.orders.length,0);assert.equal(assignmentFor(s,id),undefined);assert.ok(s.cities.find(c=>c.id==='chenliu').units.some(u=>u.id===id));
 assert.ok(s.campaign.domestic.events.some(e=>e.phase==='order-done'));restore(s);
});
test('waiting departure prevents idle members from picking new work across turns',()=>{
 const {s,army,id}=busyFixture(),other=army.units.find(u=>u.id!==id).id;
 assert.equal(assignDomestic(s,'xuchang','agriculture',other),null);
 requestStrategicOrder(s,{...expeditionFrom(army),target:'chenliu'},'after');beginExecution(s);
 assert.equal(assignmentFor(s,other).action,null);assert.ok(assignmentFor(s,id).action);restore(s);
});
test('cancelling or replacing a queued order leaves active work unchanged until explicitly interrupted',()=>{
 const {s,id}=busyFixture(),command={kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},action=assignmentFor(s,id).action;
 requestStrategicOrder(s,command,'after');removeDomesticOrder(s,s.campaign.domestic.orders[0].id);assert.strictEqual(assignmentFor(s,id).action,action);
 requestStrategicOrder(s,command,'after');const next={...command,direction:'agriculture'};assert.equal(requestStrategicOrder(s,next).confirmation.replacing.length,1);requestStrategicOrder(s,next,'after');assert.equal(s.campaign.domestic.orders.length,1);assert.equal(s.campaign.domestic.orders[0].direction,'agriculture');
 cancelDomestic(s,id,'测试离岗');assert.equal(s.campaign.domestic.orders.length,0);restore(s);
});
test('forged pending action references and duplicate officers are rejected',()=>{
 const {s,id}=busyFixture();requestStrategicOrder(s,{kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},'after');
 for(const edit of [x=>x.campaign.domestic.orders[0].waits[0].actionId=1,x=>x.campaign.domestic.orders.push(structuredClone(x.campaign.domestic.orders[0])),x=>x.campaign.domestic.orders[0].officerIds.push(id)]){const bad=structuredClone(s);edit(bad);assert.throws(()=>restore(bad));}
 restore(s);
});
test('extended construction keeps its waiting order until the actual project succeeds',()=>{
 const {s,id}=busyFixture(5);requestStrategicOrder(s,{kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},'after');
 const actionId=assignmentFor(s,id).action.id;advance(s,21);
 assert.equal(assignmentFor(s,id).direction,'technology');assert.equal(assignmentFor(s,id).action.id,actionId);assert.equal(s.campaign.domestic.orders.length,1);assert.equal(s.campaign.domestic.workHistory[id]?.some(x=>x.actionId===actionId),undefined);restore(s);
 advance(s,61);assert.equal(assignmentFor(s,id).direction,'commerce');assert.equal(s.campaign.domestic.orders.length,0);restore(s);
});
test('a failed ordinary attempt is finished work and releases a deferred dismissal',()=>{
 let verified=false;
 for(let seed=1;seed<=50&&!verified;seed++){
  const s=newCampaign(seed);s.armies.forEach(a=>a.stationary=true);const c=s.cities.find(c=>c.id==='xuchang'),id=s.campaign.idle.find(o=>o.location===c.id).unit.id;
  for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=1000;
  assignDomestic(s,c.id,'commerce',id);beginDomesticTurn(s);const actionId=assignmentFor(s,id).action.id;
  assert.equal(requestStrategicOrder(s,{kind:'dismiss',cityId:c.id,officerIds:[id]},'after').queued,true);advance(s,11);
  if(s.campaign.domestic.workHistory[id].find(x=>x.actionId===actionId).status!=='failed')continue;
  assert.equal(assignmentFor(s,id),undefined);assert.equal(s.campaign.domestic.orders.length,0);restore(s);verified=true;
 }
 assert.equal(verified,true);
});
test('a queued garrison defends an actual siege and interrupts work and cancels its deferred departure',()=>{
 const {s,id,army}=busyFixture(19),enemy=invadeFromGuandu(s);
 requestStrategicOrder(s,{...expeditionFrom(army),target:'chenliu'},'after');enemy.route=['xuchang'];enemy.target='xuchang';beginExecution(s);
 for(let i=0;i<10&&!activeBattles(s).some(r=>r.cityId==='xuchang');i++)advanceCampaignDay(s);
 const battle=activeBattles(s).find(r=>r.cityId==='xuchang');assert.ok(battle);chooseEncounter(s,battle.id,false);assert.equal(assignmentFor(s,id).action,null);
 advanceCampaignDay(s);assert.equal(assignmentFor(s,id).action,null);assert.equal(s.campaign.domestic.orders.length,0);assert.equal(army.route.length,0);restore(s);
 const copy=restore(s);
 for(const game of [s,copy]){const r=game.campaign.battles.find(r=>r.id===battle.id);assert.equal(issueCommand(r.battle,'retreat',null,r.attackSide),null);for(let i=0;i<1000&&!r.settled;i++){if(game.campaign.phase==='planning')beginExecution(game);advanceCampaignStep(game);}assert.ok(r.settled);advance(game,61);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.domestic.orders.length,0);assert.ok(s.cities.find(c=>c.id==='xuchang').units.some(u=>u.id===id));restore(s);
});
