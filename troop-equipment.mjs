import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {cityHasWater,cityTroopUnlocked,technologyMilitaryMultiplier} from './city-technology.mjs';
export {cityHasWater};
export const BASE_TROOPS=Object.freeze(['spear','halberd','cavalry','archer']);
export const troopTypes=()=>Object.keys(TROOP_DESIGNS).filter(id=>TROOP_DESIGNS[id].category==='troop');
export const equipmentTypes=slot=>Object.keys(TROOP_DESIGNS).filter(id=>TROOP_DESIGNS[id].equipmentSlot===slot);
export const combatType=u=>u.formType||u.type;
export const combatFamily=u=>TROOP_DESIGNS[combatType(u)]?.family;
export const validEquipment=e=>!!e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).length===2&&['siege','ship'].every(slot=>Object.hasOwn(e,slot)&&(e[slot]===null||TROOP_DESIGNS[e[slot]]?.equipmentSlot===slot));
export const emptyEquipment=()=>({siege:null,ship:null});
export const canEquip=(c,id)=>!!TROOP_DESIGNS[id]?.equipmentSlot&&cityTroopUnlocked(c,id)&&(TROOP_DESIGNS[id].equipmentSlot!=='ship'||cityHasWater(c));
export const equipmentCost=(e,previous,men,c=null)=>['siege','ship'].reduce((sum,slot)=>sum+(e[slot]&&e[slot]!==previous?.[slot]?Math.ceil(TROOP_DESIGNS[e[slot]].goldPerThousand*men/1000*technologyMilitaryMultiplier(c)):0),0);
export const equipmentNames=u=>['siege','ship'].map(slot=>u.equipment?.[slot]).filter(Boolean).map(id=>TROOP_DESIGNS[id].name).join('、')||'无';
export const allowedFormTypes=u=>[u.type,...['siege','ship'].map(slot=>u.equipment?.[slot]).filter(Boolean)];
export function desiredForm(b,u,ground,distance,target=b.siege?.gate){
 if(ground==='water')return u.equipment?.ship||null;
 const id=u.equipment?.siege,t=id&&TROOP_DESIGNS[id];
 if(!u.withdrawing&&!b.sides[u.side]?.retreat&&target?.hp>0&&['gate','building'].includes(target.type)&&target.side!==u.side&&t&&distance>= (t.minRange||0)&&distance<=t.range)return id;
 return null;
}
