import {cityIntelligence} from './strategic-vision.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {pendingDomesticOrder} from './domestic.mjs';
import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';
import {strategicAlgorithmProfile} from './strategic-algorithms.mjs';

// HTN leaves observe actual effects. They neither debit resources nor create
// armies. Existing operational plans remain the sole military commitments.
export function captureTasks(day){return [
 {id:'observe',kind:'scout',dependsOn:[],status:'waiting',updatedDay:day,refs:[]},
 {id:'supply',kind:'prepareSupply',dependsOn:[],status:'waiting',updatedDay:day,refs:[]},
 {id:'assemble',kind:'assemble',dependsOn:[],status:'waiting',updatedDay:day,refs:[]},
 {id:'assault',kind:'assault',dependsOn:['observe','supply','assemble'],status:'waiting',updatedDay:day,refs:[]},
 {id:'secure',kind:'consolidate',dependsOn:['assault'],status:'waiting',updatedDay:day,refs:[]},
];}
export function updateCaptureTasks(s,p,{waitingForScout,homeFood}){
 const day=s.campaign.day,staging=s.cities.find(c=>c.id===p.staging),target=s.cities.find(c=>c.id===p.target);
 const operational=!['consolidate','complete','cancelled'].includes(p.phase);
 const armies=s.armies.filter(a=>a.faction===p.faction&&!a.disbanded&&a.units.some(u=>p.officerIds.includes(u.id)));
 const orders=s.campaign.domestic.orders.filter(q=>q.faction===p.faction&&q.kind==='expedition'&&q.officerIds.some(id=>p.officerIds.includes(id)));
 const report=cityIntelligence(s,p.target,p.faction),observed=!waitingForScout(s,p.faction,p.target);
 const ready=p.officerIds.every(id=>{const o=residentOfficer(s,id);return o?.faction===p.faction&&o.location===p.staging&&!o.army&&!o.unit.mission&&!pendingDomesticOrder(s,id);});
 const supplied=!!staging&&staging.grain>=homeFood(s,staging)+(p.reserves[p.staging]||0)&&p.origins.every(g=>{
  const c=s.cities.find(c=>c.id===g.cityId);return !c?.units.some(u=>g.officerIds.includes(u.id))||c.grain>=homeFood(s,c)+(p.reserves[c.id]||0);
 });
 const goal=s.campaign.ai.factions[p.faction].strategy.goal;
 const funded=goal?.planId!==p.id||goal.requirements.every(r=>{const c=s.cities.find(c=>c.id===r.cityId);return c?.owner===p.faction&&c.gold>=r.gold&&c.manpower>=r.manpower;});
 const occupied=target?.owner===p.faction,launched=['attack','consolidate','complete'].includes(p.phase)||occupied;
 const conditions={observe:observed,supply:supplied&&funded||launched,assemble:ready||launched,assault:occupied,secure:p.phase==='complete'};
 for(const task of p.tasks){
  const refs=!operational?task.refs:task.id==='observe'?s.campaign.scouting.tasks.filter(t=>t.faction===p.faction&&t.targetCity===p.target).map(t=>'scout:'+t.id):task.id==='supply'?s.campaign.idle.filter(o=>o.faction===p.faction&&(o.destination||o.relayDestination)===p.staging&&o.cargo?.grain).map(o=>'officer:'+o.unit.id):task.id==='assemble'||task.id==='assault'?[...armies.map(a=>'army:'+a.id),...orders.map(q=>'order:'+q.id)]:[];
  const state=p.phase==='cancelled'?(task.status==='done'?'done':'cancelled'):conditions[task.id]?'done':task.id==='observe'&&refs.length||task.id==='supply'&&refs.length||task.id==='assemble'&&p.phase==='assemble'||task.id==='assault'&&p.phase==='attack'||task.id==='secure'&&p.phase==='consolidate'?'running':'waiting';
  if(task.status!==state){task.status=state;task.updatedDay=day;}
  task.refs=refs;
 }
 p.intelligence={day:report.day,visible:report.visible};
}
export function validateCaptureTasks(p,day,fail){
 const template=captureTasks(day);fail(Array.isArray(p.tasks)&&p.tasks.length===template.length);
 for(let i=0;i<template.length;i++){const t=p.tasks[i],expected=template[i];fail(t&&t.id===expected.id&&t.kind===expected.kind&&JSON.stringify(t.dependsOn)===JSON.stringify(expected.dependsOn)&&['waiting','running','done','cancelled'].includes(t.status)&&Number.isSafeInteger(t.updatedDay)&&t.updatedDay>0&&t.updatedDay<=day&&Array.isArray(t.refs)&&t.refs.every(r=>typeof r==='string'&&/^(scout|army|order|officer):[a-z0-9-]+$/.test(r)));}
 fail(p.intelligence&&(p.intelligence.day===null||Number.isSafeInteger(p.intelligence.day)&&p.intelligence.day>0&&p.intelligence.day<=day)&&typeof p.intelligence.visible==='boolean');
}
export function validateFactionStrategy(strategy,s,faction,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,city=id=>id===null||s.cities.some(c=>c.id===id);
 const candidateId=id=>typeof id==='string'&&id.length>0&&id.length<=20000&&!/[<>]/.test(id);
 const algorithms=profile=>{if(!profile)return false;try{strategicAlgorithmProfile(profile,{registered:false});return true;}catch{return false;}};
 fail(strategy?.version===R.version&&integer(strategy.revision)&&integer(strategy.updatedDay)&&strategy.updatedDay<=s.campaign.day&&typeof strategy.militarySignature==='string'&&strategy.militarySignature.length<100000&&typeof strategy.critical==='boolean');
 if(strategy.revision){let signature;try{signature=JSON.parse(strategy.militarySignature);}catch{fail(false);}fail(Array.isArray(signature)&&signature.length===2&&signature.every(Array.isArray));
  fail(signature[0].every(r=>Array.isArray(r)&&r.length===6&&city(r[0])&&typeof r[1]==='string'&&typeof r[2]==='boolean'&&typeof r[3]==='boolean'&&r.slice(4).every(n=>n===null||Number.isFinite(n)&&n>=0)));
  fail(signature[1].every(a=>a&&typeof a.id==='string'&&typeof a.faction==='string'&&typeof a.location==='string'&&(a.next===null||typeof a.next==='string')&&Number.isFinite(a.power)&&a.power>=0&&Number.isFinite(a.troops)&&a.troops>=0));
 }
 fail(strategy.neighbors&&Object.entries(strategy.neighbors).every(([f,n])=>f!==faction&&Object.hasOwn(s.campaign.diplomacy.policies,f)&&['attack','defend','peace'].includes(n.mode)&&Number.isFinite(n.pressure)&&n.pressure>=0&&typeof n.reason==='string'));
 const forecast=v=>v===null||v&&typeof v.feasible==='boolean'&&(v.readyDay===null||integer(v.readyDay)&&v.readyDay>0&&v.readyDay<=s.campaign.day+R.preparationTurns*10)&&typeof v.reason==='string';
  const g=strategy.goal;if(g){fail(candidateId(g.candidateId)&&['capture','defend','peace','recover','develop'].includes(g.kind)&&['preparing','ready','running','complete','cancelled'].includes(g.status)&&city(g.targetCity)&&city(g.staging)&&(g.targetFaction===null||g.kind==='capture'&&g.targetFaction==='neutral'||Object.hasOwn(s.campaign.diplomacy.policies,g.targetFaction))&&Number.isFinite(g.score)&&integer(g.createdDay)&&g.createdDay>0&&g.createdDay<=s.campaign.day&&typeof g.reason==='string'&&(g.planId===null||integer(g.planId)&&g.planId>0));fail(Array.isArray(g.requirements)&&new Set(g.requirements.map(r=>r.cityId)).size===g.requirements.length&&g.requirements.every(r=>r.cityId!==null&&city(r.cityId)&&['gold','grain','manpower'].every(k=>integer(r[k]))));fail(forecast(g.forecast));}
 fail(Array.isArray(strategy.trace)&&strategy.trace.length<=R.traceLimit&&strategy.trace.every(t=>integer(t.day)&&t.day>0&&t.day<=s.campaign.day&&typeof t.reason==='string'&&typeof t.selected==='string'&&algorithms(t.algorithms)&&Array.isArray(t.candidates)&&t.candidates.length<=R.candidateLimit&&t.candidates.every(c=>candidateId(c.candidateId)&&['capture','defend','peace','recover','develop'].includes(c.kind)&&city(c.target)&&Number.isFinite(c.score)&&typeof c.ready==='boolean'&&typeof c.reason==='string'&&forecast(c.forecast))));
}
