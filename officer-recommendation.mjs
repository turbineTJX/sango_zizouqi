import {domesticAssignmentError} from './domestic-staffing.mjs';
import {DOMESTIC_RECOMMENDATION_RULES} from './data/design/domestic-actions.mjs';
import {strategicTraits} from './strategic-traits.mjs';
import {mechanicEntries} from './trait-mechanics.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {personnelSpeed} from './personnel-movement.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {ACTIONS,actionCandidates,DIRECTIONS} from './domestic.mjs';
import {DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {roleTraits,officerTraits,WORK_TRAITS} from './officer-traits.mjs';
import {PASSIVES} from './passives.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {unitTactics,TROOPS,officerStratagems,STRATAGEMS} from './engine.mjs';
import {withPlanningQueries} from './planning-queries.mjs';
import {armyRoleScore} from './army-appointments.mjs';
const round=n=>Math.round(n*10)/10;
const traitInfo=ids=>ids.map(id=>({id,name:PASSIVES[id]?.name||id,description:PASSIVES[id]?.description||''}));
// Deterministic, read-only heuristics. Scores compare candidates for the same job,
// not probabilities or a promise of a globally optimal assignment.
export function officerRecommendation(s,u,p){
 const c=s.cities?.find(c=>c.id===(p.city||p.cityId)),ids=officerTraits(u);let score=0,traits=[],reasons=[],available=true;
 if(p.task==='domestic'){
  const defs=Object.values(ACTIONS).filter(d=>d.direction===p.direction),ability=u[DIRECTION_STATS[p.direction]]??0;
  traits=ids.filter(id=>{const t=WORK_TRAITS[id];return id==='administration'||id==='benevolence'&&p.direction==='talent'||t?.scope==='cooperation'||t?.strategic?.effect==='crossCooperate'||t?.kinds&&defs.some(d=>(!t.work||t.work.actions.includes(d.id))&&t.kinds.includes(d.kind)&&(!t.direction||t.direction===d.direction)&&(!t.value||t.value===d.value));});
  const choices=c?actionCandidates(s,{cityId:c.id,direction:p.direction,officerId:u.id,lastKey:null,failures:0}):[];
  // Rank appointments by their displayed main attribute and related traits.
  // Actual work selection and results keep their own shared execution rules.
  score=ability+(traits.length?DOMESTIC_RECOMMENDATION_RULES.relatedTraitBonus:0);
  if(!choices.length){available=false;reasons.push('候补负责人');}
  reasons.push(`${DIRECTIONS[p.direction]} · ${DOMESTIC_STAT_LABELS[DIRECTION_STATS[p.direction]]} ${u[DIRECTION_STATS[p.direction]]}`);
  reasons.push('自动办理本方向事务');
  if(traits.length)reasons.push(`相关特性 ${traits.length} 项 · 推荐 +${DOMESTIC_RECOMMENDATION_RULES.relatedTraitBonus}`);
  const capacityError=c&&domesticAssignmentError(s,c.id,p.direction,[u.id]);if(capacityError){available=false;reasons.push(capacityError);}
 }else if(p.task==='governor'){
  traits=ids.filter(id=>PASSIVES[id]?.effects);score=u.politics+(traits.length?DOMESTIC_RECOMMENDATION_RULES.relatedTraitBonus:0);reasons=[`政治 ${u.politics}`,'计入太守任职特性'];
 }else if(p.task==='transfer'){
  const transport=!!(u.troops||u.wounded||p.cargo?.gold||p.cargo?.grain||p.cargo?.manpower);traits=strategicTraits(u).filter(t=>t.scope==='transport').map(t=>t.id);score=personnelSpeed({unit:u,destination:p.destination||'candidate',cargo:p.cargo||{grain:0,manpower:0},relayDestination:p.relayDestination,convoyCycle:p.convoyCycle});reasons=[`${transport?'运输':'轻装'}日行 ${round(score)}`];
 }else if(p.role){
  const stat=p.role==='advisor'?'intellect':'leadership';score=u[stat];const roleMechanics=mechanicEntries(u).filter(e=>e.rule.roles?.includes(p.role));traits=[...new Set([...roleTraits(u,p.role),...roleMechanics.map(e=>e.id)])];score=armyRoleScore(u,p.role);reasons=[`${{intellect:'智力',force:'武力',leadership:'统率'}[stat]} ${u[stat]}`];if(traits.length)reasons.push('任职特性：'+traits.map(id=>PASSIVES[id].name).join('、'));const eligible=['leader','advisor'].includes(p.role)&&officerStratagems(u.id).length>0;traits=[...new Set([...traits,...(p.role==='leader'?strategicTraits(u).filter(t=>t.scope==='army').map(t=>t.id):[])])];if(eligible)reasons.push('提供军略：'+officerStratagems(u.id).map(id=>STRATAGEMS[id].name).join('、'));else reasons.push('未列入军略持有人名单');
 }else if(p.task==='recruit'){score=Math.max(0,troopCapacity(u)-u.troops-u.wounded);reasons=[`可补兵员 ${score} · 伤兵 ${u.wounded}`];
 }else{
  const type=p.types?.[u.id]||p.type||u.type,apt=troopAptitude(u,type);traits=ids.filter(id=>PASSIVES[id]?.domain==='battle');score=u.leadership*.4+Math.max(u.force,u.intellect)*.25+apt*8+Math.min(15,(u.troops||0)/300)+unitTactics({...u,type}).length*2;reasons=[`${TROOPS[type].name}适性 ${['C','B','A','S'][apt]}`,`统率 ${u.leadership} · 现役 ${u.troops||0}`];
 }
 const assignment=s.campaign?.domestic?.assignments.find(a=>a.officerId===u.id),same=p.task==='domestic'&&assignment?.direction===p.direction&&assignment?.cityId===c?.id;
 if(u.mission){if(p.task!=='domestic')score*=.65;reasons.push('外出任务中，须返城');}
 else if(assignment?.action&&!same&&['domestic','transfer','expedition'].includes(p.task)){if(p.task!=='domestic')score-=Math.min(15,assignment.action.remaining||0);reasons.push(`当前事务尚余 ${round(assignment.action.remaining)} 天`);}
 return {availabilityPriority:p.task==='expedition'?(u.mission?2:assignment?.action?1:0):0,score:round(score),available,traits:traitInfo(traits),reasons};
}
export const compareRecommendations=(a,b)=>Number(b.recommendation.available)-Number(a.recommendation.available)||(a.recommendation.availabilityPriority||0)-(b.recommendation.availabilityPriority||0)||b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id);
export function rankOfficerCandidates(s,units,p){
 const evaluate=()=>units.map(unit=>({unit,recommendation:officerRecommendation(s,unit,p)})).sort(compareRecommendations);
 return s.campaign?withPlanningQueries(s,evaluate):evaluate();
}
