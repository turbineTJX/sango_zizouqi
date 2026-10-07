import assert from 'node:assert/strict';
import {beginExecution,advanceCampaignDay,chooseEncounter,validateCampaign,serializeCampaign} from '../../strategic-campaign.mjs';
import {assignDiplomat,diplomaticOfficerCandidates,diplomaticCandidates,diplomaticRoute,prepareDiplomaticProposal,approveDiplomaticProposal,setDiplomaticGoal,lordCity} from '../../diplomacy.mjs';
import {roadCost} from '../../road-metrics.mjs';

// A controlled border excludes new ordinary AI offensives, while every actual
// diplomacy, economics, route, personnel and combat step still runs normally.
export function diplomaticDay(s,{validate=false}={}){
 s.campaign.ai.lastPlanDay=s.campaign.day;
 if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);
 for(const r of s.campaign.battles.filter(r=>r.awaiting))chooseEncounter(s,r.id,false);
 const day=s.campaign.day;
 for(let i=0;i<4&&s.campaign.day===day;i++){advanceCampaignDay(s);for(const r of s.campaign.battles.filter(r=>r.awaiting))chooseEncounter(s,r.id,false);}
 assert.ok(s.campaign.day>day,'actual day must advance');
 if(validate)validateCampaign(JSON.parse(serializeCampaign(s)));
}
export function untilDiplomatic(s,predicate,limit=120){for(let i=0;i<limit&&!predicate();i++)diplomaticDay(s);assert.ok(predicate(),JSON.stringify(s.campaign.diplomacy.proposals.map(p=>({id:p.id,status:p.status,goal:p.goal})))+' / '+JSON.stringify(s.campaign.diplomacy.contracts.map(p=>({id:p.id,status:p.status,failure:p.failure}))));validateCampaign(JSON.parse(serializeCampaign(s)));}
export function proposeDiplomatic(s,{goal='peace',direction='negotiation',other='sunce',clauses=null}={}){
 assert.equal(setDiplomaticGoal(s,goal,other),null);
 const officers=diplomaticOfficerCandidates(s,'cao',direction).map(o=>{const path=diplomaticRoute(s,o.location,lordCity(s,other).id,'cao',other);let at=o.location,cost=0;for(const next of path||[]){cost+=roadCost(s,at,next);at=next;}return {...o,path,cost};}).filter(o=>o.path).sort((a,b)=>a.cost-b.cost||b.score-a.score);
 const o=officers[0];assert.ok(o);assert.ok(assignDiplomat(s,o.unit.id,direction,{choice:'now'}).applied);
 const assignment=s.campaign.diplomacy.assignments.find(a=>a.officerId===o.unit.id),candidate=clauses?{goal,other,clauses,path:o.path,targetCity:lordCity(s,other).id,score:60,reason:'controlled exact terms'}:diplomaticCandidates(s,assignment).find(c=>c.goal===goal&&c.other===other);
 assert.ok(candidate);const p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p,assignment.waiting);return {p,o};
}
export function approveAndSign(s,p){untilDiplomatic(s,()=>['pending','rejected','cancelled'].includes(p.status));assert.equal(p.status,'pending');assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);untilDiplomatic(s,()=>s.campaign.diplomacy.contracts.some(c=>c.id===p.id));assert.equal(p.status,'signed');return p;}
