import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {makeOfficer} from '../engine.mjs';
import {lordCity,assignDiplomat,diplomaticRoute,prepareDiplomaticProposal,diplomaticOfficerCandidates} from '../diplomacy.mjs';
import {diplomaticRate} from '../diplomatic-traits.mjs';
import {diplomaticDay,untilDiplomatic} from './helpers/diplomacy-campaign.mjs';
import {diplomacyMarkup} from '../diplomacy-view.mjs';
import {cancelDomestic} from '../domestic.mjs';

test('a trait envoy pays the discounted real fee, travels, advances faster and still needs final approval',()=>{
 const s=newCampaign(281,'guandu-200');fundCities(s,9000);const id='person-123',source=lordCity(s,'cao'),target=lordCity(s,'sunce');
 cancelDomestic(s,id);for(const c of s.cities)c.units=c.units.filter(u=>u.id!==id);for(const a of s.armies)a.units=a.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(o=>o.id!==id);
 const unit={...makeOfficer(id,0),homeCity:source.id};source.units.push(unit);
 assert.ok(assignDiplomat(s,id,'friendship',{choice:'now'}).applied);const a=s.campaign.diplomacy.assignments.find(a=>a.officerId===id),path=diplomaticRoute(s,source.id,target.id,'cao','sunce');assert.ok(path?.length);
 const gold=source.gold,p=prepareDiplomaticProposal(s,a,{goal:'friendship',other:'sunce',clauses:[{kind:'gold',from:'cao',to:'sunce',amount:150,gift:true}],path,targetCity:target.id,score:60,reason:'trait mechanism fixture'});
 assert.ok(p);assert.equal(gold-source.gold,50);assert.equal(p.expenses.cao,50);assert.equal(p.progress,0);assert.equal(p.status,'outbound');
 untilDiplomatic(s,()=>p.status==='negotiating');assert.equal(unit.mission.location,target.id);assert.ok(s.campaign.day>p.createdDay);
 const before=p.progress,rate=diplomaticRate(unit,'friendship'),copy=validateCampaign(JSON.parse(serializeCampaign(s)));diplomaticDay(s);diplomaticDay(copy);
 assert.equal(p.progress-before,rate);assert.equal(serializeCampaign(s),serializeCampaign(copy));
 untilDiplomatic(s,()=>p.status==='pending');assert.equal(p.approvals.cao,undefined);assert.equal(s.campaign.diplomacy.contracts.some(c=>c.id===p.id),false);
});
test('diplomatic candidates and the existing chooser include applicable traits without changing state',()=>{
 const s=newCampaign(281,'guandu-200'),before=serializeCampaign(s),html=diplomacyMarkup(s);
 for(const direction of ['friendship','commerce','negotiation'])for(const o of diplomaticOfficerCandidates(s,'cao',direction))assert.ok(Number.isFinite(o.score));
 assert.equal(serializeCampaign(s),before);assert.ok(html.includes('办理×')||!diplomaticOfficerCandidates(s,'cao','friendship').some(o=>['person-123','person-487'].includes(o.unit.id)));
});
