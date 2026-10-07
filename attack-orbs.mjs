import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
// One active enchantment per unit. Charges belong to landed basic attacks against
// troops, never multi-hit tactics, retaliation, DOT or attacks against a gate.
export const ATTACK_ORBS=Object.freeze({
  fire:Object.freeze({charges:3,bonus:.35,status:'burn',steps:6,color:'#ffac68',name:'火矢',description:TACTIC_DESIGNS.fire.description}),
  suppress:Object.freeze({charges:3,bonus:.25,status:'slow',steps:6,color:'#9edce7',name:'阻射',description:TACTIC_DESIGNS.suppress.description}),
  pierce:Object.freeze({charges:3,bonus:.25,status:'armorBreak',steps:8,color:'#e5c681',name:'破甲',description:TACTIC_DESIGNS.pierce.description}),
  curse:Object.freeze({charges:3,bonus:0,status:'despair',steps:10,color:'#ca9add',name:'挫志',description:TACTIC_DESIGNS.curse.description}),
});
export const attackOrbDescription=id=>ATTACK_ORBS[id].description;
