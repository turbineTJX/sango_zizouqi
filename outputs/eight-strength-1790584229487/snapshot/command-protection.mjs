import {statusOn} from './battle-status-rules.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';

export function commandProtectionDuration(discipline){
 const r=STRATAGEM_DESIGNS['cao-wuchao'].disciplineDuration;
 return Math.min(r.max, r.base+Math.floor(Math.max(0,discipline)/r.per));
}
// Only ordinary physical attacks pass this protection, including physical attack orbs.
export const commandBlocksDamage=(b,u,{skill=false,intellectual=false,secondary=false}={})=>
 statusOn(b,u,'magicImmune')&&(skill||intellectual||secondary);
