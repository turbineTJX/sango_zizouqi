// Civil appointments depend on residence, not on whether a unit is prepared.
// Return references to the authoritative unit: never duplicate an officer into idle.
export function residentArmy(s,a){
 if(a.disbanded||a.travel||a.route.length||!s.cities.some(c=>c.id===a.location&&c.owner===a.faction))return false;
 const battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
 return !battle||battle.kind==='siege'&&battle.cityId===a.location&&battle.battle.sides[1-battle.attackSide].faction===a.faction;
}
export function residentOfficer(s,id){
 for(const c of s.cities){const unit=c.units.find(u=>u.id===id);if(!unit)continue;if(!unit.mission)return {unit,faction:c.owner,location:c.id,destination:null,cityUnit:true};break;}
 const idle=s.campaign.idle.find(o=>o.unit.id===id&&!o.destination&&!o.retreating&&!o.unit.mission);
 if(idle&&s.cities.some(c=>c.id===idle.location&&c.owner===idle.faction))return idle;
 const army=s.armies.find(a=>a.units.some(u=>u.id===id)&&residentArmy(s,a));
 return army?{unit:army.units.find(u=>u.id===id),faction:army.faction,location:army.location,destination:null,army}:undefined;
}
export function cityPersonnel(s,cityId){
 const city=s.cities.find(c=>c.id===cityId);if(!city)return [];
 return [...city.units.filter(unit=>!unit.mission).map(unit=>({unit,faction:city.owner,location:cityId,destination:null,cityUnit:true})),...s.campaign.idle.filter(o=>o.location===cityId&&o.faction===city.owner&&!o.destination&&!o.retreating&&!o.unit.mission),
  ...s.armies.filter(a=>a.location===cityId&&residentArmy(s,a)).flatMap(army=>army.units.map(unit=>({unit,faction:army.faction,location:cityId,destination:null,army})))];
}
