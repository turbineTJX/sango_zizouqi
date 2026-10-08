import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';

// Data-only eligibility helpers: safe to share with movement, status and UI.
export const TRAIT_EVENTS=['passive','pulse','basic','basicHit','tacticHit','cast','kill','ownCommand','enemyCommand'];
export const TRAIT_EFFECTS=['debuff','rescue','status','push','immunity','disrupt','steadyRange','commandRate','link','allyShield','entryStealth','armyCleanse','rallySelf','burn','armyRemedy','spreadFire','followUp','commandRefund','phase','guard','ignoreZoc','areaBasic','thunder','drain','frontline','armySpeed'];
export function mechanicEntries(u,event=null){
 return (OFFICER_ASSIGNMENTS[u.id]?.traits||[]).flatMap(id=>(TRAIT_DESIGNS[id]?.mechanics||[]).map((rule,index)=>({id,key:id+':'+index,name:TRAIT_DESIGNS[id].name,rule}))).filter(x=>!event||x.rule.event===event);
}
export function traitEligible(b,u,rule){
 if(!u||u.hp<=0||u.withdrawing||b?.sides?.[u.side]?.retreat)return false;
 if(rule.troops&&!rule.troops.includes(u.type))return false;
 if(rule.roles){
  if(!['active','reserve'].includes(u.status))return false;
  if(!['commandRate','commandRefund','frontline'].includes(rule.effect)&&u.status!=='active')return false;
  if(rule.event!=='passive'&&['confuse','stasis'].some(k=>(u.statuses?.[k]?.until||0)>(b?.tick||0)))return false;
  return !!b?.sides?.[u.side]?.commanders?.some(c=>c.id===u.id&&c.armyId===u.armyId&&rule.roles.includes(c.role));
 }
 return u.status==='active'&&!['confuse','stasis'].some(k=>(u.statuses?.[k]?.until||0)>(b?.tick||0));
}
export const traitIgnoresZoc=(b,u)=>mechanicEntries(u,'passive').some(x=>x.rule.effect==='ignoreZoc'&&traitEligible(b,u,x.rule));
export const traitImmune=(u,key)=>mechanicEntries(u,'passive').some(x=>x.rule.effect==='immunity'&&(!x.rule.troops||x.rule.troops.includes(u.type))&&x.rule.statuses.includes(key));
export function traitChance(u,target,rule){return Math.max(rule.minChance??0,Math.min(rule.maxChance??1,(rule.chance??1)+(rule.difference?((u[rule.difference]||0)-(target[rule.difference]||0))*(rule.differenceScale||0):0)));}
export function commandTraitMultiplier(b,u){
 let multiplier=1;
 for(const holder of b.sides[u.side].units.filter(v=>v.armyId===u.armyId))for(const {rule} of mechanicEntries(holder,'passive'))if(rule.effect==='commandRate'&&traitEligible(b,holder,rule))multiplier=Math.max(multiplier,rule.multiplier);
 return multiplier;
}
export function validTraitState(u,tick){
 if(!u.traitState||Array.isArray(u.traitState)||typeof u.traitState!=='object')return false;
 const entries=mechanicEntries(u);
 return Object.entries(u.traitState).every(([key,s])=>{const e=entries.find(x=>x.key===key);return e&&s&&Object.keys(s).length===2&&Number.isInteger(s.uses)&&s.uses>=1&&s.uses<=(e.rule.maxUses??tick+1)&&Number.isInteger(s.ready)&&s.ready>=0&&s.ready<=tick+(e.rule.interval||0);});
}
