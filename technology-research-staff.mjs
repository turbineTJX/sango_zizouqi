import {residentOfficer} from './city-personnel.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {TECHS,canResearch,localTechnologies} from './city-technology.mjs';

// Only opening a new project needs the local research establishment. Ongoing
// projects retain their payment and progress when staff later leave or change jobs.
export function technologyResearchStaff(s,c,candidateId=null){
 const ids=new Set(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction==='technology').map(a=>a.officerId));
 if(candidateId)ids.add(candidateId);
 return [...ids].filter(id=>{
  const o=residentOfficer(s,id);
  return o?.location===c.id&&o.faction===c.owner&&!o.unit.scouting&&!plannedOfficer(s,id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(id));
 }).length;
}

// AI may fill a second real technology post once facilities and local funds
// support an advanced project; ordinary work selection still pays the real cost.
export function technologyStaffTarget(c,availableGold=c.gold){
 if(c.domestic.research)return 1;
 return Math.max(1,...localTechnologies(c).filter(id=>TECHS[id].cost<=availableGold&&canResearch(c,id,{researchers:2})).map(id=>TECHS[id].researchers));
}
