import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,chooseEncounter,validateCampaign,serializeCampaign,launchExpedition} from '../strategic-campaign.mjs';
import {assignDiplomat,setDiplomaticGoal,diplomaticOfficerCandidates,diplomaticCandidates,approveDiplomaticProposal,decideDiplomaticProposal,lordCity,evaluateDiplomaticProposal} from '../diplomacy.mjs';
import {factionsHostile} from '../diplomacy-relations.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {diplomacyMarkup} from '../diplomacy-view.mjs';

const fresh=()=>{const s=newCampaign(281,'guandu-200');fundCities(s,9000);return s;};
// Isolate logistics from new military offensives. Diplomacy AI, economics,
// personnel movement and existing battles still use their actual daily engines.
function nextDay(s){s.campaign.ai.lastPlanDay=s.campaign.day;if(s.campaign.phase==='planning')beginExecution(s);for(const r of s.campaign.battles.filter(r=>r.awaiting))chooseEncounter(s,r.id,false);for(let i=0;i<3;i++){const before=s.campaign.day;advanceCampaignDay(s);if(s.campaign.day!==before)break;for(const r of s.campaign.battles.filter(r=>r.awaiting))chooseEncounter(s,r.id,false);}validateCampaign(JSON.parse(serializeCampaign(s)));}
function appoint(s,goal='buyGrain',direction='commerce'){
 // Formation no longer burns grain. Begin genuinely short of food so the
 // negotiated purchase is still needed after the real outward journey.
 if(goal==='buyGrain'){lordCity(s,'cao').grain=2000;s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));}
 assert.equal(setDiplomaticGoal(s,goal),null);const rows=diplomaticOfficerCandidates(s,'cao',direction),o=rows.find(o=>!o.work)||rows[0];assert.ok(o);assert.equal(assignDiplomat(s,o.unit.id,direction,{choice:'now'}).error,undefined);return o;
}
function waitFor(s,predicate,limit=90){for(let i=0;i<limit&&!predicate();i++)nextDay(s);assert.ok(predicate(),'expected diplomacy state within real travel/work time '+JSON.stringify(s.campaign.diplomacy.contracts.filter(p=>p.factions.includes('cao')).map(p=>({id:p.id,status:p.status,failure:p.failure,clauses:p.clauses.map(c=>({kind:c.kind,status:c.status,delivered:c.delivered,carrierId:c.carrierId})),escrow:p.escrow}))).slice(0,1800));}

test('direction appointment excludes actual idle staff and browsing does not mutate simulation',()=>{
 const s=fresh(),o=appoint(s);assert.ok(!cityStaffStatus(s,s.cities.find(c=>c.id===o.location)).idle.some(p=>p.unit.id===o.unit.id));const before=serializeCampaign(s);assert.match(diplomacyMarkup(s),/最终方案须批准/);assert.equal(serializeCampaign(s),before);assert.ok(diplomaticCandidates(s,s.campaign.diplomacy.assignments[0]).length);
});
test('envoy walks actual roads; final offer and read acknowledgement never sign or pay',()=>{
 const s=fresh(),o=appoint(s);waitFor(s,()=>s.campaign.diplomacy.proposals.some(p=>p.status==='pending'&&p.officerId===o.unit.id));const p=s.campaign.diplomacy.proposals.find(p=>p.officerId===o.unit.id);assert.notEqual(o.unit.mission.location,o.location);assert.equal(p.approvals.cao,undefined);assert.equal(s.campaign.diplomacy.contracts.some(c=>c.id===p.id),false);assert.ok(pendingActivityReports(s).some(n=>n.result.proposalId===p.id));acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));assert.equal(p.status,'pending');assert.equal(p.approvals.cao,undefined);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('approved trade escrows real assets then unloads at the confirmed ruler city exactly once',()=>{
 const s=fresh(),o=appoint(s);waitFor(s,()=>s.campaign.diplomacy.proposals.some(p=>p.status==='pending'&&p.officerId===o.unit.id));const p=s.campaign.diplomacy.proposals.find(p=>p.officerId===o.unit.id),gold=p.clauses.find(c=>c.kind==='gold'),grain=p.clauses.find(c=>c.kind==='grain');assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);assert.match(approveDiplomaticProposal(s,p.id,p.version),/失效/);
 waitFor(s,()=>s.campaign.diplomacy.contracts.some(c=>c.id===p.id));assert.equal(p.status,'signed');assert.equal(p.escrow.find(e=>e.kind==='gold').amount,gold.amount);assert.equal(gold.delivered,0);assert.equal(p.sites.cao,lordCity(s,'cao').id);waitFor(s,()=>grain.status==='done',130);assert.equal(grain.delivered,grain.amount);assert.equal(gold.delivered,gold.amount);assert.equal(p.escrow.find(e=>e.kind==='gold').amount,0);const count=s.campaign.activity.nodes.filter(n=>n.sourceId.includes(`diplomacy:${p.id}:delivery:cao`)&&n.result.clauseId===grain.id).length;nextDay(s);assert.equal(s.campaign.activity.nodes.filter(n=>n.sourceId.includes(`diplomacy:${p.id}:delivery:cao`)&&n.result.clauseId===grain.id).length,count);
});
test('returning a final offer invalidates approval version and denial does not count as breach',()=>{
 const s=fresh(),o=appoint(s);waitFor(s,()=>s.campaign.diplomacy.proposals.some(p=>p.status==='pending'&&p.officerId===o.unit.id));const p=s.campaign.diplomacy.proposals.find(p=>p.officerId===o.unit.id),version=p.version;assert.equal(decideDiplomaticProposal(s,p.id,'renegotiate'),null);assert.match(approveDiplomaticProposal(s,p.id,version),/失效/);waitFor(s,()=>p.status==='pending');const credit=JSON.stringify(s.campaign.diplomacy.credit);assert.equal(decideDiplomaticProposal(s,p.id,'reject'),null);assert.equal(JSON.stringify(s.campaign.diplomacy.credit),credit);assert.equal(p.status,'rejected');assert.equal(o.unit.mission.phase,'return');
});
test('AI uses real candidates and ruler valuation, never supplies player approval',()=>{
 const s=fresh();
 // Give autonomous sellers a real customer need; forming troops is no longer
 // an artificial grain sink that can create it in an otherwise stocked city.
 lordCity(s,'cao').grain=2000;s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));
 nextDay(s);assert.ok(s.campaign.diplomacy.assignments.some(a=>a.faction!=='cao'));waitFor(s,()=>s.campaign.diplomacy.proposals.some(p=>p.status==='pending'&&p.factions.includes('cao')),100);const p=s.campaign.diplomacy.proposals.find(p=>p.status==='pending'&&p.factions.includes('cao'));assert.equal(p.approvals.cao,undefined);const f=p.factions.find(f=>f!=='cao'),bad=structuredClone(p);bad.clauses=[{id:1,kind:'gold',from:f,to:'cao',amount:50000}];assert.equal(evaluateDiplomaticProposal(s,bad,f).approve,false);assert.match(diplomacyMarkup(s),/待批准/);
});
test('ruler move or exhausted inventory stops signing an already approved version',()=>{
 const s=fresh(),o=appoint(s);waitFor(s,()=>s.campaign.diplomacy.proposals.some(p=>p.status==='pending'&&p.officerId===o.unit.id));const p=s.campaign.diplomacy.proposals.find(p=>p.officerId===o.unit.id);assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);fundCities(s,500);nextDay(s);assert.equal(p.status,'cancelled');assert.equal(s.campaign.diplomacy.contracts.some(c=>c.id===p.id),false);assert.match(p.failure||s.campaign.activity.nodes.findLast(n=>n.result.proposalId===p.id&&n.phase==='failed').text,/不足/);
});
