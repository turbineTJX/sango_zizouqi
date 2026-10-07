import {fundCities} from './resource-fixtures.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,prepareSiegeUnits,launchExpedition,prepareCityUnits,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,assignDomestic} from '../strategic-campaign.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {ACTIONS,assignmentFor} from '../domestic.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
const town=(s,id)=>s.cities.find(c=>c.id===id);
const order=(s,id='xuchang',target='chenliu')=>{const ids=town(s,id).units.slice(0,2).map(u=>u.id);return {kind:'expedition',cityId:id,officerIds:ids,leader:ids[0],advisor:ids[1]||ids[0],deputy:null,target,policy:'auto'};};
const reload=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const advance=s=>{if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);};
test('both current national scenarios store units in cities with no standing map armies',()=>{
 for(const scenario of ['guandu-200','heroes-251']){const s=newCampaign(5,scenario);assert.equal(s.armies.length,0);assert.ok(town(s,'xuchang').units.length);assert.ok(campaignOfficers(s).some(r=>r.cityUnit));assert.equal(new Set(campaignOfficers(s).map(r=>r.unit.id)).size,campaignOfficers(s).length);reload(s);}
});
test('preparing units preserves domestic duties and creates no army; departure creates only selected units',()=>{
 const s=newCampaign(5,'guandu-200'),c=town(s,'xuchang'),idle=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao');
 assert.equal(assignDomestic(s,c.id,'commerce',idle.unit.id),null);assert.equal(prepareCityUnits(s,c.id,[idle.unit.id]),null);
 assert.equal(s.armies.length,0);assert.ok(c.units.some(u=>u.id===idle.unit.id));assert.ok(assignmentFor(s,idle.unit.id));
 const q=order(s),before=c.units.length,grain=c.grain,learning=q.officerIds.map(id=>structuredClone(c.units.find(u=>u.id===id).tacticLearning));
 assert.deepEqual(requestStrategicOrder(s,q),{applied:true});assert.equal(s.armies.length,1);assert.equal(c.units.length,before-2);
 assert.deepEqual(s.armies[0].units.map(u=>u.id),q.officerIds);assert.deepEqual(s.armies[0].units.map(u=>u.tacticLearning),learning);assert.equal(grain-c.grain,s.armies[0].supply);reload(s);
});
test('invalid commander and duplicate selection cannot partially create a field army',()=>{
 const s=newCampaign(5,'guandu-200'),q=order(s),before=serializeCampaign(s);
 assert.ok(launchExpedition(s,{...q,advisor:'not-selected'}));assert.equal(serializeCampaign(s),before);
 assert.ok(launchExpedition(s,{...q,officerIds:[q.leader,q.leader]}));assert.equal(serializeCampaign(s),before);
});
test('arrival at a friendly destination returns individual units and removes the expedition instance',()=>{
 const s=newCampaign(5,'guandu-200'),q=order(s);assert.equal(launchExpedition(s,q),null);const id=s.armies[0].id;
 for(let n=0;n<12&&s.armies.some(a=>a.id===id);n++)advance(s);
 assert.ok(!s.armies.some(a=>a.id===id));for(const id of q.officerIds)assert.ok(town(s,q.target).units.some(u=>u.id===id));reload(s);
});
test('a deferred expedition stores composition, creates no army early, and launches after real work completes',()=>{
 const s=newCampaign(19),c=town(s,'xuchang');fundCities(s,40000);
 for(const x of s.cities.filter(x=>x.owner!=='cao'))for(const u of x.units)u.troops=0;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=10000;
 const q=order(s),id=q.officerIds[0];assert.equal(assignDomestic(s,c.id,'technology',id),null);
 for(let n=0;n<30&&s.campaign.day<11;n++)advance(s);
 assert.equal(s.campaign.day,11);assert.ok(assignmentFor(s,id).action);
 q.formation={types:{},reinforce:false};const before=serializeCampaign(s);assert.ok(requestStrategicOrder(s,q).confirmation);assert.equal(serializeCampaign(s),before);
 assert.ok(requestStrategicOrder(s,q,'after').queued);assert.equal(s.armies.filter(a=>a.faction==='cao').length,0);assert.ok(c.units.some(u=>u.id===id));
 const loaded=reload(s);assert.equal(loaded.campaign.domestic.orders[0].leader,q.leader);
 for(let n=0;n<80&&loaded.campaign.domestic.orders.length;n++)advance(loaded);
 assert.equal(loaded.campaign.domestic.orders.length,0);assert.ok(loaded.armies.some(a=>a.faction==='cao'&&a.leader===id&&a.route.length));assert.equal(loaded.campaign.domestic.workHistory[id][0].status,'completed');reload(loaded);
});
test('real sieges build temporary defense from city units and resume deterministically',()=>{
 const s=newCampaign(5,'guandu-200');let r;
 assert.equal(launchExpedition(s,order(s,'chenliu','ye')),null);
 for(let n=0;n<20&&!r;n++){advance(s);r=activeBattles(s).find(r=>r.armies.some(a=>a.defense));}
 assert.ok(r);const guard=s.armies.find(a=>a.defense&&r.armyIds.includes(a.id));assert.ok(guard);assert.equal(town(s,guard.location).units.length,0);
 for(const pending of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,pending.id,false);
 const loaded=reload(s);for(let i=0;i<4;i++){advanceCampaignStep(s);advanceCampaignStep(loaded);}
 assert.equal(serializeCampaign(s),serializeCampaign(loaded));reload(s);for(let n=0;n<100&&!r.settled;n++)advance(s);assert.ok(r.settled);assert.ok(!s.armies.some(a=>a.id===guard.id&&a.defense));reload(s);
});

test('departure can prepare an idle officer atomically and invalid departure spends nothing',()=>{
 const s=newCampaign(5,'guandu-200'),c=town(s,'xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao'),id=o.unit.id;
 const q={...order(s),officerIds:[id],leader:id,advisor:id,formation:{types:{[id]:'spear'},reinforce:true}};
 const before=serializeCampaign(s);assert.ok(requestStrategicOrder(s,{...q,target:'invalid'}).error);assert.equal(serializeCampaign(s),before);
 assert.ok(requestStrategicOrder(s,q,'now').applied);assert.ok(s.armies.some(a=>a.units.some(u=>u.id===id&&u.troops>0)));assert.ok(!s.campaign.idle.some(o=>o.unit.id===id));reload(s);
});
test('awaiting siege permits real idle-officer preparation without starting battle or changing source',()=>{
 const s=newCampaign(5);fieldFromCity(s,'guandu',{target:'xuchang'});let r;
 for(let n=0;n<30&&!r;n++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);r=activeBattles(s).find(r=>r.awaiting&&r.kind==='siege'&&town(s,r.cityId).owner==='cao'&&s.campaign.idle.some(o=>o.location===r.cityId&&o.faction==='cao'));if(!r)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}
 assert.ok(r);const c=town(s,r.cityId),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao'),before=serializeCampaign(s);
 const result=prepareSiegeUnits(s,r.id,[o.unit.id],{},true);assert.equal(result.error,undefined);assert.equal(serializeCampaign(s),before);
 const next=result.state,updated=activeBattles(next).find(b=>b.id===r.id);assert.ok(updated.awaiting);assert.ok(updated.battle.sides[1-updated.attackSide].units.some(u=>u.officerId===o.unit.id||u.id.includes(o.unit.id)));reload(next);
 assert.equal(chooseEncounter(next,r.id,false),null);assert.ok(prepareSiegeUnits(next,r.id,[o.unit.id],{},true).error);
 const loaded=reload(next);advanceCampaignStep(next);advanceCampaignStep(loaded);assert.equal(serializeCampaign(next),serializeCampaign(loaded));
});
