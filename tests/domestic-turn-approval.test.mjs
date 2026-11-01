import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,beginDomesticTurn,decideDomesticProposal,pendingDomesticProposals,setDomesticAutoApprove,setGovernorApproval,validateDomestic} from '../domestic.mjs';
import {strategicTraits} from '../strategic-traits.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture({conflict=false}={}){
 const s=peacefulCities(newCampaign(7));fundCities(s,40000);s.campaign.domestic.incidents.enabled=false;
 const c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==c.governor&&!strategicTraits(o.unit,'chain').length).unit;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);if(conflict)c.budget.goldReserve=c.gold;
 return {s,c,u,a:assignmentFor(s,u.id)};
}
function lastPaidDay(f){
 beginExecution(f.s);assert.ok(f.a.action);assert.equal(f.a.proposal,null);
 // A mechanism fixture at the final day of a real paid research round. The
 // ordinary engine still computes its actual progress, result and next job.
 f.a.action.remaining=1;advanceCampaignDay(f.s);assert.equal(f.s.campaign.day,2);assert.equal(f.a.action,null);return f;
}
test('旬初进行后统一提出内政提案，逐项批准前不推进一天且仅按各城实际扣费',()=>{
 const f=fixture({conflict:true}),{s,c,a}=f,other=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==a.officerId&&o.unit.id!==c.governor);
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'commerce',other.unit.id),null);const gold=c.gold;beginExecution(s);
 assert.equal(pendingDomesticProposals(s).length,2);assert.ok(pendingDomesticProposals(s).every(a=>a.proposal.createdDay===1));
 const copy=restore(s);assert.equal(serializeCampaign(copy),serializeCampaign(s));assert.deepEqual(advanceCampaignDay(s),{paused:true,proposals:true});assert.equal(s.campaign.day,1);
 c.budget.goldReserve=0;const proposals=[...pendingDomesticProposals(s)],total=proposals.reduce((n,a)=>n+a.proposal.expenses.gold,0);
 for(const x of proposals){const id=x.proposal.id;assert.equal(decideDomesticProposal(s,id,true),null);assert.ok(decideDomesticProposal(s,id,true));}
 assert.equal(c.gold,gold-total);assert.equal(s.campaign.day,1);assert.equal(pendingDomesticProposals(s).length,0);assert.ok(advanceCampaignDay(s).dayEnded);restore(s);
});
test('内政批准、暂缓及委托审批仅能在旬初窗口办理，窗口外失败不改变状态',()=>{
 const {s,a,c}=fixture({conflict:true});beginExecution(s);const id=a.proposal.id;s.campaign.day=2;s.campaign.domestic.lastFinishedDay=1;
 for(const decide of [()=>decideDomesticProposal(s,id,true),()=>decideDomesticProposal(s,id,false),()=>setDomesticAutoApprove(s,true),()=>setGovernorApproval(s,c.id,true)]){const before=serializeCampaign(s);assert.ok(decide());assert.equal(serializeCampaign(s),before);}
 const before=serializeCampaign(s);beginDomesticTurn(s);assert.equal(serializeCampaign(s),before);
});
test('旬初审批窗口一经执行关闭，同日暂停或读档不能重开，也拒绝伪造未处理提案',()=>{
 const {s,a}=fixture({conflict:true});beginExecution(s);const raw=JSON.parse(serializeCampaign(s));raw.campaign.domestic.approvalClosedTurn=1;assert.throws(()=>validateDomestic(raw),/审批窗口/);
 s.cities.find(c=>c.id===a.cityId).budget.goldReserve=0;assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);advanceCampaignStep(s);assert.equal(s.campaign.day,1);
 const copy=restore(s),before=serializeCampaign(copy);assert.ok(setDomesticAutoApprove(copy,true));beginDomesticTurn(copy);assert.equal(serializeCampaign(copy),before);
});
test('旬内完成已付费研究后可接续无需批准的免费研究，原进度与费用守恒并可确定性读档',()=>{
 const {s,c,a}=lastPaidDay(fixture()),gold=c.gold,progress=c.domestic.research.progress;assert.ok(progress>0);assert.equal(a.routineDay,2);
 const copy=restore(s);for(const world of [s,copy]){advanceCampaignStep(world);const x=assignmentFor(world,a.officerId);assert.equal(x.proposal,null);assert.equal(x.action.key,'research');assert.equal(x.action.cost,0);assert.equal(x.action.startedDay,2);assert.equal(x.routineDay,0);assert.equal(world.cities.find(c=>c.id===a.cityId).gold,gold);assert.equal(world.cities.find(c=>c.id===a.cityId).domestic.research.progress,progress);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
test('旬内可接续预算充足且无需裁决的付费事务，仍从原城真实扣费',()=>{
 const {s,c,a}=lastPaidDay(fixture());c.domestic.cooldowns.research=10000;c.domestic.cooldowns.build_workshop=0;const gold=c.gold;
 advanceCampaignStep(s);assert.ok(a.action);assert.equal(a.action.key,'build_workshop');assert.ok(a.action.cost>0);assert.equal(a.action.startedDay,2);assert.equal(c.gold,gold-a.action.cost);assert.equal(a.proposal,null);restore(s);
});
test('旬内完工后只剩需批准事项即保持空闲，不逐日重试，到下一旬才重新提出提案',()=>{
 const {s,c,a}=lastPaidDay(fixture());c.domestic.cooldowns.research=10000;c.domestic.cooldowns.build_workshop=0;c.budget.goldReserve=c.gold;
 const copy=restore(s);for(const world of [s,copy]){advanceCampaignDay(world);const x=assignmentFor(world,a.officerId);assert.equal(x.action,null);assert.equal(x.proposal,null);assert.equal(x.routineDay,0);}
 const idleSeed=s.campaign.domestic.seed;
 while(s.campaign.day<11){advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(a.action,null);assert.equal(a.proposal,null);assert.equal(serializeCampaign(s),serializeCampaign(copy));}
 assert.equal(s.campaign.domestic.seed,idleSeed,'an idle author does not choose or reroll a job every day');
 for(const world of [s,copy]){const home=world.cities.find(t=>t.id===c.id);home.budget.goldReserve=home.gold;beginExecution(world);const x=assignmentFor(world,a.officerId);assert.ok(x.proposal);assert.equal(x.proposal.createdDay,11);assert.equal(x.action,null);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.ok(s.campaign.domestic.events.filter(e=>e.phase==='proposal').every(e=>e.day===11));restore(s);
});
test('旬初暂缓或本来空闲的人不会在旬内另行重提或自动接替新工作',()=>{
 const {s,c,a}=fixture({conflict:true});beginExecution(s);assert.equal(decideDomesticProposal(s,a.proposal.id,false),null);c.budget.goldReserve=0;
 for(let i=0;i<5;i++){advanceCampaignDay(s);assert.equal(a.action,null);assert.equal(a.proposal,null);assert.equal(a.routineDay,0);}restore(s);
});
