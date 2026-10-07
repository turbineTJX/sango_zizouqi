import {TROOP_DESIGNS} from '../data/design/troops.mjs';
// Economic probes measure a legal base troop carrying its equipment materials.
export function resourceRecipe(unit,id){
 const d=TROOP_DESIGNS[id];unit.type=d.category==='troop'?id:'spear';unit.equipment={siege:null,ship:null};
 if(d.equipmentSlot)unit.equipment[d.equipmentSlot]=id;
 return unit;
}
