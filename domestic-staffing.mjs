import {DOMESTIC_STAFFING_RULES as RULES,DOMESTIC_DIRECTIONS} from './data/design/domestic-actions.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';

// Expansion is permanent municipal organization. Damage, a blocked road or the
// loss of an external facility never removes an already unlocked appointment.
export function domesticStaffingBonuses(c){
 const levels=Object.keys(BUILDING_DESIGNS).reduce((n,key)=>n+(c[key]||0),0),saved=c.domestic.staffingExpansion;
 return {
  construction:Math.max(saved.construction,Math.min(RULES.constructionBonusMaximum,Math.floor(Math.max(0,levels-RULES.initialBuildingLevels)/RULES.buildingLevelsPerSlot))),
  technology:Math.max(saved.technology,Math.min(RULES.technologyBonusMaximum,Math.floor(new Set(c.domestic.techs).size/RULES.technologiesPerSlot)))
 };
}
export const expandDomesticStaffing=c=>{c.domestic.staffingExpansion=domesticStaffingBonuses(c);};
export const domesticStaffingLimit=c=>Math.min(RULES.maximum,RULES.base+Object.values(domesticStaffingBonuses(c)).reduce((n,v)=>n+v,0));
export function domesticStaffing(s,cityId,direction,{replacing=[]}={}){
 const c=s.cities.find(c=>c.id===cityId),assigned=new Set(),reserved=new Set();
 for(const a of s.campaign.domestic.assignments)if(a.cityId===cityId&&a.direction===direction)assigned.add(a.officerId);
 // A replacement command releases that person's old reservation, not their
 // actual appointment. A waiting change still occupies its original job.
 for(const q of s.campaign.domestic.orders)if(q.kind==='assign'&&q.cityId===cityId&&q.direction===direction)for(const id of q.officerIds)if(!replacing.includes(id)&&!assigned.has(id))reserved.add(id);
 const limit=domesticStaffingLimit(c),used=new Set([...assigned,...reserved]);
 return {assigned:assigned.size,reserved:reserved.size,used:used.size,limit,remaining:Math.max(0,limit-used.size),officerIds:used};
}
export function domesticAssignmentError(s,cityId,direction,officerIds){
 const c=s.cities.find(c=>c.id===cityId);if(!c||!DOMESTIC_DIRECTIONS[direction])return '内政方向无效';
 const slots=domesticStaffing(s,cityId,direction,{replacing:officerIds});
 return new Set([...slots.officerIds,...officerIds]).size>slots.limit?`${c.name}${DOMESTIC_DIRECTIONS[direction]}人数已达上限（${slots.limit}人，含待执行委任），请减少人选或先解除委任`:null;
}
export function validDomesticStaffingExpansion(c){
 const x=c.domestic.staffingExpansion;
 return !!x&&Object.keys(x).sort().join(',')==='construction,technology'&&Number.isSafeInteger(x.construction)&&x.construction>=0&&x.construction<=RULES.constructionBonusMaximum&&Number.isSafeInteger(x.technology)&&x.technology>=0&&x.technology<=RULES.technologyBonusMaximum;
}
