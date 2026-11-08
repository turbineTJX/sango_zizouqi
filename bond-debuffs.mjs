import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {bondOnField,bondLevels,sideBondDetails} from './bonds.mjs';
import {hasStatus,setStatus} from './tactics.mjs';
import {STATUS_DEFINITIONS,statusNotice} from './battle-status-rules.mjs';

const designs=()=>Object.entries(BOND_DESIGNS).filter(([,d])=>d.onceDebuff);
const primary=(units,id)=>[...units].sort((a,c)=>bondLevels(c)[id]-bondLevels(a)[id]||a.id.localeCompare(c.id))[0];
// A bond casts once when its threshold is first met. The target list is frozen:
// later entrants, tier changes, cleansing, and reloads never apply another copy.
export function grantBondDebuffs(b){
 if(!b.deploymentLocked)return;
 for(const side of [0,1]){
  const army=b.sides[side],casts=army.bondDebuffCasts ||= [];
  if(army.retreat)continue;
  const pending=designs().filter(([id])=>!casts.some(e=>e.id===id));if(!pending.length)continue;
  const targets=b.sides[1-side].units.filter(u=>bondOnField(u)&&u.type!=='gate');if(!targets.length)continue;
  const details=sideBondDetails(b,side);
  for(const [id,d] of pending){
   const detail=details[id];if(!detail?.tier)continue;
   const holders=army.units.filter(u=>bondOnField(u)&&bondLevels(u)[id]>0),source=primary(holders,id);
   const effect={id,tier:detail.tier,sourceId:source.id,castTick:b.tick,until:b.tick+d.debuffSteps+1,holders:holders.map(u=>({id:u.id,points:bondLevels(u)[id]})),treasurePoints:detail.treasurePoints,targets:targets.map(u=>u.id)};
   casts.push(effect);
   for(const target of targets){
    const applied=setStatus(b,target,d.statusKey,d.debuffSteps,{sourceId:source.id,sourceName:source.name,sourceSkillName:d.name,sourceBond:id,bondDebuffTier:effect.tier,castTick:b.tick,fraction:d.values[effect.tier-1]});
    if(applied!==false&&hasStatus(b,target,d.statusKey))statusNotice(b,target,d.name+' · '+STATUS_DEFINITIONS[d.statusKey].name+'（'+d.debuffSteps+'回合）');
   }
  }
 }
}
export function validBondDebuffs(b,side){
 const casts=b.sides[side].bondDebuffCasts;
 if(!b.deploymentLocked)return casts===undefined;
 if(!Array.isArray(casts)||casts.length>designs().length||new Set(casts.map(e=>e?.id)).size!==casts.length)return false;
 return casts.every(effect=>{
  const d=BOND_DESIGNS[effect?.id];
  if(!d?.onceDebuff||Object.keys(effect).length!==8||!Number.isInteger(effect.castTick)||effect.castTick<0||effect.castTick>b.tick||effect.until!==effect.castTick+d.debuffSteps+1||!Array.isArray(effect.holders)||!effect.holders.length||new Set(effect.holders.map(h=>h?.id)).size!==effect.holders.length)return false;
  const units=effect.holders.map(h=>b.sides[side].units.find(u=>u.id===h?.id));
  if(units.some((u,i)=>!u||!u.bondEntry||u.bondEntry.tick>effect.castTick||Object.keys(effect.holders[i]).length!==2||effect.holders[i].points!==(bondLevels(u)[effect.id]||0)||effect.holders[i].points<=0))return false;
  const sides=b.sides.map((s,i)=>i===side?{...s,units:units.map(u=>({...u,status:'active',hp:u.initial}))}:s),detail=sideBondDetails({...b,sides},side)[effect.id];
  if(effect.sourceId!==primary(units,effect.id).id||!detail?.tier||effect.tier!==detail.tier||effect.treasurePoints!==detail.treasurePoints||!Array.isArray(effect.targets)||!effect.targets.length||new Set(effect.targets).size!==effect.targets.length)return false;
  return effect.targets.every(id=>b.sides[1-side].units.some(u=>u.id===id&&!u.isDecoy&&u.type!=='gate'&&u.bondEntry&&u.bondEntry.tick<=effect.castTick));
 });
}
