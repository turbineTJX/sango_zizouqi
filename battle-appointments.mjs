import {ARMY_ROLES,appointArmyRoles,recommendArmyAppointments} from './army-appointments.mjs';

export const battleAppointmentCandidates=(b,side,armyId)=>b.sides[side].units.filter(u=>(armyId===undefined||u.armyId===armyId)&&!u.cityGuard&&!u.isDecoy&&u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing&&!u.retreatDispatched&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=b.tick);
const commander=(u,role)=>({id:u.id,name:u.name,role,armyId:u.armyId,leadership:u.leadership,intellect:u.intellect,politics:u.politics,charm:u.charm});
export function commandersAt(side,tick=Infinity){
 let list=[...(side.organizationCommanders||side.commanders||[])];
 for(const e of side.appointmentEvents||[])if(e.tick<=tick){
  list=list.filter(c=>c.armyId!==e.armyId);
  for(const role of ARMY_ROLES){const u=side.units.find(u=>u.armyId===e.armyId&&u.id===e.roles[role]);if(u)list.push(commander(u,role));}
 }
 return list;
}
// At a council's tick, an earlier cast can precede the appointment.
export function commandProvidersAt(side,tick){
 const providers=[...commandersAt(side,tick)];
 for(let i=0;i<(side.appointmentEvents||[]).length;i++)if(side.appointmentEvents[i].tick===tick)providers.push(...commandersAt({...side,appointmentEvents:side.appointmentEvents.slice(0,i)},tick));
 return providers;
}
export function appointBattleRoles(b,armyId,roles,side=0){
 if(!b||b.result||![0,1].includes(side)||!(b.tick===0&&!b.deploymentLocked||b.reinforcementCouncil==='open'))return '只能在战前会议或援军军议任命';
 const units=battleAppointmentCandidates(b,side,armyId),army={units:units.map(u=>({...u,troops:u.hp}))};
 if(!units.length)return '本军团没有已抵达且可任命的部队';
 const error=appointArmyRoles(army,roles);if(error)return error;
 const current=commandersAt(b.sides[side]);
 if(ARMY_ROLES.every(role=>current.some(c=>c.armyId===armyId&&c.role===role&&c.id===roles[role])))return null;
 b.sides[side].appointmentEvents.push({armyId,tick:b.tick,roles:{...roles}});
 b.sides[side].commanders=commandersAt(b.sides[side]);
 for(const u of b.sides[side].units.filter(u=>u.armyId===armyId)){
  u.commandBonus=units.find(c=>c.id===roles.leader).leadership/1000;
  u.advisorBonus=units.find(c=>c.id===roles.advisor).intellect/1000;
 }
 return null;
}
export function planBattleAppointmentsAI(b,side){
 for(const armyId of new Set(battleAppointmentCandidates(b,side).map(u=>u.armyId))){
  const units=battleAppointmentCandidates(b,side,armyId),previous=Object.fromEntries(ARMY_ROLES.map(role=>[role,b.sides[side].commanders.find(c=>c.armyId===armyId&&c.role===role)?.id??null]));
  appointBattleRoles(b,armyId,recommendArmyAppointments({units:units.map(u=>({...u,troops:u.hp}))},{previous}),side);
 }
}
export function planArrivalAppointmentsAI(b,side){
 const council=b.reinforcementCouncil;b.reinforcementCouncil='open';
 try{planBattleAppointmentsAI(b,side);}finally{b.reinforcementCouncil=council;}
}
export function validateBattleAppointments(b,side,originals,fail){
 const s=b.sides[side];s.organizationCommanders=originals;
 fail(Array.isArray(s.appointmentEvents)&&s.appointmentEvents.length<=1000,'战场任命记录无效');
 let tick=-1;for(const e of s.appointmentEvents){
  fail(e&&Object.keys(e).length===3&&Number.isInteger(e.tick)&&e.tick>=tick&&e.tick<=b.tick&&typeof e.armyId==='string'&&e.roles&&Object.keys(e.roles).length===2&&ARMY_ROLES.every(role=>s.units.some(u=>u.armyId===e.armyId&&u.id===e.roles[role]&&(u.arrivalTick||0)<=e.tick&&u.arrivalConfirmed!==false)),'战场任命人选或日期无效');tick=e.tick;
 }
 s.commanders=commandersAt(s);
}
