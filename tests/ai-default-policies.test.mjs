import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {rankOfficerCandidates} from '../officer-recommendation.mjs';
import {strategicCityBudget,manageStrategicEconomy} from '../strategic-ai.mjs';
import {manageTreasuresAI,treasureRecord,treasureOfficerRows,grantTreasure} from '../treasures.mjs';
import {updateCaptives,resolveOfficerLoss,fateRoll,officerLossResult} from '../officer-fates.mjs';
import {servingPeople,factionLord} from '../talent-core.mjs';
import {technologyResearchStaff} from '../technology-research-staff.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import {assignmentFor,ACTIONS} from '../domestic.mjs';
import {beginExecution,validateCampaign} from '../strategic-campaign.mjs';
import {completeTechnologyBuilding} from '../building-durability.mjs';

test('AI fills a second real technology post for a developed advanced project only at turn start',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='xuchang');
 c.gold=10000;c.order=75;c.domestic.techs=['taxation','cultivation','militaryRegistry','efficientConstruction','watchtower'];completeTechnologyBuilding(c,'watchtower',s);
 for(const [key,level]of Object.entries({commerce:2,workshop:3,granary:2,drill:0,farm:1,clinic:0}))setBuildingLevel(c,key,level);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=1000;
 const gold=c.gold;prepareEnemyDomestic(s);assert.equal(technologyResearchStaff(s,c),2);assert.equal(c.gold,gold);
 const technical=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction==='technology');assert.equal(technical.length,2);assert.notEqual(technical[0].officerId,technical[1].officerId);
 s.campaign.ai.lastPlanDay=s.campaign.day;assert.equal(beginExecution(s),null);
 assert.equal(technical.filter(a=>assignmentFor(s,a.officerId).action?.targetId==='militarySupply').length,1);validateCampaign(JSON.parse(serializeCampaign(s)));
 const before=serializeCampaign(s);prepareEnemyDomestic(s);assert.equal(serializeCampaign(s),before);
});

test('AI governor selection uses the shared ranking and excludes queued local officers',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='ye');c.governor=null;
 const excluded=c.units[0].id;s.campaign.domestic.orders.push({officerIds:[excluded]});
 const candidates=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>u.id!==excluded&&!u.mission&&!u.scouting);
 const expected=rankOfficerCandidates(s,candidates,{task:'governor',city:c.id}).find(x=>x.recommendation.available)?.unit.id;
 assert.ok(expected);prepareEnemyDomestic(s);assert.equal(c.governor,expected);assert.notEqual(c.governor,excluded);
});
test('AI budget policy preserves saved city floors and reads forecasts without crediting income',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='ye');
 c.budget.goldReserve=c.gold+1;c.budget.grainReserve=c.grain+1;
 const saved=serializeCampaign(s),measure=strategicCityBudget(s,c);assert.equal(serializeCampaign(s),saved);
 assert.ok(measure.goldNeed>=c.budget.goldReserve);assert.ok(measure.grainNeed>=c.budget.grainReserve);
 const before={budget:structuredClone(c.budget),gold:c.gold,grain:c.grain,manpower:c.manpower,units:structuredClone(c.units)};
 manageStrategicEconomy(s);assert.deepEqual(c.budget,before.budget);assert.equal(c.gold,before.gold);assert.equal(c.grain,before.grain);assert.equal(c.manpower,before.manpower);assert.deepEqual(c.units,before.units);
});
test('AI treasure policy retains an existing lawful equipment choice and never rerolls resources',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='ye'),u=c.units[0];
 const item=treasureRecord(s,'brightArmor');for(const o of treasureOfficerRows(s))if(o.unit.treasureId===item.id)delete o.unit.treasureId;
 Object.assign(item,{state:'treasury',factionId:c.owner,cityId:null,holderId:null});
 assert.equal(grantTreasure(s,item.id,u.id,{faction:'yuan',automatic:true,equip:true}),null);
 const seed=s.seed,resources=s.cities.map(c=>[c.gold,c.grain,c.manpower]),men=treasureOfficerRows(s).map(o=>[o.unit.id,o.unit.troops,o.unit.wounded]);
 manageTreasuresAI(s);assert.equal(item.holderId,u.id);assert.ok(u.treasureIds.includes(item.id));
 assert.equal(s.seed,seed);assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);assert.deepEqual(treasureOfficerRows(s).map(o=>[o.unit.id,o.unit.troops,o.unit.wounded]),men);
});
test('AI captive policy holds a guarded prisoner until lawful release and spends no automatic ransom',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true});let prisoner;
 for(const o of [...servingPeople(s).values()].filter(o=>o.faction==='cao'&&!o.army&&o.unit.id!==factionLord(s,'cao'))){
  resolveOfficerLoss(s,{unit:o.unit,faction:'cao',location:o.location,enemy:'yuan',eventId:Array.from({length:10000},(_,i)=>'hold-policy:'+o.unit.id+':'+i).find(key=>officerLossResult(fateRoll(s,key),'yuan')==='CAPTIVE')});
  prisoner=s.campaign.domestic.people.find(p=>p.id===o.unit.id&&p.status==='CAPTIVE');if(prisoner)break;
 }
 assert.ok(prisoner);const c=s.cities.find(c=>c.owner==='yuan');prisoner.cityId=c.id;delete prisoner.custody;
 const resources=s.cities.map(c=>[c.gold,c.grain,c.manpower]);s.campaign.day+=10;
 updateCaptives(s);assert.ok(s.campaign.domestic.people.includes(prisoner));assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);
 c.owner='cao';updateCaptives(s);assert.ok(!s.campaign.domestic.people.includes(prisoner));
 assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);const released=s.campaign.idle.filter(o=>o.unit.id===prisoner.id);assert.equal(released.length,1);
 updateCaptives(s);assert.equal(s.campaign.idle.filter(o=>o.unit.id===prisoner.id).length,1);
});
