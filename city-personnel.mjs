import {cityUnitRows} from './city-units.mjs';
// Civil appointments depend on residence, not on whether a unit is prepared.
// Return references to the authoritative unit: never duplicate an officer into idle.
export function residentArmy(s,a){
 if(a.disbanded||a.travel||a.route.length||!s.cities.some(c=>c.id===a.location&&c.owner===a.faction))return false;
 const battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
 return !battle||battle.kind==='siege'&&battle.cityId===a.location&&battle.battle.sides[1-battle.attackSide].faction===a.faction;
}
export function residentOfficer(s,id){
 const prepared=cityUnitRows(s).find(o=>o.unit.id===id);if(prepared&&!prepared.unit.mission)return prepared;
 const idle=s.campaign.idle.find(o=>o.unit.id===id&&!o.destination&&!o.unit.mission);
 if(idle&&s.cities.some(c=>c.id===idle.location&&c.owner===idle.faction))return idle;
 const army=s.armies.find(a=>a.units.some(u=>u.id===id)&&residentArmy(s,a));
 return army?{unit:army.units.find(u=>u.id===id),faction:army.faction,location:army.location,destination:null,army}:undefined;
}
export function cityPersonnel(s,cityId){
 const city=s.cities.find(c=>c.id===cityId);if(!city)return [];
 return [...cityUnitRows(s).filter(o=>o.location===cityId&&!o.unit.mission),...s.campaign.idle.filter(o=>o.location===cityId&&o.faction===city.owner&&!o.destination&&!o.unit.mission),
  ...s.armies.filter(a=>a.location===cityId&&residentArmy(s,a)).flatMap(army=>army.units.map(unit=>({unit,faction:army.faction,location:cityId,destination:null,army})))];
}
