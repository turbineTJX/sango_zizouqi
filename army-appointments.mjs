import {mechanicEntries} from './trait-mechanics.mjs';
import {roleTraits,COMMAND_TRAITS} from './officer-traits.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';

export const ARMY_ROLES=Object.freeze(['leader','advisor']);
export const armyAppointmentCandidates=army=>(army?.units||[]).filter(u=>u.troops>0&&!u.mission);
// Shared with the player's recommendation. Only this army's actual attributes
// and appointment traits are inputs; bonds and enemy information are absent.
export function armyRoleScore(u,role){
 if(!ARMY_ROLES.includes(role))return -Infinity;
 const entries=mechanicEntries(u).filter(e=>e.rule.roles?.includes(role)),traits=new Set([...roleTraits(u,role),...entries.map(e=>e.id)]);
 return (u[role==='advisor'?'intellect':'leadership']||0)+[...traits].reduce((n,id)=>n+Object.values(COMMAND_TRAITS[id]?.stats||{}).reduce((a,b)=>a+b,0)*100,0)+entries.length*6;
}
export function recommendArmyAppointments(army,{previous=army}={}){
 const units=armyAppointmentCandidates(army);
 return Object.fromEntries(ARMY_ROLES.map(role=>[role,units.some(u=>u.id===previous?.[role])?previous[role]:[...units].sort((a,b)=>armyRoleScore(b,role)-armyRoleScore(a,role)||a.id.localeCompare(b.id))[0]?.id??null]));
}
export function appointArmyRoles(army,roles){
 if(!army||!roles||Object.keys(roles).some(role=>!ARMY_ROLES.includes(role)))return '只支持军团长和军师任命';
 const units=armyAppointmentCandidates(army);
 if(ARMY_ROLES.some(role=>units.length?!units.some(u=>u.id===roles[role]):roles[role]!==null))return '请从本军团实际有兵力的武将中任命军团长和军师';
 for(const role of ARMY_ROLES)army[role]=roles[role];
 return null;
}
export function settleArmyAppointments(army,{previous=army}={}){
 const before=Object.fromEntries(ARMY_ROLES.map(role=>[role,previous?.[role]??null])),roles=recommendArmyAppointments(army,{previous});
 const error=appointArmyRoles(army,roles);if(error)throw Error(error);
 let starters=0;for(const u of army.units)if(u.first)u.first=++starters<=armyFrontlineCapacity(army);
 return ARMY_ROLES.filter(role=>before[role]!==roles[role]).map(role=>({armyId:army.id,role,from:before[role],to:roles[role]}));
}
export function validArmyAppointmentChanges(changes,armies,{units=null,originals=null}={}){
 if(!Array.isArray(changes)||changes.length>armies.length*2)return false;
 const seen=new Set();return changes.every(c=>{
  const army=armies.find(a=>a.id===c?.armyId),original=originals?.find(a=>a.id===c?.armyId),key=c?.armyId+':'+c?.role;
  if(!army||!ARMY_ROLES.includes(c.role)||Object.keys(c).length!==4||seen.has(key)||c.from===c.to||!(c.from===null||typeof c.from==='string'))return false;
  seen.add(key);if(original&&original[c.role]!==c.from)return false;
  const candidates=units?units.filter(u=>u.armyId===army.id&&u.hp>0&&!u.retreatDispatched):armyAppointmentCandidates(army);
  return c.to===null?!candidates.length:candidates.some(u=>u.id===c.to);
 });
}
