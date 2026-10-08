import {stratagemScopeText} from './stratagem-area.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
import {STRATAGEM_ATTRIBUTE_RULES} from './data/design/stratagem-attributes.mjs';
import {commandProtectionDuration} from './command-protection.mjs';
export const STRATAGEMS=structuredClone(STRATAGEM_DESIGNS);
export const STRATAGEM_POOL=Object.freeze(Object.keys(STRATAGEMS));
export const stratagemEligible=id=>Object.hasOwn(OFFICER_BY_ID,id)&&(OFFICER_ASSIGNMENTS[id]?.stratagems.length??0)>0;
export const stratagemLimit=id=>!stratagemEligible(id)?0:id==='person-290'?2:1;
export const OFFICER_STRATAGEMS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.stratagems])])));
export const officerStratagems=id=>Object.hasOwn(OFFICER_STRATAGEMS,id)?OFFICER_STRATAGEMS[id]:[];
export const commanderStratagems=c=>c&&['leader','advisor'].includes(c.role)&&stratagemEligible(c.id)?officerStratagems(c.id):[];
export const availableBattleCommanders = (side,tick=0) => side.retreat ? [] : (side.commanders||[]).filter(c=>side.units.some(u=>u.id===c.id && u.hp>0 && !u.withdrawing && (u.arrivalTick||0)<=tick && u.arrivalConfirmed!==false && ['active','reserve'].includes(u.status)));
export const STRATAGEM_RULE_TEXT='全游戏15种军略，不区分基础与专属，仅按明确人物名单分配给有统军、谋划或宗教领袖表现者，取消统一智力门槛。通常1项，诸葛亮2项；任军团长或军师且部队仍存活、已经抵达、未撤离时提供。重复军略只取较强来源。主要效果明显随施放者统率、智力变化，预览显示实际效果。每项独立长冷却，奇兵、整备、雷火和八阵每场各限一次。';

const baseStrength={shield:.25,heal:.2,cleanse:1,firestorm:1};
export function stratagemProfile(key,holder,bondBonus=0){
 const s=STRATAGEMS[key];if(!s||!holder)return null;
 const u={...OFFICER_BY_ID[holder.id],...holder},effect=s.effect||key;
 const weights=s.weights,r=STRATAGEM_ATTRIBUTE_RULES;
 const score=Object.entries(weights).reduce((n,[k,w])=>n+(u[k]??0)*w,0),power=Math.round(Math.max(r.min,Math.min(r.max,2**((score-r.reference)/r.doublingPoints)))*10000)/10000;
 const bondStrength=0;
 const strength=(s.baseStrength??baseStrength[effect]??1)*(s.scaling==='strength'?power:1);
 const duration=s.scaling==='duration'?Math.max(1,Math.round(s.duration*power)):s.duration;
 return {key,count:s.scaling==='count'?Math.max(1,Math.round(s.baseCount*power)):0,bondStrength,id:u.id,name:u.name,role:holder.role||'leader',leadership:u.leadership,intellect:u.intellect,power,score,weights,strength,duration,resolve:effect==='cleanse'?Math.max(1,Math.round(s.resolve*power)):0,cooldown:s.cooldown};
}
export function selectStratagemSource(commanders,key,bondBonus=0){
 return (commanders||[]).filter(c=>commanderStratagems(c).includes(key)).map(c=>stratagemProfile(key,c,bondBonus)).sort((a,b)=>b.power-a.power||Number(a.role!=='leader')-Number(b.role!=='leader')||a.id.localeCompare(b.id))[0]||null;
}
export function stratagemEffectText(p){
 if(!p)return '无符合任职条件的提供者';const s=STRATAGEMS[p.key],e=s.effect||p.key,percent=n=>(n*100).toFixed(1).replace(/\.0$/,'')+'%';
 const cooldown=' · 冷却 '+p.cooldown+' 回合';
 const detail=({shield:'护盾 '+percent(p.strength)+' 兵力上限',heal:'各队救治上限 '+percent(p.strength)+'，仅本场伤兵',cleanse:'驱散全部战斗异常（保留缺粮），获得坚定 '+p.resolve+' 回合',forceReserve:'额外出场最多 '+p.count+' 支已抵达后备部队，突破人数限制',tacticRefresh:'刷新已抵达存活部队全部主动战法次数（含专属），剩余冷却缩短 '+percent(p.strength),catastrophe:'敌我皆受影响；全战场随机 '+s.strikes+' 道雷火，半径 '+s.strikeRadius+' 格；每次伤害 '+percent(p.strength*(s.randomDamage?.min||0))+'～'+percent(p.strength*(s.randomDamage?.max||0))+' 初始兵力',blockade:'阻止敌方预备队正常补位，可用奇兵天降突破',firestorm:'施加灼烧，总火势 '+percent(p.strength)+'，按全部合法在场敌军分摊',invincible:'军阵无敌，仍可行动',ambush:'伏兵，接敌首击使目标混乱',stun:'眩晕，停止行动并打断战法',rapidAdvance:'神速，移动力+1、攻击间隔缩短25%、无视ZOC',magicImmunity:'魔免，驱散战斗异常，仅承受物理普攻',eightFormation:'八阵每场一次，按目标军纪判定异常（10%～60%），异常持续 '+s.zone?.statusSteps+' 回合'})[e];
 const duration=s.disciplineDuration?' · 按受益者军纪持续 '+commandProtectionDuration(0,p.power)+'～'+commandProtectionDuration(Infinity,p.power)+' 回合':p.duration?' · '+p.duration+' 回合':'';
 return p.name+'（统'+p.leadership+'／智'+p.intellect+'） · '+stratagemScopeText(s)+' · '+detail+duration+(s.shipFireBonus?' · 对舰船火势 +'+percent(s.shipFireBonus):'')+cooldown+(s.maxUses?' · 每场'+s.maxUses+'次':'');
}
