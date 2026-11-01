import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,appointGovernor} from './helpers/auto-domestic-campaign.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {dispatchScout,scoutTargets,scoutAssignments} from '../scouting.mjs';
import {assignDomestic,assignmentFor} from '../domestic.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
import {expeditionFrom} from './helpers/field-campaign.mjs';
import {cityBaseIncome} from '../economy.mjs';
import {foodConsumption} from '../army-supply.mjs';

test('player confirmation replaces a governor appointment with scouting without changing preview state',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),id=c.units[0].id;
 assert.equal(appointGovernor(s,c.id,id),null);
 const target=scoutTargets(s,c.id)[0].id,command={kind:'scout',cityId:c.id,officerIds:[id],target};
 const before=serializeCampaign(s),preview=requestStrategicOrder(s,command);
 assert.ok(preview.confirmation?.immediateOnly);assert.ok(preview.confirmation.duties.some(d=>d.titles.includes('太守')));
 assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);
 assert.equal(s.cities.find(x=>x.id===c.id).governor,null);assert.ok(scoutAssignments(s).some(t=>t.officerId===id));
 validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('invalid replacement never cancels the existing job and valid replacement releases an idle domestic post',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner);
 assert.equal(assignDomestic(s,c.id,'military',o.unit.id),null);
 const command={kind:'scout',cityId:c.id,officerIds:[o.unit.id],target:'missing'},before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,command,'now').error);assert.equal(serializeCampaign(s),before);
 command.target=scoutTargets(s,c.id)[0].id;
 assert.ok(requestStrategicOrder(s,command).confirmation);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);
 assert.equal(assignmentFor(s,o.unit.id),undefined);
});

test('a player can replace an existing scout route after confirmation',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner&&o.unit.id!==c.governor),targets=scoutTargets(s,c.id);
 assert.equal(dispatchScout(s,c.id,o.unit.id,targets[0].id),null);
 const command={kind:'scout',cityId:c.id,officerIds:[o.unit.id],target:targets.at(-1).id},before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,command).confirmation);assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);
 assert.equal(scoutAssignments(s).filter(t=>t.officerId===o.unit.id).length,1);
 assert.equal(scoutAssignments(s).find(t=>t.officerId===o.unit.id).targetCity,command.target);
});

test('two effective farms sustain one ordinary six-unit army plus a light rear guard',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang');c.farm=2;c.domestic.techs=[];
 const need=(foodConsumption(27000,0)+foodConsumption(1000,0))*10;
 assert.ok(cityBaseIncome(s,c).grain>=need);
});

test('player expedition interrupts paid work immediately after confirmation and charges actual carried grain',()=>{
 const {s,army,id,c}=busyFixture(),command={...expeditionFrom(army),target:'chenliu',policy:'main'},before=serializeCampaign(s),grain=c.grain,actionId=assignmentFor(s,id).action.id;
 assert.ok(requestStrategicOrder(s,command).confirmation?.immediateOnly);assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);
 assert.equal(assignmentFor(s,id),undefined);assert.ok(s.campaign.domestic.workHistory[id].some(w=>w.actionId===actionId&&w.status==='interrupted'));
 const launched=s.armies.find(a=>a.units.some(u=>u.id===id));assert.ok(launched);assert.equal(s.cities.find(x=>x.id===c.id).grain,grain-launched.supply);
 assert.equal(s.campaign.domestic.orders.length,0);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('player expedition releases its scout appointment only after a valid confirmed order',()=>{
 const {s,army,id}=busyFixture();assert.equal(requestStrategicOrder(s,{kind:'scout',cityId:'xuchang',officerIds:[id],target:'chenliu'},'now').applied,true);
 const command={...expeditionFrom(army),target:'chenliu',policy:'main'},before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,{...command,target:'missing'},'now').error);assert.equal(serializeCampaign(s),before);
 assert.ok(requestStrategicOrder(s,command).confirmation.duties.some(d=>d.titles.includes('侦察')));assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);assert.ok(!scoutAssignments(s).some(t=>t.officerId===id));assert.ok(s.armies.some(a=>a.units.some(u=>u.id===id)));validateCampaign(JSON.parse(serializeCampaign(s)));
});
