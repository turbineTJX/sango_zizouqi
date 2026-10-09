import {ARMY_ROLES,armyAppointmentCandidates,appointArmyRoles,recommendArmyAppointments} from './army-appointments.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {playerFaction} from './player-faction.mjs';

export const pendingArmyAppointments=s=>s.pendingAppointments||[];
const reportFor=(s,id)=>s.campaign?s.campaign.battles.find(r=>r.id===id)?.report:s.report?.id===id?s.report:null;
function record(s,a,p){
 const report=reportFor(s,p.battleId);if(!report)return;
 report.appointments=report.appointments.filter(c=>c.armyId!==a.id);
 report.appointments.push(...ARMY_ROLES.filter(role=>p.previous[role]!==a[role]).map(role=>({armyId:a.id,role,from:p.previous[role],to:a[role]})));
 let n=0;for(const u of a.units)if(u.first)u.first=++n<=armyFrontlineCapacity(a);
}
export function preparePostbattleAppointments(s,b,armyIds,originals=[]){
 for(const a of s.armies.filter(a=>armyIds.includes(a.id)&&!a.disbanded&&armyAppointmentCandidates(a).length)){
  const previous=Object.fromEntries(ARMY_ROLES.map(role=>[role,originals.find(o=>o.id===a.id)?.[role]??a[role]??null])),p={armyId:a.id,battleId:b.id,previous};
  for(const role of ARMY_ROLES){const id=b.sides.flatMap(side=>side.commanders).find(c=>c.armyId===a.id&&c.role===role)?.id??null;a[role]=armyAppointmentCandidates(a).some(u=>u.id===id)?id:null;}
  if(ARMY_ROLES.some(role=>a[role]===null)&&a.faction===playerFaction(s)&&!s.campaign?.allAI)s.pendingAppointments.push(p);
  else {const error=appointArmyRoles(a,recommendArmyAppointments(a));if(error)throw Error(error);record(s,a,p);}
  let n=0;for(const u of a.units)if(u.first)u.first=++n<=armyFrontlineCapacity(a);
 }
}
export function confirmPostbattleAppointments(s,armyId,roles){
 const p=pendingArmyAppointments(s).find(p=>p.armyId===armyId),a=s.armies.find(a=>a.id===armyId);
 if(!p||!a||a.faction!==playerFaction(s))return '当前没有本军团的待任命';
 if(ARMY_ROLES.some(role=>a[role]!==null&&roles?.[role]!==a[role]))return '请保留已有任命，仅补齐缺失职位';
 const error=appointArmyRoles(a,roles);if(error)return error;
 record(s,a,p);s.pendingAppointments=s.pendingAppointments.filter(item=>item!==p);return null;
}
export function validatePendingAppointments(s,fail){
 fail(Array.isArray(s.pendingAppointments)&&s.pendingAppointments.length<=s.armies.length,'战后待任命记录无效');
 const seen=new Set();for(const p of s.pendingAppointments){
  const a=s.armies.find(a=>a.id===p?.armyId),report=reportFor(s,p?.battleId);
  fail(p&&Object.keys(p).length===3&&a&&a.faction===playerFaction(s)&&!s.campaign?.allAI&&report&&typeof p.battleId==='string'&&!seen.has(a.id)&&armyAppointmentCandidates(a).length&&ARMY_ROLES.some(role=>a[role]===null)&&p.previous&&Object.keys(p.previous).length===2&&ARMY_ROLES.every(role=>p.previous[role]===null||typeof p.previous[role]==='string'),'战后待任命人选或来源无效');seen.add(a.id);
 }
}
