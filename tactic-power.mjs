// Shared formulas for simulation, descriptions and previews. P is the caster's
// corresponding derived power at cast start, never a raw officer attribute.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const POWER_RULES=Object.freeze({reference:280,minFactor:.7,maxFactor:1.6,criticalMultiplier:1.5});
export const powerFactor=p=>clamp(.6+Math.max(0,p)/700,POWER_RULES.minFactor,POWER_RULES.maxFactor);
export const powerDuration=(steps,p)=>Math.max(1,Math.round(steps*powerFactor(p)));
export const effectChance=(p,resistance)=>clamp(.65+(p-resistance)/1000,.25,.95);
export const criticalChance=p=>clamp(.05+Math.max(0,p)/2000,.05,.30);
export const statusFraction=(u,key,base)=>base*(u.statuses?.[key]?.potency??1);
export const DURATION_POWER_STATUSES=new Set(['confuse','seal','taunt','resolve','haste','riposte','phase','pursuit','burningAttack','strategyAttack','magicImmune','anchored','attackHaste','attackSlow','longRange','shortRange','insight','guard']);
export const CHANCE_EFFECT_NAMES=Object.freeze({stun:'眩晕',confuse:'混乱',seal:'封技',taunt:'嘲讽',root:'定身',disarm:'缴械',lure:'诱敌位移',knockback:'击退'});
const CRITICAL_EFFECTS=new Set(['thrust','strike','repeat','rush','terror','ram','navalRam','bombard','broadside']);
// Combine the current derived powers, including every live modifier. Damage
// type remains independent: siege tactics still meet physical defense.
export function tacticPowerValue(attributes,skill){
 if(skill?.powerSource==='combined')return (attributes.martialPower+attributes.strategyPower)/2;
 return skill?.category==='politics'?attributes.supportPower:skill?.category==='intellect'?attributes.strategyPower:attributes.martialPower;
}
export function tacticPowerProfile(s){
  const checks=[];
  if(s.control==='stun'||s.statusKey==='stun')checks.push('stun');
  if(s.control==='root')checks.push('root');
  if(['root','disarm'].includes(s.statusKey))checks.push(s.statusKey);
  if(s.effect==='confuse'||s.control==='confuse')checks.push('confuse');
  if(s.effect==='terror'&&!checks.includes('confuse'))checks.push('confuse');
  if(s.effect==='seal'||s.debuff==='seal')checks.push('seal');
  if(s.effect==='taunt')checks.push('taunt');
  if(s.effect==='lure')checks.push('lure');
  if(s.effect==='protect')checks.push('knockback');
  // Burst attacks can crit. Wide-area pressure, DOT, reflection and support stay predictable.
  const critical=CRITICAL_EFFECTS.has(s.effect)||(s.effect==='famous'&&s.mode==='attack'&&(s.targets||1)===1&&!s.control&&s.debuff!=='seal');
  return {attribute:s.powerSource==='combined'?'combinedPower':s.category==='politics'?'supportPower':s.category==='intellect'?'strategyPower':'martialPower',name:s.powerSource==='combined'?'合成威力':s.category==='politics'?'营务威力':s.category==='intellect'?'谋略威力':'武技威力',checks,critical};
}
export function tacticPowerDescription(s){
  if(s.passive)return '首次入场触发，持续与破隐混乱时间固定。';
  const rule=s.power;
  const current='部队当前'+rule.name+'（已计入现役兵力、状态、羁绊和支援修正）';
  if(s.attackOrb)return '强化普攻受'+current+'影响；强化次数固定，不额外暴击。';
  const parts=[s.powerSource==='combined'?'使用当前武技威力与谋略威力各50%的合成威力；现役兵力、状态、羁绊及支援修正先计入两项威力':'效果随'+current+'增强'];
  if(rule.checks.length)parts.push(rule.checks.map(k=>CHANCE_EFFECT_NAMES[k]).join('、')+'的成功率与'+rule.name+'和敌军'+(s.category==='intellect'?'军纪':'防御')+'有关');
  if(rule.critical)parts.push('可暴击，暴击率随'+rule.name+'提高');
  return parts.join('；')+'。';
}
export function tacticPowerPreview(s,p){
  if(s.passive)return '首次入场触发，持续与破隐混乱时间固定。';
  return s.power.name+' '+Math.round(p)+(s.power.critical?' · 可暴击':'')+(s.power.checks.length?' · 控制成功率受敌军抗性影响':'');
}
