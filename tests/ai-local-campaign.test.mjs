import test from 'node:test';
import assert from 'node:assert/strict';
import * as scenarios from '../national-scenarios.mjs';
import * as roads from '../road-network.mjs';
import * as officers from '../officer-catalog.mjs';
import {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {openingCityResources} from '../city-resources.mjs';
import {LOCAL_CASES,buildLocalCampaignInput} from '../scripts/ai-validation/local-campaign-cases.mjs';
import {assessLocalLoop} from '../scripts/ai-validation/local-campaign.mjs';
const api={...scenarios,...roads,...officers};

test('local campaign inputs preserve original roads and default resources while keeping all AI and ordinary fog',()=>{
 const original=JSON.stringify(scenarios.nationalWorld('guandu-200')),menu=scenarios.NATIONAL_SCENARIOS.map(s=>s.id);
 for(const c of LOCAL_CASES){
  const input=buildLocalCampaignInput(api,c.id,{suffix:'test-default'}),id=scenarios.registerCampaignAuditScenario(input),s=newCampaign(417,id,'cao',{allAI:true});
  assert.equal(s.cities.length,c.id==='four-cities'?4:6);assert.equal(s.campaign.domestic.incidents.enabled,true);
  assert.equal(s.campaign.allAI,true);assert.equal(s.turn,1);assert.equal(s.campaign.day,1);
  assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
  for(const city of s.cities){const opening=openingCityResources(city);assert.equal(city.gold,opening.gold);assert.equal(city.manpower,opening.manpower);assert.ok(city.grain>=opening.grain);assert.equal(city.units.length,3);assert.ok(city.units.every(u=>u.troops===2500));}
  assert.ok(Object.values(s.campaign.ai.factions).every(p=>p.strategy.victory.totalCities===s.cities.length));
  const activeTalent=s.campaign.domestic.people.filter(p=>p.status!=='EXCLUDED');assert.ok(activeTalent.every(p=>input.talentIds.includes(p.id)));
  input.world.cities[0].name='mutated';assert.notEqual(scenarios.nationalWorld(id).cities[0].name,'mutated');
 }
 assert.deepEqual(scenarios.NATIONAL_SCENARIOS.map(s=>s.id),menu);assert.equal(JSON.stringify(scenarios.nationalWorld('guandu-200')),original);
});
test('local registry rejects overwrites, fabricated shortcuts, missing rulers and disconnected cities',()=>{
 for(const [i,mutate]of [x=>x.spec.id='guandu-200',x=>x.world.roadSegments[Object.keys(x.world.roadSegments)[0]].distance=1,
  x=>x.roster=x.roster.filter(o=>o.id!=='cao'),x=>x.world.roads.push([x.world.cities[0].id,x.world.cities.at(-1).id])].entries()){
  const input=buildLocalCampaignInput(api,'four-cities',{suffix:'bad-'+i});mutate(input);assert.throws(()=>scenarios.registerCampaignAuditScenario(input));
 }
 const input=buildLocalCampaignInput(api,'four-cities',{suffix:'unique'});scenarios.registerCampaignAuditScenario(input);assert.throws(()=>scenarios.registerCampaignAuditScenario(input));
});
test('local maps use unchanged save validation and deterministic actual daily AI decisions',()=>{
 const input=buildLocalCampaignInput(api,'four-cities',{suffix:'continuation'}),id=scenarios.registerCampaignAuditScenario(input),s=newCampaign(643,id,'cao',{allAI:true});
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(let i=0;i<12;i++){const before=s.campaign.day;advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(s.campaign.day,before+1);assert.equal(serializeCampaign(s),serializeCampaign(copy));}
 assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
 const invalid=JSON.parse(serializeCampaign(s));invalid.campaign.scenarioId='audit-local-unregistered';assert.throws(()=>validateCampaign(invalid));
 const shortened=JSON.parse(serializeCampaign(s));shortened.roadSegments[Object.keys(shortened.roadSegments)[0]].distance=1;assert.throws(()=>validateCampaign(shortened),/路网/);
});

test('a local victory alone cannot impersonate the conquest and reinvestment loop',()=>{
 const input={winner:'cao',captures:[{day:40,city:'one',from:'yuan',to:'cao'},{day:90,city:'two',from:'yuan',to:'cao'}],
  departures:[{day:60,faction:'cao',target:'two'}],battles:[{factions:['cao','yuan']}],
  reinvestment:[{day:50,cityId:'one',faction:'cao'}],cityless:[{day:90,faction:'yuan'}]};
 assert.equal(assessLocalLoop(input).status,'observed');assert.equal(assessLocalLoop(input).nationwideUnification,'not-assessed');
 const partial=assessLocalLoop({...input,winner:null});assert.equal(partial.status,'not-established');assert.equal(partial.checks.firstConquest,true);assert.equal(partial.checks.conqueredCityUsed,true);assert.equal(partial.checks.localUnification,false);
 for(const change of [{winner:null},{departures:[]},{battles:[]},{reinvestment:[]},{cityless:[]},
  {departures:[{day:20,faction:'cao',target:'two'}]},
  {captures:[input.captures[0],{...input.captures[1],city:'one'}]},
  {reinvestment:[{day:20,cityId:'one',faction:'cao'}]}])assert.equal(assessLocalLoop({...input,...change}).status,'not-established');
});
