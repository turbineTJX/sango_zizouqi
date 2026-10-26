import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {DIRECTIONS,assignDomestic,assignmentFor,cancelDomestic,removeDomesticOrder,beginDomesticTurn,finishDomesticDay,ACTIONS,reconcileDomestic} from '../domestic.mjs';
import {domesticStaffing,domesticStaffingLimit,expandDomesticStaffing} from '../domestic-staffing.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';
import {newCommand,commandCanAdvance} from '../strategic-command.mjs';
import {campaignOfficers,pickerReason} from '../strategic-roster.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(){const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),ids=cityPersonnel(s,c.id).map(o=>o.unit.id);return {s,c,ids};}
const appoint=(s,c,direction,ids)=>{for(const id of ids)assert.equal(assignDomestic(s,c.id,direction,id),null);};

test('all scenarios start every city with three independent slots per direction',()=>{
 for(const scenario of [undefined,...NATIONAL_SCENARIOS.map(x=>x.id)]){
  const s=newCampaign(7,scenario);for(const c of s.cities){assert.equal(domesticStaffingLimit(c),3);for(const direction of Object.keys(DIRECTIONS))assert.equal(domesticStaffing(s,c.id,direction).remaining,3);}
 }
});

test('each direction caps actual appointments and failed replacement preserves all original work',()=>{
 for(const direction of Object.keys(DIRECTIONS)){
  const {s,c,ids}=fixture();appoint(s,c,direction,ids.slice(0,3));
  const other=Object.keys(DIRECTIONS).find(d=>d!==direction);appoint(s,c,other,[ids[3]]);
  const before=serializeCampaign(s);assert.match(assignDomestic(s,c.id,direction,ids[3]),/上限（3人/);assert.equal(serializeCampaign(s),before);
  assert.equal(assignDomestic(s,c.id,direction,ids[0]),null);assert.equal(serializeCampaign(s),before);
  cancelDomestic(s,ids[0]);assert.equal(assignDomestic(s,c.id,direction,ids[3]),null);assert.equal(domesticStaffing(s,c.id,direction).assigned,3);restore(s);
 }
});

test('batch orders reject the entire overflow before changing appointments or selected work',()=>{
 const {s,c,ids}=fixture();appoint(s,c,'commerce',[ids[0]]);
 const before=serializeCampaign(s),result=requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'commerce',officerIds:ids.slice(1,4)},'now');
 assert.match(result.error,/上限/);assert.equal(serializeCampaign(s),before);
 assert.ok(requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'commerce',officerIds:ids.slice(1,3)},'now').applied);
 assert.equal(domesticStaffing(s,c.id,'commerce').assigned,3);restore(s);
});

test('waiting changes reserve target slots and execute deterministically after real completion',()=>{
 const {s,c,id}=busyFixture(),ids=cityPersonnel(s,c.id).map(o=>o.unit.id).filter(x=>x!==id);
 appoint(s,c,'commerce',ids.slice(0,2));
 assert.equal(requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'commerce',officerIds:[id]},'after').queued,true);
 assert.equal(domesticStaffing(s,c.id,'commerce').reserved,1);assert.equal(domesticStaffing(s,c.id,'technology').assigned,1);
 const before=serializeCampaign(s);assert.match(assignDomestic(s,c.id,'commerce',ids[2]),/上限/);assert.equal(serializeCampaign(s),before);restore(s);
 const copy=restore(s);for(let guard=0;guard<80&&assignmentFor(s,id).direction!=='commerce';guard++)for(const world of [s,copy]){if(world.campaign.phase==='planning')beginExecution(world);advanceCampaignDay(world);}
 assert.equal(assignmentFor(s,id).direction,'commerce');assert.equal(domesticStaffing(s,c.id,'commerce').reserved,0);assert.equal(domesticStaffing(s,c.id,'commerce').assigned,3);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});

test('full target rejection keeps active paid work, queued commands and history untouched',()=>{
 const {s,c,id}=busyFixture(),ids=cityPersonnel(s,c.id).map(o=>o.unit.id).filter(x=>x!==id);
 appoint(s,c,'commerce',ids.slice(0,3));const before=serializeCampaign(s);
 for(const choice of ['now','after',null]){assert.match(requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'commerce',officerIds:[id]},choice).error,/上限/);assert.equal(serializeCampaign(s),before);}
});

test('cancelled and replaced waiting changes release only their target reservation',()=>{
 const {s,c,id}=busyFixture(),ids=cityPersonnel(s,c.id).map(o=>o.unit.id).filter(x=>x!==id);
 appoint(s,c,'commerce',ids.slice(0,2));
 assert.ok(requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'commerce',officerIds:[id]},'after').queued);
 assert.ok(requestStrategicOrder(s,{kind:'assign',cityId:c.id,direction:'agriculture',officerIds:[id]},'after').queued);
 assert.equal(domesticStaffing(s,c.id,'commerce').remaining,1);assert.equal(domesticStaffing(s,c.id,'agriculture').reserved,1);
 removeDomesticOrder(s,s.campaign.domestic.orders[0].id);assert.equal(domesticStaffing(s,c.id,'agriculture').reserved,0);assert.ok(assignmentFor(s,id).action);restore(s);
});

test('completed facility and technology milestones expand all directions independently up to ten',()=>{
 const {s,c}=fixture(),other=s.cities.find(x=>x.id==='chenliu');
 setBuildingLevel(c,'workshop',4);assert.equal(domesticStaffingLimit(c),3);
 setBuildingLevel(c,'workshop',5);assert.equal(domesticStaffingLimit(c),4);
 c.domestic.techs=['taxation','militaryRegistry'];assert.equal(domesticStaffingLimit(c),4);
 c.domestic.techs.push('cultivation');assert.equal(domesticStaffingLimit(c),5);
 for(const key of ['hall','drill','clinic'])setBuildingLevel(c,key,5);
 c.domestic.techs=['taxation','militaryRegistry','cultivation','efficientConstruction','watchtower','towerDefense','militaryMusic','battlefieldMedicine','baier'];
 assert.equal(domesticStaffingLimit(c),10);assert.equal(domesticStaffingLimit(other),3);
 expandDomesticStaffing(c);setBuildingLevel(c,'hall',0);setBuildingLevel(c,'drill',0);setBuildingLevel(c,'clinic',0);setBuildingLevel(c,'workshop',0);
 assert.equal(domesticStaffingLimit(c),10);assert.deepEqual(c.domestic.staffingExpansion,{construction:4,technology:3});
});

test('actual construction completion unlocks its milestone once',()=>{
 const {s,c,ids}=fixture();setBuildingLevel(c,'hall',4);
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',ids[0]),null);beginDomesticTurn(s);assert.equal(assignmentFor(s,ids[0]).action.key,'build_workshop');assert.equal(domesticStaffingLimit(c),3);
 for(let i=0;i<120&&c.workshop===0;i++){finishDomesticDay(s);s.campaign.day++;if((s.campaign.day-1)%10===0)beginDomesticTurn(s);}
 assert.equal(c.workshop,1);assert.equal(domesticStaffingLimit(c),4);assert.equal(c.domestic.staffingExpansion.construction,1);
 reconcileDomestic(s);assert.equal(c.domestic.staffingExpansion.construction,1);
});

test('actual third technology completion expands slots without crediting unfinished research',()=>{
 const {s,c,ids}=fixture();c.domestic.techs=['taxation','cultivation'];
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',ids[0]),null);beginDomesticTurn(s);
 assert.equal(assignmentFor(s,ids[0]).action.key,'research');assert.equal(domesticStaffingLimit(c),3);
 for(let i=0;i<90&&c.domestic.techs.length===2;i++){finishDomesticDay(s);s.campaign.day++;if((s.campaign.day-1)%10===0)beginDomesticTurn(s);}
 assert.equal(c.domestic.techs.length,3);assert.equal(c.domestic.staffingExpansion.technology,1);assert.equal(domesticStaffingLimit(c),4);
});

test('ten appointments are legal in a developed city and eleven are rejected for either controller',()=>{
 for(const allAI of [false,true]){
  const s=newCampaign(7,'heroes-251','cao',{allAI}),c=s.cities.find(c=>c.id==='xuchang'),ids=cityPersonnel(s,c.id).map(o=>o.unit.id);
  for(const key of ['workshop','hall','drill','clinic'])setBuildingLevel(c,key,5);
  c.domestic.techs=['taxation','cultivation','militaryRegistry','efficientConstruction','militarySupply','militaryHouseholds','siegeEngineering','baier','tigerCavalry'];
  for(const id of ids.slice(0,10))assert.equal(assignDomestic(s,c.id,'commerce',id,{scheduled:allAI,faction:c.owner}),null);
  assert.match(assignDomestic(s,c.id,'commerce',ids[10],{scheduled:allAI,faction:c.owner}),/上限（10人/);assert.equal(domesticStaffing(s,c.id,'commerce').assigned,10);restore(s);
 }
});

test('UI and recommendations share vacancies and selected candidates cannot exceed them',()=>{
 const {s,c,ids}=fixture();appoint(s,c,'commerce',ids.slice(0,2));
 const p=newCommand(s,'domestic',c.id,{direction:'commerce'});p.selected=[ids[2]];
 assert.equal(commandCanAdvance(s,p),true);assert.match(pickerReason(s,campaignOfficers(s).find(o=>o.unit.id===ids[3]),p),/上限/);
 p.selected.push(ids[3]);assert.equal(commandCanAdvance(s,p),false);
 appoint(s,c,'commerce',[ids[2]]);assert.equal(officerRecommendation(s,cityPersonnel(s,c.id).find(o=>o.unit.id===ids[3]).unit,{task:'domestic',city:c.id,direction:'commerce'}).available,false);
 assert.match(cityDomesticMarkup(s,c.id),/3 \/ 3 人/);assert.match(cityDomesticMarkup(s,c.id),/disabled[^>]*data-task="domestic"[^>]*data-direction="commerce"/);
});

test('save validation rejects overfilled directions, forged expansion and previous domestic versions',()=>{
 const {s,c,ids}=fixture();appoint(s,c,'commerce',ids.slice(0,3));
 const extra=structuredClone(s.campaign.domestic.assignments[0]);extra.id=s.campaign.domestic.nextId++;extra.officerId=ids[3];s.campaign.domestic.assignments.push(extra);
 assert.throws(()=>restore(s),/人数上限/);s.campaign.domestic.assignments.pop();
 c.domestic.staffingExpansion.construction=5;assert.throws(()=>restore(s),/扩容记录/);c.domestic.staffingExpansion.construction=0;
 c.domestic.staffingExpansion.technology=.5;assert.throws(()=>restore(s),/扩容记录/);c.domestic.staffingExpansion.technology=0;
 s.campaign.domestic.version=24;assert.throws(()=>restore(s),/版本不兼容/);
});

test('staffing design rejects impossible caps and nonintegral expansion thresholds',()=>{
 for(const change of [x=>x.maximum=11,x=>x.buildingLevelsPerSlot=0,x=>x.technologiesPerSlot=1.5]){
  const tables=structuredClone(DESIGN_TABLES);change(tables.domesticStaffing);assert.ok(validateDesignTables(tables).some(x=>x.includes('domesticStaffing')));
 }
});
