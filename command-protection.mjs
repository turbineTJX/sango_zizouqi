import {statusOn} from './battle-status-rules.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';

export function commandProtectionDuration(discipline,power=1){
 const r=STRATAGEM_DESIGNS['cao-wuchao'].disciplineDuration;
 return Math.max(1,Math.round(Math.min(r.max, r.base+Math.floor(Math.max(0,discipline)/r.per))*power));
}
// Only ordinary physical attacks pass this protection, including physical attack orbs.
export const commandBlocksDamage=(b,u,{skill=false,intellectual=false,secondary=false}={})=>
 statusOn(b,u,'magicImmune')&&(skill||intellectual||secondary);
