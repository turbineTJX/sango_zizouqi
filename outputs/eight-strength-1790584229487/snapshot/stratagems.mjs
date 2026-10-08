import {stratagemScopeText} from './stratagem-area.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
export const STRATAGEMS=structuredClone(STRATAGEM_DESIGNS);
export const EXCLUSIVE_STRATAGEMS=Object.freeze(Object.fromEntries(Object.entries(STRATAGEMS).filter(([,s])=>s.pool==='exclusive').map(([id,s])=>[id,s.owner])));
export const ORDINARY_STRATAGEM_POOL=Object.freeze(Object.keys(STRATAGEMS).filter(id=>!Object.hasOwn(EXCLUSIVE_STRATAGEMS,id)));
export const EXCLUSIVE_STRATAGEM_POOL=Object.freeze(Object.keys(EXCLUSIVE_STRATAGEMS));
for(const [id,s] of Object.entries(STRATAGEMS)){s.pool=EXCLUSIVE_STRATAGEMS[id]?'exclusive':'ordinary';s.owner=EXCLUSIVE_STRATAGEMS[id]??null;}
export const STRATAGEM_MIN_INTELLECT=70;
export const stratagemEligible=id=>(OFFICER_BY_ID[id]?.intellect??0)>=STRATAGEM_MIN_INTELLECT;
export const stratagemLimit=id=>!stratagemEligible(id)?0:id==='person-290'?3:2;
export const OFFICER_STRATAGEMS=Object.freeze(Object.fromEntries(Object.entries(OFFICER_ASSIGNMENTS).map(([id,a])=>[id,Object.freeze([...a.stratagems])])));
export const officerStratagems=id=>Object.hasOwn(OFFICER_STRATAGEMS,id)?OFFICER_STRATAGEMS[id]:[];
export const stratagemPoolLabel=id=>STRATAGEMS[id]?.pool==='exclusive'?'专属军略':'普通军略';

export const commanderStratagems=c=>c&&['leader','advisor'].includes(c.role)&&stratagemEligible(c.id)?officerStratagems(c.id):[];
export const availableBattleCommanders = side => side.retreat ? [] : (side.commanders||[]).filter(c=>side.units.some(u=>u.id===c.id && u.hp>0 && !u.withdrawing && ['active','reserve'].includes(u.status)));
export const STRATAGEM_RULE_TEXT='仅基础智力≥70的武将拥有军略，任军团长或军师时提供；所率部队被歼灭、开始撤离或撤退后不能再提供军略；通常2项，仅诸葛亮3项。基础智力不足70者无军略，升级不改变资格。专属占用总名额；重复军略取合资格持有者的较强效果。军略数值按持有者统率、智力折算；八阵的异常概率单独按目标当前军纪判定；统军类偏重统率，谋划与救治类偏重智力。';

const baseStrength={assault:.25,fortify:.2,disrupt:.15,heal:.08,regenerate:.01,relief:.15,inspire:35,demoralize:45,cycle:15,range:2,haste:1,blockade:1,cleanse:1,firestorm:1};
export function stratagemProfile(key,holder){
 const s=STRATAGEMS[key];if(!s||!holder)return null;
 const u={...OFFICER_BY_ID[holder.id],...holder},effect=s.effect||key;
 const weights=s.weights||(['heal','regenerate','firestorm','disrupt','demoralize','blockade','cycle','cleanse'].includes(effect)?{leadership:.3,intellect:.7}:{leadership:.7,intellect:.3});
 const score=Object.entries(weights).reduce((n,[k,w])=>n+(u[k]??0)*w,0),power=Math.round(Math.max(.35,Math.min(1.3,(score/80)**2))*10000)/10000;
 const strength=(s.baseStrength??baseStrength[effect]??1)*power;
 const duration=['range','haste','blockade'].includes(effect)?Math.max(1,Math.round(s.duration*power)):s.duration;
 return {key,id:u.id,name:u.name,role:holder.role||'leader',power,score,weights,strength,duration,resolve:Math.max(1,Math.round((s.resolve||3)*power)),cooldownReduction:Math.max(1,Math.round(4*power)),intentDrain:Math.round((s.intentDrain||0)*power)};
}
export function selectStratagemSource(commanders,key){
 return (commanders||[]).filter(c=>commanderStratagems(c).includes(key)).map(c=>stratagemProfile(key,c)).sort((a,b)=>b.power-a.power||Number(a.role!=='leader')-Number(b.role!=='leader')||a.id.localeCompare(b.id))[0]||null;
}
export function stratagemEffectText(p){
 if(!p)return '无符合任职条件的提供者';const s=STRATAGEMS[p.key],e=s.effect||p.key,percent=n=>(n*100).toFixed(1).replace(/\.0$/,'')+'%';
 if(s.zone||['magicImmunity','rapidAdvance'].includes(e))return p.name+' · '+s.description;
 const detail=({assault:'攻击 +'+percent(p.strength),fortify:'防御、军纪 +'+percent(p.strength),disrupt:'敌军攻击、防御、军纪 −'+percent(p.strength),heal:'各队救治上限 '+percent(p.strength),regenerate:'每日救治上限 '+percent(p.strength),relief:'补位护盾 '+percent(p.strength),inspire:'战意 +'+Math.round(p.strength),demoralize:'敌军战意 −'+Math.round(p.strength),cycle:'战意 +'+Math.round(p.strength)+'，冷却缩短 '+p.cooldownReduction+' 日',cleanse:'镇静并保护 '+p.resolve+' 日',range:'弓弩射程 +2',haste:'移动力 +1',blockade:'阻止敌方预备队补位',firestorm:'火攻伤害与持有者统率、智力有关'})[e];
 return p.name+' · '+stratagemScopeText(s)+' · '+detail+(p.duration?' · '+p.duration+' 日':'')+(s.resolve?' · 控制保护 '+p.resolve+' 日':'')+(s.intentDrain?' · 敌军战意 −'+p.intentDrain:'')+(s.shipFireBonus?' · 对舰船火势 +'+percent(s.shipFireBonus):'');
}
