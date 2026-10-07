import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,cityIncome} from '../strategic-campaign.mjs';
import {buildingLimit,localBuildingLimit,canExpandBuilding,metropolitanMembers} from '../metropolitan-areas.mjs';
import {cityWorkLimit,cityWorkRemaining,resourceValue} from '../economy.mjs';
import {assignDomestic,ACTIONS,reconcileDomestic} from '../domestic.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';

test('small cities, rich centers and large metropolises have different physical development ceilings',()=>{
 const s=newCampaign(417,'guandu-200'),city=id=>s.cities.find(c=>c.id===id);
 for(const key of ['commerce','farm','barracks']){
  assert.equal(buildingLimit(s,city('town-1'),key),2);
  assert.equal(buildingLimit(s,city('xuchang'),key),6);
  assert.equal(buildingLimit(s,city('town-31'),key),12);
 }
 const big=city('jinyang'),small=metropolitanMembers(s,big).find(n=>n.citySize==='small');
 assert.equal(localBuildingLimit(s,big,'farm',small.id),2);
 assert.ok(canExpandBuilding(s,big,'farm',small.id));
 big.farm++;big.domestic.buildingSites.farm.push(small.id);
 assert.ok(!canExpandBuilding(s,big,'farm',small.id),'the native small-city farm and external farm share one physical limit');
 assert.equal(localBuildingLimit(s,big,'walls',small.id),0);
 const d=structuredClone(DESIGN_TABLES);d.economy.development.richCities.push('missing');
 assert.ok(validateDesignTables(d).some(e=>e.includes('richCities')));
});

test('many actual cash workers share a saved turn allowance and continuation cannot restore spent output',()=>{
 const s=newCampaign(911,'heroes-251'),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,30000);c.commerce=1;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=10000;
 const people=cityPersonnel(s,c.id).slice(0,8);assert.ok(people.length>=4);
 for(const p of people)assert.equal(assignDomestic(s,c.id,'commerce',p.unit.id),null);
 assert.equal(beginExecution(s),null);
 for(let i=0;i<4;i++)advanceCampaignDay(s);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 while(s.campaign.day<11){advanceCampaignDay(s);advanceCampaignDay(restored);assert.equal(serializeCampaign(s),serializeCampaign(restored));}
 assert.equal(c.domestic.production.gold,cityWorkLimit(s,c,'gold'));
 assert.ok(s.campaign.activity.nodes.filter(e=>e.category==='domestic'&&e.cityId===c.id&&e.key==='fair'&&['complete','failure'].includes(e.phase)).length>=4);
 // Viewing the following month's unused allowance does not rewrite history.
 const before=serializeCampaign(s);assert.equal(cityWorkRemaining(s,c,'gold'),cityWorkLimit(s,c,'gold'));assert.match(cityDomesticMarkup(s,c.id),/本旬额外内政产能剩余.*多人共用/);assert.equal(serializeCampaign(s),before);
});

test('disrupted external farms stop income and conquest transfers facilities without duplicating productivity',()=>{
 const s=newCampaign(417,'guandu-200'),c=s.cities.find(c=>c.id==='jinyang'),small=metropolitanMembers(s,c).find(n=>n.citySize==='small');c.governor=null;
 c.farm=2;c.domestic.buildingSites.farm=[small.id];const before=cityIncome(s,c).grain;
 small.owner='cao';assert.equal(cityIncome(s,c).grain,before-ECONOMY_RULES.income.grain.perFarm);
 reconcileDomestic(s);assert.equal(c.farm,1);assert.equal(small.farm,2);
 assert.equal(c.farm+small.farm,3);assert.equal(cityIncome(s,c).grain,before-ECONOMY_RULES.income.grain.perFarm);
 const poor=s.cities.find(c=>c.id==='town-1'),rich=s.cities.find(c=>c.id==='xuchang');
 for(const key of ['commerce','farm','barracks']){poor[key]=buildingLimit(s,poor,key);rich[key]=buildingLimit(s,rich,key);}
 const value=x=>resourceValue(cityIncome(s,x))+resourceValue(Object.fromEntries(['gold','grain','manpower'].map(k=>[k,cityWorkLimit(s,x,k)])));
 assert.ok(value(rich)>value(poor)*2,'richness must survive equally numerous hypothetical workers at the throughput ceiling');
});
