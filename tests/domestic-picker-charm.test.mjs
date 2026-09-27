import {newCommand,commandMarkup,commandSteps} from '../strategic-command.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {domesticAbility} from '../domestic-cooperation.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {campaignRosterMarkup} from '../strategic-roster.mjs';
test('all officers carry source charm into talent domestic calculations',()=>{
 for(const source of Object.values(OFFICER_BY_ID)){
  const u=makeOfficer(source.id,0);assert.equal(u.charm,source.charm);assert.ok(Number.isFinite(u.charm));
  assert.equal(domesticAbility(u,{stat:'charm'}),Math.max(0,Math.min(100,source.charm)));
 }
});
test('domestic table shows relevant ability and appointment context without mutation',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s),p={task:'domestic',city:'xuchang',direction:'talent',selected:[]};
 const html=campaignRosterMarkup(s,{personnel:{city:'xuchang'}},p);
 for(const text of ['魅力','所在','任职','事务'])assert.ok(html.includes(text));
 assert.equal(JSON.stringify(s),before);
});

test('appointments confirm on the officer page with no review step',()=>{
 const s=newCampaign(203,'guandu-200');
 for(const task of ['domestic','governor']){
  const p=newCommand(s,task,'xuchang',{direction:'talent'});p.step='officers';p.selected=[s.cities.find(c=>c.id==='xuchang').units[0].id];
  assert.ok(!commandSteps(p).includes('review'));
  const v=commandMarkup(s,{officerPick:p,personnel:{}},'');assert.match(v.footer,/data-action="campaign-pick-confirm"[^>]*>确认任命/);
  assert.doesNotMatch(v.body,/data-sort="leadership"|data-sort="force"/);
 }
});
