import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {dispatchScout,scoutCandidates,scoutRoute,scoutJourney,advanceScouting,recallScout,scoutAssignment} from '../scouting.mjs';
import {scoutingMarkup} from '../scouting-view.mjs';
import {assignmentCandidates} from '../assignment-picker.mjs';
import {mapTargetSummary} from '../map-target-picker.mjs';
import {cityVisible,cityIntelligence,updateVision} from '../strategic-vision.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {assignDomestic,finishDomesticDay,cancelDomestic} from '../domestic.mjs';
import {finishTalentDay} from '../talent-lifecycle.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {MOVEMENT_RULES} from '../data/design/movement-rules.mjs';

function fixture(){const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),target=s.cities.find(c=>c.id==='chenliu'),officer=scoutCandidates(s,home.id)[0];return {s,home,target,officer};}
const step=s=>{advanceScouting(s);finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;s.campaign.phase='executing';};

test('route days and fees are shared by the endpoint table, map summary and always visible dispatch summary',()=>{
 const {s,home,target,officer}=fixture(),selection={city:home.id,officer:officer.unit.id,target:target.id},route=scoutRoute(s,home.id,target.id),trip=scoutJourney(s,home.id,route),before=serializeCampaign(s);
 assert.equal(trip.days,4);assert.equal(trip.gold,40);
 const row=assignmentCandidates(s,{kind:'scout-target',city:home.id,officer:officer.unit.id}).find(r=>r.id===target.id);assert.equal(row.days,trip.days);assert.equal(row.gold,trip.gold);
 const markup=scoutingMarkup(s,selection);assert.match(markup,/预计用时/);assert.match(markup,/class="scout-cost">40 金/);assert.match(markup.match(/<footer[\s\S]*$/)[0],/4 天 · 40 金/);
 assert.match(mapTargetSummary(s,{kind:'scout-target'},target,{scout:selection}),/预计用时 4 天 · 费用 40 金/);
 const detour=scoutRoute(s,home.id,target.id,['junction:atlas-qiao:xuchang']);assert.ok(detour);const longer=scoutJourney(s,home.id,detour);assert.ok(longer.days>trip.days);assert.equal(longer.gold,longer.days*MOVEMENT_RULES.scouting.goldPerDay);
 const preview=scoutingMarkup(s,{...selection,route:detour});assert.ok(preview.includes(`${longer.days} 天 · ${longer.gold} 金`));assert.equal(serializeCampaign(s),before);
});

test('dispatch deducts the quoted fee once from the actual source city and save/load or daily travel never charges again',()=>{
 const {s,home,target,officer}=fixture(),other=s.cities.find(c=>c.owner===home.owner&&c!==home),gold=home.gold,total=s.gold,otherGold=other.gold;
 assert.equal(dispatchScout(s,home.id,officer.unit.id,target.id),null);const task=scoutAssignment(s,officer.unit.id);assert.equal(task.plannedDays,4);assert.equal(task.paidGold,40);assert.equal(home.gold,gold-40);assert.equal(s.gold,total-40);assert.equal(other.gold,otherGold);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));for(const state of [s,copy]){advanceScouting(state);advanceScouting(state);assert.equal(state.cities.find(c=>c.id===home.id).gold,gold-40);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('insufficient source funds reject before interrupting old work or spending another city treasury',()=>{
 const {s,home,target,officer}=fixture();assert.equal(assignDomestic(s,home.id,'commerce',officer.unit.id),null);home.gold=39;syncResourceTotals(s);const before=serializeCampaign(s);
 const result=requestStrategicOrder(s,{kind:'scout',cityId:home.id,officerIds:[officer.unit.id],target:target.id},'now');assert.match(result.error,/金不足/);assert.equal(serializeCampaign(s),before);
 const html=scoutingMarkup(s,{city:home.id,officer:officer.unit.id,target:target.id});assert.match(html,/本城金不足/);assert.match(html.match(/<button[^>]*data-action="scout-dispatch"[^>]*>/)[0],/disabled/);
});

test('returning from a conflict confirmation spends nothing and accepting pays the actual route fee once',()=>{
 const {s,home,target,officer}=fixture();assert.equal(assignDomestic(s,home.id,'commerce',officer.unit.id),null);const before=serializeCampaign(s),gold=home.gold,command={kind:'scout',cityId:home.id,officerIds:[officer.unit.id],target:target.id};
 assert.ok(requestStrategicOrder(s,command,null).confirmation);assert.equal(serializeCampaign(s),before);assert.ok(requestStrategicOrder(s,command,'now').applied);assert.equal(s.cities.find(c=>c.id===home.id).gold,gold-40);assert.equal(s.campaign.domestic.assignments.some(a=>a.officerId===officer.unit.id),false);
});

test('arrival scans the destination then removes the scout and releases the officer while timed vision and reports remain',()=>{
 const {s,home,officer}=fixture(),target=s.cities.find(c=>c.id==='runan'),trip=scoutJourney(s,home.id,scoutRoute(s,home.id,target.id));assert.equal(cityVisible(s,target.id),false);assert.equal(dispatchScout(s,home.id,officer.unit.id,target.id),null);const task=scoutAssignment(s,officer.unit.id),paid=home.gold;
 assert.match(armyMapMarkers(s,{}),new RegExp(`data-scout-task="${task.id}"`));
 for(let day=1;day<=trip.days;day++){step(s);assert.equal(!!scoutAssignment(s,officer.unit.id),day<trip.days);assert.equal(home.gold,paid);}
 assert.equal(officer.unit.scouting,undefined);assert.equal(task.location,target.id);assert.equal(cityVisible(s,target.id),true);assert.ok(cityIntelligence(s,target.id).data);assert.ok(s.campaign.personnelEvents.some(e=>e.type==='SCOUT_COMPLETE'&&e.officerId===officer.unit.id));
 assert.doesNotMatch(armyMapMarkers(s,{}),new RegExp(`data-scout-task="${task.id}"`));assert.doesNotMatch(scoutingMarkup(s),/data-action="scout-recall"/);
 const wards=structuredClone(s.campaign.vision.factions.cao.scouted),lastReport=structuredClone(cityIntelligence(s,target.id));assert.ok(wards.length);step(s);assert.deepEqual(s.campaign.vision.factions.cao.scouted,wards,'completed scouts cannot renew wards');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(scoutAssignment(copy,officer.unit.id),undefined);assert.deepEqual(copy.campaign.vision.factions.cao.scouted,wards);
 while(s.campaign.day<=Math.max(...wards.map(v=>v.expiresDay)))step(s);updateVision(s);assert.equal(cityVisible(s,target.id),false);assert.ok(cityIntelligence(s,target.id).day>=lastReport.day);assert.ok(cityIntelligence(s,target.id).data);
});

test('stopping a dispatched scout releases the officer without refunding its paid expense or creating vision',()=>{
 const {s,home,target,officer}=fixture(),gold=home.gold;assert.equal(dispatchScout(s,home.id,officer.unit.id,target.id),null);assert.equal(recallScout(s,officer.unit.id),null);assert.equal(home.gold,gold-40);assert.equal(officer.unit.scouting,undefined);assert.equal(s.campaign.vision.factions.cao.scouted.length,0);
});

test('the actual arrival day counts as work after the scouting post is released and the next idle day stays idle',()=>{
 const {s,home,target,officer}=fixture(),trip=scoutJourney(s,home.id,scoutRoute(s,home.id,target.id)),record=s.campaign.talent.records[officer.unit.id];
 assert.equal(dispatchScout(s,home.id,officer.unit.id,target.id),null);const before=record.workedDays;
 for(let i=0;i<trip.days;i++){advanceScouting(s);finishTalentDay(s,cancelDomestic);finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;}
 assert.equal(officer.unit.scouting,undefined);assert.equal(record.workedDays,before+trip.days);finishTalentDay(s,cancelDomestic);assert.equal(record.workedDays,0);
});

test('old scouting saves require a new campaign rather than inventing a missing paid fee',()=>{
 const {s,home,target,officer}=fixture();assert.equal(dispatchScout(s,home.id,officer.unit.id,target.id),null);const old=JSON.parse(serializeCampaign(s));old.campaign.scouting.version=1;delete old.campaign.scouting.tasks[0].plannedDays;delete old.campaign.scouting.tasks[0].paidGold;assert.throws(()=>validateCampaign(old),/侦察工作存档版本不兼容，请重新开始/);
});
