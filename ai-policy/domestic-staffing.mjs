import {runCoordinatedAction,runDecisionModule} from './action-runtime.mjs';
import {rearOptionalHiring} from './faction-demand.mjs';
import {isAITurnStart} from '../ai-turn.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {cityNeedsAgriculture,cityNeedsCommerce} from '../economy.mjs';
import {plannedOfficer} from '../strategic-intent.mjs';
import {diplomaticAssignment} from '../diplomacy-relations.mjs';
import {domesticStaffing,domesticAssignmentError} from '../domestic-staffing.mjs';
import {assignDomestic,assignmentFor,setDomesticPriority,domesticWorkBudget} from '../domestic.mjs';
import {appointGovernor} from '../strategic-campaign.mjs';
import {DIRECTIONS} from '../domestic-designs.mjs';
import {isAIControlled} from '../player-faction.mjs';
import {rankOfficerCandidates} from '../officer-recommendation.mjs';
import {withCitySupplyQueries} from '../city-logistics.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {staffingOfficer} from '../strategic-staffing.mjs';
import {appendActivityNode} from '../activity-nodes.mjs';
import {cityFoodRelief} from './food-relief.mjs';
import {technologyStaffTarget,technologyResearchStaff} from '../technology-research-staff.mjs';
import {firstDomesticMatch,orderedDomesticRules} from './rule-match.mjs';
import {preparePersonnelRetention} from './personnel-retention.mjs';

function policy_prepareEnemyDomestic(s){
 if(!isAITurnStart(s))return;
 if(!s.campaign.scenarioId)return;
 for(const faction of [...new Set(s.cities.filter(c=>isAIControlled(s,c.owner)).map(c=>c.owner))]){
  const cities=s.cities.filter(c=>c.owner===faction),first=withCitySupplyQueries(s,()=>[cities.some(c=>cityNeedsAgriculture(s,c))?'agriculture':null,cities.some(c=>cityNeedsCommerce(s,c))?'commerce':null].filter(Boolean));
  setDomesticPriority(s,[...first,...Object.keys(DIRECTIONS).filter(d=>!first.includes(d))],{faction,scheduled:true});
 }
 for(const c of s.cities.filter(c=>isAIControlled(s,c.owner))){
  if(s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===c.id))continue;
  preparePersonnelRetention(s,c);
  if(!c.governor){const best=rankOfficerCandidates(s,cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!u.scouting&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!staffingOfficer(s,u.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id))),{task:'governor',city:c.id}).find(x=>x.recommendation.available);if(best)appointGovernor(s,c.id,best.unit.id,{scheduled:true,faction:c.owner});}
  // Reuse a waiting optional worker when the city has lost its sole producer.
  // Paid active work continues; this is a real appointment, never free income.
  const {priorities,food}=withCitySupplyQueries(s,()=>({priorities:[cityNeedsAgriculture(s,c)?'agriculture':null,cityNeedsCommerce(s,c)?'commerce':null].filter(Boolean),food:cityFoodRelief(s,c)}));
  for(const direction of priorities){
   const resident=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.mission&&!u.scouting&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id)));
   if(resident.some(u=>assignmentFor(s,u.id)?.direction===direction))continue;
   const eligible=resident.filter(u=>!assignmentFor(s,u.id)?.action&&!priorities.includes(assignmentFor(s,u.id)?.direction)&&(!staffingOfficer(s,u.id)||direction==='agriculture'&&food.urgent)),free=eligible.filter(u=>!assignmentFor(s,u.id));
   const best=firstDomesticMatch(s,free.length?free:eligible,c.id,direction);
   if(best){
    const promise=s.campaign.ai.staffing.find(p=>p.officerId===best.unit.id);
    if(!assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner})&&promise&&direction!==promise.direction){
     s.campaign.ai.staffing=s.campaign.ai.staffing.filter(p=>p!==promise);
     appendActivityNode(s,{sourceId:`staffing-food-emergency:${best.unit.id}:${promise.createdDay}:${s.campaign.day}`,category:'personnel',phase:'staffing-released',faction:c.owner,cityId:c.id,officerId:best.unit.id,
      text:`${c.name}实际口粮告急，${best.unit.name}解除调任${DIRECTIONS[promise.direction]}承诺，改任农业救急。`,
      result:{reason:'staffing-food-emergency',formerDirection:promise.direction,nextDirection:direction,grain:c.grain,dailyFood:food.use}});
    }
   }
  }
  const assigned=new Set(s.campaign.domestic.assignments.map(a=>a.officerId));
  let units=cityPersonnel(s,c.id).map(o=>o.unit).filter(u=>!u.scouting&&!assigned.has(u.id)&&!diplomaticAssignment(s,u.id)&&!plannedOfficer(s,u.id)&&!staffingOfficer(s,u.id)&&!u.mission&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(u.id)));
  const rationed=rearOptionalHiring(s,c);
  const directions=Object.keys(DIRECTIONS).filter(direction=>(!rationed||['agriculture','commerce','martial','technology'].includes(direction))&&!s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===direction));
  // Secure food staffing before optional jobs when planned soldiers outconsume
  // recurring fields. Existing appointments and active work remain intact.
  const foodPriority=cityNeedsAgriculture(s,c),cashPriority=cityNeedsCommerce(s,c);
  directions.sort((a,b)=>(foodPriority?Number(b==='agriculture')-Number(a==='agriculture'):0)||(cashPriority?Number(b==='commerce')-Number(a==='commerce'):0));
  for(const direction of directions){
   const best=firstDomesticMatch(s,units.filter(u=>!assigned.has(u.id)),c.id,direction);
   if(best&&!assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner}))assigned.add(best.unit.id);
  }
  // Additional civil officers perform real autonomous work, using the same
  // recommendation scores and costs as player appointments. Never reassign work.
  for(let slot=1;slot<(rationed?1:ECONOMY_RULES.ai.economicWorkersPerDirection);slot++)for(const direction of ['agriculture','commerce','military']){
   if(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction).length>slot||!domesticStaffing(s,c.id,direction).remaining)continue;
   const best=firstDomesticMatch(s,units.filter(u=>!assigned.has(u.id)),c.id,direction);
   if(best&&!assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner}))assigned.add(best.unit.id);
  }
  const researchTarget=technologyStaffTarget(c,domesticWorkBudget(s,c).gold);
  while(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction==='technology').length<researchTarget&&domesticStaffing(s,c.id,'technology').remaining){
   const free=units.filter(u=>!assigned.has(u.id)),match=firstDomesticMatch(s,free,c.id,'technology');
   const team=match?[]:orderedDomesticRules(free,'technology').filter(x=>!domesticAssignmentError(s,c.id,'technology',[x.unit.id]));
   // Forming a missing team is a lawful appointment even when its first member
   // alone cannot yet start research. Require the whole team before committing.
   const forming=researchTarget>1&&technologyResearchStaff(s,c)===0&&team.length>=researchTarget&&domesticStaffing(s,c.id,'technology').remaining>=researchTarget;
   const best=match||(forming?team[0]:null);
   if(!best||assignDomestic(s,c.id,'technology',best.unit.id,{scheduled:true,faction:c.owner}))break;
   assigned.add(best.unit.id);
  }
 }
}

export function prepareEnemyDomestic(...args){return runDecisionModule('prepareEnemyDomestic',args,()=>policy_prepareEnemyDomestic(...args));}
