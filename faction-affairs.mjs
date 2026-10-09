import {DIRECTIONS,assignDomestic,assignmentFor,besieged,pendingDomesticOrder,domesticPriority,setDomesticPriority} from './domestic.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {playerFaction} from './player-faction.mjs';

export {domesticPriority,setDomesticPriority};
export function fillFactionAppointments(s,{faction=playerFaction(s),scheduled=false}={}){
 if(!scheduled&&s.campaign.phase!=='planning'||s.finished)return {error:'须在筹划阶段统一委任'};
 let count=0;
 for(const c of s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id))){
  for(const direction of domesticPriority(s,faction)){
   if(s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===direction))continue;
   const units=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!u.scouting&&!diplomaticAssignment(s,u.id)&&!assignmentFor(s,u.id)&&!pendingDomesticOrder(s,u.id)&&!plannedOfficer(s,u.id));
   const best=rankOfficerCandidates(s,units,{task:'domestic',city:c.id,direction}).find(x=>x.recommendation.available);
   if(best&&!assignDomestic(s,c.id,direction,best.unit.id,{faction,scheduled}))count++;
  }
 }
 return {count};
}
