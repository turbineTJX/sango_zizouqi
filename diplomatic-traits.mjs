import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
import {DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';

export function diplomaticTraits(u,direction){
 return (OFFICER_ASSIGNMENTS[u?.id]?.traits||[]).map(id=>({id,...TRAIT_DESIGNS[id]})).filter(t=>t.diplomacy?.directions.includes(direction));
}
export function diplomaticTraitProfile(u,direction){
 const traits=diplomaticTraits(u,direction);
 return {rate:Math.max(1,...traits.map(t=>t.diplomacy.rate||1)),feeDiscount:Math.max(0,...traits.map(t=>t.diplomacy.feeDiscount||0))};
}
export const diplomaticRate=(u,direction)=>Math.max(.5,(u?.[DIPLOMACY_DIRECTIONS[direction]?.stat]||0)/50)*diplomaticTraitProfile(u,direction).rate;
export const diplomaticFee=(fee,u,direction)=>Math.ceil(fee*(1-diplomaticTraitProfile(u,direction).feeDiscount));
