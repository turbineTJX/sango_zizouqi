import {treasureDesign} from './data/design/treasures.mjs';
export const TREASURE_SLOTS=Object.freeze({weapon:'武器',mount:'坐骑',other:'其它'});
export const treasureSlot=id=>{const c=treasureDesign(id)?.category;return c==='weapon'?'weapon':c==='horse'?'mount':c?'other':null;};
// A singular ID is accepted only as a shorthand for scenario/test input. New
// assignments and normalized battles always store the three-slot loadout.
export const equippedTreasureIds=u=>Array.isArray(u.treasureIds)?u.treasureIds:u.treasureId?[u.treasureId]:[];
export const treasureInSlot=(u,slot)=>equippedTreasureIds(u).find(id=>treasureSlot(id)===slot)||null;
export function validTreasureLoadout(u){
 if(u.treasureIds!==undefined&&!Array.isArray(u.treasureIds))return false;
 const ids=equippedTreasureIds(u),slots=ids.map(treasureSlot);
 return ids.length<=3&&slots.every(Boolean)&&new Set(slots).size===ids.length&&new Set(ids).size===ids.length&&!(u.treasureIds!==undefined&&u.treasureId);
}
export function setTreasureEquipment(u,id,context=u){
 const design=treasureDesign(id,context),custom=!!context.treasureDesigns;
 const slot=treasureSlot(id);if(!slot)throw Error('宝物类别无效');
 u.treasureIds=[...equippedTreasureIds(u).filter(t=>treasureSlot(t)!==slot),id].sort((a,b)=>Object.keys(TREASURE_SLOTS).indexOf(treasureSlot(a))-Object.keys(TREASURE_SLOTS).indexOf(treasureSlot(b)));delete u.treasureId;
 if(custom)u.treasureDesigns=Object.fromEntries(u.treasureIds.map(t=>[t,structuredClone(t===id?design:treasureDesign(t,u))]));
}

export function removeTreasureEquipment(u,id){u.treasureIds=equippedTreasureIds(u).filter(t=>t!==id);delete u.treasureId;if(u.treasureDesigns){delete u.treasureDesigns[id];if(!u.treasureIds.length)delete u.treasureDesigns;}}
