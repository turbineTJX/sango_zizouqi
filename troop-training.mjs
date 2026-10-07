import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {technologyMilitaryMultiplier} from './city-technology.mjs';
const trainingPerThousand=value=>typeof value==='string'?TROOP_DESIGNS[value].goldPerThousand:TROOP_DESIGNS[value.type].goldPerThousand+['siege','ship'].reduce((n,slot)=>n+(value.equipment?.[slot]?TROOP_DESIGNS[value.equipment[slot]].goldPerThousand:0),0);
export const trainingRate=(value,c=null)=>(trainingPerThousand(value)*technologyMilitaryMultiplier(c))/1000;
export const trainingCost=(type,men,c=null)=>Math.ceil(Math.max(0,men)*(trainingPerThousand(type)*technologyMilitaryMultiplier(c))/1000);
export const affordableTraining=(value,gold,c=null)=>Math.floor(Math.max(0,gold)*1000/(trainingPerThousand(value)*technologyMilitaryMultiplier(c)));
export const troopFamily=type=>TROOP_DESIGNS[type]?.family||type;
