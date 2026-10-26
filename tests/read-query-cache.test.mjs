import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipInfo,relationshipScore,relationshipKey} from '../relationships.mjs';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {servingPeople,withServingPeopleQueries} from '../talent-core.mjs';
import {intelligenceWorld,cityVisible} from '../strategic-vision.mjs';
import {withRoadQueries,cityRoads,adjacentCityPath} from '../road-network.mjs';
import {cityBudget,cityGoldCommitment,withCityBudgetQueries} from '../city-budget.mjs';
import {citySupplyBudgets,forecastArmySupply,withCitySupplyQueries} from '../city-logistics.mjs';
import {actionCandidates,withDomesticCandidateQueries} from '../domestic.mjs';
import {diplomaticProtection,factionsAllied,withDiplomaticQueries} from '../diplomacy-relations.mjs';

test('catalogue relationship indexing keeps returned arrays detached and saved scores and types live',()=>{
 const scores={},types={},key=relationshipKey('cao','dian'),initial=relationshipInfo('cao','dian',scores,types);
 initial.sourceTypes.push('spouse');assert.ok(!relationshipInfo('cao','dian').sourceTypes.includes('spouse'));
 for(const [type,score]of [['ordinary',50],['friendly',65],['disliked',0]]){types[key]=type;scores[key]=score;assert.equal(relationshipScore('cao','dian',scores,types),score);assert.equal(relationshipInfo('cao','dian',scores,types).score,score);}
 delete scores[key];assert.equal(relationshipScore('cao','dian',scores,types),20);assert.equal(relationshipKey('dian','cao'),key);
});

test('person query scopes isolate fog perspectives, leave state untouched and expire after moves or throws',()=>{
 const s=newCampaign(217,'guandu-200'),hidden=s.cities.find(c=>c.owner==='yuan'&&c.units.length&&!cityVisible(s,c.id,'cao')),id=hidden.units[0].id,before=serializeCampaign(s);
 withServingPeopleQueries(()=>{const root=servingPeople(s),own=intelligenceWorld(s,'cao'),enemy=intelligenceWorld(s,'yuan');assert.equal(servingPeople(s),root);assert.ok(root.has(id));assert.ok(!servingPeople(own).has(id));assert.ok(servingPeople(enemy).has(id));});assert.equal(serializeCampaign(s),before);
 const city=s.cities.find(c=>c.owner==='cao'&&c.units.length),unit=city.units.shift(),target=s.cities.find(c=>c.owner==='cao'&&c.id!==city.id);target.units.push(unit);
 assert.equal(withServingPeopleQueries(()=>servingPeople(s)).get(unit.id).location,target.id);
 assert.throws(()=>withServingPeopleQueries(()=>{servingPeople(s);throw Error('closed');}),/closed/);
 target.units.pop();city.units.unshift(unit);assert.equal(servingPeople(s).get(unit.id).location,city.id);
});

test('public road queries may share geometry across fog views while returning detached paths',()=>{
 const s=newCampaign(217,'guandu-200'),[a,b]=cityRoads(s)[0],expected=adjacentCityPath(s,a,b),before=serializeCampaign(s);
 withRoadQueries(s,()=>{for(const faction of ['cao','yuan']){const view=intelligenceWorld(s,faction);assert.deepEqual(adjacentCityPath(view,a,b),expected);adjacentCityPath(view,a,b).pop();assert.deepEqual(adjacentCityPath(view,a,b),expected);}});
 assert.equal(serializeCampaign(s),before);
});

test('budget scopes distinguish counterfactual cities and supply forecasts and detach their results',()=>{
 const s=newCampaign(217,'guandu-200'),c=s.cities.find(c=>c.owner==='cao'),supplies=citySupplyBudgets(s),forecast=forecastArmySupply(s,{supplies}),options={supplies,supplyForecast:forecast,includeWork:false};
 const expected=cityBudget(s,c,options),gold=cityGoldCommitment(s,c),other=structuredClone(forecast);other.cities[c.id].grain+=100;
 const counterfactual=cityBudget(s,c,{...options,supplyForecast:other}),clone={...c,gold:c.gold+123},cloneExpected=cityBudget(s,clone,options),before=serializeCampaign(s);
 withCityBudgetQueries(()=>{assert.deepEqual(cityBudget(s,c,options),expected);cityBudget(s,c,options).stocks.gold=0;assert.deepEqual(cityBudget(s,c,options),expected);assert.deepEqual(cityBudget(s,c,{...options,supplyForecast:other}),counterfactual);assert.deepEqual(cityBudget(s,clone,options),cloneExpected);assert.deepEqual(cityGoldCommitment(s,c),gold);});assert.equal(serializeCampaign(s),before);
 assert.throws(()=>withCityBudgetQueries(()=>{cityBudget(s,c,options);throw Error('closed');}),/closed/);c.gold+=1;assert.equal(cityBudget(s,c,options).stocks.gold,c.gold);
});

test('domestic candidate scopes keep synthetic assignment identity and detached picks',()=>{
 const s=newCampaign(217,'guandu-200'),c=s.cities.find(c=>c.owner==='cao'&&c.units.length),a={cityId:c.id,officerId:c.units[0].id,direction:'commerce',lastKey:null,failures:0};
 const expected=actionCandidates(s,a),before=serializeCampaign(s);
 withDomesticCandidateQueries(()=>{assert.deepEqual(actionCandidates(s,a),expected);const picks=actionCandidates(s,a);if(picks.length)picks[0].score=-999;picks.push({key:'private'});assert.deepEqual(actionCandidates(s,a),expected);assert.deepEqual(actionCandidates(s,structuredClone(a)),expected);});assert.equal(serializeCampaign(s),before);
 assert.throws(()=>withDomesticCandidateQueries(()=>{actionCandidates(s,a);throw Error('closed');}),/closed/);c.gold=0;assert.deepEqual(withDomesticCandidateQueries(()=>actionCandidates(s,a)),actionCandidates(s,a));
});

test('supply query families keep projected worlds separate and release all caches on invalid input',()=>{
 const s=newCampaign(217,'guandu-200'),views=['cao','yuan'].map(f=>intelligenceWorld(s,f)),expected=views.map(v=>citySupplyBudgets(v));
 withCitySupplyQueries(s,()=>{for(const [i,view]of views.entries()){assert.deepEqual(citySupplyBudgets(view),expected[i]);assert.equal(citySupplyBudgets(view),citySupplyBudgets(view));}assert.notEqual(citySupplyBudgets(views[0]),citySupplyBudgets(views[1]));});
 assert.throws(()=>withCitySupplyQueries(null,()=>{}));assert.notEqual(citySupplyBudgets(s),citySupplyBudgets(s));
});

test('live treaty queries preserve contract identity, separate worlds and expire on day changes or exceptions',()=>{
 const clause={kind:'alliance',from:'cao',to:'yuan',status:'active',effectiveDay:2,untilDay:5};
 const contract={status:'signed',factions:['cao','yuan'],clauses:[clause]};
 const s={campaign:{day:5,diplomacy:{contracts:[contract]}}},other=structuredClone(s);other.campaign.diplomacy.contracts[0].status='cancelled';
 withDiplomaticQueries(()=>{const found=diplomaticProtection(s,'cao','yuan');assert.equal(found.p,contract);assert.equal(found.c,clause);assert.equal(factionsAllied(s,'cao','yuan'),true);assert.equal(diplomaticProtection(other,'cao','yuan'),undefined);});
 s.campaign.day=6;assert.equal(withDiplomaticQueries(()=>diplomaticProtection(s,'cao','yuan')),undefined);
 s.campaign.day=5;assert.throws(()=>withDiplomaticQueries(()=>{diplomaticProtection(s,'cao','yuan');throw Error('closed');}),/closed/);
 clause.status='expired';assert.equal(withDiplomaticQueries(()=>factionsAllied(s,'cao','yuan')),false);
});
