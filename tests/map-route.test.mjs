import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignStep} from './helpers/auto-domestic-campaign.mjs';
import {newCommand,selectCommandPoint,editCommandWaypoint,commandRoute,commandMarkup} from '../strategic-command.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {validMapRoute,campaignRoads} from '../strategic-movement.mjs';
import {fieldFromCity,expeditionFrom} from './helpers/field-campaign.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';

test('choose a destination directly and drag a waypoint while preserving the destination and game state',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang'),p=newCommand(s,'march',a.location,{armyId:a.id}),before=serializeCampaign(s),mid='junction:chenliu:xuchang';
 assert.equal(selectCommandPoint(s,p,'chenliu'),null);const first=[...p.route];assert.ok(first.includes(mid));
 const markup=commandMarkup(s,{officerPick:p},'');assert.doesNotMatch(markup.body,/继续选路|设为终点|道路消耗|每日行动力/);assert.match(markup.footer,/确认终点/);
 const alternate=s.junctions.find(n=>{const draft=structuredClone(p);return n.id!==mid&&editCommandWaypoint(s,draft,.5,n.id)&&JSON.stringify(draft.route)!==JSON.stringify(first);});assert.ok(alternate);
 assert.equal(editCommandWaypoint(s,p,.5,alternate.id),true);assert.equal(p.destination,'chenliu');assert.ok(p.route.includes(alternate.id));assert.notDeepEqual(p.route,first);
 const edited=structuredClone(p);assert.equal(editCommandWaypoint(s,p,.5,'missing'),false);assert.deepEqual(p,edited);
 assert.equal(selectCommandPoint(s,p,mid),null);assert.equal(p.destination,mid);assert.deepEqual(p.waypoints,[]);
 assert.equal(serializeCampaign(s),before);
 assert.ok(selectCommandPoint(s,p,'xuchang'));assert.equal(p.destination,mid);
});
test('manual marching route is issued exactly and deterministic after saving',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang'),p=newCommand(s,'march',a.location,{armyId:a.id});
 selectCommandPoint(s,p,'chenliu');assert.equal(editCommandWaypoint(s,p,.5,'junction:chenliu:xuchang'),true);
 const route=[...p.route];assert.deepEqual(commandRoute(s,p).route,route);
 assert.equal(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:p.destination,route}).applied,true);assert.deepEqual(a.route,route);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));beginExecution(s);beginExecution(copy);advanceCampaignStep(s);advanceCampaignStep(copy);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});
test('expedition preserves selected roads and rejects invalid paths before changing state',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id),q={kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[0],target:'chenliu',route:['junction:chenliu:xuchang','chenliu']};
 const before=serializeCampaign(s);assert.ok(requestStrategicOrder(s,{...q,route:['missing','chenliu']}).error);assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,q).applied,true);assert.deepEqual(s.armies[0].route,q.route);validateCampaign(JSON.parse(serializeCampaign(s)));
 assert.equal(validMapRoute(s,c.id,'chenliu',['chenliu',c.id,'chenliu']),false);
 for(const [x,y]of s.roads)assert.equal(campaignRoads(s,x,y).length,1);
});
test('waiting expedition saves the exact selected route',()=>{
 const {s,army}=busyFixture();const q={...expeditionFrom(army),target:'chenliu',route:['chenliu']};
 assert.equal(requestStrategicOrder(s,q,'after').queued,true);assert.deepEqual(s.campaign.domestic.orders[0].route,q.route);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(copy.campaign.domestic.orders[0].route,q.route);
 copy.campaign.domestic.orders[0].route=['missing','chenliu'];assert.throws(()=>validateCampaign(copy));
});
