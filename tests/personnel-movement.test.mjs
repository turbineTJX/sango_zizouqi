import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,transferOfficer,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay,armyActionPoints,activeBattles,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {advancePersonnel,personnelSpeed,PERSONNEL_SPEED,TRANSPORT_SPEED,isTransport} from '../personnel-movement.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const fixture=()=>{const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),dest=s.cities.find(c=>c.id==='chenliu');return {s,c,dest,id:c.units.find(u=>u.id!==c.governor).id};};
test('light personnel are faster than cavalry, invisible on map, and unavailable while moving',()=>{
 const {s,c}=fixture(),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao'&&o.unit.id!==c.governor);
 assert.equal(transferOfficer(s,o.unit.id,'chenliu'),null);assert.equal(personnelSpeed(o),PERSONNEL_SPEED);assert.ok(PERSONNEL_SPEED>armyActionPoints({units:[{troops:1000,type:'cavalry',leadership:100}],morale:100,hunger:0}));assert.equal(isTransport(o),false);assert.doesNotMatch(armyMapMarkers(s,{}),/data-transport-officer/);assert.ok(transferOfficer(s,o.unit.id,'luoyang'));restore(s);
 while(o.destination)advancePersonnel(s,o);assert.equal(o.location,'chenliu');assert.equal(o.remainingDays,0);restore(s);
});
test('transport carries prepared troops and cargo once, projects position, then hands them to the destination',()=>{
 const {s,c,dest,id}=fixture(),u=c.units.find(u=>u.id===id),troops=u.troops,grain=c.grain,men=c.manpower,dg=dest.grain,dm=dest.manpower;
 assert.equal(transferOfficer(s,id,dest.id,{cargo:{grain:1000,manpower:500}}),null);const o=s.campaign.idle.find(o=>o.unit.id===id);
 assert.equal(personnelSpeed(o),TRANSPORT_SPEED);assert.equal(c.grain,grain-1000);assert.equal(c.manpower,men-500);assert.ok(!c.units.includes(u));assert.equal(s.armies.length,0);assert.match(armyMapMarkers(s,{}),new RegExp('data-transport-officer="'+id+'"'));restore(s);
 const copy=restore(s),other=copy.campaign.idle.find(x=>x.unit.id===id);
 while(o.destination){advancePersonnel(s,o);advancePersonnel(copy,other);}assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(dest.grain,dg+1000);assert.equal(dest.manpower,dm+500);assert.equal(dest.units.find(x=>x.id===id).troops,troops);assert.ok(!s.campaign.idle.includes(o));advancePersonnel(s,o);assert.equal(dest.grain,dg+1000);restore(s);
});
test('cargo-only convoys are visible and full warehouses retain cargo',()=>{
 const {s,c,dest}=fixture(),o=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==c.governor&&o.faction==='cao');
 assert.equal(transferOfficer(s,o.unit.id,dest.id,{cargo:{grain:1000,manpower:0}}),null);assert.ok(isTransport(o));dest.grain=10000+dest.granary*10000;
 for(let i=0;i<10&&o.location!==dest.id;i++)advancePersonnel(s,o);assert.equal(o.destination,dest.id);assert.match(o.journey.blocked,/粮仓/);assert.equal(o.cargo.grain,1000);s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));restore(s);
 dest.grain-=400;advancePersonnel(s,o);assert.equal(o.cargo.grain,600);assert.equal(o.destination,dest.id);restore(s);dest.grain-=600;advancePersonnel(s,o);assert.equal(o.destination,null);assert.equal(dest.grain,10000+dest.granary*10000);assert.ok(s.campaign.idle.includes(o));restore(s);
});
test('deferred transport preserves cargo instructions without deducting resources or moving its officer',()=>{
 const {s,c,id}=busyFixture(),command={kind:'transfer',cityId:c.id,officerIds:[id],target:'chenliu',cargo:{gold:0,grain:600,manpower:200}},before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,command).confirmation);assert.equal(serializeCampaign(s),before);const grain=c.grain,men=c.manpower;
 assert.ok(requestStrategicOrder(s,command,'after').queued);assert.deepEqual(s.campaign.domestic.orders[0].cargo,command.cargo);assert.equal(c.grain,grain);assert.equal(c.manpower,men);assert.ok(c.units.some(u=>u.id===id));const copy=restore(s);
 for(const value of [s,copy])for(let i=0;i<300&&value.campaign.day<61;i++){if(value.campaign.phase==='planning')beginExecution(value);for(const b of activeBattles(value).filter(b=>b.awaiting))chooseEncounter(value,b.id,false);advanceCampaignDay(value);}
 assert.equal(s.campaign.day,61);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.domestic.orders.length,0);assert.ok(s.cities.find(c=>c.id==='chenliu').units.some(u=>u.id===id));assert.ok(s.campaign.domestic.events.some(e=>e.phase==='order-done'));restore(s);
});
test('real daily execution resumes a transport deterministically and rejects corrupt journey cargo',()=>{
 const {s,id,dest}=fixture();assert.equal(transferOfficer(s,id,dest.id,{cargo:{grain:100,manpower:100}}),null);beginExecution(s);advanceCampaignDay(s);const copy=restore(s);
 for(let i=0;i<3;i++){advanceCampaignDay(s);advanceCampaignDay(copy);}assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const f=fixture();transferOfficer(f.s,f.id,f.dest.id,{cargo:{grain:100,manpower:0}});
 for(const mutate of [o=>o.cargo.grain=-1,o=>o.journey.progress=Infinity,o=>o.journey.route=['missing']]){const bad=JSON.parse(serializeCampaign(f.s));mutate(bad.campaign.idle.find(o=>o.unit.id===f.id));assert.throws(()=>validateCampaign(bad));}
 const before=serializeCampaign(f.s);assert.ok(transferOfficer(f.s,f.id,f.dest.id,{cargo:{grain:NaN,manpower:0}}));assert.equal(serializeCampaign(f.s),before);
});
