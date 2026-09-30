import {mechanicEntries,traitEligible} from './trait-mechanics.mjs';
import {TROOP_INTENT} from './combat-rules.mjs';
import {COMMAND_TRAITS,activeCommandTraits,COMMON_TRAITS,CIVIC_TRAITS,OFFICER_TRAITS,officerTraits,aptitudeKey} from './officer-traits.mjs';
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {bondAttributes,bondList,bondDamage,bondProtection} from './bonds.mjs';
export const PASSIVES=structuredClone({...TRAIT_DESIGNS,...Object.fromEntries(Object.entries(BOND_DESIGNS).map(([id,d])=>[id,{...d,domain:'battle'}]))});
export const SKILL_ROUTES=OFFICER_TRAITS;
export const COMMON_ROUTES=COMMON_TRAITS;
export const CIVIC_ROUTES=CIVIC_TRAITS;
export const commonRouteKey=aptitudeKey;
export const commonRouteName=()=> '羁绊成长';
export const officerLevel=u=>u.level??1;
export const skillRoute=officerTraits;
export const hasPassive=(u,id)=>!!u&&skillRoute(u).includes(id);
export const domesticEffects=u=>u?skillRoute(u).filter(id=>PASSIVES[id]?.effects).reduce((sum,id)=>{for(const [key,value] of Object.entries(PASSIVES[id].effects))sum[key]=(sum[key]||0)+value;return sum;},{}):{};
export const intentIncome=u=>({...TROOP_INTENT[u.type]});
export const deniesHitIntent=()=>false;
export const hpRatio=u=>Math.max(0,Math.min(1,(u.hp??u.troops)/Math.max(1,u.maxHp??3000)));
export const adapting=()=>false;
export function initialPassiveState(tick=0){return {lastMoveTick:tick,moveCount:0,targetId:null,shots:0,shotType:null,reserveEntered:false,entryUntil:0};}
export function moved(b,u,from){if(from.x!==u.x||from.y!==u.y){u.passiveState ||= initialPassiveState(b.tick);u.passiveState.lastMoveTick=b.tick;u.passiveState.moveCount++;}}
export function recordBasicAttack(u,target){u.passiveState ||= initialPassiveState();const p=u.passiveState;p.shots=p.targetId===target.id&&p.shotType===u.type?p.shots+1:1;p.targetId=target.id;p.shotType=u.type;}
export const passiveAttributes=(b,u)=>bondAttributes(b,u);
export const passiveDamageMultiplier=(b,u,target,kind)=>bondDamage(b,u,target,kind);
export const passiveDamageTaken=(b,u,kind)=>bondProtection(b,u,kind);
export const supportMultiplier=()=>1;
export function passiveList(u,b=null){
 return [...skillRoute(u).map(id=>{
  const def=PASSIVES[id];let state='条件未满足';
  if(def.domain==='command')state=b?(activeCommandTraits(b,u).includes(id)&&b.sides[u.side].commanders.some(c=>c.id===u.id&&c.armyId===u.armyId&&c.role===def.role)?'军团任职生效':'未担任对应军团职务'):'仅任'+(def.role==='leader'?'军团长':'军师')+'时对所属军团生效';
  else if(def.domain==='domestic')state=b?'内政特性 · 战场不生效':def.scope==='cooperation'?'同城同方向协作时判定':def.scope==='actor'?'本人办理对应事务时生效':['administration','benevolence'].includes(id)?'本人办理或任太守时生效':'任太守时生效';
  else if(def.domain==='movement'||def.domain==='personality')state=b?'战场不生效':def.domain==='movement'?'实际行程中生效':'内政选事时生效';
  else if(def.domain==='diplomacy')state='外交预留 · 未开放';
  else if(def.mechanics&&b&&mechanicEntries(u).filter(e=>e.id===id).some(e=>traitEligible(b,u,e.rule)))state='已生效';
  return {id,...def,level:1,unlocked:true,state};
 }),...bondList(u,b)];
}
