import {mechanicEntries} from './trait-mechanics.mjs';

// Appointment snapshots fix this battle's organization even after casualties.
export function extraFrontlineArmies(side){
 return new Set((side.commanders||[]).filter(c=>mechanicEntries(c,'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes(c.role))).map(c=>c.armyId));
}
export function frontlineCapacity(b,side){return 6+(extraFrontlineArmies(b.sides[side]).size?1:0);}
export function validFrontline(b,side,units=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0)){
 const extra=extraFrontlineArmies(b.sides[side]);
 return units.length<=frontlineCapacity(b,side)&&units.filter(u=>!extra.has(u.armyId)).length<=6;
}
export function armyMarchMultiplier(army){
 const leader=army.units.find(u=>u.id===army.leader&&u.troops>0);
 return Math.max(1,...mechanicEntries(leader||{},'passive').filter(({rule})=>rule.effect==='armySpeed'&&rule.roles.includes('leader')).map(({rule})=>rule.multiplier));
}
