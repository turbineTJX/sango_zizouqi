import {mechanicEntries,traitEligible,traitChance,traitImmune} from './trait-mechanics.mjs';
import {hexDistance,hexBeyond} from './hex-grid.mjs';
import {isTargetable} from './engagement.mjs';
import {hasStatus,setStatus,openCell,unitTactics} from './tactics.mjs';
import {remedy,needsRemedy} from './battle-status-rules.mjs';
import {recordContribution} from './progression.mjs';
import {snapshotTactic,tacticOutcome} from './tactic-outcomes.mjs';

// The engine supplies its seeded RNG and shared damage/healing pipeline.
// Additional trait attacks never emit another trait attack event.
export function resolveTraitEvent(b,u,event,context,api){
 for(const entry of mechanicEntries(u,event)){
  const {rule:r,key,name}=entry;
  if(!traitEligible(b,u,r))continue;
  const old=u.traitState?.[key];
  if((old?.ready||0)>b.tick||(old?.uses||0)>=(r.maxUses??Infinity))continue;
  if(r.health!==undefined&&r.effect!=='rescue'&&u.hp/u.maxHp>=r.health)continue;
  if(r.movedWithin!==undefined&&(!(u.passiveState?.moveCount>0)||b.tick-u.passiveState.lastMoveTick>r.movedWithin))continue;
  const alive=t=>t.status==='active'&&t.hp>0;
  const allies=b.sides[u.side].units.filter(t=>alive(t)&&!t.withdrawing&&!hasStatus(b,t,'stasis'));
  const enemies=b.sides[1-u.side].units.filter(t=>alive(t)&&isTargetable(b,t));
  const lowest=(a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||a.id.localeCompare(c.id);
  const near=(t,anchor=u)=>hexDistance(anchor,t)<=(r.range??Infinity);
  const controllable=(t,status)=>!hasStatus(b,t,'resolve')&&!hasStatus(b,t,status)&&!traitImmune(t,status);
  let targets=[],target=context?.target;
  switch(r.effect){
   case 'adjacentConfuse':targets=enemies.filter(t=>near(t)&&controllable(t,'confuse'));break;
   case 'rescue':targets=allies.filter(t=>t!==u&&near(t)&&t.hp/t.maxHp<r.health).sort(lowest).slice(0,1);break;
   case 'allyShield':case 'guard':targets=allies.filter(t=>t!==u&&near(t)&&(r.effect!=='guard'||!hasStatus(b,t,'guard'))).sort(lowest).slice(0,1);break;
   case 'armyCleanse':targets=allies.filter(t=>t.armyId===u.armyId);break;
   case 'armyRemedy':targets=allies.filter(t=>t.armyId===u.armyId&&needsRemedy(b,t,'calm')).sort(lowest).slice(0,1);break;
   case 'sweep':targets=enemies.filter(t=>near(t)).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,r.targets);break;
   case 'followUp':targets=target&&enemies.includes(target)?[target]:[];break;
   case 'thunder':targets=target?enemies.filter(t=>t!==target&&near(t,target)).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,r.targets):[];break;
   case 'link':targets=target&&enemies.includes(target)?[target,...enemies.filter(t=>t!==target&&near(t,target)).sort((a,c)=>a.id.localeCompare(c.id))].slice(0,r.targets):[];if(targets.length<2)targets=[];break;
   case 'spreadFire':targets=target&&hasStatus(b,target,'burn')?enemies.filter(t=>t!==target&&near(t,target)&&!hasStatus(b,t,'burn')).sort((a,c)=>a.id.localeCompare(c.id)).slice(0,1):[];break;
   case 'debuff':case 'status':case 'push':case 'disrupt':case 'burn':case 'drain':
    targets=target&&!target.isDecoy&&near(target)&&context.damage>0&&(r.effect==='drain'||enemies.includes(target))?[target]:[];
    if(r.greater)targets=targets.filter(t=>u[r.greater]>t[r.greater]);
    if(['status','push','disrupt'].includes(r.effect))targets=targets.filter(t=>controllable(t,r.status||'disrupted'));
    if(r.effect==='push')targets=targets.filter(t=>{const cell=hexBeyond(u,t);return !hasStatus(b,t,'phalanx')&&openCell(b,cell.x,cell.y,t);});
    if(r.effect==='drain'&&!api.wounded(u))targets=[];
    break;
   case 'steadyRange':
    if(b.tick-(u.passiveState?.lastMoveTick??b.tick)<r.steady){if(u.statuses.longRange?.sourceSkillName===name)delete u.statuses.longRange;continue;}
    targets=[u];break;
   case 'entryStealth':case 'phase':case 'rallySelf':case 'commandRefund':targets=[u];break;
   default:continue;
  }
  if(!targets.length)continue;
  const presentationBefore=snapshotTactic(b),effectStart=b.effects.length;
  const report=()=>{
   const events=b.effects.slice(effectStart).filter(e=>e.from===u.id&&e.label===name);
   for(const e of events){e.abilityKind='trait';e.traitId=entry.id;}
   if(events.length){
    const outcome=tacticOutcome(b,u,presentationBefore,events,{includeOngoing:true});
    events[0].outcome=outcome;
    events[0].traitEffective=outcome.some(t=>t.damage||t.healing||t.absorbed||t.changes.length)||events.some(e=>e.commandRestored>0);
    for(const t of outcome)for(const e of events.filter(e=>e.to===t.id&&/未触发|未成功/.test(e.text||'')))t.changes.push(e.text);
   }
  };
  u.traitState ||= {};u.traitState[key]={uses:(old?.uses||0)+1,ready:b.tick+(r.interval||0)};
  const source={sourceId:u.id,sourceName:u.name,sourceSkillName:name};
  const status=(t,k,steps,extra={})=>{
   const before=JSON.stringify(t.statuses[k]);setStatus(b,t,k,steps,{...source,...extra});
   const changed=JSON.stringify(t.statuses[k])!==before;
   if(changed&&t!==u)recordContribution(u,t.side===u.side?'support':'control',1);
   return changed;
  };
  const shield=(t,fraction)=>status(t,'shield',r.steps,{amount:Math.floor(t.maxHp*fraction),source:u.id+':'+key,label:u.name+' · '+name});
  // Area attacks use one roll per attack; control auras roll once per target.
  if(r.effect!=='adjacentConfuse'&&r.chance!==undefined&&api.random(b)>=traitChance(u,targets[0],r)){
   api.signal(u,targets[0],name,{text:name+' · 未触发'});report();continue;
  }
  for(const t of targets){
   if(!traitEligible(b,u,r))break;
   switch(r.effect){
    case 'adjacentConfuse':{
     const chance=traitChance(u,t,r),success=api.random(b)<chance,k='confuse';
     if(success)api.control(t,r.steps,k,source);
     if(success)recordContribution(u,'control',1);
     api.signal(u,t,name,{text:name+' · '+Math.round(chance*100)+'% · '+(success?'成功':'未成功')});break;
    }
    case 'debuff':for(const k of r.statuses)status(t,k,r.steps,{fraction:r.fraction});api.signal(u,t,name);break;
    case 'status':api.control(t,r.steps,r.status,source);recordContribution(u,'control',1);api.signal(u,t,name);break;
    case 'push':{const from={x:t.x,y:t.y},cell=hexBeyond(u,t);Object.assign(t,cell);api.moved(b,t,from);api.control(t,r.steps,'disrupted',source);recordContribution(u,'control',1);api.signal(u,t,name,{text:name+' · 击退'});break;}
    case 'disrupt':api.control(t,r.steps,'disrupted',source);status(t,'slow',r.steps);api.signal(u,t,name);break;
    case 'rescue':remedy(b,t,'calm');shield(t,r.fraction);api.signal(u,t,name);break;
    case 'allyShield':shield(t,r.fraction);api.signal(u,t,name);break;
    case 'guard':status(t,'guard',r.steps);api.signal(u,t,name);break;
    case 'armyCleanse':remedy(b,t,'calm');status(t,'resolve',r.steps);api.signal(u,t,name);break;
    case 'armyRemedy':if(remedy(b,t,'calm').length){recordContribution(u,'support',1);api.signal(u,t,name);}break;
    case 'sweep':case 'followUp':case 'thunder':api.damage(u,t,r.scale,{name,category:r.effect==='thunder'?'intellect':'force',trait:true,visual:r.effect==='thunder'?'shockwave':'slash'});break;
    case 'link':status(t,'link',r.steps,{group:u.id+':'+key+':'+b.tick});api.signal(u,t,name);break;
    case 'burn':case 'spreadFire':status(t,'burn',r.steps,{amount:Math.max(1,Math.round(api.attributes(u).strategyPower*r.scale*100/(100+api.attributes(t).discipline)))});api.signal(u,t,name);break;
    case 'drain':{
     const amount=Math.min(api.wounded(u),u.maxHp-u.hp,Math.floor(Math.min(u.maxHp*r.cap,context.damage*r.fraction)*api.healFactor(u)));
     if(amount>0){u.hp+=amount;u.healed+=amount;api.signal(u,u,name,{healing:amount,text:name+' · 救治 +'+amount});}break;
    }
    case 'steadyRange':{const active=hasStatus(b,u,'longRange');status(u,'longRange',r.steps);if(!active)api.signal(u,u,name);break;}
    case 'entryStealth':status(u,'stealth',r.steps);api.signal(u,u,name);break;
    case 'phase':delete u.statuses.slow;delete u.statuses.root;status(u,'phase',r.steps);api.signal(u,u,name);break;
    case 'rallySelf':api.intent(u,r.intent);for(const s of unitTactics(u).filter(s=>!s.special))if(u.skillReady[s.id])u.skillReady[s.id]=Math.max(b.tick,u.skillReady[s.id]-r.reduction);api.signal(u,u,name);break;
    case 'commandRefund':{const resource=u.side===0?b:b.enemyCommand,prior=resource.commandProgress;resource.commandProgress=Math.min(api.commandCapacity,prior+Math.floor(api.commandCapacity*r.fraction));if(resource.commandProgress>prior)recordContribution(u,'support',1);if(u.status==='active')api.signal(u,u,name,{commandRestored:resource.commandProgress-prior,text:'军略进度 +'+Math.round((resource.commandProgress-prior)/api.commandCapacity*100)+'%'});break;}
   }
  }
  report();
 }
}
