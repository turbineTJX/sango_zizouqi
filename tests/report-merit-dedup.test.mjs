import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {appendActivityNode,pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {settleOfficerMerit} from '../campaign-merit.mjs';
import {changeMerit,totalMerit,meritFloor} from '../progression.mjs';

function fixture(){
 const s=newCampaign(81),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 changeMerit(u,meritFloor(u.level+1)-totalMerit(u)-1);
 const growth=settleOfficerMerit(s,u,{sourceId:'domestic:99:1',amount:5,faction:c.owner,cityId:c.id,category:'domestic',reason:'举办集市结算'});
 const merit=s.campaign.activity.nodes.at(-1);
 const result=appendActivityNode(s,{sourceId:'domestic:500',category:'domestic',phase:'complete',faction:c.owner,cityId:c.id,officerId:u.id,key:'fair',text:'集市成功；'+merit.text,result:{growth,leveled:true,meritSourceId:merit.sourceId}});
 return {s,c,u,merit,result};
}
test('a completed work upgrade is reported once, remains in the ledger, and acknowledgement survives reload',()=>{
 const {s,merit,result}=fixture(),before=serializeCampaign(s);
 assert.deepEqual(pendingActivityReports(s).map(n=>n.id),[result.id]);assert.equal(serializeCampaign(s),before);
 acknowledgeActivityReports(s,[result.id]);assert.ok(merit.read&&result.read);assert.ok(s.campaign.activity.nodes.includes(merit));
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(pendingActivityReports(copy),[]);
});
test('legacy receipts and unique ledger growth identify old upgrades; conflicting receipts remain visible',()=>{
 const {s,merit,result}=fixture();delete result.result.meritSourceId;
 assert.deepEqual(pendingActivityReports(s).map(n=>n.id),[result.id]);
 s.campaign.domestic.events=[{id:500,actionId:99}];assert.deepEqual(pendingActivityReports(s).map(n=>n.id),[result.id]);
 s.campaign.domestic.events[0].actionId=100;assert.ok(pendingActivityReports(s).includes(merit));
});
test('independent merit and non-important failed outcomes retain their upgrade report',()=>{
 const {s,c,u,merit,result}=fixture();
 changeMerit(u,meritFloor(u.level+1)-totalMerit(u)-1);
 settleOfficerMerit(s,u,{sourceId:'work-progress:other:1',amount:5,faction:c.owner,cityId:c.id,category:'domestic',reason:'推进工程'});
 const independent=s.campaign.activity.nodes.at(-1);assert.ok(pendingActivityReports(s).includes(independent));
 result.phase='failure';assert.ok(pendingActivityReports(s).includes(merit));
 result.phase='complete';result.result.growth={...result.result.growth,gained:99};assert.ok(pendingActivityReports(s).includes(merit));
});

import {ACTIONS,assignDomestic,assignmentFor} from '../domestic.mjs';
test('real daily cash work attaches its merit receipt to the outcome',()=>{
 let successes=0;for(const seed of [1,2,3,4,81]){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 s.campaign.domestic.incidents.enabled=false;c.gold=0;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);beginExecution(s);
 const a=assignmentFor(s,u.id);assert.equal(a.action.key,'fair');
 changeMerit(u,meritFloor(u.level+1)-totalMerit(u)-1);
 for(let i=0;i<30&&a.action;i++)advanceCampaignDay(s);
 const result=s.campaign.activity.nodes.find(n=>n.officerId===u.id&&n.key==='fair'&&['complete','failure'].includes(n.phase));
 assert.ok(result?.result.growth);const merit=s.campaign.activity.nodes.find(n=>n.sourceId===result.result.meritSourceId);assert.ok(merit);
 if(result.phase==='complete')successes++;
 if(result.result.leveled){assert.ok(pendingActivityReports(s).includes(result));assert.ok(!pendingActivityReports(s).includes(merit));}
 s.campaign.domestic.events=[];
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.ok(!pendingActivityReports(copy).some(n=>n.id===merit.id));
 }assert.ok(successes>0);
});

test('ambiguous historical ledger matches preserve both upgrade reports',()=>{
 const {s,merit,result}=fixture();delete result.result.meritSourceId;
 appendActivityNode(s,{...merit,sourceId:'merit:domestic:100:1:'+merit.officerId});
 assert.ok(pendingActivityReports(s).includes(merit));
});
