import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIT_DESIGNS as T} from '../data/design/traits.mjs';
import {STRATEGIC_TRAIT_EFFECTS} from '../strategic-traits.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeBuildingDurability} from '../building-durability.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {ACTIONS,TECHS,assignDomestic,dismissDomestic,assignmentFor,beginDomesticTurn,actionCandidates,finishDomesticDay,cancelDomestic,researchDailyRate,setDomesticAutoApprove,decideDomesticProposal} from '../domestic.mjs';
import {workProfile,workDuration} from '../work-traits.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';

function fixture(id){
 const s=peacefulCities(newCampaign(17)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,10000);
 const ids=Array.isArray(id)?id:[id];
 for(const town of s.cities)town.units=town.units.filter(u=>!ids.includes(u.id));for(const a of s.armies)a.units=a.units.filter(u=>!ids.includes(u.id));s.campaign.idle=s.campaign.idle.filter(o=>!ids.includes(o.unit.id));s.campaign.domestic.people=s.campaign.domestic.people.filter(o=>!ids.includes(o.id));
 const units=ids.map(id=>({...makeOfficer(id,2000),homeCity:c.id}));c.units.push(...units);Object.assign(c,{grain:20000,granary:5,commerce:1,farm:1,workshop:1,hall:1});initializeBuildingDurability(c);syncResourceTotals(s);return {s,c,u:units[0]};
}

test('domestic core effects have no handoff prerequisite or implemented handoff effect',()=>{
 assert.ok(!STRATEGIC_TRAIT_EFFECTS.includes('handoff'));
 for(const t of Object.values(T))assert.notEqual(t.strategic?.effect,'handoff');
 for(const id of ['successor','researchHandoff','speakerHandoff']){assert.ok(T[id].work);assert.doesNotMatch(T[id].description,/接任|接手|交接|更换执行/);}
 assert.equal(T.successor.name,'勤政');assert.equal(T.researchHandoff.name,'研习');
});

test('direction-only appointments automatically use normal enhanced work without any predecessor',()=>{
 for(const [id,direction,trait,kind] of [['person-263','commerce','successor','cash'],['person-420','technology','researchHandoff','research'],['person-123','talent','speakerHandoff','hire']]){
  const {s,c,u}=fixture(id);if(direction==='talent')readyTalent(s,c.id);
  assert.equal(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction).length,0);
  assert.equal(assignDomestic(s,c.id,direction,id),null);const a=assignmentFor(s,id),choices=actionCandidates(s,a);assert.ok(choices.length>1);
  const recommendation=officerRecommendation(s,u,{task:'domestic',city:c.id,direction});assert.ok(recommendation.traits.some(t=>t.id===trait));
  beginDomesticTurn(s);assert.ok(a.action,'backend automatically selected an action for '+direction);assert.equal(ACTIONS[a.action.key].kind,kind);assert.ok(a.action.traitIds.includes(trait));
  const def=ACTIONS[a.action.key],profile=workProfile(a.action.traitIds,def,a.action.targetId),ordinaryDays=def.kind==='research'?TECHS[a.action.targetId].days:def.days;
  assert.equal(a.action.remaining,workDuration(ordinaryDays,profile));assert.ok(a.action.remaining<ordinaryDays);
  assert.equal(s.campaign.domestic.events.some(e=>e.cityId===c.id&&['resume','cancel'].includes(e.phase)),false);
  const save=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(save))),save);
 }
});

test('Diligent administration credits real production on the first ordinary appointment',()=>{
 const {s,c}=fixture('person-263');assert.equal(assignDomestic(s,c.id,'commerce','person-263'),null);beginDomesticTurn(s);const a=assignmentFor(s,'person-263'),id=a.action.id,cost=a.action.cost,before=c.gold;
 assert.equal(a.action.key,'fair');assert.equal(a.action.remaining,5);s.campaign.domestic.seed=1;
 for(let i=0;i<5;i++){s.campaign.day++;finishDomesticDay(s);}
 const event=s.campaign.domestic.events.find(e=>e.actionId===id&&e.result.factor!==undefined);assert.ok(event.result.actual>0);assert.equal(c.gold,before+event.result.actual);assert.equal(c.domestic.production.gold,event.result.actual);assert.ok(event.result.traits.includes('successor'));assert.equal(event.result.spent,cost);
});

test('cancelling a discounted purchase refunds only the actual unpaid goods amount',()=>{
 const {s,c}=fixture('person-533');c.grain=1000;for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='agriculture'&&key!=='buy')c.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(s,c.id,'agriculture','person-533'),null);const before=c.gold;beginDomesticTurn(s);const a=assignmentFor(s,'person-533');assert.equal(a.action.key,'buy');const paid=a.action.cost;
 cancelDomestic(s,'person-533');assert.equal(before-c.gold,ACTIONS.buy.cost-300);assert.ok(c.gold-before+paid<=paid);
});

test('engineering research works through direction-only appointment without a selected technology or method',()=>{
 const {s,c}=fixture('person-642');assert.equal(assignDomestic(s,c.id,'technology','person-642'),null);const a=assignmentFor(s,'person-642');
 assert.ok(actionCandidates(s,a).length>1);beginDomesticTurn(s);
 assert.equal(ACTIONS[a.action.key].kind,'research');assert.notEqual(a.action.targetId,'siegeEngineering');assert.ok(a.action.traitIds.includes('liuEngines'));
 assert.equal(workProfile(a.action.traitIds,ACTIONS[a.action.key],a.action.targetId).quantity,1.5);
 assert.equal(T.liuEngines.work.targets,undefined);assert.deepEqual(T.liuEngines.work.actions,Object.keys(ACTIONS).filter(key=>ACTIONS[key].kind==='research'));
 a.action.researchRoll=0;const before=c.domestic.research.progress,type=c.domestic.research.type,rate=researchDailyRate(s,c,a);assert.ok(rate>0);assert.equal(beginExecution(s),null);assert.ok(advanceCampaignDay(s).dayEnded);assert.ok(c.domestic.techs.includes(type)||c.domestic.research?.type===type&&c.domestic.research.progress>before);
 const save=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(save))),save);
});

test('ordinary technology appointments automatically arrange a real research helper in either appointment order',()=>{
 for(const order of [['person-420','person-290'],['person-290','person-420']]){
  const {s,c}=fixture(order);for(const id of order)assert.equal(assignDomestic(s,c.id,'technology',id),null);
  const lead=assignmentFor(s,'person-290'),helper=assignmentFor(s,'person-420');assert.ok(actionCandidates(s,lead).length>1);assert.ok(actionCandidates(s,helper).length>1);
  beginDomesticTurn(s);assert.equal(ACTIONS[lead.action.key].kind,'research');assert.equal(helper.action,null);assert.equal(helper.proposal,null);assert.match(helper.waiting,/协助诸葛亮研究/);assert.deepEqual(actionCandidates(s,helper),[]);
  assert.equal(s.campaign.domestic.events.filter(e=>e.cityId===c.id&&e.phase==='start').length,1);
  lead.action.researchRoll=0;const rate=researchDailyRate(s,c,lead),before=c.domestic.research.progress,type=c.domestic.research.type;assert.ok(rate>0);
  assert.equal(requestStrategicOrder(s,{kind:'assign',cityId:c.id,officerIds:[lead.officerId],direction:'commerce'},'after').queued,true);assert.deepEqual(actionCandidates(s,helper),[]);assert.equal(researchDailyRate(s,c,lead),rate);
  const save=serializeCampaign(s),copy=validateCampaign(JSON.parse(save));assert.equal(serializeCampaign(copy),save);
  assert.equal(dismissDomestic(copy,'person-420'),null);assert.equal(researchDailyRate(copy,copy.cities.find(v=>v.id===c.id),assignmentFor(copy,'person-290'))*2,rate);
  assert.equal(beginExecution(s),null);assert.ok(advanceCampaignDay(s).dayEnded);assert.ok(c.domestic.techs.includes(type)||c.domestic.research?.type===type&&c.domestic.research.progress>before);assert.equal(helper.action,null);assert.equal(helper.proposal,null);
 }
});

test('research helper arrangement respects proposal approval and does not interrupt an existing action',()=>{
 for(const approve of [true,false]){
  const {s,c}=fixture(['person-290','person-420']);setDomesticAutoApprove(s,false);for(const id of ['person-420','person-290'])assignDomestic(s,c.id,'technology',id);
  const gold=c.gold,lead=assignmentFor(s,'person-290'),helper=assignmentFor(s,'person-420');beginDomesticTurn(s);
  assert.equal(ACTIONS[lead.proposal.pick.key].kind,'research');assert.equal(c.gold,gold);assert.equal(c.domestic.research,null);assert.equal(helper.action,null);assert.equal(helper.proposal,null);
  const save=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(save))),save);
  assert.equal(decideDomesticProposal(s,lead.proposal.id,approve),null);assert.equal(helper.action,null);assert.equal(helper.proposal,null);
  if(approve){assert.ok(lead.action);assert.equal(c.gold,gold-lead.action.cost);lead.action.researchRoll=0;assert.ok(researchDailyRate(s,c,lead)>0);}else{assert.equal(c.gold,gold);assert.equal(c.domestic.research,null);assert.ok(actionCandidates(s,helper).length>0);}
 }
 const {s,c}=fixture(['person-420','person-290']);assignDomestic(s,c.id,'technology','person-420');beginDomesticTurn(s);const helper=assignmentFor(s,'person-420'),old=structuredClone(helper.action),gold=c.gold;
 assignDomestic(s,c.id,'technology','person-290');beginDomesticTurn(s);assert.deepEqual(helper.action,old);assert.equal(c.gold,gold-(assignmentFor(s,'person-290').action?.cost||0));
 const save=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(save))),save);
});
