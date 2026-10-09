import {mechanicEntries} from './trait-mechanics.mjs';

export function armyFrontlineCapacity(army){return 6+(mechanicEntries({id:army.leader},'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes('leader'))?1:0);}

// Appointment snapshots fix this battle's organization even after casualties.
export function extraFrontlineArmies(side){
 let commanders=[...(side.organizationCommanders||side.commanders||[])];
 for(const e of side.appointmentEvents||[])if(e.tick===0){
  commanders=commanders.filter(c=>c.armyId!==e.armyId);
  for(const role of ['leader','advisor']){const u=side.units.find(u=>u.armyId===e.armyId&&u.id===e.roles[role]);if(u)commanders.push({id:u.id,armyId:u.armyId,role});}
 }
 return new Set(commanders.filter(c=>side.units.some(u=>u.armyId===c.armyId&&u.arrivalConfirmed!==false)&&mechanicEntries(c,'passive').some(({rule})=>rule.effect==='frontline'&&rule.roles.includes(c.role))).map(c=>c.armyId));
}
export const commandEntrants=side=>new Set((side.stratagemEvents||[]).filter(e=>e.key==='reinforce').flatMap(e=>e.units));
export function frontlineCapacity(b,side){const s=b.sides[side],ids=commandEntrants(s);return 6+(extraFrontlineArmies(s).size?1:0)+s.units.filter(u=>ids.has(u.id)&&u.status==='active'&&u.hp>0).length;}
export function validFrontline(b,side,units=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0)){
 const s=b.sides[side],extra=extraFrontlineArmies(s),entrants=commandEntrants(s),normal=units.filter(u=>!entrants.has(u.id));
 return normal.length<=6+(extra.size?1:0)&&normal.filter(u=>!extra.has(u.armyId)).length<=6;
}
export const armyMarchMultiplier=()=>1;
