import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {assignmentCandidates,assignmentPickerMarkup,selectScoutField} from '../assignment-picker.mjs';
import {scoutCandidates,scoutTargets,scoutAssignments,scoutRoute} from '../scouting.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn} from '../domestic.mjs';
import {requestStrategicOrder,requestFactionOrder,resolveStrategicOrders} from '../strategic-orders.mjs';
import {scoutSelection,scoutingMarkup} from '../scouting-view.mjs';
import {diplomacyMarkup} from '../diplomacy-view.mjs';
import {treasureRecord} from '../treasures.mjs';
import {treasuresMarkup} from '../treasure-view.mjs';
const fixture=()=>{
 const s=newCampaign(203,'guandu-200'),city=s.cities.find(c=>c.id==='xuchang'),o=scoutCandidates(s,city.id)[0];
 assert.equal(assignDomestic(s,city.id,'commerce',o.unit.id),null);beginDomesticTurn(s);assert.ok(assignmentFor(s,o.unit.id).action);
 const target=scoutTargets(s,city.id)[0];return {s,city,o,target,command:{kind:'scout',cityId:city.id,officerIds:[o.unit.id],target:target.id,route:scoutRoute(s,city.id,target.id)}};
};
test('assignment tables include working residents and governors eligible for player handoff',()=>{
 const {s,city,o,target}=fixture(),before=serializeCampaign(s),p={kind:'scout-officer',city:city.id},rows=assignmentCandidates(s,p);
 assert.equal(rows.find(r=>r.id===o.unit.id).reason,'');assert.equal(rows.find(r=>r.id===city.governor).reason,'');
 const html=assignmentPickerMarkup(s,p).body;for(const text of ['智力','视野持续','所在','任职','事务',o.unit.name,'商业负责人','还需'])assert.ok(html.includes(text));
 assert.ok(!scoutCandidates(s,city.id).some(r=>r.unit.id===o.unit.id),'AI automatic selection still preserves work');
 assert.equal(scoutSelection(s,{city:city.id,officer:o.unit.id,target:target.id}).officer.unit.id,o.unit.id);
 assert.doesNotMatch(scoutingMarkup(s,{city:city.id}),/<select/);assert.doesNotMatch(diplomacyMarkup(s),/<select[^>]*id="diplomacy-(?:city|officer)-/);
 const diplomat=assignmentCandidates(s,{kind:'diplomacy-officer',city:city.id,direction:'commerce'}).find(r=>r.id===o.unit.id);assert.equal(diplomat.reason,'');
 assert.equal(serializeCampaign(s),before);
});
test('scout handoff previews and invalid routes are read only; immediate reassignment ends work once',()=>{
 const {s,o,command}=fixture(),before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,command).confirmation);assert.equal(serializeCampaign(s),before);
 assert.ok(requestStrategicOrder(s,{...command,route:['missing']},'now').error);assert.equal(serializeCampaign(s),before);
 assert.equal(requestStrategicOrder(s,command,'now').applied,true);assert.equal(assignmentFor(s,o.unit.id),undefined);assert.equal(scoutAssignments(s).filter(t=>t.officerId===o.unit.id).length,1);
 assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
});
test('scheduled faction scouts preserve work and route across save, execute after completion, and do not repeat',()=>{
 const {s,o,command}=fixture(),work=assignmentFor(s,o.unit.id).action;
 assert.equal(requestFactionOrder(s,s.campaign.playerFaction,command,'after',true).queued,true);assert.equal(assignmentFor(s,o.unit.id).action,work);assert.equal(scoutAssignments(s).length,0);
 const saved=serializeCampaign(s),next=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(next),saved);resolveStrategicOrders(next);assert.equal(scoutAssignments(next).length,0);
 // Same completion receipt consumed by the daily order resolver.
 const a=assignmentFor(next,o.unit.id);a.action=null;(next.campaign.domestic.workHistory[o.unit.id]??=[]).push({actionId:work.id,status:'completed'});
 resolveStrategicOrders(next);assert.equal(next.campaign.domestic.orders.length,0);assert.equal(scoutAssignments(next).length,1);assert.deepEqual(scoutAssignments(next)[0].route,command.route);
 resolveStrategicOrders(next);assert.equal(scoutAssignments(next).length,1);
});
test('scout selection keeps unchanged drafts and invalidates only dependent choices',()=>{
 const p={city:'a',officer:'u',target:'b',route:['b'],waypoints:['x'],mapUI:{city:'a'}},before=JSON.stringify(p);
 selectScoutField(p,'officer','u');assert.equal(JSON.stringify(p),before);
 selectScoutField(p,'officer','v');assert.equal(p.city,'a');assert.equal(p.target,null);assert.equal(p.route,null);assert.deepEqual(p.waypoints,[]);
 selectScoutField(p,'city','c');assert.equal(p.officer,null);assert.equal(p.mapUI,null);
});
test('scout commands reject absent officers before touching their original work',()=>{
 const {s,o,command}=fixture();o.unit.mission={type:'search',homeCity:command.cityId};const before=JSON.stringify(s);
 assert.ok(requestStrategicOrder(s,command,'now').error);assert.equal(JSON.stringify(s),before);
});
test('treasure recipients use the same read-only table and include working officers across cities',()=>{
 const {s,city,o}=fixture();Object.assign(treasureRecord(s,'brightArmor'),{state:'treasury',cityId:null,factionId:city.owner,holderId:null});
 const before=serializeCampaign(s),p={kind:'treasure-officer',treasureId:'brightArmor'},rows=assignmentCandidates(s,p);
 assert.equal(rows.find(r=>r.id===o.unit.id).reason,'');assert.ok(rows.some(r=>r.location!==city.id&&!r.reason));
 assert.match(assignmentPickerMarkup(s,p).body,/商业负责人/);assert.doesNotMatch(treasuresMarkup(s,{id:'brightArmor'}),/<select[^>]*data-treasure-recipient/);
 assert.equal(serializeCampaign(s),before);
});
