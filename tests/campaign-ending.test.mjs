import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignEnding} from '../campaign-ending.mjs';
import {campaignEndingMarkup} from '../campaign-ending-view.mjs';
import {endingCampaign} from './helpers/ending-campaign.mjs';
const state=()=>({finished:'defeat',cities:[{id:'one',owner:'yuan'}],campaign:{playerFaction:'cao',allAI:false,scenarioId:'guandu-200',day:41,activity:{nodes:[]},archive:[]}});
const node=(sourceId,extra)=>({sourceId,sequence:1,day:2,faction:'cao',text:sourceId,...extra});
test('the common final-day pipeline reaches player victory, defeat and observer unification with valid current saves',()=>{
 for(const kind of ['victory','defeat','observer']){const s=endingCampaign(kind),r=campaignEnding(s);assert.equal(s.finished,kind==='defeat'?'defeat':'victory');assert.equal(r.observer,kind==='observer');assert.equal(r.days,1);}
});
test('ending reads every permanent battle, deduplicates settlement and counts actual signed merit without changing the save',()=>{
 const s=state();for(let i=0;i<135;i++)s.campaign.activity.nodes.push(node('battle:'+i,{sequence:i,category:'battle',phase:'settled',officerIds:['fixture-officer'],result:{battleId:'b'+i,winner:i%2?'cao':'yuan',stats:{initial:100,remaining:70,wounded:10,killed:15,escaped:5}}}));
 s.campaign.activity.nodes.push(structuredClone(s.campaign.activity.nodes[0]));
 for(const [category,gained] of [['battle',30],['domestic',10],['personnel',-5]])s.campaign.activity.nodes.push(node(category,{category,phase:'merit',officerId:'fixture-officer',result:{growth:{gained}}}));
 s.campaign.activity.nodes.push(node('hidden-enemy',{faction:'yuan',category:'battle',phase:'settled',result:{battleId:'hidden'}}));
 const before=JSON.stringify(s),r=campaignEnding(s);assert.equal(JSON.stringify(s),before);
 assert.equal(r.battles.total,135);assert.equal(r.battles.wins,67);assert.equal(r.casualty.initial,13500);assert.equal(r.casualty.killed,2025);
 assert.equal(r.officers[0].merit,35);assert.equal(r.officers[0].otherMerit,-5);assert.equal(r.officers[0].battles,135);assert.equal(r.events.length,135);
 assert.doesNotMatch(campaignEndingMarkup(s,{}),/hidden-enemy/);assert.match(campaignEndingMarkup(s,{endingEventsPage:6}),/第 7 \/ 7 页/);
});
test('territory counts include recapture and empty cities independently of actual battles',()=>{
 const s=state();s.cities.push({id:'two',owner:'cao'});
 for(const [index,phase] of ['lost','captured','lost'].entries())s.campaign.activity.nodes.push(node('occupation:'+index,{cityId:'one',category:'occupation',phase}));
 const r=campaignEnding(s);assert.deepEqual(r.territory,{initial:2,controlled:1,captured:1,lost:2});assert.equal(r.battles.total,0);assert.equal(r.days,40);
});
test('all AI ending names the actual unifier instead of declaring victory for the selected observer',()=>{
 const s=state();s.finished='victory';s.campaign.allAI=true;s.campaign.activity.nodes.push(node('yuan',{faction:'yuan',category:'battle',phase:'settled',result:{battleId:'b',winner:'yuan',stats:{killed:1}}}));
 const r=campaignEnding(s);assert.equal(r.winner,'yuan');assert.equal(r.faction,'yuan');assert.equal(r.observer,true);assert.equal(r.casualty.killed,1);
 assert.match(campaignEndingMarkup(s,{}),/全 AI 观战结束/);s.finished=null;assert.equal(campaignEnding(s),null);
});
