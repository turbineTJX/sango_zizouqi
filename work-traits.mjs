import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const WORK_MODIFIERS=['quantity','successQuantity','effect','price','discount','duration','durationDays','setbackDays','partialFloor','failureFloor','riskReduction','criticalRefund','chance','secondaryTargets','secondaryFraction','cooperationMultiplier'];
export const workMatches=(t,def)=>!!t?.work?.actions.includes(def?.id);
export const workTraitIds=u=>(OFFICER_ASSIGNMENTS[u?.id]?.traits||[]);
export function workProfile(ids,def,target=null){
 const p={};
 for(const id of ids||[]){const w=TRAIT_DESIGNS[id]?.work;if(!workMatches(TRAIT_DESIGNS[id],def)||w.targets&&!w.targets.includes(target))continue;
  for(const [key,n] of Object.entries(w))if(WORK_MODIFIERS.includes(key))p[key]=key==='setbackDays'?Math.min(p[key]??5,n):Math.max(p[key]??0,n);
 }
 return p;
}
export const workChance=(p,def)=>(p.chance||0)+Math.min(def.risk||0,p.riskReduction||0);
export const workFactor=(factor,p)=>factor===0?(p.failureFloor||0):factor<1?Math.max(factor,p.partialFloor||0):factor;
export const workQuantity=(factor,p)=>1+Math.max(p.quantity||0,p.effect||0,factor>=1?p.successQuantity||0:0);
// Expected changes relative to the same command, never a passive attribute bonus.
export function workValue(p,{chance=.8,cooperation=0,secondary=0}={}){
 const partial=Math.min(.15,Math.max(0,.98-chance)),failure=Math.max(0,1-chance-partial),base=chance*1.03+partial*.45;
 const expected=chance*1.03+partial*Math.max(.45,p.partialFloor||0)+failure*(p.failureFloor||0);
 const quantity=Math.max(p.quantity||0,p.effect||0)+(p.successQuantity||0)*chance;
 return Math.max(1,expected/Math.max(.01,base))*(1+quantity)*(1+(p.price||0))*(1+(p.duration||0)/3)*(1+Math.max(0,(p.durationDays||30)-30)/60)*(1+(p.discount||0))*(1+Math.max(0,(p.criticalRefund||.15)-.15)*.15)*(1+Math.max(0,5-(p.setbackDays??5))*(1-chance)/10)*(1+Math.max(0,(p.cooperationMultiplier||1)-1)*cooperation)*(1+Math.min(secondary,p.secondaryTargets||0)*(p.secondaryFraction||0));
}
