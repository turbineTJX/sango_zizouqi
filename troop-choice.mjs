import {troopTypes} from './troop-equipment.mjs';
import {TROOPS} from './unit-stats.mjs';
import {troopAptitude} from './tactic-learning.mjs';

export const battleTroopTypes=terrain=>troopTypes();

// Keep the officer's customary troop on ties, then use the shared troop order.
export function highestAptitudeTroop(unit,types=troopTypes()){
 const legal=types.filter(type=>Object.hasOwn(TROOPS,type));
 if(!legal.length)throw Error('没有可用兵种');
 const best=Math.max(...legal.map(type=>troopAptitude(unit,type)));
 return legal.includes(unit.type)&&troopAptitude(unit,unit.type)===best?unit.type:legal.find(type=>troopAptitude(unit,type)===best);
}
