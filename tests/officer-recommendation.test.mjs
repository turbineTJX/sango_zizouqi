import {assignDomestic,beginDomesticTurn,assignmentFor} from '../domestic.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {rankOfficerCandidates,officerRecommendation} from '../officer-recommendation.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {campaignRosterMarkup} from '../strategic-roster.mjs';
const scene=()=>newCampaign(42,'heroes-251');
test('commerce and agriculture match actor traits rather than governor-only income skills',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang');c.commerce=5;c.farm=5;c.granary=5;c.grain=10000;s.gold=2500;
 const units=['person-533','person-107'].map(id=>s.cities.flatMap(c=>cityPersonnel(s,c.id)).find(o=>o.unit.id===id).unit);
 for(const u of units){for(const other of s.cities)other.units=other.units.filter(v=>v.id!==u.id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==u.id);s.campaign.idle.push({unit:u,faction:'cao',location:c.id,destination:null});Object.assign(u,{politics:80,charm:80,intellect:80,leadership:80,personality:1});}
 const commerce=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction:'commerce'}),agriculture=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction:'agriculture'});
 assert.equal(commerce[0].unit.id,'person-533');assert.equal(agriculture[0].unit.id,'person-107');assert.ok(commerce[0].recommendation.traits.some(t=>t.id==='merchant'));assert.ok(!commerce[0].recommendation.traits.some(t=>t.id==='wealth'));assert.ok(officerRecommendation(s,units[0],{task:'governor',city:c.id}).traits.some(t=>t.id==='wealth'));
});
test('recommendation reads and roster rendering do not mutate saves or draw random numbers',()=>{
 const s=scene(),p={task:'domestic',city:'xuchang',direction:'agriculture',selected:[]},before=serializeCampaign(s),units=cityPersonnel(s,p.city).map(o=>o.unit),ranked=rankOfficerCandidates(s,units,p),html=campaignRosterMarkup(s,{personnel:{city:p.city}},p);
 assert.ok(html.includes('任务推荐'));assert.ok(ranked.some(r=>r.recommendation.traits.some(t=>t.name==='农政')));assert.equal(html.match(/data-personnel-choice="([^"]+)"/)[1],ranked[0].unit.id);assert.equal(serializeCampaign(s),before);assert.deepEqual(rankOfficerCandidates(s,units,p),ranked);
});
test('AI uses the same scores for vacant jobs, preserves existing assignments, and appoints each actor once',()=>{
 const s=scene(),c=s.cities.find(c=>!['cao','neutral'].includes(c.owner)),units=cityPersonnel(s,c.id).map(o=>o.unit),pairs=['commerce','agriculture','technology','military','martial','talent'].flatMap(direction=>rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction}).filter(x=>x.recommendation.available).map(x=>({...x,direction}))).sort((a,b)=>b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id)||a.direction.localeCompare(b.direction));
 assert.ok(pairs.length);prepareEnemyDomestic(s);const assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id);assert.equal(assignments[0].officerId,pairs[0].unit.id);assert.equal(assignments[0].direction,pairs[0].direction);assert.equal(new Set(assignments.map(a=>a.officerId)).size,assignments.length);assert.ok(new Set(s.campaign.domestic.assignments.map(a=>a.direction)).size===6);const first=structuredClone(assignments);prepareEnemyDomestic(s);assert.deepEqual(s.campaign.domestic.assignments.filter(a=>first.some(b=>b.id===a.id)),first);
});
test('transport recommendation uses actual transport speed and compilation does not penalize domestic duties',()=>{
 const s=scene(),u=s.cities.flatMap(c=>cityPersonnel(s,c.id)).find(o=>o.unit.id==='person-533').unit,p={task:'transfer',city:'xuchang',cargo:{grain:100,manpower:0}};assert.equal(officerRecommendation(s,u,p).score,120);
 const before=officerRecommendation(s,u,{task:'draft',city:'xuchang'}).score;s.campaign.domestic.assignments.push({officerId:u.id,cityId:'xuchang',direction:'commerce',action:{remaining:8}});assert.equal(officerRecommendation(s,u,{task:'draft',city:'xuchang'}).score,before);
});
test('AI fills a vacant governorship using the same governor recommendation',()=>{
 const s=scene(),c=s.cities.find(c=>!['cao','neutral'].includes(c.owner));c.governor=null;
 const expected=rankOfficerCandidates(s,cityPersonnel(s,c.id).map(o=>o.unit),{task:'governor',city:c.id})[0].unit.id;
 prepareEnemyDomestic(s);assert.equal(c.governor,expected);
});

test('expedition recommendations place idle officers before busy officers regardless of ability score',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),units=cityPersonnel(s,c.id).map(o=>o.unit);
 const best=rankOfficerCandidates(s,units,{task:'expedition',city:c.id})[0].unit;
 assignDomestic(s,c.id,'commerce',best.id);beginDomesticTurn(s);assert.ok(assignmentFor(s,best.id).action);
 const ranked=rankOfficerCandidates(s,units,{task:'expedition',city:c.id});let seenBusy=false;
 for(const {unit} of ranked){if(assignmentFor(s,unit.id)?.action)seenBusy=true;else assert.equal(seenBusy,false);}
 assert.notEqual(ranked[0].unit.id,best.id);
});
