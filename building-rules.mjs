import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import {hexDistance} from './hex-grid.mjs';
import {COMBAT,TARGETING} from './combat-rules.mjs';
// Gates and physical facilities share targeting, occupancy and repairs.
// Additional buildings: {id,name,type:'building',kind,side,x,y,hp,maxHp,lastDamagedTick?}.
export function battleBuildings(b){
  return [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])];
}
export const combatBuildingRule=a=>BUILDING_DESIGNS[a.kind]?.combat;
export const buildingCombatState=(kind,level)=>BUILDING_DESIGNS[kind]?.combat?{level,lastActionTick:null}:{};
export const buildingEffectText=a=>combatBuildingRule(a)?a.level>0?BUILDING_DESIGNS[a.kind].description:'施工中，尚未启用':'';
// Current, observable benefit only. A cooldown does not erase a live facility's
// role; unfinished, destroyed, abandoned or ineffective facilities have no bonus.
export function buildingTargetValue(b,a,api){
 const r=combatBuildingRule(a);
 if(!r||!a.level||a.hp<=0||b.sides[a.side].retreat)return 0;
 const own=b.sides[a.side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.isDecoy&&!u.withdrawing&&!u.disengage&&!api.stasis(u));
 if(!own.length)return 0;
 if(r.effect==='shoot'){
  const targets=b.sides[1-a.side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.isDecoy&&!api.stasis(u)&&api.visible(u)&&hexDistance(a,u)<=r.range);
  return targets.length?TARGETING.tower+4*(a.level-1)+Math.min(6,targets.length*2):0;
 }
 const beneficiaries=own.filter(u=>api.visible(u)&&hexDistance(a,u)<=r.range);
 if(r.effect==='intent'){
  const gain=beneficiaries.reduce((n,u)=>n+Math.min(r.intentPerLevel*a.level,COMBAT.intentCap-u.intent),0);
  return gain>0?TARGETING.music+Math.min(18,gain*2):0;
 }
 const healing=beneficiaries.reduce((n,u)=>n+Math.min(api.wounded(u),u.maxHp-u.hp,Math.floor(u.maxHp*r.healPerLevel*a.level*(api.healFactor?.(u)??1)))/u.maxHp,0);
 return healing>0?TARGETING.medical+Math.min(18,healing*1000):0;
}
export function validBuildingCombatState(b,a){
 const d=BUILDING_DESIGNS[a.kind];
 if(!d?.combat)return a.level===undefined&&a.lastActionTick===undefined;
 return Number.isSafeInteger(a.level)&&a.level>=0&&a.level<=d.maximumLevel&&(a.lastActionTick===null||Number.isSafeInteger(a.lastActionTick)&&a.lastActionTick>=1&&a.lastActionTick<=b.tick);
}
// Pulse only at simulation boundaries. Overlapping support uses the strongest
// completed local facility per recipient, never a summed metropolitan level.
export function pulseBattleBuildings(b,api){
 const live=side=>b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.isDecoy&&!u.withdrawing&&!u.disengage&&!api.stasis(u));
 const support=new Map();
 const order=b.tick%2?[0,1]:[1,0];
 for(const a of [...(b.buildings||[])].sort((a,c)=>order.indexOf(a.side)-order.indexOf(c.side)||a.id.localeCompare(c.id))){
  const r=combatBuildingRule(a);
  if(!r||!a.level||a.hp<=0||b.sides[a.side].retreat||!live(a.side).length||a.lastActionTick!==null&&b.tick-a.lastActionTick<r.interval)continue;
  a.lastActionTick=b.tick;
  if(r.effect==='shoot'){
   const target=b.sides[1-a.side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.isDecoy&&!api.stasis(u)&&api.visible(u)&&hexDistance(a,u)<=r.range).sort((u,v)=>hexDistance(a,u)-hexDistance(a,v)||u.hp-v.hp||u.id.localeCompare(v.id))[0];
   if(target)api.shoot(a,target,r.power+(a.level-1)*r.powerPerLevel);
  }else for(const u of live(a.side).filter(u=>hexDistance(a,u)<=r.range)){
   const key=r.effect+':'+u.id,previous=support.get(key);
   if(!previous||a.level>previous.a.level)support.set(key,{a,u,r});
  }
 }
 for(const {a,u,r}of support.values()){
  if(b.sides[a.side].retreat||a.hp<=0||!live(a.side).includes(u))continue;
  if(r.effect==='intent')api.intent(a,u,r.intentPerLevel*a.level);else api.heal(a,u,r.healPerLevel*a.level);
 }
}
