import {cityRoads} from './road-network.mjs';
import {mapNode} from './map-node-data.mjs';
import {roadCost} from './road-metrics.mjs';
import {cityIntelligence,cityVisible,directPointVisible,visionEnabled} from './strategic-vision.mjs';
import {dispatchScout,recallScout,scoutCandidates,scoutRoute,scoutAssignments} from './scouting.mjs';
import {offensivePlans,plannedOfficer} from './strategic-intent.mjs';
import {factionsHostile,diplomaticAssignment} from './diplomacy-relations.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {assignmentFor,cancelDomestic} from './domestic.mjs';
import {STRATEGIC_SCOUTING_RULES as RULES} from './data/design/strategic-scouting-rules.mjs';

const adjacent=(s,id)=>cityRoads(s).flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const besieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const localWorkers=(s,c)=>cityPersonnel(s,c.id).filter(o=>!o.army&&!o.unit.mission&&!o.unit.scouting&&!diplomaticAssignment(s,o.unit.id)&&!plannedOfficer(s,o.unit.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(o.unit.id))).length;
function availableScout(s,c,faction){
 if(localWorkers(s,c)<=RULES.minimumLocalWorkers)return null;
 const free=scoutCandidates(s,c.id,faction)[0];if(free)return free;
 const d=s.campaign.domestic,waiting=new Set(d.assignments.filter(a=>a.cityId===c.id&&!a.action&&!['agriculture','commerce'].includes(a.direction)).map(a=>a.officerId));
 if(!waiting.size)return null;
 // Assess shared eligibility after releasing an unstarted optional appointment.
 const candidateWorld={...s,campaign:{...s.campaign,domestic:{...d,assignments:d.assignments.filter(a=>!waiting.has(a.officerId))}}};
 return scoutCandidates(candidateWorld,c.id,faction)[0];
}
function priority(s,faction,target,frontier,planned){
 const i=cityIntelligence(s,target,faction);
 if(directPointVisible(s,mapNode(s,target),faction)||!factionsHostile(s,faction,i.owner))return 0;
 if(!frontier&&!planned)return 0;
 const age=i.day===null?RULES.unknownPriority:Math.min(RULES.maximumAgePriority,(s.campaign.day-i.day)*RULES.agePriorityPerDay);
 return (planned?RULES.planPriority:RULES.frontierPriority)+age;
}

// Called daily, using the same current and last observations as the player's map.
export function planStrategicScouting(s,faction){
 if(!visionEnabled(s)||!s.campaign.scouting)return;
 const homes=s.cities.filter(c=>c.owner===faction),frontier=new Set(homes.flatMap(c=>adjacent(s,c.id)));
 const planned=new Set(offensivePlans(s).filter(p=>p.faction===faction).map(p=>p.target));
 const goal=s.campaign.ai?.factions[faction]?.strategy?.goal;if(goal?.kind==='capture'&&!['complete','cancelled'].includes(goal.status))planned.add(goal.targetCity);
 const score=id=>priority(s,faction,id,frontier.has(id),planned.has(id));
 for(const t of [...scoutAssignments(s)].filter(t=>t.faction===faction)){
  if(!score(t.targetCity)||mapNode(s,t.homeCity)?.owner!==faction)recallScout(s,t.officerId,{faction});
 }
 for(const c of homes){
  const tasks=scoutAssignments(s).filter(t=>t.faction===faction&&t.homeCity===c.id).sort((a,b)=>score(a.targetCity)-score(b.targetCity)||b.id.localeCompare(a.id));
  for(const t of tasks){if(localWorkers(s,c)>=RULES.minimumLocalWorkers)break;recallScout(s,t.officerId,{faction});}
 }
 const choices=[];
 for(const c of homes.filter(c=>!besieged(s,c.id))){
  const officer=availableScout(s,c,faction);
  if(!officer&&!scoutAssignments(s).some(t=>t.faction===faction&&t.homeCity===c.id&&t.phase==='watch'&&t.contacts.some(c=>c.report)))continue;
  for(const target of new Set([...adjacent(s,c.id),...planned])){
   const value=score(target);if(!value||cityVisible(s,target,faction))continue;
   const report=cityIntelligence(s,target,faction);if(!planned.has(target)&&report.day!==null&&s.campaign.day-report.day<RULES.refreshDays)continue;
   const path=scoutRoute(s,c.id,target);if(!path?.length)continue;
   let from=c.id,distance=0;for(const to of path){distance+=roadCost(s,from,to);from=to;}
   choices.push({c,target,officer,value,distance});
  }
 }
 choices.sort((a,b)=>b.value-a.value||a.distance-b.distance||(b.officer?.unit.intellect||0)-(a.officer?.unit.intellect||0)||a.target.localeCompare(b.target)||a.c.id.localeCompare(b.c.id));
 for(const x of choices){
  let tasks=scoutAssignments(s).filter(t=>t.faction===faction);
  if(tasks.some(t=>t.targetCity===x.target))continue;
  if(tasks.length>=RULES.maxAssignments){
   // Cover unknown and stale borders too, after obtaining useful intelligence.
   const hasOfficer=!!availableScout(s,x.c,faction);
   const replace=tasks.filter(t=>{
    const contact=t.contacts.find(c=>c.id===t.targetCity&&c.kind==='city'&&c.report);
    return t.phase==='watch'&&contact&&(planned.has(x.target)||s.campaign.day-contact.firstDay>=RULES.minimumObservationDays)&&score(t.targetCity)+RULES.replacementPriorityGap<=x.value&&(hasOfficer||t.homeCity===x.c.id);
   })
    .sort((a,b)=>score(a.targetCity)-score(b.targetCity)||a.id.localeCompare(b.id))[0];
   if(!replace)continue;
   recallScout(s,replace.officerId,{faction});
  }
  // Earlier assignments may have consumed this city's best officer.
  const officer=availableScout(s,x.c,faction);if(!officer)continue;
  if(assignmentFor(s,officer.unit.id))cancelDomestic(s,officer.unit.id,'优先取得边境侦察情报，调整尚未开始的事务');
  dispatchScout(s,x.c.id,officer.unit.id,x.target,{faction,scheduled:true});
 }
}

// A feasible scouting assignment gets its first/fresh report before committing
// an offensive. With no available scout, the normal conservative estimate applies.
export function waitingForStrategicScout(s,faction,target){
 if(!visionEnabled(s)||cityVisible(s,target,faction))return false;
 const i=cityIntelligence(s,target,faction);
 return (i.day===null||s.campaign.day-i.day>=RULES.refreshDays)&&scoutAssignments(s).some(t=>t.faction===faction&&t.targetCity===target&&!t.paused);
}
