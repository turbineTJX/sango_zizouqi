import {DIRECTIONS,assignDomestic,assignmentFor,besieged,pendingDomesticOrder} from './domestic.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {playerFaction} from './player-faction.mjs';

export const domesticPriority=s=>s.campaign.domestic.priority;
export function setDomesticPriority(s,priority){
 if(s.campaign.phase!=='planning'||s.finished)return '须在筹划阶段设置内政优先级';
 if(!Array.isArray(priority)||priority.length!==Object.keys(DIRECTIONS).length||new Set(priority).size!==priority.length||priority.some(d=>!DIRECTIONS[d]))return '每个内政方向须出现一次';
 s.campaign.domestic.priority=[...priority];return null;
}
export function fillFactionAppointments(s){
 if(s.campaign.phase!=='planning'||s.finished)return {error:'须在筹划阶段统一委任'};
 let count=0;
 for(const c of s.cities.filter(c=>c.owner===playerFaction(s)&&!besieged(s,c.id))){
  for(const direction of domesticPriority(s)){
   if(s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===direction))continue;
   const units=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!diplomaticAssignment(s,u.id)&&!assignmentFor(s,u.id)&&!pendingDomesticOrder(s,u.id)&&!plannedOfficer(s,u.id));
   const best=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction}).find(x=>x.recommendation.available);
   if(best&&!assignDomestic(s,c.id,direction,best.unit.id))count++;
  }
 }
 return {count};
}
