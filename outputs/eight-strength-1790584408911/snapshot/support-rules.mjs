import {hexDistance} from './hex-grid.mjs';
import {powerFactor} from './tactic-power.mjs';
import {hasTrait} from './officer-traits.mjs';
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
export const FORMATION_AURA=TRAIT_DESIGNS.formationSupport;
export const AURA_INTERVAL=FORMATION_AURA.aura.interval;
export function formationAuraFactor(source){const rule=FORMATION_AURA.aura;return powerFactor((rule.basePower+Math.max(0,source.politics||0)*rule.politicsScale)*Math.max(0,source.hp??source.troops??0)/3000*(1-(source.supplyPenalty||0)));}
export function formationAura(b,target){
 if(!b||target.status!=='active'||target.hp<=0)return null;
 const rule=FORMATION_AURA.aura;
 const candidates=(b.sides[target.side]?.units||[]).filter(u=>u.id!==target.id&&hasTrait(u,'formationSupport')&&u.status==='active'&&u.hp>0&&!u.withdrawing&&!b.sides[u.side].retreat&&hexDistance(u,target)<=rule.range&&!['confuse','stealth','stasis'].some(k=>(u.statuses?.[k]?.until||0)>b.tick));
 return candidates.map(source=>({source,factor:formationAuraFactor(source)})).sort((a,c)=>c.factor-a.factor||a.source.id.localeCompare(c.source.id))[0]||null;
}
