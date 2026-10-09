import {workProfile,workChance,workValue} from './work-traits.mjs';
import {strategicTraits} from './strategic-traits.mjs';
import {bondLevels} from './bonds.mjs';
import {mechanicEntries} from './trait-mechanics.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {personnelSpeed} from './personnel-movement.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {ACTIONS,actionCandidates,DIRECTIONS} from './domestic.mjs';
import {domesticAbility,cooperationProfile,DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {roleTraits,COMMAND_TRAITS,officerTraits,WORK_TRAITS,taskTraitBonus} from './officer-traits.mjs';
import {PASSIVES,domesticEffects} from './passives.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {unitTactics,TROOPS,officerStratagems,STRATAGEMS} from './engine.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {withCitySupplyQueries} from './city-logistics.mjs';
import {armyRoleScore} from './army-appointments.mjs';
const round=n=>Math.round(n*10)/10;
const traitInfo=ids=>ids.map(id=>({id,name:PASSIVES[id]?.name||id,description:PASSIVES[id]?.description||''}));
// Deterministic, read-only heuristics. Scores compare candidates for the same job,
// not probabilities or a promise of a globally optimal assignment.
export function officerRecommendation(s,u,p){
 const c=s.cities?.find(c=>c.id===(p.city||p.cityId)),ids=officerTraits(u),effects=domesticEffects(u);let score=0,traits=[],reasons=[],available=true;
 if(p.task==='domestic'){
  const defs=Object.values(ACTIONS).filter(d=>d.direction===p.direction),ability=Math.max(...defs.map(d=>domesticAbility(u,d)));
  traits=ids.filter(id=>{const t=WORK_TRAITS[id];return id==='administration'||id==='benevolence'&&p.direction==='talent'||t?.scope==='cooperation'||t?.strategic?.effect==='crossCooperate'||t?.kinds&&defs.some(d=>(!t.work||t.work.actions.includes(d.id))&&t.kinds.includes(d.kind)&&(!t.direction||t.direction===d.direction)&&(!t.value||t.value===d.value));});
  const choices=c?actionCandidates(s,{cityId:c.id,direction:p.direction,officerId:u.id,lastKey:null,failures:0}):[];
  const best=choices[0]?.score??0,pool=choices.filter(x=>x.score>=best-14),weight=pool.reduce((n,x)=>n+x.score-best+15,0);
  // Same weighted candidate pool as autonomous work selection. Success, output,
  // actor-only savings and duration are evaluated against current city needs.
  score=pool.reduce((sum,x)=>{const d=ACTIONS[x.key],q=taskTraitBonus(u,d,'quantity')+(d.kind==='reassure'?Math.max(0,(effects.relief||0)-(domesticEffects(cityPersonnel(s,c.id).find(o=>o.unit.id===c.governor)?.unit).relief||0))/15:0),discount=taskTraitBonus(u,d,'recruitDiscount')+(d.kind==='build'?Math.max(0,(effects.projectDiscount||0)-(domesticEffects(cityPersonnel(s,c.id).find(o=>o.unit.id===c.governor)?.unit).projectDiscount||0)):0),factor=x.chance*1.03+Math.min(.15,Math.max(0,.98-x.chance))*.45;return sum+(x.score-best+15)*Math.max(1,x.score)*factor*(1+q+discount)*10/d.days;},0)/(weight||1);
  if(!pool.length){available=false;const specialty=Math.max(0,...defs.map(d=>(taskTraitBonus(u,d,'chance')+workChance(workProfile(ids,d),d))/.004+(workValue(workProfile(ids,d))-1)*20));score=(ability+specialty)*.1;reasons.push('候补负责人');if(specialty)reasons.push(`适用事务特性相当于主属性 +${round(specialty)}`);}
  reasons.push(`${DIRECTIONS[p.direction]} · ${DOMESTIC_STAT_LABELS[DIRECTION_STATS[p.direction]]} ${u[DIRECTION_STATS[p.direction]]}`);
  reasons.push('自动办理本方向事务');
  const colleagues=cityPersonnel(s,c?.id).filter(o=>o.unit.id!==u.id&&s.campaign.domestic.assignments.some(a=>a.officerId===o.unit.id&&(a.direction===p.direction||strategicTraits(u,'crossCooperate').length||strategicTraits(o.unit,'crossCooperate').length)));
  if(colleagues.length){const coop=Math.max(...colleagues.map(o=>{return Math.max(0,...pool.map(x=>{const profile=cooperationProfile(s,u,o.unit,ACTIONS[x.key]);return profile.chance*profile.gain;}));}));score*=1+coop;reasons.push(`同岗协作参考 +${Math.round(coop*100)}%`);}
 }else if(p.task==='governor'){
  traits=ids.filter(id=>PASSIVES[id]?.effects);score=u.politics+(effects.gold||0)*40+(effects.grain||0)*40+(effects.manpower||0)*25+(effects.projectDiscount||0)*30+(effects.relief||0)*2;reasons=[`政治 ${u.politics}`,'计入太守任职特性'];
 }else if(p.task==='transfer'){
  const transport=!!(u.troops||u.wounded||p.cargo?.gold||p.cargo?.grain||p.cargo?.manpower);traits=strategicTraits(u).filter(t=>t.scope==='transport').map(t=>t.id);score=personnelSpeed({unit:u,destination:p.destination||'candidate',cargo:p.cargo||{grain:0,manpower:0}});reasons=[`${transport?'运输':'轻装'}日行 ${round(score)}`];
 }else if(p.role){
  const stat=p.role==='advisor'?'intellect':'leadership';score=u[stat];const roleMechanics=mechanicEntries(u).filter(e=>e.rule.roles?.includes(p.role));traits=[...new Set([...roleTraits(u,p.role),...roleMechanics.map(e=>e.id)])];score=armyRoleScore(u,p.role);reasons=[`${{intellect:'智力',force:'武力',leadership:'统率'}[stat]} ${u[stat]}`];if(traits.length)reasons.push('任职特性：'+traits.map(id=>PASSIVES[id].name).join('、'));const eligible=['leader','advisor'].includes(p.role)&&officerStratagems(u.id).length>0;traits=[...new Set([...traits,...(p.role==='leader'?strategicTraits(u).filter(t=>t.scope==='army').map(t=>t.id):[])])];if(eligible)reasons.push('提供军略：'+officerStratagems(u.id).map(id=>STRATAGEMS[id].name).join('、'));else reasons.push('未列入军略持有人名单');
 }else if(p.task==='recruit'){score=Math.max(0,troopCapacity(u)-u.troops-u.wounded);reasons=[`可补兵员 ${score} · 伤兵 ${u.wounded}`];
 }else{
  const type=p.types?.[u.id]||p.type||u.type,apt=troopAptitude(u,type);traits=ids.filter(id=>PASSIVES[id]?.domain==='battle');score=u.leadership*.4+Math.max(u.force,u.intellect)*.25+apt*8+Math.min(15,(u.troops||0)/300)+unitTactics({...u,type}).length*2;reasons=[`${TROOPS[type].name}适性 ${['C','B','A','S'][apt]}`,`统率 ${u.leadership} · 现役 ${u.troops||0}`];
 }
 const assignment=s.campaign?.domestic?.assignments.find(a=>a.officerId===u.id),same=p.task==='domestic'&&assignment?.direction===p.direction&&assignment?.cityId===c?.id;
 if(u.mission){score*=.65;reasons.push('外出任务中，须返城');}
 else if(assignment?.action&&!same&&['domestic','transfer','expedition'].includes(p.task)){const delay=Math.min(15,assignment.action.remaining||0);score-=delay;reasons.push(`当前事务尚余 ${round(assignment.action.remaining)} 天`);}
 if(['expedition','formation','unit'].includes(p.task)){const levels=bondLevels(u);const points=Object.values(levels).reduce((n,v)=>n+v,0);score+=points*2;traits=[...new Set([...traits,...Object.keys(levels)])];if(points)reasons.push('已获得羁绊 '+points+' 点');}
 return {availabilityPriority:p.task==='expedition'?(u.mission?2:assignment?.action?1:0):0,score:round(score),available,traits:traitInfo(traits),reasons};
}
export const compareRecommendations=(a,b)=>Number(b.recommendation.available)-Number(a.recommendation.available)||(a.recommendation.availabilityPriority||0)-(b.recommendation.availabilityPriority||0)||b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id);
export function rankOfficerCandidates(s,units,p){return withCitySupplyQueries(s,()=>units.map(unit=>({unit,recommendation:officerRecommendation(s,unit,p)})).sort(compareRecommendations));}
