import {hexDistance} from './hex-grid.mjs';
import {powerFactor} from './tactic-power.mjs';

export const AURA_INTERVAL=6;
// Derived from live positions; recovery pulses never modify attack or defense.
export function formationAura(b,target){
  if(!b||target.status!=='active'||target.hp<=0||!['spear','halberd','cavalry','logistics'].includes(target.type))return null;
  const candidates=(b.sides[target.side]?.units||[]).filter(u=>u.id!==target.id&&u.type==='logistics'&&u.status==='active'&&u.hp>0&&u.tactics?.includes('passage')&&!b.sides[u.side].retreat&&hexDistance(u,target)<=1&&!['stun','confuse','seal'].some(k=>(u.statuses?.[k]?.until||0)>b.tick));
  return candidates.map(source=>({source,factor:powerFactor((80+(source.intellect||0)*1.4+(source.politics||0)*.6)*source.hp/3000*(1-(source.supplyPenalty||0)))})).sort((a,c)=>c.factor-a.factor||a.source.id.localeCompare(c.source.id))[0]||null;
}
