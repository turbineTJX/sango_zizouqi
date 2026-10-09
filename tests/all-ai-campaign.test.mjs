import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,advanceCampaignDay,activeBattles,serializeCampaign,validateCampaign,setObserverFaction,takeOverBattle,chooseEncounter} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {pendingDomesticProposals} from '../domestic.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {isAIControlled,isPlayerControlled} from '../player-faction.mjs';
import {nationalLobby} from '../national-lobby.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {canOccupy} from '../battlefield.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
test('all seven ordinary scenarios expose every faction to AI, including the viewing faction',()=>{
 for(const spec of NATIONAL_SCENARIOS){const s=newCampaign(81,spec.id,'cao',{allAI:true});
  assert.deepEqual(Object.keys(s.campaign.ai.factions).sort(),[...spec.factions].sort());
  assert.ok(spec.factions.every(f=>isAIControlled(s,f)&&!isPlayerControlled(s,f)));
  assert.equal(restore(s).campaign.allAI,true);
 }
 assert.throws(()=>newCampaign(1,null,'cao',{allAI:true}),/天下剧本/);
 const player=newCampaign(81,'guandu-200');assert.equal(isPlayerControlled(player,'cao'),true);assert.equal(isAIControlled(player,'cao'),false);
 assert.match(nationalLobby(null,{step:'faction',scenarioId:'guandu-200',faction:'cao',allAI:true}),/开始观战/);
});
test('observation crosses turns without approvals and resumes deterministically from its current save',()=>{
 const s=newCampaign(91,'guandu-200','cao',{allAI:true});
 for(let i=0;i<11;i++){const day=s.campaign.day;advanceCampaignDay(s);assert.equal(s.campaign.day,day+1);assert.equal(pendingDomesticProposals(s).length,0);}
 assert.ok(s.campaign.domestic.assignments.some(a=>s.cities.find(c=>c.id===a.cityId).owner==='cao'));
 const saved=serializeCampaign(s),copy=restore(s);assert.equal(serializeCampaign(copy),saved);
 for(const x of [s,copy])advanceCampaignDay(x);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 assert.match(requestStrategicOrder(s,{kind:'dismiss',cityId:'xuchang',officerIds:['cao']}).error,/全 AI/);
});
test('switching the observation changes totals and perspective without changing AI, resources or RNG',()=>{
 const s=newCampaign(71,'guandu-200','cao',{allAI:true});advanceCampaignDay(s);
 const before=structuredClone({seed:s.seed,cities:s.cities,armies:s.armies,ai:s.campaign.ai,diplomacy:s.campaign.diplomacy,domestic:s.campaign.domestic,vision:s.campaign.vision,treasures:s.campaign.treasures});
 assert.equal(setObserverFaction(s,'yuan'),null);
 assert.deepEqual({seed:s.seed,cities:s.cities,armies:s.armies,ai:s.campaign.ai,diplomacy:s.campaign.diplomacy,domestic:s.campaign.domestic,vision:s.campaign.vision,treasures:s.campaign.treasures},before);
 assert.equal(s.gold,s.cities.filter(c=>c.owner==='yuan').reduce((n,c)=>n+c.gold,0));restore(s);
});
test('actual observation encounters use autonomous sides, do not open human councils, and cannot be taken over',()=>{
 const s=newCampaign(31,'guandu-200','cao',{allAI:true}),a=fieldFromCity(s,'xuchang');
 const edge=s.roads.find(pair=>pair.includes('ye'));a.location=edge.find(id=>id!=='ye');a.route=['ye'];a.target='ye';approachDestination(s,a,0);
 s.campaign.ai.lastPlanDay=s.campaign.day;advanceCampaignDay(s);
 const r=activeBattles(s).find(r=>r.armyIds.includes(a.id));assert.ok(r);
 assert.equal(r.awaiting,false);assert.equal(r.battle.deploymentLocked,true);assert.equal(r.control,'auto');assert.equal(r.battle.reinforcementCouncil,null);
 assert.equal(r.attackSide,0);assert.equal(r.battle.sides[0].faction,'cao');
 assert.match(takeOverBattle(s,r.id),/全 AI/);assert.match(chooseEncounter(s,r.id,true),/全 AI/);
 const active=r.battle.sides.flatMap(side=>side.units).filter(u=>u.status==='active');
 assert.ok(active.every(u=>canOccupy(r.battle,u,u.x,u.y)));assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);
 const copy=restore(s);for(const x of [s,copy])advanceCampaignDay(x);assert.equal(serializeCampaign(copy),serializeCampaign(s));
});
test('observer extinction does not end the world, but a single ruler owning all cities does',()=>{
 const s=newCampaign(41,'guandu-200','cao',{allAI:true});s.armies=[];for(const c of s.cities.filter(c=>c.owner==='cao'))c.owner='yuan';advanceCampaignDay(s);assert.equal(s.finished,null);assert.equal(s.campaign.day,2);
 const unified=newCampaign(41,'guandu-200','cao',{allAI:true});unified.armies=[];for(const c of unified.cities)c.owner='yuan';advanceCampaignDay(unified);assert.equal(unified.finished,'victory');
});
