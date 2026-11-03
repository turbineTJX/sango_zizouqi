import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates} from '../domestic.mjs';
import {disaffectionCandidates,disaffectionAvailable,isLord,servingPeople} from '../talent-core.mjs';
import {cityVisible,updateVision,intelligenceWorld} from '../strategic-vision.mjs';
import {campaignInfoIndex,campaignInfoDetail} from '../campaign-info.mjs';
import {resolveOfficerLoss,fateRoll,officerLossResult,releaseCaptive} from '../officer-fates.mjs';
import {observeFixtureCity} from './helpers/observed-city.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {subversionFixture as fixture,subversionActor as actorFor} from './helpers/talent-subversion.mjs';
import {dispatchScout,recallScout,scoutCandidates,scoutAssignment,advanceScouting} from '../scouting.mjs';
import {finishDomesticDay,decideDomesticProposal,setDomesticAutoApprove,domesticProposalSummary} from '../domestic.mjs';
import {cityPersonnel} from '../city-personnel.mjs';

for(const faction of ['cao','yuan'])test(`${faction} current city sight reveals officer details and loyalty without a personnel report`,()=>{
 const f=fixture(faction),{s,city,target}=f,id=target.unit.id;
 assert.ok(!campaignInfoIndex(intelligenceWorld(s,faction)).officer.some(r=>r.unit.id===id));
 observeFixtureCity(s,city.id,faction);const before=serializeCampaign(s),view=intelligenceWorld(s,faction);
 assert.equal(view.campaign.domestic.loyalty[id],99);assert.ok(campaignInfoIndex(view).officer.some(r=>r.unit.id===id));
 let detail=campaignInfoDetail(view,'officer',id);assert.match(detail.sections.find(x=>x.id==='attributes').html,/忠诚/);assert.match(detail.sections.find(x=>x.id==='attributes').html,/>99</);
 assert.ok(['attributes','aptitudes','traits','bonds','tactics','stratagems'].every(id=>detail.sections.some(x=>x.id===id)));
 assert.equal(serializeCampaign(s),before,'viewing is read-only');
 const report=JSON.stringify(s.campaign.vision.factions[faction].cities[city.id]);s.campaign.domestic.loyalty[id]=73;
 assert.equal(intelligenceWorld(s,faction).campaign.domestic.loyalty[id],73,'current loyalty changes without another report');
 assert.equal(JSON.stringify(s.campaign.vision.factions[faction].cities[city.id]),report);
 s.campaign.vision.factions[faction].scouted=[];updateVision(s);assert.ok(!cityVisible(s,city.id,faction));
 assert.equal(intelligenceWorld(s,faction).campaign.domestic.loyalty[id],undefined);
 assert.ok(!campaignInfoIndex(intelligenceWorld(s,faction)).officer.some(r=>r.unit.id===id));
 assert.deepEqual(campaignInfoDetail(intelligenceWorld(s,faction),'officer',id).sections,[]);
 const resumed=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(intelligenceWorld(resumed,faction).campaign.domestic.loyalty[id],undefined);
});

for(const faction of ['cao','yuan'])test(`${faction} subversion uses visible high loyalty targets and shares paid journeys and deterministic settlement`,()=>{
 const f=fixture(faction,1),{s,home,city,target}=f,id=target.unit.id;
 assert.equal(disaffectionCandidates(s,home).length,0);
 const hidden=structuredClone(s);hidden.campaign.domestic.loyalty[id]=1;assert.deepEqual(disaffectionCandidates(hidden,hidden.cities.find(c=>c.id===home.id)),disaffectionCandidates(s,home));
 observeFixtureCity(s,city.id,faction,100);const actor=actorFor(f),a=assignmentFor(s,actor.unit.id);
 assert.ok(disaffectionCandidates(s,home).some(p=>p.unit.id===id));
 assert.ok(disaffectionCandidates(s,home).every(o=>!isLord(s,o.unit.id,o.faction)));
 // One visible target makes the actual autonomous command unambiguous.
 for(const o of disaffectionCandidates(s,home))if(o.unit.id!==id)s.campaign.domestic.loyalty[o.unit.id]=65;
 assert.ok(actionCandidates(s,a).some(p=>p.key==='disaffect'&&p.targetId===id));
 const cash=home.gold;assert.equal(beginExecution(s),null);assert.equal(a.action?.key,'disaffect');assert.equal(a.action.targetId,id);assert.equal(a.action.targetFaction,f.rival);
 assert.ok(home.gold<=cash-ACTIONS.disaffect.cost);assert.equal(actor.unit.mission.phase,'outbound');assert.equal(s.campaign.domestic.loyalty[id],99);
 assert.equal(disaffectionAvailable(s,home,a.action,actor.unit),false,'travel cannot reduce loyalty');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));let result;
 for(let i=0;i<100&&!result;i++){
  for(const state of [s,copy]){if(state.campaign.phase==='planning')beginExecution(state);advanceCampaignDay(state);}
  assert.equal(serializeCampaign(s),serializeCampaign(copy));
  result=s.campaign.domestic.events.find(e=>e.actionId===a.action?.id&&['complete','failure'].includes(e.phase));
 }
 assert.ok(result,'a real paid visit must settle');assert.ok(result.result.actual>0,'fixed seed must demonstrate an actual reduction: '+JSON.stringify(result));
 assert.equal(s.campaign.domestic.loyalty[id],99-result.result.actual);assert.equal(servingPeople(s).get(id).faction,f.rival);
 assert.ok(home.domestic.cooldowns.disaffect>s.campaign.day);assert.ok(actor.unit.mission,'the executor still needs to return home');
 const corrupt=JSON.parse(serializeCampaign(s)),work=corrupt.campaign.domestic.assignments.find(a=>a.action?.key==='disaffect');assert.ok(work);work.action.targetFaction='invalid';assert.throws(()=>validateCampaign(corrupt),/离间/);
});

test('subversion completion rejects departed targets, changed allegiance, lords and low loyalty',()=>{
 const f=fixture(),{s,home,city,target}=f;observeFixtureCity(s,city.id,'cao',100);const actor=actorFor(f);
 for(const o of disaffectionCandidates(s,home))if(o.unit.id!==target.unit.id)s.campaign.domestic.loyalty[o.unit.id]=65;
 beginExecution(s);const x=assignmentFor(s,actor.unit.id).action;
 // Eligibility fixtures isolate execution rechecks; they do not grant a result.
 actor.unit.mission={...actor.unit.mission,phase:'work',location:city.id,route:[],progress:0};
 assert.equal(disaffectionAvailable(s,home,x,actor.unit),true);
 target.destination=home.id;assert.equal(disaffectionAvailable(s,home,x,actor.unit),false);target.destination=null;
 target.faction='cao';assert.equal(disaffectionAvailable(s,home,x,actor.unit),false);target.faction=f.rival;
 s.campaign.domestic.loyalty[target.unit.id]=65;assert.equal(disaffectionAvailable(s,home,x,actor.unit),false);
});

for(const faction of ['cao','yuan'])test(`${faction} custody reveals current captive loyalty without enlisting or exposing other prisoners`,()=>{
 const f=fixture(faction),{s,target,home,city,rival}=f,id=target.unit.id;
 let eventId;for(let i=0;!eventId&&i<10000;i++){const key='custody-detail:'+i;if(officerLossResult(fateRoll(s,key),faction,'field')==='CAPTIVE')eventId=key;}
 assert.ok(eventId);assert.equal(resolveOfficerLoss(s,{unit:target.unit,faction:rival,location:home.id,enemy:faction,eventId}), 'CAPTIVE');
 updateVision(s);const view=intelligenceWorld(s,faction),p=s.campaign.domestic.people.find(p=>p.id===id);
 assert.equal(view.campaign.domestic.loyalty[id],99);assert.equal(servingPeople(s).has(id),false);
 assert.equal(campaignInfoIndex(view).officer.find(r=>r.unit.id===id).faction,rival,'custody does not change allegiance');
 const before=serializeCampaign(s);assert.match(campaignInfoDetail(view,'officer',id).sections.find(x=>x.id==='attributes').html,/>99</);assert.equal(serializeCampaign(s),before);
 s.campaign.domestic.loyalty[id]=81;assert.equal(intelligenceWorld(s,faction).campaign.domestic.loyalty[id],81);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(intelligenceWorld(copy,faction).campaign.domestic.loyalty[id],81);
 assert.equal(releaseCaptive(s,id,{scheduled:true,faction}),null);assert.equal(s.campaign.domestic.people.some(p=>p.id===id),false);
 // A foreign prison outside our sight has no continuing grant of visibility.
 const other=fixture(faction).s,foreign=other.campaign.idle.find(o=>o.faction===rival&&!isLord(other,o.unit.id,rival));
 foreign.location=city.id;assert.equal(intelligenceWorld(other,faction).campaign.domestic.loyalty[foreign.unit.id],undefined);
});

test('real scouting leaves fixed timed wards which keep live officer information after recall until their last coverage expires',()=>{
 const f=fixture(),{s,home,city,target}=f,actor=scoutCandidates(s,home.id)[0],record=s.campaign.vision.factions.cao;
 assert.equal(dispatchScout(s,home.id,actor.unit.id,city.id),null);const task=scoutAssignment(s,actor.unit.id),first={...record.scouted[0]};
 for(let i=0;i<40&&task.phase!=='watch';i++){
  advanceScouting(s);assert.deepEqual([record.scouted.find(v=>v.id===first.id).x,record.scouted.find(v=>v.id===first.id).y],[first.x,first.y]);
  if(task.phase!=='watch'){finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;}
 }
 assert.equal(task.phase,'watch');assert.ok(record.scouted.length>1);assert.equal(recallScout(s,actor.unit.id),null);
 const wards=JSON.stringify(record.scouted);s.campaign.domestic.loyalty[target.unit.id]=77;
 assert.equal(intelligenceWorld(s).campaign.domestic.loyalty[target.unit.id],77,'left-behind wards keep real-time information');
 assert.equal(JSON.stringify(record.scouted),wards,'reading cannot move or extend wards');
 const until=Math.max(...record.scouted.filter(v=>Math.hypot(v.x-city.x,v.y-city.y)<=36).map(v=>v.expiresDay));
 while(s.campaign.day<until){finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;updateVision(s);}
 assert.equal(cityVisible(s,city.id),false);assert.equal(intelligenceWorld(s).campaign.domestic.loyalty[target.unit.id],undefined);
 assert.ok(s.campaign.vision.factions.cao.cities[city.id].data,'existing city reports survive without granting personnel sight');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(intelligenceWorld(copy).campaign.domestic.loyalty[target.unit.id],undefined);
});

test('one expired ward cannot hide officer details while another ward still covers the city',()=>{
 const {s,city,target}=fixture();observeFixtureCity(s,city.id,'cao',2);observeFixtureCity(s,city.id,'cao',5);
 while(s.campaign.day<3){finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;}updateVision(s);
 assert.equal(intelligenceWorld(s).campaign.domestic.loyalty[target.unit.id],99);
 while(s.campaign.day<6){finishDomesticDay(s);s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;}updateVision(s);
 assert.equal(intelligenceWorld(s).campaign.domestic.loyalty[target.unit.id],undefined);
});

test('subversion approval preserves its target reservation and lost sight cannot charge or replace it',()=>{
 const f=fixture('cao',1),{s,home,city,target}=f;observeFixtureCity(s,city.id,'cao',100);const actor=actorFor(f),a=assignmentFor(s,actor.unit.id);
 for(const o of disaffectionCandidates(s,home))if(o.unit.id!==target.unit.id)s.campaign.domestic.loyalty[o.unit.id]=65;
 setDomesticAutoApprove(s,false);home.budget.goldReserve=home.gold;const gold=home.gold;beginExecution(s);
 assert.equal(a.proposal.pick.key,'disaffect');assert.equal(a.proposal.pick.targetId,target.unit.id);assert.equal(home.gold,gold);
 assert.equal(domesticProposalSummary(s,a).target,target.unit.name);assert.match(domesticProposalSummary(s,a).effect,/降低/);
 assert.equal(disaffectionCandidates(s,home).length,0,'same-faction work cannot reserve the person twice');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s))),other=copy.campaign.domestic.assignments.find(x=>x.id===a.id);
 copy.cities.find(c=>c.id===home.id).budget.goldReserve=0;assert.equal(decideDomesticProposal(copy,other.proposal.id,true),null);assert.equal(copy.cities.find(c=>c.id===home.id).gold,gold-ACTIONS.disaffect.cost);
 assert.equal(other.action.targetId,target.unit.id);assert.ok(servingPeople(copy).get(actor.unit.id).unit.mission);
 home.budget.goldReserve=0;s.campaign.vision.factions.cao.scouted=[];updateVision(s);assert.match(decideDomesticProposal(s,a.proposal.id,true),/目标或办理条件已变/);assert.equal(home.gold,gold);assert.equal(a.action,null);
});

test('foreign subversion cannot reserve a victim against its own reassurance',()=>{
 const f=fixture('cao',1),{s,home,city,target}=f;observeFixtureCity(s,city.id,'cao',100);actorFor(f);
 for(const o of disaffectionCandidates(s,home))s.campaign.domestic.loyalty[o.unit.id]=o.unit.id===target.unit.id?75:65;
 beginExecution(s);for(const o of servingPeople(s).values())if(o.faction===f.rival)s.campaign.domestic.loyalty[o.unit.id]=o.unit.id===target.unit.id?75:100;
 const options=actionCandidates(s,{cityId:city.id,direction:'talent',officerId:target.unit.id,lastKey:null,failures:0});
 assert.ok(options.some(p=>p.key==='reassure'&&p.targetId===target.unit.id));
});
