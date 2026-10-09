import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {rankOfficerCandidates} from '../officer-recommendation.mjs';
import {strategicCityBudget,manageStrategicEconomy} from '../strategic-ai.mjs';
import {manageTreasuresAI,treasureRecord,treasureOfficerRows,grantTreasure} from '../treasures.mjs';
import {updateCaptives,resolveOfficerLoss} from '../officer-fates.mjs';
import {servingPeople,factionLord} from '../talent-core.mjs';

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
 Object.assign(item,{state:'city',cityId:c.id,holderId:null});
 assert.equal(grantTreasure(s,item.id,u.id,{faction:'yuan',automatic:true,equip:true}),null);
 const seed=s.seed,resources=s.cities.map(c=>[c.gold,c.grain,c.manpower]),men=treasureOfficerRows(s).map(o=>[o.unit.id,o.unit.troops,o.unit.wounded]);
 manageTreasuresAI(s);assert.equal(item.holderId,u.id);assert.equal(u.treasureId,item.id);
 assert.equal(s.seed,seed);assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);assert.deepEqual(treasureOfficerRows(s).map(o=>[o.unit.id,o.unit.troops,o.unit.wounded]),men);
});
test('AI captive policy holds a guarded prisoner until lawful release and spends no automatic ransom',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true});let prisoner;
 for(const o of [...servingPeople(s).values()].filter(o=>o.faction==='cao'&&!o.army&&o.unit.id!==factionLord(s,'cao'))){
  resolveOfficerLoss(s,{unit:o.unit,faction:'cao',location:o.location,enemy:'yuan',eventId:'hold-policy:'+o.unit.id});
  prisoner=s.campaign.domestic.people.find(p=>p.id===o.unit.id&&p.status==='CAPTIVE');if(prisoner)break;
 }
 assert.ok(prisoner);const c=s.cities.find(c=>c.owner==='yuan');prisoner.cityId=c.id;delete prisoner.custody;
 const resources=s.cities.map(c=>[c.gold,c.grain,c.manpower]);s.campaign.day+=10;
 updateCaptives(s);assert.ok(s.campaign.domestic.people.includes(prisoner));assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);
 c.owner='cao';updateCaptives(s);assert.ok(!s.campaign.domestic.people.includes(prisoner));
 assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);const released=s.campaign.idle.filter(o=>o.unit.id===prisoner.id);assert.equal(released.length,1);
 updateCaptives(s);assert.equal(s.campaign.idle.filter(o=>o.unit.id===prisoner.id).length,1);
});
