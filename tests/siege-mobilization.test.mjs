import test from 'node:test';
import assert from 'node:assert/strict';
import {siegeMobilizationFixture} from './helpers/siege-mobilization.mjs';
import {siegeDefenseCandidates,siegeDefensePlan} from '../siege-defense.mjs';
import {advanceCampaignStep,advanceCampaignDay,activeBattles,prepareAutoSiegeDefense,prepareSiegeUnits,chooseEncounter,needsSiegeDefense,relinquishSiegeDefense,serializeCampaign,validateCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {campaignOfficers,pickerReason,canPrepareSiegeDefense} from '../strategic-roster.mjs';
import {encounterFlowMarkup} from '../military-flow.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn} from '../domestic.mjs';
import {currentDomesticWork} from '../strategic-orders.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {trainingCost} from '../troop-training.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {dispatchScout,scoutTargets} from '../scouting.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {newCommand,commandMarkup,changeCommandUnit,removeCommandUnit,prepareCommandFormation} from '../strategic-command.mjs';
const reload=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const pending=s=>activeBattles(s).find(r=>r.kind==='siege');

test('AI mobilizes real reserves on arrival before empty occupation, without waiting for a new turn',()=>{
 const {s,c,a}=siegeMobilizationFixture();a.cooldownDay=4;
 for(let n=0;n<3;n++){s.campaign.ai.lastPlanDay=s.campaign.day;s.campaign.diplomacy.lastDay=s.campaign.day;advanceCampaignDay(s);}
 s.campaign.ai.lastPlanDay=s.campaign.day;s.campaign.diplomacy.lastDay=s.campaign.day;
 const plan=siegeDefensePlan(s,c.id),before={gold:c.gold,men:c.manpower,drafted:c.drafted};assert.equal(s.campaign.day,4);
 assert.ok(plan.officerIds.length);advanceCampaignStep(s);const r=pending(s);
 assert.equal(c.owner,'yuan');assert.ok(r);assert.equal(r.awaiting,false);assert.equal(r.battle.deploymentLocked,true);
 const guard=s.armies.find(a=>a.defense&&r.armyIds.includes(a.id));assert.ok(guard);
 assert.deepEqual(guard.units.map(u=>u.id),plan.officerIds);assert.deepEqual(Object.fromEntries(guard.units.map(u=>[u.id,u.troops])),plan.troops);
 assert.equal(before.gold-c.gold,plan.gold);assert.equal(before.men-c.manpower,plan.men);assert.equal(c.drafted-before.drafted,plan.men);
 assert.equal(guard.supply,guard.units.length*900);assert.equal(new Set(s.armies.flatMap(a=>a.units.map(u=>u.id))).size,s.armies.reduce((n,a)=>n+a.units.length,0));reload(s);
});

test('human city receives a saved paused council; automatic muster uses the same paid default as AI',()=>{
 const {s,c}=siegeMobilizationFixture({allAI:false}),plan=siegeDefensePlan(s,c.id),gold=c.gold,men=c.manpower;
 assert.deepEqual(advanceCampaignStep(s),{encounter:true});const r=pending(s);assert.ok(needsSiegeDefense(r));
 assert.equal(c.owner,'cao');assert.equal(c.gold,gold);assert.equal(c.manpower,men);assert.equal(s.campaign.day,1);assert.equal(s.campaign.stepInDay,0);
 assert.match(chooseEncounter(s,r.id,false),/先编制/);assert.equal(r.battle.tick,0);assert.equal(r.awaiting,true);
 assert.ok(canPrepareSiegeDefense(s,r));assert.match(encounterFlowMarkup(s,{id:r.id,step:2}).footer,/disabled/);
 const original=serializeCampaign(s),copy=reload(s);assert.equal(serializeCampaign(copy),original);
 for(const world of [s,copy]){assert.deepEqual(advanceCampaignStep(world),{encounter:true});assert.deepEqual(siegeDefensePlan(world,c.id),plan);}
 assert.equal(serializeCampaign(s),original);
 const result=prepareAutoSiegeDefense(s,r.id),same=prepareAutoSiegeDefense(copy,r.id);assert.equal(result.error,undefined);assert.equal(serializeCampaign(result.state),serializeCampaign(same.state));assert.equal(serializeCampaign(s),original);
 assert.equal(result.gold,plan.gold);assert.equal(result.men,plan.men);assert.equal(result.grain,plan.officerIds.length*900);
 const next=result.state,updated=pending(next);assert.equal(needsSiegeDefense(updated),false);assert.equal(updated.awaiting,true);
 assert.deepEqual(next.armies.find(a=>a.defense).units.map(u=>u.id),plan.officerIds);reload(next);
 assert.equal(chooseEncounter(next,r.id,false),null);assert.ok(prepareAutoSiegeDefense(next,r.id).error);
 const saved=reload(next);for(let n=0;n<3;n++){advanceCampaignStep(next);advanceCampaignStep(saved);}assert.equal(serializeCampaign(next),serializeCampaign(saved));reload(next);
});

test('an AI defender also mobilizes against a human attack; actual arriving reinforcements join the same siege',()=>{
 const {s,c,a}=siegeMobilizationFixture({allAI:false,target:'ye'}),plan=siegeDefensePlan(s,c.id);
 const source=s.cities.find(x=>x.id!==c.id&&x.owner===c.owner&&x.units.some(u=>u.troops>0)),help=fieldFromCity(s,source.id);
 help.location=s.roads.find(pair=>pair.includes(c.id)&&!pair.includes(a.location)).find(id=>id!==c.id);help.route=[c.id];help.target=c.id;approachDestination(s,help,0);
 assert.notEqual(help.location,c.id);advanceCampaignStep(s);const r=pending(s),guard=s.armies.find(a=>a.defense);
 assert.equal(c.owner,'yuan');assert.ok(r.awaiting);assert.deepEqual(guard.units.map(u=>u.id),plan.officerIds);
 assert.ok(r.armyIds.includes(help.id));assert.equal(help.location,c.id);
 assert.ok(r.battle.sides[1-r.attackSide].units.some(u=>u.armyId===help.id));reload(s);
 assert.equal(chooseEncounter(s,r.id,false),null);const copy=reload(s);for(const world of [s,copy])advanceCampaignStep(world);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('zero-strength prepared units remain in the city and can be replenished before defense',()=>{
 const {s,c}=siegeMobilizationFixture({allAI:false,zeroPrepared:true}),ids=c.units.map(u=>u.id);
 advanceCampaignStep(s);const r=pending(s);assert.ok(needsSiegeDefense(r));assert.equal(s.armies.some(a=>a.defense),false);
 assert.ok(c.units.every(u=>u.troops===0));assert.ok(canPrepareSiegeDefense(s,r));
 const id=ids[0],row=campaignOfficers(s).find(o=>o.unit.id===id);assert.equal(pickerReason(s,row,{task:'defense',city:c.id}),'');
 const before=serializeCampaign(s),result=prepareSiegeUnits(s,r.id,[id],{},false,{[id]:1000});assert.equal(result.error,undefined);assert.equal(serializeCampaign(s),before);
 assert.equal(result.men,1000);assert.equal(result.gold,trainingCost(row.unit,1000,c));assert.equal(result.grain,900);
 assert.equal(result.state.cities.find(x=>x.id===c.id).units.filter(u=>u.troops===0).length,ids.length-1);reload(result.state);
});

test('manual and automatic muster have identical allocation, cost and garrison results',()=>{
 const {s,c}=siegeMobilizationFixture({allAI:false});advanceCampaignStep(s);const r=pending(s),plan=siegeDefensePlan(s,c.id);
 const manual=prepareSiegeUnits(s,r.id,plan.officerIds,plan.types,false,plan.troops),auto=prepareAutoSiegeDefense(s,r.id);
 assert.equal(manual.error,undefined);assert.equal(serializeCampaign(manual.state),serializeCampaign(auto.state));
 const guard=auto.state.armies.find(a=>a.defense),id=guard.units[0].id,row=campaignOfficers(auto.state).find(o=>o.unit.id===id);
 assert.equal(pickerReason(auto.state,row,{task:'defense',city:c.id}),'','temporary defenders remain selectable before combat');
 const same=prepareSiegeUnits(auto.state,r.id,[id],{},false,{[id]:guard.units[0].troops});assert.equal(same.error,undefined);assert.equal(same.gold,0);assert.equal(same.men,0);assert.equal(same.grain,0);reload(same.state);
});

test('the defense editor lists actual temporary guards and can edit or disband them without spending on preview',()=>{
 const {s,c}=siegeMobilizationFixture({allAI:false});advanceCampaignStep(s);const r=pending(s),next=prepareAutoSiegeDefense(s,r.id).state,guard=next.armies.find(a=>a.defense),id=guard.units[0].id;
 const p={...newCommand(next,'defense',c.id),battleId:r.id},source=serializeCampaign(next);
 assert.match(commandMarkup(next,{officerPick:p}).body,new RegExp(`data-id="${id}"`));
 assert.equal(changeCommandUnit(next,p,id,'troops',1000),null);const edit=prepareCommandFormation(next,p);assert.equal(edit.error,undefined);assert.equal(edit.state.armies.find(a=>a.defense).units[0].troops,1000);
 assert.equal(serializeCampaign(next),source);reload(edit.state);
 const disband={...newCommand(next,'defense',c.id),battleId:r.id};assert.equal(removeCommandUnit(next,disband,id),'');assert.deepEqual(disband.disbandIds,[id]);
 const result=prepareCommandFormation(next,disband);assert.equal(result.error,undefined);assert.equal(result.gold,0);assert.equal(result.men,-guard.units[0].troops);assert.ok(needsSiegeDefense(pending(result.state)));assert.equal(serializeCampaign(next),source);reload(result.state);
});

test('a newly selected resident can change troop count before confirming its initial formation',()=>{
 const {s,c}=siegeMobilizationFixture({allAI:false});advanceCampaignStep(s);const r=pending(s),id=siegeDefensePlan(s,c.id).officerIds[0],p={...newCommand(s,'defense',c.id),battleId:r.id,step:'formation',unitOfficer:id};
 assert.equal(changeCommandUnit(s,p,id,'troops',2000),null);assert.deepEqual(p.selected,[id]);const result=prepareCommandFormation(s,p);assert.equal(result.error,undefined);assert.equal(result.state.armies.find(a=>a.defense).units[0].troops,2000);reload(result.state);
});

test('player may relinquish an unmustered city without a ghost battle, casualties or merit',()=>{
 const {s,c,a}=siegeMobilizationFixture({allAI:false});advanceCampaignStep(s);const r=pending(s),gold=c.gold,men=c.manpower,grain=c.grain;
 assert.equal(relinquishSiegeDefense(s,r.id),null);assert.equal(c.owner,a.faction);assert.equal(c.gold,gold);assert.equal(c.manpower,men);assert.equal(c.grain,grain);
 assert.equal(activeBattles(s).length,0);assert.equal(s.campaign.archive.length,0);assert.equal(a.location,c.id);assert.equal(a.task,'驻守');
 assert.equal(s.armies.some(x=>x.defense),false);assert.ok(relinquishSiegeDefense(s,r.id));reload(s);
});

test('no officers, reserves, treasury, quota, or available wounded capacity still means direct empty occupation',()=>{
 for(const reason of ['officers','reserves','gold','quota','wounded']){
  const {s,c,a}=siegeMobilizationFixture();
  if(reason==='officers'){c.governor=null;for(const o of siegeDefenseCandidates(s,c.id))assert.equal(transferOfficer(s,o.unit.id,'jinyang',{scheduled:true,faction:c.owner}),null);}
  if(reason==='reserves')c.manpower=0;
  if(reason==='gold')c.gold=0;
  if(reason==='quota')c.drafted=2000+c.barracks*1000;
  if(reason==='wounded')for(const o of s.campaign.idle.filter(o=>o.location===c.id&&o.faction===c.owner))o.unit.wounded=troopCapacity(o.unit);
  syncResourceTotals(s);assert.equal(siegeDefensePlan(s,c.id).officerIds.length,0,reason);advanceCampaignStep(s);
  assert.equal(c.owner,a.faction,reason);assert.equal(pending(s),undefined,reason);reload(s);
 }
});

test('muster excludes travelling, foreign and scouting officers and cannot partially spend on invalid requests',()=>{
 const {s,c,a}=siegeMobilizationFixture({allAI:false}),residents=siegeDefenseCandidates(s,c.id);
 const excluded=residents.slice(0,2);c.governor=null;
 assert.equal(transferOfficer(s,excluded[0].unit.id,'chenliu',{scheduled:true}),null);
 assert.equal(dispatchScout(s,c.id,excluded[1].unit.id,scoutTargets(s,c.id)[0].id,{scheduled:true}),null);
 const eligible=siegeDefenseCandidates(s,c.id);assert.ok(excluded.every(o=>!eligible.some(x=>x.unit.id===o.unit.id)));
 advanceCampaignStep(s);const r=pending(s),before=serializeCampaign(s);
 for(const id of [...excluded.map(o=>o.unit.id),a.units[0].id])assert.ok(prepareSiegeUnits(s,r.id,[id],{},false,{[id]:1000}).error);
 assert.equal(serializeCampaign(s),before);reload(s);
});

test('governors and domestic workers may muster; only actual participants interrupt work and retain appointments',()=>{
 const {s,c}=siegeMobilizationFixture(),plan=siegeDefensePlan(s,c.id),id=plan.officerIds[0];
 s.campaign.phase='planning';c.governor=id;assert.equal(assignDomestic(s,c.id,'commerce',id,{faction:c.owner}),null);
 beginDomesticTurn(s);const appointment=assignmentFor(s,id);assert.ok(appointment);const action=appointment.action;assert.ok(action,'real paid domestic work started');
 s.campaign.phase='executing';s.campaign.ai.lastPlanDay=s.campaign.day;advanceCampaignStep(s);
 const r=pending(s);assert.ok(r);assert.ok(s.armies.find(a=>a.defense).units.some(u=>u.id===id));
 assert.equal(c.governor,id);assert.equal(assignmentFor(s,id).direction,'commerce');assert.equal(assignmentFor(s,id).action,null);assert.equal(currentDomesticWork(s,id),null);
 assert.ok(s.campaign.domestic.events.some(e=>e.phase==='cancel'&&e.text.includes('参加守城')));reload(s);
});
