import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {domesticPriority,setDomesticPriority,fillFactionAppointments} from '../faction-affairs.mjs';
import {assignmentFor} from '../domestic.mjs';
import {playerFaction} from '../player-faction.mjs';
import {factionAffairsMarkup,battlesPanel} from '../strategic-view.mjs';
test('global priority persists and rejects malformed or execution-time changes',()=>{
 const s=newCampaign(203,'guandu-200'),order=[...domesticPriority(s)].reverse();
 assert.equal(setDomesticPriority(s,order),null);
 assert.deepEqual(domesticPriority(validateCampaign(JSON.parse(serializeCampaign(s)))),order);
 const before=serializeCampaign(s);assert.ok(setDomesticPriority(s,order.map(()=>order[0])));assert.equal(serializeCampaign(s),before);
 s.campaign.phase='executing';assert.ok(setDomesticPriority(s,[...order].reverse()));
});
test('unified appointments use local officers once, preserve appointments and are idempotent',()=>{
 const s=newCampaign(203,'guandu-200'),existing=structuredClone(s.campaign.domestic.assignments);
 const result=fillFactionAppointments(s);assert.ok(result.count>0);
 for(const a of existing)assert.deepEqual(assignmentFor(s,a.officerId),a);
 const jobs=s.campaign.domestic.assignments;assert.equal(new Set(jobs.map(a=>a.officerId)).size,jobs.length);
 assert.ok(jobs.filter(a=>!existing.some(x=>x.id===a.id)).every(a=>s.cities.find(c=>c.id===a.cityId).owner===playerFaction(s)));
 assert.equal(fillFactionAppointments(s).count,0);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('global menus describe unified policies and tabular battle states',()=>{
 const s=newCampaign(203,'guandu-200');assert.match(factionAffairsMarkup(s),/统一内政/);assert.match(factionAffairsMarkup(s),/最终方案须批准/);assert.match(factionAffairsMarkup(s,'diplomacy'),/diplomatic-direction/);
 assert.match(battlesPanel(s,true),/<table class="battle-overview">/);
});
