import {fundCities} from './resource-fixtures.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor} from '../domestic.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {rankOfficerCandidates,officerRecommendation} from '../officer-recommendation.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {campaignRosterMarkup} from '../strategic-roster.mjs';
const scene=()=>newCampaign(42,'heroes-251');
test('commerce and agriculture no longer recommend deleted numerical traits',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang');c.commerce=5;c.farm=5;c.granary=5;c.grain=10000;fundCities(s,2500);
 const units=['person-533','person-107'].map(id=>s.cities.flatMap(c=>cityPersonnel(s,c.id)).find(o=>o.unit.id===id).unit);
 for(const u of units){for(const other of s.cities)other.units=other.units.filter(v=>v.id!==u.id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==u.id);s.campaign.idle.push({unit:u,faction:'cao',location:c.id,destination:null});Object.assign(u,{politics:80,charm:80,intellect:80,leadership:80,personality:1});}
 const commerce=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction:'commerce'}),agriculture=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction:'agriculture'});
 assert.ok([...commerce,...agriculture].every(r=>r.recommendation.traits.every(t=>!['merchant','farming','wealth'].includes(t.id))));assert.deepEqual(officerRecommendation(s,units[0],{task:'governor',city:c.id}).traits,[]);
});
test('recommendation reads and roster rendering do not mutate saves or draw random numbers',()=>{
 const s=scene(),p={task:'domestic',city:'xuchang',direction:'agriculture',selected:[]},before=serializeCampaign(s),units=cityPersonnel(s,p.city).map(o=>o.unit),ranked=rankOfficerCandidates(s,units,p),html=campaignRosterMarkup(s,{personnel:{city:p.city}},p);
 assert.ok(html.includes('任务推荐'));assert.ok(ranked.every(r=>!r.recommendation.traits.some(t=>t.name==='农政')));assert.equal(html.match(/data-personnel-choice="([^"]+)"/)[1],ranked[0].unit.id);assert.equal(serializeCampaign(s),before);assert.deepEqual(rankOfficerCandidates(s,units,p),ranked);
});
test('AI uses the same scores for vacant jobs, preserves existing assignments, and appoints each actor once',()=>{
 const s=scene(),c=s.cities.find(c=>!['cao','neutral'].includes(c.owner)),units=cityPersonnel(s,c.id).map(o=>o.unit),pairs=['commerce','agriculture','technology','military','martial','talent'].flatMap(direction=>rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction}).filter(x=>x.recommendation.available).map(x=>({...x,direction}))).sort((a,b)=>b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id)||a.direction.localeCompare(b.direction));
 assert.ok(pairs.length);prepareEnemyDomestic(s);const assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id);assert.equal(assignments[0].officerId,pairs[0].unit.id);assert.equal(assignments[0].direction,pairs[0].direction);assert.equal(new Set(assignments.map(a=>a.officerId)).size,assignments.length);assert.ok(new Set(s.campaign.domestic.assignments.map(a=>a.direction)).size===6);const first=structuredClone(assignments);prepareEnemyDomestic(s);assert.deepEqual(s.campaign.domestic.assignments.filter(a=>first.some(b=>b.id===a.id)),first);
});
test('transport recommendation uses actual transport speed and compilation does not penalize domestic duties',()=>{
 const s=scene(),u=s.cities.flatMap(c=>cityPersonnel(s,c.id)).find(o=>o.unit.id==='person-533').unit,p={task:'transfer',city:'xuchang',cargo:{grain:100,manpower:0}};assert.equal(officerRecommendation(s,u,p).score,100);
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


test('removed numerical traits do not offset ability in task or standby ranking',async()=>{
 const {ACTIONS,actionChance}=await import('../domestic.mjs');
 const {taskTraitBonus}=await import('../officer-traits.mjs');
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),units=cityPersonnel(s,c.id).map(o=>o.unit),trainer=units.find(u=>u.id==='person-70'),plain=units.find(u=>u.id==='person-472');
 trainer.force=75;plain.force=95;
 const trained=actionChance(s,c,trainer,ACTIONS.exercise),untrained=actionChance(s,c,plain,ACTIONS.exercise);
 assert.ok(trained<untrained);
 assert.equal(taskTraitBonus(trainer,ACTIONS.exercise,'quantity'),0);
 assert.ok(actionChance(s,c,trainer,ACTIONS.build_drill)<actionChance(s,c,plain,ACTIONS.build_drill));
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='martial')c.domestic.cooldowns[key]=1000;
 trainer.force=84;
 const ranked=rankOfficerCandidates(s,[plain,trainer],{task:'domestic',city:c.id,direction:'martial'});
 assert.equal(ranked[0].unit.id,plain.id);assert.equal(ranked[0].recommendation.available,false);
 const html=campaignRosterMarkup(s,{personnel:{city:c.id}},{task:'domestic',city:c.id,direction:'martial',selected:[]});
 assert.ok(html.indexOf('data-personnel-choice="'+plain.id+'"')<html.indexOf('data-personnel-choice="'+trainer.id+'"'));
});
