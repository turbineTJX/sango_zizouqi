// Shared formulas for simulation, descriptions and previews. P is the caster's
// corresponding derived power at cast start, never a raw officer attribute.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const POWER_RULES=Object.freeze({reference:280,minFactor:.7,maxFactor:1.6,criticalMultiplier:1.5});
export const powerFactor=p=>clamp(.6+Math.max(0,p)/700,POWER_RULES.minFactor,POWER_RULES.maxFactor);
export const powerDuration=(steps,p)=>Math.max(1,Math.round(steps*powerFactor(p)));
export const effectChance=(p,resistance)=>clamp(.65+(p-resistance)/1000,.25,.95);
export const criticalChance=p=>clamp(.05+Math.max(0,p)/2000,.05,.30);
export const statusFraction=(u,key,base)=>base*(u.statuses?.[key]?.potency??1);
export const DURATION_POWER_STATUSES=new Set(['stun','confuse','seal','taunt','resolve','haste','riposte','phase','pursuit','burningAttack','strategyAttack']);
export const CHANCE_EFFECT_NAMES=Object.freeze({stun:'眩晕',confuse:'混乱',seal:'封技',taunt:'挑衅',lure:'诱敌位移',knockback:'击退'});
const CRITICAL_EFFECTS=new Set(['thrust','strike','repeat','rush','terror','ram','navalRam','bombard','broadside']);
export function tacticPowerProfile(s){
  const checks=[];
  if(s.effect==='confuse'||s.control==='confuse')checks.push('confuse');
  if(s.effect==='terror'||s.control==='stun')checks.push('stun');
  if(s.effect==='seal'||s.debuff==='seal')checks.push('seal');
  if(s.effect==='taunt')checks.push('taunt');
  if(s.effect==='lure')checks.push('lure');
  if(s.effect==='protect')checks.push('knockback');
  // Burst attacks can crit. Wide-area pressure, DOT, reflection and support stay predictable.
  const critical=CRITICAL_EFFECTS.has(s.effect)||(s.effect==='famous'&&s.mode==='attack'&&(s.targets||1)===1&&!s.control&&s.debuff!=='seal');
  return {attribute:s.category==='politics'?'supportPower':s.category==='intellect'?'strategyPower':'martialPower',name:s.category==='politics'?'营务威力':s.category==='intellect'?'谋略威力':'武技威力',checks,critical};
}
export function tacticPowerDescription(s){
  if(s.passive)return '恢复光环，每 6 步结算，无战意门槛、不占用施法行动；增效按（80＋智力×1.4＋政治×0.6）×现役兵力/3000计算，再使用增效系数 S。相同光环不叠加。';
  const rule=s.power;
  if(s.attackOrb)return '强化次数固定为 3 次，不受威力或连携延长。削弱幅度按装填时'+rule.name+'计算；普攻基数与火矢灼烧按命中时面板计算，不额外暴击。只结算一次普攻战意和受击战意，不触发战法连携。';
  const parts=[`随${rule.name}成长：固定治疗、护盾、增减战意、冷却缩减和状态幅度乘增效系数 S；原公式已含威力的数值不重复乘 S。S＝0.6＋威力/700，限 0.7～1.6`];
  parts.push('控制、免控、疾行、反击、奇门、追击及强化普攻的持续时间也乘 S；射程、目标数、位移格数、自损和自身破防代价固定');
  if(rule.checks.length)parts.push(`${rule.checks.map(k=>CHANCE_EFFECT_NAMES[k]).join('、')}逐目标判定：成功率＝(65＋（${rule.name}−目标${s.category==='intellect'?'军纪':'防御'}）/10)%，限 25%～95%；失败仍进入冷却，伤害与其他效果照常结算`);
  if(rule.critical)parts.push(`直接伤害可暴击：暴击率＝(5＋${rule.name}/20)%，最高 30%，伤害 ×1.5；同次多段对同一目标共用一次判定`);
  else parts.push('本战法不暴击');
  return parts.join('。')+'。';
}
export function tacticPowerPreview(s,p){
  if(s.passive)return `协阵威力 ${Math.round(p)} · 每 6 步救治最多 ${(0.5*powerFactor(p)).toFixed(2)}% 伤兵、恢复 ${Math.round(2*powerFactor(p))} 战意 · 同类只取最强`;
  return `${s.power.name} ${Math.round(p)} · 增效 ×${powerFactor(p).toFixed(2)}${s.power.critical?` · 暴击率 ${(criticalChance(p)*100).toFixed(1)}%（伤害 ×1.5）`:' · 不暴击'}${s.power.checks.length?' · '+s.power.checks.map(k=>CHANCE_EFFECT_NAMES[k]).join('／')+'成功率随目标抗性计算（25%～95%）':' · 合法目标稳定生效'}`;
}
