import {DOMESTIC_ACTION_DESIGNS,DOMESTIC_DIRECTIONS,DOMESTIC_DIRECTION_STATS} from './data/design/domestic-actions.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
// A construction action references its building rather than duplicating price,
// duration, direction and label. Other actions are authored directly.
export function resolveDomesticActions(actions=DOMESTIC_ACTION_DESIGNS,buildings=BUILDING_DESIGNS){
 return Object.fromEntries(Object.entries(actions).map(([id,a])=>{
  const b=a.kind==='build'?buildings[a.value]:null;
  return [id,b?{...structuredClone(a),name:'建设'+b.name,direction:b.direction,cost:b.cost,days:b.days}:structuredClone(a)];
 }));
}
export const DIRECTION_STATS=Object.freeze({...DOMESTIC_DIRECTION_STATS});
export const DIRECTIONS=Object.freeze({...DOMESTIC_DIRECTIONS});
export const BUILDINGS=Object.freeze(Object.fromEntries(Object.entries(BUILDING_DESIGNS).map(([id,{projectName,projectDescription,...b}])=>[id,structuredClone(b)])));
export const ACTIONS=Object.freeze(resolveDomesticActions());
export const PROJECTS=Object.freeze(Object.fromEntries(Object.entries(BUILDING_DESIGNS).map(([id,b])=>[id,{name:b.projectName,cost:b.cost,turns:b.days/10,field:id,description:b.projectDescription}])));
