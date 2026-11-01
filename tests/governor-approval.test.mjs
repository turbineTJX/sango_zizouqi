import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,appointGovernor} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,beginDomesticTurn,decideDomesticProposal,pendingDomesticProposals,setGovernorApproval,domesticProposalConflicts,reconcileDomestic} from '../domestic.mjs';
import {governorApprover} from '../city-governance.mjs';
import {domesticWorkMarkup,domesticGovernanceMarkup} from '../domestic-governance-view.mjs';
import {domesticApprovalMarkup} from '../domestic-proposal-view.mjs';
import {appendActivityNode,pendingActivityReports} from '../activity-nodes.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {setCityBudget} from '../city-budget.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture({conflict=false,delegate=false}={}){
 const s=peacefulCities(newCampaign(7));fundCities(s,40000);
 const c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==c.governor).unit;
 for(const [key,d]of Object.entries(ACTIONS))if(d.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);
 if(conflict)c.budget.goldReserve=c.gold;
 if(delegate)assert.equal(setGovernorApproval(s,c.id,true),null);
 return {s,c,u,a:assignmentFor(s,u.id)};
}
test('funded work starts automatically and its author, fee and time remain visible without delegation',()=>{
 const {s,c,u,a}=fixture(),gold=c.gold;beginExecution(s);
 assert.equal(pendingDomesticProposals(s).length,0);assert.ok(a.action);assert.equal(c.gold,gold-a.action.cost);
 const before=serializeCampaign(s),html=domesticWorkMarkup(s);
 assert.ok(html.includes(u.name));assert.ok(html.includes(String(a.action.cost)));assert.match(html,/研制|研究/);assert.match(html,/天/);assert.match(html,/已付/);
 assert.equal(serializeCampaign(s),before);assert.equal(serializeCampaign(restore(s)),before);assert.ok(advanceCampaignDay(s).dayEnded);
});
test('only a physically funded expense that conflicts with protected demand becomes a fixed unpaid proposal',()=>{
 const {s,c,a}=fixture({conflict:true}),gold=c.gold;beginExecution(s);
 assert.ok(a.proposal);assert.equal(a.action,null);assert.equal(c.gold,gold);assert.equal(c.domestic.research,null);
 const proposal=structuredClone(a.proposal),before=serializeCampaign(s);
 assert.equal(domesticProposalConflicts(s,a)[0].key,'gold');assert.match(domesticApprovalMarkup(s),/data-action="domestic-proposal-approve"[^>]*disabled/);
 assert.match(decideDomesticProposal(s,a.proposal.id,true),/不足/);assert.equal(serializeCampaign(s),before);
 assert.deepEqual(advanceCampaignDay(s),{paused:true,proposals:true});assert.deepEqual(assignmentFor(restore(s),a.officerId).proposal,proposal);
 assert.equal(setCityBudget(s,c.id,'goldReserve',0),null);assert.equal(c.gold,gold);assert.equal(decideDomesticProposal(s,proposal.id,true),null);assert.equal(c.gold,gold-a.action.cost);assert.equal(decideDomesticProposal(s,proposal.id,true).includes('已撤回'),true);
 restore(s);
});
test('no physical fee produces no proposal, while declining a conflict never spends or retries this turn',()=>{
 const empty=fixture();empty.c.gold=0;beginExecution(empty.s);assert.equal(empty.a.proposal,null);assert.equal(empty.a.action,null);
 const {s,c,a}=fixture({conflict:true}),gold=c.gold;beginExecution(s);assert.equal(decideDomesticProposal(s,a.proposal.id,false),null);
 beginDomesticTurn(s);assert.equal(a.proposal,null);assert.equal(a.action,null);assert.equal(c.gold,gold);assert.ok(advanceCampaignDay(s).dayEnded);restore(s);
});
test('governor approval is explicit, local, saved and refuses a city without a resident governor',()=>{
 const {s,c}=fixture(),other=s.cities.find(c=>c.id==='chenliu');
 assert.equal(governorApprover(s,c),null);assert.equal(c.governor,'cao');
 assert.equal(setGovernorApproval(s,c.id,true),null);assert.equal(governorApprover(s,c),'cao');assert.equal(governorApprover(s,other),null);
 assert.equal(governorApprover(restore(s),c),'cao');assert.match(domesticGovernanceMarkup(s),/许昌太守审批/);
 other.governor=null;assert.match(setGovernorApproval(s,other.id,true),/太守/);
 assert.equal(setGovernorApproval(s,c.id,false),null);assert.equal(governorApprover(s,c),null);restore(s);
});
test('delegating a pending conflict lets the governor defer without charging, stealing reserves or pausing',()=>{
 const {s,c,a}=fixture({conflict:true}),gold=c.gold;beginExecution(s);assert.ok(a.proposal);
 assert.equal(setGovernorApproval(s,c.id,true),null);assert.equal(a.proposal,null);assert.equal(a.action,null);assert.equal(c.gold,gold);assert.match(a.waiting,/太守缓办/);
 assert.ok(advanceCampaignDay(s).dayEnded);assert.equal(domesticWorkMarkup(s,{cityId:c.id}),'');restore(s);
});
test('a delegated city starts safe work normally and does not affect another city approval',()=>{
 const {s,c,a}=fixture({delegate:true}),other=s.cities.find(c=>c.id==='chenliu'),u=[...other.units,...s.campaign.idle.filter(o=>o.location===other.id).map(o=>o.unit)].find(u=>u.id!==other.governor);
 for(const [key,d]of Object.entries(ACTIONS))if(d.direction==='technology'&&key!=='research')other.domestic.cooldowns[key]=10000;
 other.budget.goldReserve=other.gold;assert.equal(assignDomestic(s,other.id,'technology',u.id),null);beginExecution(s);
 assert.ok(a.action);assert.equal(a.proposal,null);assert.ok(assignmentFor(s,u.id).proposal);restore(s);
});
test('delegation is revoked by replacing the governor, departure or capture and cannot transfer to a successor',()=>{
 const {s,c,u}=fixture({delegate:true});assert.equal(appointGovernor(s,c.id,u.id),null);assert.equal(governorApprover(s,c),null);assert.equal(c.domestic.approvalGovernor,null);
 const moved=fixture({delegate:true});moved.c.governor=null;reconcileDomestic(moved.s);assert.equal(moved.c.domestic.approvalGovernor,null);
 const captured=fixture({delegate:true});captured.c.owner='shao';reconcileDomestic(captured.s);assert.equal(captured.c.domestic.approvalGovernor,null);
 const bad=fixture();bad.c.domestic.approvalGovernor=bad.u.id;assert.throws(()=>restore(bad.s),/太守审批/);
});
test('delegated normal outcomes stay in the ledger while actual problems still report; toggling is not retroactive',()=>{
 const {s,c}=fixture(),node=(id,phase,result={},category='domestic')=>appendActivityNode(s,{sourceId:id,category,phase,faction:c.owner,cityId:c.id,key:'research',text:id,result});
 const prior=node('before-delegation','complete',{reward:{kind:'technology'}});setGovernorApproval(s,c.id,true);
 const normal=node('delegated-completion','complete',{reward:{kind:'technology'}}),problem=node('delegated-interruption','pause');
 assert.ok(s.campaign.activity.nodes.includes(normal));assert.ok(!pendingActivityReports(s).includes(normal));assert.ok(pendingActivityReports(s).includes(prior));assert.ok(pendingActivityReports(s).includes(problem));
 setGovernorApproval(s,c.id,false);assert.ok(!pendingActivityReports(s).includes(normal));
});
test('old domestic structures and invalid approval delegates are rejected rather than migrated',()=>{
 const {s}=fixture();const raw=JSON.parse(serializeCampaign(s));raw.campaign.domestic.version=25;assert.throws(()=>validateCampaign(raw),/内政存档版本/);
 const missing=JSON.parse(serializeCampaign(s));delete missing.cities[0].domestic.approvalGovernor;assert.throws(()=>validateCampaign(missing),/太守审批/);
});
test('real delegated research produces a recorded technology and harvest without an ordinary interrupt and resumes deterministically',()=>{
 const {s,c,a}=fixture({delegate:true});s.campaign.domestic.incidents.enabled=false;beginExecution(s);a.action.researchRoll=0;
 const copy=restore(s),technology=c.domestic.research.type;
 for(let i=0;i<10;i++){assert.ok(advanceCampaignDay(s).dayEnded);assert.ok(advanceCampaignDay(copy).dayEnded);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.ok(c.domestic.techs.includes(technology));
 const outcome=s.campaign.activity.nodes.find(n=>n.result.reward?.technologyId===technology);assert.ok(outcome);assert.equal(outcome.result.governorApprover,'cao');assert.ok(!pendingActivityReports(s).includes(outcome));
 assert.ok(s.campaign.activity.nodes.some(n=>n.phase==='harvest'));restore(s);
});
