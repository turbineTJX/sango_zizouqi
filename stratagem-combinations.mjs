import {hasStatus,setStatus,shieldAmount,unitTactics,tacticTarget,recoverableWounded} from './tactics.mjs';
import {decoyTargets} from './battle-status-rules.mjs';
import {battleBuildings,buildingTargetValue} from './building-rules.mjs';
import {gateTarget} from './battlefield.mjs';
import {statusFraction} from './tactic-power.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {tacticUsesLeft} from './tactic-tempo.mjs';
import {isTargetable,canStrikeFrom} from './engagement.mjs';
import {hexDistance} from './hex-grid.mjs';
import {STATUS_DEFINITIONS} from './data/design/battle-statuses.mjs';

export function combinationText(p){
 const percent=n=>Number((n*100).toFixed(1))+'%';
 const describe=e=>{
  const detail={shield:'兵力上限'+percent(e.fraction),valor:'攻击+'+percent(e.fraction),armorBreak:'防御−'+percent(e.fraction),slow:'移动减半',nexus:'谋略威力、军纪+'+percent(e.fraction),attackSlow:'普攻间隔+'+percent(e.fraction),attackHaste:'普攻间隔−'+percent(e.fraction),weaken:'攻击−'+percent(e.fraction),ward:'直接减伤'+e.percent+'%'}[e.status];
  return STATUS_DEFINITIONS[e.status].name+(detail?'（'+detail+'）':'')+' '+e.steps+'回合';
 };
 const c=p.combination;
 return c.benefits.map(describe).join('、')+(c.intentCost?'；每队消耗'+c.intentCost+'战意，不足者不受益':'')+(c.penalties.length?'；'+(c.penaltyTarget==='provider'?'施放者本队':'受益部队')+'获得'+c.penalties.map(describe).join('、'):'')+(c.penaltyTarget==='provider'?'；施放者须在场且不领取保护':'');
}

// Every timed component, including penalties, snapshots the same actual caster.
// Shield amounts also retain the existing caster-strength scaling and shared cap.
export const combinationSteps=(s,steps,power)=>Math.max(1,Math.min(s.cooldown-1,Math.round(steps*power)));
export function combinationProfile(s,power){
 const scaled=e=>({...e,steps:combinationSteps(s,e.steps,power),...(e.status==='shield'?{fraction:Math.min(1,e.fraction*power)}:{})});
 return {...s.combination,benefits:s.combination.benefits.map(scaled),penalties:s.combination.penalties.map(scaled)};
}
export function combinationStatusExtra(e){
 return {...(e.fraction!==undefined?{fraction:e.fraction}:{}),...(e.percent!==undefined?{percent:e.percent}:{}),...(['valor','nexus'].includes(e.status)?{potency:e.fraction/(e.status==='valor'?.25:.2)}:{})};
}
export function combinationHasEffect(b,s,u,profile){
 if(!s.combination||!profile?.combination)return false;
 if((s.combination.intentCost||0)>u.intent)return false;
 if(s.scope.anchor==='provider'&&profile.id===u.id)return false;
 return profile.combination.benefits.some(e=>{
  if(e.status==='shield')return shieldAmount(b,u)<u.maxHp;
  if(!hasStatus(b,u,e.status))return true;
  if(['valor','nexus'].includes(e.status))return statusFraction(u,e.status,e.status==='valor'?.25:.2)<e.fraction;
  if(e.fraction!==undefined)return (u.statuses[e.status].fraction??0)<e.fraction;
  if(e.percent!==undefined)return (u.statuses[e.status].percent??0)<e.percent;
  return false;
 });
}
// AI only asks whether there is a current legal target; it does not search
// combinations, predict movement, or score bond-derived gains.
export function combinationAiTarget(b,s,u){
 if(['allOutAttack','opportunisticAssault'].includes(s.effect)){
  const stats=unitAttributes(u,b,{ignoreBonds:true});
  const gate=gateTarget(b,u),api={visible:e=>isTargetable(b,e),stasis:e=>hasStatus(b,e,'stasis'),wounded:recoverableWounded,healFactor:e=>hasStatus(b,e,'plague')?.5:1};
  const targets=[...b.sides[1-u.side].units.filter(e=>e.status==='active'&&e.hp>0),...decoyTargets(b,1-u.side),...battleBuildings(b).filter(e=>e.side!==u.side&&e.hp>0&&(e===gate||buildingTargetValue(b,e,api)>0))];
  return targets.some(e=>isTargetable(b,e)&&hexDistance(u,e)>=stats.minRange&&hexDistance(u,e)<=stats.range&&canStrikeFrom(b,u,e));
 }
 if(s.effect==='focusedPlanning')return unitTactics(u).some(t=>!t.passive&&t.category==='intellect'&&tacticUsesLeft(u,t)>0&&tacticTarget(b,u,t,unitAttributes(u,b,{ignoreBonds:true}).range));
 return true;
}
export function applyCombination(b,key,s,p,targets,provider,point){
 const source={sourceId:p.id,sourceName:p.name,sourceSkillName:s.name,sourceCommand:key,castTick:b.tick};
 const apply=(u,e,role)=>{
  const extra={...source,...combinationStatusExtra(e),duration:e.steps,commandRole:role};
  if(e.status==='shield')setStatus(b,u,'shield',e.steps,{...extra,amount:Math.round(u.maxHp*e.fraction),source:'command:'+key,label:s.name});
  else {
   // A shorter command must not extend or replace an existing longer protection.
   if(e.status==='resolve'&&hasStatus(b,u,'resolve')&&u.statuses.resolve.until>=b.tick+e.steps+1)return;
   if(role==='benefit'&&hasStatus(b,u,e.status)&&u.statuses[e.status].until>=b.tick+e.steps+1){
    const old=u.statuses[e.status],magnitude=['valor','nexus'].includes(e.status)?statusFraction(u,e.status,e.status==='valor'?.25:.2):old.fraction??old.percent??0;
    if(magnitude>=(e.fraction??e.percent??0))return;
   }
   setStatus(b,u,e.status,e.steps,extra);
  }
 };
 const recipients=targets.map(u=>{
  const intentBefore=u.intent,cost=p.combination.intentCost||0;
  u.intent-=cost;
  for(const e of p.combination.benefits)apply(u,e,'benefit');
  if(p.combination.penaltyTarget!=='provider')for(const e of p.combination.penalties)apply(u,e,'penalty');
  return {id:u.id,x:u.x,y:u.y,intentBefore,intentAfter:u.intent,cost};
 });
 if(p.combination.penaltyTarget==='provider')for(const e of p.combination.penalties)apply(provider,e,'penalty');
 b.sides[provider.side].stratagemEvents.push({key,castTick:b.tick,source:{...p},point:{...point},providerPosition:{x:provider.x,y:provider.y},units:recipients});
}

// Source, duration and magnitude are checked against the saved caster profile.
// A durable cast record retains paid costs even after an abnormality is cleansed.
export function validCombinationStatus(b,u,key,status,design,profile){
 if(!design?.combination||!profile?.combination)return false;
 const side=b.sides[u.side],event=side.stratagemEvents.find(e=>e.key===status.sourceCommand&&e.castTick===status.castTick&&e.source.id===status.sourceId);
 if(!event||status.sourceSkillName!==design.name)return false;
 const role=status.commandRole,parts=role==='benefit'?profile.combination.benefits:role==='penalty'?profile.combination.penalties:[];
 const e=parts.find(e=>e.status===key);if(!e)return false;
 const providerPenalty=role==='penalty'&&profile.combination.penaltyTarget==='provider';
 if(providerPenalty?u.id!==profile.id:!event.units.some(r=>r.id===u.id))return false;
 const extra=combinationStatusExtra(e);
 return status.duration===e.steps&&status.until===status.castTick+e.steps+1&&['fraction','percent','potency'].every(k=>status[k]===extra[k]);
}
export function validCombinationShield(b,u,layer,design,profile){
 const e=profile?.combination?.benefits.find(e=>e.status==='shield');
 const event=b.sides[u.side].stratagemEvents.find(e=>e.key===layer.sourceCommand&&e.castTick===layer.castTick&&e.source.id===layer.sourceId);
 return !!(design?.combination&&e&&event?.units.some(r=>r.id===u.id)&&layer.source==='command:'+layer.sourceCommand&&layer.label===design.name&&layer.until===layer.castTick+e.steps+1&&layer.amount<=Math.round(u.maxHp*e.fraction));
}
