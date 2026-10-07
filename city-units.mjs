// City troops are individual prepared units, not standing map armies.
export const preparedUnits=s=>s.cities.flatMap(c=>c.units);
export function cityUnitRows(s){return s.cities.flatMap(c=>c.units.map(unit=>({unit,faction:unit.mission?.faction||c.owner,location:unit.mission?.location||c.id,destination:null,cityUnit:true})));}
// Read-only force estimate for AI planning. Never stored in s.armies.
export function cityForce(c){
 const units=c.units.filter(u=>!u.mission),leader=[...units].sort((a,b)=>b.leadership-a.leadership)[0],advisor=[...units].sort((a,b)=>b.intellect-a.intellect)[0];
 return {id:`city-force:${c.id}`,cityForce:true,task:'驻城',name:`${c.name}城内部队`,faction:c.owner,location:c.id,homeCity:c.id,units,leader:leader?.id,advisor:advisor?.id,deputy:null,morale:80,tactic:'balanced',route:[],target:null,travel:null,supply:Math.min(c.grain,units.length*900),supplyCapacity:units.length*900,hunger:c.hunger,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:c.kind&&c.kind!=='city'};
}
export function cityForces(s){return s.cities.filter(c=>c.units.length).map(cityForce);}

// City services and expedition preparation; field reorganization uses canRallyAt.
export function canFormArmyAt(s,id,faction){
 const c=s.cities.find(c=>c.id===id);
 return !!c&&c.kind!=='junction'&&c.owner===faction&&!s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===id);
}
