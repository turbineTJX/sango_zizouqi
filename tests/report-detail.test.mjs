import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {appendActivityNode,pendingActivityReports} from '../activity-nodes.mjs';
import {activityReportMarkup,outcomeReportData,outcomeReportMarkup,reportTone} from '../reward-presentation.mjs';
import {updateCityBudgetAlerts} from '../city-budget.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {addCityGold} from '../city-resources.mjs';

const scene=()=>peacefulCities(newCampaign(81));
const node=(s,category,phase,result={},extra={})=>appendActivityNode(s,{sourceId:'detail:'+s.campaign.activity.nextSequence,category,phase,faction:'cao',cityId:'xuchang',text:'已发生的事项。',result,...extra});
const values=(s,e)=>outcomeReportData(s,e).facts.map(f=>f.value);

test('construction detail presents actual site, level, income and expense without replaying another daily event',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),u=cityStaffStatus(s,c).idle[0].unit;addCityGold(s,c,40000-c.gold);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
 assignDomestic(s,c.id,'commerce',u.id);let e;
 for(let i=0;i<60&&!e;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);e=s.campaign.activity.nodes.find(n=>n.result.reward?.kind==='building'&&n.faction==='cao');}
 assert.ok(e);const r=e.result.reward,data=outcomeReportData(s,e),html=activityReportMarkup(s,e),saved=serializeCampaign(s);
 assert.ok(data.facts.some(f=>f.value===`${r.beforeLevel} → ${r.afterLevel}级`));
 assert.ok(data.facts.some(f=>f.value===e.result.spent.toLocaleString('zh-CN')+'金'));
 assert.ok(html.includes(`data-activity-node="${e.id}"`));assert.ok(!html.includes('officer-activity-entry'));
 assert.equal(activityReportMarkup(validateCampaign(JSON.parse(saved)),e),html);assert.equal(serializeCampaign(s),saved);
 c.commerce+=5;c.gold=3;c.grain=4;assert.equal(activityReportMarkup(s,e),html);
});

test('budget report distinguishes recorded forecast gaps and real stocks from savings targets and later resources',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang');c.grain=0;c.gold=0;c.budget.grainReserve=20000;
 updateCityBudgetAlerts(s);const e=pendingActivityReports(s).find(n=>n.phase==='budget-warning'&&n.cityId===c.id);assert.ok(e);
 const b=e.result.budget,data=outcomeReportData(s,e),html=activityReportMarkup(s,e),snapshot=serializeCampaign(s);
 assert.ok(data.facts.some(f=>f.value==='约 '+b.fundingShortages.grain.toLocaleString('zh-CN')));
 assert.ok(data.facts.some(f=>f.value==='约 '+Math.floor(b.fundingDaysSupply)+'天'));
 assert.equal(serializeCampaign(s),snapshot);c.grain=999999;c.gold=999999;assert.equal(activityReportMarkup(s,e),html);
 assert.ok(!html.includes('999,999'));assert.equal(reportTone(e),'concern');
});

test('battle and occupation details keep own casualties and recorded resource handover, with correct loss tone',()=>{
 const s=scene(),e=node(s,'battle','settled',{winner:'yuan',stats:{initial:3000,remaining:1800,wounded:800,killed:300,escaped:100}});
 assert.deepEqual(values(s,e),['1,800人','800人','300人','3,000人','100人']);assert.equal(reportTone(e),'concern');
 const occupation=node(s,'occupation','lost',{previous:'cao',owner:'yuan',resources:{before:{gold:100,grain:200,manpower:1000},retained:{gold:50,grain:100,manpower:200},lost:{gold:50,grain:100,manpower:800}}});
 assert.ok(values(s,occupation).includes('曹操 → 袁绍'));assert.ok(values(s,occupation).includes('800'));assert.equal(reportTone(occupation),'concern');
});

test('disaster, incident and merit details expose the saved changes, including zero losses',()=>{
 const s=scene(),disaster=node(s,'domestic','event',{loss:0});assert.deepEqual(values(s,disaster),['0粮']);assert.equal(reportTone(disaster),'notice');
 const incident=node(s,'domestic','incident',{incident:{code:'rivalry',sourceOfficerId:'cao',otherOfficerId:'shao',resources:{before:{gold:200,grain:300,manpower:400},after:{gold:200,grain:300,manpower:300},delta:{gold:0,grain:0,manpower:-100}},relationship:{before:50,after:45,delta:-5}}});
 assert.ok(values(s,incident).includes('400 → 300（-100）'));assert.ok(values(s,incident).some(v=>v.includes('50 → 45')));
 const growth=node(s,'domestic','merit',{leveled:true,growth:{gained:10,before:1,after:2,unlocked:['战歌']}},{officerId:'cao'});assert.deepEqual(values(s,growth),['+10','1 → 2级','战歌']);
});

test('detail refuses other faction nodes, escapes text, and does not invent costs, arrival dates or hidden officer stats',()=>{
 const s=scene(),e=node(s,'talent','discovered',{}, {officerId:'cao',text:'发现<script>不可执行</script>。'}),before=serializeCampaign(s),html=activityReportMarkup(s,e);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.deepEqual(outcomeReportData(s,e).facts,[]);
 assert.ok(!html.includes('reward-attributes'));assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));
 assert.ok(!activityReportMarkup(s,{...e,faction:'yuan'}).includes('发现'));
 const card=outcomeReportMarkup(s,e);assert.ok(card.includes('data-action="activity-alert-record"'));assert.equal(serializeCampaign(s),before);
});

test('diplomacy shows both directions of an exact offer without treating promised resources as delivered',()=>{
 const s=scene(),clauses=[{id:'gold',kind:'gold',from:'cao',to:'yuan',amount:100},{id:'grain',kind:'grain',from:'yuan',to:'cao',amount:500}];
 const p={id:999,version:1,factions:['cao','yuan'],clauses,approvals:{},status:'pending'};s.campaign.diplomacy.proposals.push(p);
 const e=node(s,'diplomacy','pending',{proposalId:999,version:1});
 assert.deepEqual(values(s,e),['袁绍','100金','500粮']);
 const html=activityReportMarkup(s,e);assert.ok(html.includes('本方拟划付金'));assert.ok(html.includes('对方拟交付粮'));assert.ok(!html.includes('实际入库'));
 p.signedTerms=JSON.stringify({version:1,clauses:structuredClone(clauses)});p.status='signed';p.clauses[0].delivered=100;p.clauses[0].amount=999;
 assert.deepEqual(values(s,e),['袁绍','100金','500粮']);
 p.version=2;assert.deepEqual(outcomeReportData(s,e).facts,[]);
});
