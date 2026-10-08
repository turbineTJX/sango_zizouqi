// Shared formulas for simulation, descriptions and previews. P is the caster's
// corresponding derived power at cast start, never a raw officer attribute.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const POWER_RULES=Object.freeze({reference:280,minFactor:.7,maxFactor:1.6,criticalMultiplier:1.5});
export const powerFactor=p=>clamp(.6+Math.max(0,p)/700,POWER_RULES.minFactor,POWER_RULES.maxFactor);
export const powerDuration=(steps,p)=>Math.max(1,Math.round(steps*powerFactor(p)));
export const effectChance=(p,resistance)=>clamp(.65+(p-resistance)/1000,.25,.95);
export const criticalChance=p=>clamp(.05+Math.max(0,p)/2000,.05,.30);
export const statusFraction=(u,key,base)=>base*(u.statuses?.[key]?.potency??1);
export const DURATION_POWER_STATUSES=new Set(['confuse','seal','taunt','resolve','haste','riposte','phase','pursuit','burningAttack','strategyAttack']);
export const CHANCE_EFFECT_NAMES=Object.freeze({confuse:'混乱',seal:'封技',taunt:'挑衅',lure:'诱敌位移',knockback:'击退'});
const CRITICAL_EFFECTS=new Set(['thrust','strike','repeat','rush','terror','ram','navalRam','bombard','broadside']);
export function tacticPowerProfile(s){
  const checks=[];
  if(s.effect==='confuse'||s.control==='confuse')checks.push('confuse');
  if(s.effect==='terror'&&!checks.includes('confuse'))checks.push('confuse');
  if(s.effect==='seal'||s.debuff==='seal')checks.push('seal');
  if(s.effect==='taunt')checks.push('taunt');
  if(s.effect==='lure')checks.push('lure');
  if(s.effect==='protect')checks.push('knockback');
  // Burst attacks can crit. Wide-area pressure, DOT, reflection and support stay predictable.
  const critical=CRITICAL_EFFECTS.has(s.effect)||(s.effect==='famous'&&s.mode==='attack'&&(s.targets||1)===1&&!s.control&&s.debuff!=='seal');
  return {attribute:s.category==='politics'?'supportPower':s.category==='intellect'?'strategyPower':'martialPower',name:s.category==='politics'?'营务威力':s.category==='intellect'?'谋略威力':'武技威力',checks,critical};
}
export function tacticPowerDescription(s){
  if(s.passive)return '首次入场触发，持续与破隐混乱时间固定。';
  const rule=s.power;
  const related=s.category==='politics'?'政治为主、智力为辅':s.category==='intellect'?'智力':'武力';
  if(s.attackOrb)return '强化普攻受'+rule.name+'影响，与'+related+'及现役兵力有关；强化次数固定，不额外暴击。';
  const parts=['效果随'+rule.name+'增强，与'+related+'及现役兵力有关'];
  if(rule.checks.length)parts.push(rule.checks.map(k=>CHANCE_EFFECT_NAMES[k]).join('、')+'的成功率与'+rule.name+'和敌军'+(s.category==='intellect'?'军纪':'防御')+'有关');
  if(rule.critical)parts.push('可暴击，暴击率随'+rule.name+'提高');
  return parts.join('；')+'。';
}
export function tacticPowerPreview(s,p){
  if(s.passive)return '首次入场触发，持续与破隐混乱时间固定。';
  return s.power.name+' '+Math.round(p)+(s.power.critical?' · 可暴击':'')+(s.power.checks.length?' · 控制成功率受敌军抗性影响':'');
}
