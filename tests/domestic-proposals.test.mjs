import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,pendingDomesticProposals,decideDomesticProposal,setDomesticAutoApprove,domesticProposalText,domesticConfidence,actionChance,beginDomesticTurn,cancelDomestic,actionCandidates,cityFoodReserve} from '../domestic.mjs';
import {domesticApprovalMarkup} from '../domestic-proposal-view.mjs';
import {cityBudget} from '../city-budget.mjs';
import {cityMaintenance} from '../economy.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(key='research',seed=7){
 const s=peacefulCities(newCampaign(seed));fundCities(s,40000);
 const c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id).unit;
 for(const [id,def]of Object.entries(ACTIONS))if(def.direction===ACTIONS[key].direction&&id!==key)c.domestic.cooldowns[id]=10000;
 assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,u.id),null);
 return {s,c,u,a:assignmentFor(s,u.id)};
}
test('paid work presents a fixed proposal before any payment, research or construction; reload is read-only',()=>{
 for(const key of ['research','build_workshop']){
  const {s,c,a}=fixture(key),gold=c.gold;assert.equal(s.campaign.domestic.autoApprove,false);beginExecution(s);
  assert.ok(a.proposal);assert.equal(a.action,null);assert.equal(c.gold,gold);assert.equal(c.project,null);assert.equal(c.domestic.research,null);
  const before=serializeCampaign(s),text=domesticProposalText(s,a);assert.match(text,/费用 \d+金.+耗时 \d+天.+成功率/);assert.doesNotMatch(text,/%|呈请|臣度|裁示/);
  assert.match(domesticApprovalMarkup(s),/同意/);assert.equal(serializeCampaign(s),before);
  const copy=restore(s);assert.equal(serializeCampaign(copy),before);assert.deepEqual(advanceCampaignDay(s),{paused:true,proposals:true});assert.equal(s.campaign.day,1);
  beginDomesticTurn(s);assert.equal(pendingDomesticProposals(s).length,1);
  assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);assert.equal(c.gold,gold-a.action.cost);assert.equal(a.proposal,null);
  assert.ok(key==='research'?c.domestic.research:c.project);restore(s);
 }
});
test('approval is exactly once and denial preserves assignment, spends nothing and does not repropose this turn',()=>{
 const {s,c,a}=fixture(),gold=c.gold;beginExecution(s);const id=a.proposal.id;
 assert.equal(decideDomesticProposal(s,id,false),null);assert.equal(c.gold,gold);assert.equal(a.action,null);assert.equal(a.proposal,null);assert.ok(s.campaign.domestic.assignments.includes(a));
 assert.match(decideDomesticProposal(s,id,true),/已撤回/);beginDomesticTurn(s);assert.equal(a.proposal,null);assert.ok(advanceCampaignDay(s).dayEnded);restore(s);
});
test('automatic approval applies to pending and future work and is saved; free operations need no proposal',()=>{
 const {s,c,a}=fixture(),gold=c.gold;beginExecution(s);assert.equal(setDomesticAutoApprove(s,true),null);assert.equal(a.proposal,null);assert.ok(a.action);assert.equal(c.gold,gold-a.action.cost);
 const paid=c.gold;setDomesticAutoApprove(s,true);assert.equal(c.gold,paid);assert.equal(restore(s).campaign.domestic.autoApprove,true);
 const free=fixture('cultivate');free.c.grain=8000;beginExecution(free.s);assert.equal(free.a.proposal,null);assert.equal(free.a.action.cost,0);assert.ok(advanceCampaignDay(free.s).dayEnded);
});
test('approval rechecks city gold and sites without charging or substituting the original proposal',()=>{
 const {s,c,a}=fixture('build_workshop');beginExecution(s);const proposal=structuredClone(a.proposal);c.gold=0;
 assert.match(decideDomesticProposal(s,a.proposal.id,true),/钱粮/);assert.deepEqual(a.proposal,proposal);assert.equal(c.gold,0);assert.equal(c.project,null);
 c.gold=40000;assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);assert.equal(c.project.siteId,proposal.siteId);
 assert.match(decideDomesticProposal(s,proposal.id,true),/已撤回/);
 const once=c.gold;cancelDomestic(s,a.officerId);assert.equal(c.gold,once);restore(s);
});
test('an unfunded paid action is not proposed, and free useful work remains available',()=>{
 for(const ai of [false,true]){
  const {s,c,a}=fixture('build_workshop');if(ai)s.campaign.allAI=true;
  const cost=actionCandidates(s,a,{ignoreFunds:true})[0].cost,payroll=cityMaintenance(s,c).gold;c.gold=c.budget.goldReserve+payroll+cost-1;
  assert.equal(actionCandidates(s,a).length,0);assert.equal(cityBudget(s,c).work,0);beginDomesticTurn(s);assert.equal(a.proposal,null);assert.equal(a.action,null);
  c.gold=c.budget.goldReserve+payroll+cost;a.lastTurn=0;beginDomesticTurn(s);
  assert.ok(ai?a.action:a.proposal,'exactly funded work is allowed for player and AI');
 }
 const {s,c,a}=fixture('fair');c.gold=0;beginDomesticTurn(s);assert.equal(a.proposal,null);assert.equal(a.action.cost,0);
});
test('rations and pending proposals cannot be spent by a second proposed action',()=>{
 const {s,c,u,a}=fixture('heal');c.clinic=1;c.units[0].wounded=500;c.gold=10000;
 c.grain=cityFoodReserve(s,c)+199;assert.ok(!actionCandidates(s,a).some(p=>p.key==='heal'));
 beginDomesticTurn(s);assert.equal(a.proposal,null);
 c.grain+=1;a.lastTurn=0;beginDomesticTurn(s);assert.equal(a.proposal.expenses.grain,200);
 const other=c.units.find(v=>v.id!==u.id);assert.equal(assignDomestic(s,c.id,'technology',other.id),null);
 const second=assignmentFor(s,other.id);assert.ok(!actionCandidates(s,second).some(p=>p.key==='heal'));
 assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);assert.equal(a.action.key,'heal');
});
test('proposal approval preserves the money held by other proposals and real shipments',()=>{
 const {s,c,a}=fixture('build_workshop');beginDomesticTurn(s);const p=structuredClone(a.proposal);
 s.campaign.domestic.orders.push({kind:'transfer',faction:c.owner,cityId:c.id,officerIds:[],cargo:{gold:500,grain:0,manpower:0}});
 const payroll=cityMaintenance(s,c).gold;c.gold=c.budget.goldReserve+payroll+p.expenses.gold+499;
 assert.match(decideDomesticProposal(s,p.id,true),/钱粮/);assert.deepEqual(a.proposal,p);assert.equal(a.action,null);
 c.gold++;assert.equal(decideDomesticProposal(s,p.id,true),null);assert.equal(c.gold,c.budget.goldReserve+payroll+500);
});
test('unpaid proposals occupy the research slot and their actual cost enters the budget once',()=>{
 const {s,c,a}=fixture(),other=c.units.find(u=>u.id!==a.officerId);assignDomestic(s,c.id,'technology',other.id);beginExecution(s);
 assert.equal(pendingDomesticProposals(s).length,1);assert.equal(s.campaign.domestic.assignments.filter(a=>a.action?.key==='research').length,0);
 const budget=cityBudget(s,c);assert.equal(budget.work,a.proposal.expenses.gold);restore(s);
 decideDomesticProposal(s,a.proposal.id,true);assert.equal(cityBudget(s,c).work,0);
});
test('recalling or transferring the author withdraws the unpaid proposal',()=>{
 const {s,c,a}=fixture(),gold=c.gold;beginExecution(s);cancelDomestic(s,a.officerId,'调任');assert.equal(pendingDomesticProposals(s).length,0);assert.equal(c.gold,gold);assert.equal(c.domestic.research,null);restore(s);
});
test('every domestic action and research depends on its executor primary ability, without guaranteed success',()=>{
 const {s,c,u}=fixture();
 for(const def of Object.values(ACTIONS)){
  const low=actionChance(s,c,{...u,[def.stat]:0},def),high=actionChance(s,c,{...u,[def.stat]:100},def);
  assert.ok(high>low,def.id);assert.ok(high<1,def.id);
 }
 assert.deepEqual([.9,.8,.6,.4,.2].map(domesticConfidence),['很高','较高','一般','较低','很低']);
});
test('real research can fail, preserves payment and prior progress, then resumes without further payment; save is deterministic',()=>{
 const {s,c,a}=fixture();beginExecution(s);decideDomesticProposal(s,a.proposal.id,true);
 // Legal unlucky outcome in the saved research round, with no productive floor.
 a.action.researchRoll=.999999;c.domestic.research.progress=12;const gold=c.gold,copy=restore(s);
 for(let i=0;i<10;i++){assert.ok(advanceCampaignDay(s).dayEnded);assert.ok(advanceCampaignDay(copy).dayEnded);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(c.domestic.research.progress,12);assert.equal(c.domestic.research.workedDays,10);
 assert.ok(s.campaign.domestic.events.some(e=>e.phase==='failure'&&e.result.actual===0&&/未有进展/.test(e.text)));
 assert.equal(c.domestic.techs.length,0);const beforeResume=c.gold;beginExecution(s);assert.equal(a.proposal,null);assert.equal(a.action.cost,0);assert.equal(c.gold,beforeResume);restore(s);
});
test('proposal save rejects tampered costs, duplicate ids and simultaneous action/proposal states',()=>{
 const {s,a}=fixture();beginExecution(s);
 for(const change of [x=>x.proposal.expenses.gold++,x=>x.proposal.id=x.id,x=>x.action={...x.proposal.pick}]){
  const bad=JSON.parse(serializeCampaign(s));change(bad.campaign.domestic.assignments.find(x=>x.id===a.id));assert.throws(()=>validateCampaign(bad));
 }
});
test('actual free domestic operations fail as well; higher executor ability succeeds more often with matched seeds',()=>{
 let lowSuccess=0,highSuccess=0,failures=0;
 for(let seed=1;seed<=16;seed++){
  const low=fixture('fair',seed),high=fixture('fair',seed);low.u.politics=20;high.u.politics=95;
  for(const x of [low,high]){beginExecution(x.s);for(let i=0;i<10;i++)assert.ok(advanceCampaignDay(x.s).dayEnded);}
  const result=x=>x.s.campaign.domestic.events.find(e=>e.officerId===x.u.id&&e.result.factor!==undefined);
  const a=result(low),b=result(high);lowSuccess+=a.result.factor>=1;highSuccess+=b.result.factor>=1;failures+=a.result.factor===0;
  if(a.result.factor===0){assert.equal(a.result.actual,0);assert.ok((a.result.growth?.gained||0)<=0);}
 }
 assert.ok(failures>0);assert.ok(highSuccess>lowSuccess);
});
test('national city approvals use local funds and preserve the chosen construction site across reload',()=>{
 const s=newCampaign(73,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];fundCities(s,40000);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);beginDomesticTurn(s);const a=assignmentFor(s,u.id),p=a.proposal;assert.ok(p);const other=s.cities.find(c=>c.id==='chenliu'),otherGold=other.gold;
 const copy=restore(s),b=assignmentFor(copy,u.id);assert.deepEqual(b.proposal,p);assert.equal(decideDomesticProposal(s,p.id,true),null);assert.equal(decideDomesticProposal(copy,p.id,true),null);
 assert.equal(c.project.siteId,p.siteId);assert.equal(other.gold,otherGold);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
test('replacing a construction executor updates their own chance without a new proposal or payment',()=>{
 const {s,c,u,a}=fixture('build_workshop');beginExecution(s);decideDomesticProposal(s,a.proposal.id,true);const chance=a.action.chance,cost=c.gold,id=a.action.id;
 cancelDomestic(s,u.id);const replacement=c.units.find(u=>u.id!==a.officerId);s.campaign.phase='planning';
 assert.equal(assignDomestic(s,c.id,'technology',replacement.id),null);beginDomesticTurn(s);const next=assignmentFor(s,replacement.id);
 assert.equal(next.action.id,id);assert.notEqual(next.action.chance,chance);assert.equal(next.action.chance,actionChance(s,c,replacement,ACTIONS.build_workshop,next.action.targetId));assert.equal(next.proposal,null);assert.equal(c.gold,cost);restore(s);
});
