import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {appendActivityNode,acknowledgeActivityReports,pendingActivityReports} from '../activity-nodes.mjs';
import {recordOfficerActivities,officerActivityDays} from '../officer-activity.mjs';
import {compactActivityState} from '../activity-retention.mjs';
import {settleOfficerMerit,transportMerit} from '../campaign-merit.mjs';
import {campaignEnding} from '../campaign-ending.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {officerActivityMarkup} from '../officer-activity-view.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';

function later(s,day){s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;recordOfficerActivities(s);}
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));

test('finished civil history becomes compact totals while pending reports, battle facts and the latest harvest survive',()=>{
 const s=newCampaign(911),o=s.campaign.idle[0],f=o.faction;
 settleOfficerMerit(s,o.unit,{sourceId:'past-work',amount:12,faction:f,cityId:o.location,category:'domestic',reason:'办理事务'});
 const old=appendActivityNode(s,{sourceId:'old-start',category:'domestic',phase:'start',faction:f,text:'开工'});
 const pending=appendActivityNode(s,{sourceId:'pending',category:'domestic',phase:'event',faction:f,text:'待核阅事项'});
 const battle=appendActivityNode(s,{sourceId:'battle',category:'battle',phase:'settled',faction:f,text:'战果',result:{battleId:'battle',winner:f}});
 const gain=appendActivityNode(s,{sourceId:'gain',category:'talent',phase:'signed',faction:f,text:'新人才'});
 const harvest=appendActivityNode(s,{sourceId:'latest-harvest',category:'domestic',phase:'harvest',faction:f,text:'收获',result:{nodeIds:[gain.id]}});
 later(s,41);assert.ok(!s.campaign.activity.nodes.includes(old));assert.ok(!s.campaign.activity.nodes.some(n=>n.sourceId==='merit:past-work:'+o.unit.id));
 assert.deepEqual(s.campaign.activity.meritTotals[f][o.unit.id],{battle:0,domestic:12,other:0});
 for(const n of [pending,battle,gain,harvest])assert.ok(s.campaign.activity.nodes.includes(n));
 assert.ok(pendingActivityReports(s).includes(pending));acknowledgeActivityReports(s,[pending.id]);later(s,42);assert.ok(!s.campaign.activity.nodes.includes(pending));
 const totals=structuredClone(s.campaign.activity.meritTotals);later(s,43);assert.deepEqual(s.campaign.activity.meritTotals,totals);
});

test('same-turn transport receipts survive cleanup and continue to enforce shared merit caps after loading',()=>{
 const s=newCampaign(912),o=s.campaign.idle[0],options={sourceId:'first'};
 transportMerit(s,o.unit,o.faction,'xuchang','chenliu',{gold:3000},options);
 s.campaign.activity.compactedDay=0;compactActivityState(s);
 const copy=restore(s),u=copy.campaign.idle.find(x=>x.unit.id===o.unit.id).unit,before=u.merit;
 transportMerit(copy,u,o.faction,'chenliu','xuchang',{gold:3000},{sourceId:'second'});assert.equal(u.merit,before);
 assert.ok(copy.campaign.activity.nodes.some(n=>n.sourceId==='merit:first:'+u.id));
});

test('queued action receipts remain until execution and completed unrelated work does not accumulate',()=>{
 const s=newCampaign(913),o=s.campaign.idle[0];
 const receipt={actionId:77,startedDay:1,endedDay:2,status:'completed'};
 s.campaign.domestic.workHistory[o.unit.id]=[receipt,{...receipt,actionId:78}];
 s.campaign.domestic.orders.push({waits:[{actionId:77}],officerIds:[o.unit.id]});
 later(s,61);assert.deepEqual(s.campaign.domestic.workHistory[o.unit.id],[receipt]);
 s.campaign.domestic.orders=[];later(s,62);assert.equal(s.campaign.domestic.workHistory[o.unit.id],undefined);
});

test('current officer details contain one state and no date paging, independent of elapsed days',()=>{
 const s=newCampaign(914),id=s.campaign.idle[0].unit.id;later(s,601);
 for(const rows of Object.values(s.campaign.activity.records)){assert.equal(rows.length,1);assert.equal(rows[0].fromDay,601);assert.equal(rows[0].toDay,601);}
 assert.deepEqual(officerActivityDays(s,id).rows.map(x=>x.day),[601]);assert.doesNotMatch(officerActivityMarkup(s,id),/campaign-activity-page|较早30天|较近30天/);
});

test('compacted totals respect the observing faction and remain read-only derived information',()=>{
 const s=newCampaign(914,'guandu-200'),before=serializeCampaign(s);
 s.campaign.activity.meritTotals={cao:{cao:{battle:0,domestic:10,other:0}},yuan:{yuan:{battle:20,domestic:0,other:0}}};
 for(const faction of ['cao','yuan'])assert.deepEqual(Object.keys(intelligenceWorld(s,faction).campaign.activity.meritTotals),[faction]);
 const after=serializeCampaign(s);intelligenceWorld(s,'cao');assert.equal(serializeCampaign(s),after);assert.notEqual(after,before);
});

test('civil compaction preserves ending merit totals and leaves battle replay bytes untouched',()=>{
 const s=newCampaign(915),o=s.campaign.idle[0];
 for(const [i,amount]of [12,-3,8].entries())settleOfficerMerit(s,o.unit,{sourceId:'civil-'+i,amount,faction:'cao',cityId:o.location,category:'domestic',reason:'事务结算'});
 s.finished='defeat';const before=campaignEnding(s).officers.find(x=>x.id===o.unit.id);
 s.campaign.battles.push({settled:true,armyIds:[],snapshots:[{day:1,data:{sides:[{units:[]}]}}],battle:{tick:10},templates:{officer:{}}});
 const replay=JSON.stringify(s.campaign.battles);later(s,101);
 assert.deepEqual(campaignEnding(s).officers.find(x=>x.id===o.unit.id),before);assert.equal(JSON.stringify(s.campaign.battles),replay);
});

test('real civil progression remains bounded and deterministic across current-state saves',()=>{
 const s=peacefulCities(newCampaign(916));
 const advance=(s,to)=>{while(s.campaign.day<to){if(s.campaign.phase==='planning')beginExecution(s);assert.ok(advanceCampaignDay(s).dayEnded);}};
 advance(s,31);const copy=restore(s);advance(s,121);advance(copy,121);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
 assert.ok(Object.values(s.campaign.activity.records).every(rows=>rows.length===1));
 assert.ok(s.campaign.activity.nodes.every(n=>n.day>=111||['battle','occupation'].includes(n.category)||n.phase==='harvest'||pendingActivityReports(s).includes(n)||s.campaign.activity.nodes.some(h=>h.phase==='harvest'&&h.result.nodeIds.includes(n.id))));
 assert.ok(Buffer.byteLength(JSON.stringify(s.campaign.activity))<800000);
});
