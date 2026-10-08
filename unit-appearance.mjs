import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';

export const siegeAppearance=u=>TROOP_DESIGNS[combatType(u)]?.equipmentSlot==='siege'?combatType(u):null;
export function unitModelKey(pack,u){
 const type=combatType(u),siege=siegeAppearance(u);
 if(pack.models?.[type])return type;
 if(siege)return 'builtin:'+siege;
 const family=combatFamily(u);return family==='ship'&&pack.models?.[family]?family:null;
}
export function unitSpriteClips(pack,u){
 // A generic catapult atlas cannot stand in for a ram or a siege tower.
 return pack.troops?.[combatType(u)]||(!siegeAppearance(u)?pack.troops?.[combatFamily(u)]:null);
}
const wheels='<circle cx="25" cy="65" r="7"/><circle cx="68" cy="65" r="7"/><path d="M18 65h14m-7-7v14m36-7h14m-7-7v14"/>';
const shapes={
 ram:'<path d="M12 49h74v13H12zM18 49V28l30-16 30 16v21M12 29h72L48 8z"/><path d="M24 39h57v7H24zM76 38l13 5-13 5M32 30v10m28-10v10"/>',
 siege:'<path d="M15 58h65v7H15zM29 58l14-27 15 27M43 31l26-20M39 31l-11 9"/><path d="M62 9h18v6H62zM31 58h27M42 30v27"/><circle cx="43" cy="31" r="4"/>',
 tower:'<path d="M18 59h59v7H18zM25 59V18h44v41M20 18h54V9H20zM21 36h53v7H21zM34 59V23m25 36V23M27 50h40M38 9V3h19v6"/><path d="M45 23v35m-7-28h14m-14 8h14m-14 8h14m-14 8h14"/>'
};
// Native vector fallback remains readable when image assets or WebGL are absent.
export function siegeFigureMarkup(u){
 const type=siegeAppearance(u);if(!type)return '';
 return `<svg class="unit-equipment-model" data-model-type="${type}" viewBox="0 0 96 78" aria-hidden="true"><ellipse class="equipment-shadow" cx="48" cy="70" rx="40" ry="6"/><g class="equipment-frame">${shapes[type]}${wheels}</g><path class="equipment-banner" d="M83 23V4m0 0h11l-3 4 3 4H83"/></svg>`;
}
