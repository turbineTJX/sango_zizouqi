import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,actionChance} from '../domestic.mjs';
import {talentCandidates,refreshTalentProjects} from '../talent-lifecycle.mjs';
import {talentKey,factionLord,isLord,persuasionEligibility,talentEligibility} from '../talent-core.mjs';
import {cityVisible,updateVision,intelligenceWorld} from '../strategic-vision.mjs';
import {setRelationshipType} from '../relationships.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {observeFixtureCity} from './helpers/observed-city.mjs';

function fixture(faction='cao'){
 const s=peacefulCities(newCampaign(15));fundCities(s,100000);
 const rival=faction==='cao'?'yuan':'cao',home=s.cities.find(c=>c.id===(faction==='cao'?'xuchang':'guandu')),city=s.cities.find(c=>c.id===(faction==='cao'?'guandu':'xuchang'));
 const target=s.campaign.idle.find(o=>o.faction===rival&&!isLord(s,o.unit.id,rival)&&!s.cities.some(c=>c.governor===o.unit.id));assert.ok(target);
 target.location=city.id;target.destination=null;
 assert.equal(setRelationshipType(s,target.unit.id,factionLord(s,faction),'sworn',100),null);
 s.campaign.domestic.loyalty[target.unit.id]=99;
 updateVision(s);return {s,faction,rival,home,city,target};
}
// A controlled, valid sight interval tests the observation boundary; it is not
// used by any natural campaign audit or counted as an actual scouting action.
function observe(f){observeFixtureCity(f.s,f.city.id,f.faction);assert.ok(cityVisible(f.s,f.city.id,f.faction));}

for(const faction of ['cao','yuan'])test(`${faction} persuasion decisions ignore hidden loyalty and rival staffing`,()=>{
 const f=fixture(faction),{s,home,target,city,rival}=f;
 assert.equal(cityVisible(s,city.id,faction),false);
 assert.equal(talentCandidates(s,home,'persuade').some(p=>p.id===target.unit.id),false);
 observe(f);const before=serializeCampaign(s),candidates=talentCandidates(s,home,'persuade');
 assert.ok(candidates.some(p=>p.id===target.unit.id),'a visible person is an invitation, not a disclosure of private loyalty');
 assert.equal(serializeCampaign(s),before,'browsing candidates is read-only');
 const changed=structuredClone(s);changed.campaign.domestic.loyalty[target.unit.id]=1;changed.campaign.talent.demands[rival].demand+=100;
 changed.campaign.talent.records[target.unit.id].defeatHistory.push({defeatingFactionId:faction,formerLordId:factionLord(s,rival)});
 assert.deepEqual(talentCandidates(changed,changed.cities.find(c=>c.id===home.id),'persuade'),candidates);
 const actor=cityPersonnel(s,home.id)[0].unit;
 assert.equal(actionChance(s,home,actor,ACTIONS.persuade,target),actionChance(changed,changed.cities.find(c=>c.id===home.id),actor,ACTIONS.persuade,target));
 const visible=intelligenceWorld(s,faction);assert.equal(visible.campaign.domestic.loyalty[target.unit.id],undefined);
 s.campaign.vision.factions[faction].scouted=[];updateVision(s);
 assert.notEqual(s.campaign.vision.factions[faction].cities[city.id].day,null,'old city reports remain');
 assert.equal(persuasionEligibility(s,target.unit.id,faction,home.id).reason,'unknown','old sightings do not disclose present personnel');
});

test('an actual paid persuasion journey rejects a loyal target, saves its response and waits before retrying',()=>{
 const f=fixture(),{s,home,target}=f;observe(f);
 const actor=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===home.id);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='talent'&&key!=='persuade')home.domestic.cooldowns[key]=100000;
 assert.equal(assignDomestic(s,home.id,'talent',actor.unit.id),null);
 assert.ok(actionCandidates(s,assignmentFor(s,actor.unit.id)).some(p=>p.targetId===target.unit.id));
 assert.equal(talentEligibility(s,target.unit.id,'cao',home.id,'persuade').reason,'loyal');
 assert.equal(beginExecution(s),null);const project=s.campaign.talent.projects[talentKey(target.unit.id,'cao')];assert.ok(project);assert.ok(project.spent>0);assert.ok(actor.unit.mission,'the invitation uses a real journey');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(let i=0;i<60&&project.nextAttemptDay===0;i++){
  for(const state of [s,copy]){if(state.campaign.phase==='planning')beginExecution(state);advanceCampaignDay(state);}
  assert.equal(serializeCampaign(copy),serializeCampaign(s));
 }
 assert.equal(project.reason,'loyal');assert.equal(project.progress,0);assert.equal(project.attempts,1);assert.ok(project.nextAttemptDay>s.campaign.day);
 assert.equal(talentCandidates(s,home,'persuade').some(p=>p.id===target.unit.id),false);
 const knowledge=structuredClone(project);s.campaign.domestic.loyalty[target.unit.id]=1;refreshTalentProjects(s);
 assert.equal(project.progress,knowledge.progress);assert.equal(project.spent,knowledge.spent);assert.equal(project.attempts,knowledge.attempts);assert.equal(project.nextAttemptDay,knowledge.nextAttemptDay);
});
