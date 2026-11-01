import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {cancelDomestic,assignDomestic} from '../domestic.mjs';
import {resolveTalentResignations} from '../talent-lifecycle.mjs';
import * as core from '../talent-core.mjs';
import {outcomeReportMarkup} from '../reward-presentation.mjs';
import {importantActivityNode} from '../activity-nodes.mjs';
import {dispatchScout,scoutTargets,scoutAssignment} from '../scouting.mjs';

function fixture(loyalty=20){
 const s=peacefulCities(newCampaign(15));for(const o of core.servingPeople(s).values())s.campaign.domestic.loyalty[o.unit.id]=100;
 const id='liao',r=s.campaign.talent.records[id];s.campaign.domestic.loyalty[id]=loyalty;
 return {s,id,r};
}

test('low loyalty alone produces a factual reminder without any scheduled resignation date',()=>{
 const {s,id,r}=fixture(55);assert.equal(assignDomestic(s,'xuchang','military',id),null);
 s.campaign.talent.seed=0;resolveTalentResignations(s,cancelDomestic);
 assert.equal(r.loyaltyWarning,true);assert.equal(Object.hasOwn(r,'leaveAtDay'),false);
 const note=s.campaign.activity.nodes.find(n=>n.phase==='loyalty-low');assert.ok(note);
 assert.match(note.text,/忠诚.*55/);assert.doesNotMatch(note.text,/预计|倒计时|将于|\d+天.*辞官|30天/);
 assert.equal(importantActivityNode(note),true);
 const before=serializeCampaign(s),markup=outcomeReportMarkup(s,note);
 assert.match(markup,/data-action="domestic-direction-open"/);assert.match(markup,/data-direction="talent"/);
 assert.equal(serializeCampaign(s),before,'viewing a reminder does not draw random outcomes');
});

test('loyalty risk rises as loyalty falls, while a normal loyal officer has zero passive resignation risk',()=>{
 const {s,id}=fixture(59),near=core.loyaltyResignationChance(s,id,'cao');
 s.campaign.domestic.loyalty[id]=20;const low=core.loyaltyResignationChance(s,id,'cao');
 s.campaign.domestic.loyalty[id]=0;const zero=core.loyaltyResignationChance(s,id,'cao');
 assert.ok(near>0&&near<low&&low<=zero&&zero<1);
 s.campaign.domestic.loyalty[id]=60;assert.equal(core.loyaltyResignationChance(s,id,'cao'),0);
});

test('a low-loyalty officer may suddenly resign on the first check without a previous warning period',()=>{
 const {s,id}=fixture(0);s.campaign.talent.seed=1972;
 resolveTalentResignations(s,cancelDomestic);
 assert.equal(core.servingPeople(s).has(id),false);
 const results=s.campaign.talent.reports.filter(n=>n.personId===id&&n.code==='resigned');
 assert.equal(results.length,1);assert.equal(results[0].day,1);
 assert.doesNotMatch(results[0].text,/届满|到期|倒计时/);
});

test('a low-loyalty officer can remain for over thirty days, and repeated same-day checks never reroll',()=>{
 const {s,id,r}=fixture(0);
 for(let day=1;day<=45;day++){
  s.campaign.day=day;s.campaign.talent.seed=0;resolveTalentResignations(s,cancelDomestic);
  assert.ok(core.servingPeople(s).has(id));const seed=s.campaign.talent.seed;
  resolveTalentResignations(s,cancelDomestic);assert.equal(s.campaign.talent.seed,seed);
 }
 assert.equal(r.loyaltyWarning,true);assert.equal(s.campaign.talent.reports.filter(n=>n.code==='loyalty-low'&&n.personId===id).length,1);
});

test('loyalty recovery clears the reminder without a fresh popup or any random resignation roll',()=>{
 const {s,id,r}=fixture(20);s.campaign.talent.seed=0;resolveTalentResignations(s,cancelDomestic);
 s.campaign.day++;s.campaign.domestic.loyalty[id]=60;s.campaign.talent.seed=1972;
 resolveTalentResignations(s,cancelDomestic);
 assert.equal(r.loyaltyWarning,false);assert.equal(s.campaign.talent.seed,1972);assert.ok(core.servingPeople(s).has(id));
 const note=s.campaign.activity.nodes.find(n=>n.phase==='loyalty-restored');assert.ok(note);assert.equal(importantActivityNode(note),false);
});

test('risk RNG and reminder state survive a current save and produce identical real daily continuation',()=>{
 const {s}=fixture(55);beginExecution(s);advanceCampaignDay(s);
 const text=serializeCampaign(s),copy=validateCampaign(JSON.parse(text));
 for(let i=0;i<8;i++){advanceCampaignDay(s);advanceCampaignDay(copy);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const old=JSON.parse(text);old.campaign.talent.version=2;assert.throws(()=>validateCampaign(old),/人才存档版本不兼容/);
});

test('a scouting officer who suddenly resigns releases the real task and leaves a valid unique person',()=>{
 const s=newCampaign(203,'guandu-200'),id='person-409',home='town-8';
 for(const o of core.servingPeople(s).values())s.campaign.domestic.loyalty[o.unit.id]=100;
 assert.equal(dispatchScout(s,home,id,scoutTargets(s,home)[0].id),null);
 s.campaign.domestic.loyalty[id]=0;s.campaign.talent.seed=1972;resolveTalentResignations(s,cancelDomestic);
 assert.equal(core.servingPeople(s).has(id),false);assert.equal(scoutAssignment(s,id),undefined);
 const person=s.campaign.domestic.people.find(p=>p.id===id);assert.ok(person);assert.equal(person.unit.scouting,undefined);
 const text=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(text))),text);
});
