import {mechanicEntries} from './trait-mechanics.mjs';

export function armyFrontlineCapacity(army){return 6+(mechanicEntries({id:army.leader},'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes('leader'))?1:0);}

// Appointment snapshots fix this battle's organization even after casualties.
export function extraFrontlineArmies(side){
 return new Set((side.commanders||[]).filter(c=>side.units.some(u=>u.armyId===c.armyId&&u.arrivalConfirmed!==false)&&mechanicEntries(c,'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes(c.role))).map(c=>c.armyId));
}
export function frontlineCapacity(b,side){return 6+(extraFrontlineArmies(b.sides[side]).size?1:0);}
export function validFrontline(b,side,units=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0)){
 const extra=extraFrontlineArmies(b.sides[side]);
 return units.length<=frontlineCapacity(b,side)&&units.filter(u=>!extra.has(u.armyId)).length<=6;
}
export const armyMarchMultiplier=()=>1;
