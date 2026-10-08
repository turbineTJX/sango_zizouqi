import {STATUS_DEFINITIONS} from './data/design/battle-statuses.mjs';
import {STRATAGEMS,stratagemEffectText} from './stratagems.mjs';
import {ATTACK_ORBS,attackOrbDescription} from './attack-orbs.mjs';
import {COMBAT} from './combat-rules.mjs';
import {unitAttributes,ATTRIBUTE_LABELS} from './unit-stats.mjs';
import {passiveDamageTaken} from './passives.mjs';
import {fireTerrainFactor} from './terrain-rules.mjs';
import {hasStatus,shieldLayers,shieldAmount} from './tactics.mjs';
import {bondBlocksEffect} from './bonds.mjs';

const entry=(name,icon,tone,priority,description)=>({name,icon,tone,priority,description});
export function statusDescription(key,state={}){
  if(key==='attackOrb')return attackOrbDescription(state.skillId);
  const factor=state.potency??1,p=n=>Number((state.fraction!==undefined&&['powerDown','weaken','armorBreak'].includes(key)?state.fraction*100:n*factor).toFixed(1));
  const dynamic={
    hunger:`攻击、武技威力、谋略威力与营务威力降低 ${Math.round((state.fraction??0)*100)}%；按事件期限结束，无法镇静`,
    despair:`持续流失战意`,intentSuppression:`攻击与受击战意获取减少 ${(state.fraction??.3)*100}%`,decoy:`幻象耐久 ${state.hp??0}，承受200%伤害；不能攻击、不占上场名额`,
    attackHaste:`普攻间隔缩短 ${(state.fraction??.2)*100}%`,longRange:`远程普攻最大射程 +${state.amount??1}`,shortRange:`远程普攻最大射程 −${state.amount??1}`,
    powerDown:`武技威力与谋略威力降低 ${p(20)}%；可整军解除`,armorBreak:`防御降低 ${p(20)}%`,weaken:`攻击降低 ${p(20)}%`,valor:`攻击提高 ${p(25)}%`,
    phalanx:`减伤 ${p(30)}%，停止移动并免疫击退`,anchored:`停止移动，普攻最大射程 +1`,
    bulwark:`防御 +${p(30)}%、军纪 +${p(20)}%，移动减半`,camp:`防御提高 ${p(25)}%`,
    nexus:`谋略威力与军纪提高 ${p(20)}%`,emplaced:`攻击 +${p(20)}%、普攻与投石射程 +1，停止移动`,
    attackSlow:`普攻间隔增加 ${(state.fraction??.25)*100}%`,
    plague:`持续损失兵力，受到救治降低 ${p(50)}%；可救护解除`,
    ward:`减少所受直接伤害 ${state.percent??0}%`,
  };
  return dynamic[key]||STATUS_DISPLAY[key]?.description||'';
}
export const STATUS_DISPLAY=STATUS_DEFINITIONS;
const ICONS={
  confuse:'M5 7c1-6 14-6 14 2 0 7-13 8-13 2 0-4 8-4 8 0 0 2-2 3-3 3M12 18v3',
  fire:'M13 2c1 6 6 7 6 13a7 7 0 0 1-14 0c0-3 1-5 4-8 0 5 2 6 3 3 1-3 1-5 1-8Z',
  plague:'M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM9 14l6 4m0-4-6 4',
  seal:'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  target:'M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 10v4m-2-2h4',
  slow:'M5 2h14M5 22h14M7 2v5l10 10v5M17 2v5L7 17v5',
  sword:'M4 20 18 6l2-4-4 2L2 18ZM3 14l7 7',
  heal:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  move:'M3 6h12l-4-4m4 4-4 4M9 18h12l-4-4m4 4-4 4',
};
export function statusIcon(key){
  return `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[STATUS_DISPLAY[key]?.icon||'shield']}"/></svg>`;
}
// until is exclusive. A newly applied N-step status expires after N future ticks.
export function statusRemaining(until,tick){return Math.max(0,until-tick-1);}
export function statusTimeLabel(until,tick){
  const steps=statusRemaining(until,tick);
  return steps?'生效中':'即将结束';
}
export function visibleStatuses(b,u){
  const statuses=Object.entries(u.statuses||{}).filter(([key])=>hasStatus(b,u,key)).map(([key,s])=>({key,...STATUS_DISPLAY[key],description:statusDescription(key,s),state:key==='shield'?{...s,amount:shieldAmount(b,u),layers:shieldLayers(b,u)}:s,...(key==='heavyAttack'?{remaining:s.charges,time:'剩余 '+s.charges+' 次物理主动普攻'}:key==='attackOrb'?{name:s.sourceSkillName+' · 强化普攻',remaining:s.charges,time:'剩余 '+s.charges+' 次部队普攻 · 不随时间消耗'}:{remaining:statusRemaining(s.until,b.tick),time:statusTimeLabel(s.until,b.tick)})}));
  if(u.supplyPenalty)statuses.push({key:'hunger',...STATUS_DISPLAY.hunger,description:`攻击、武技威力、谋略威力与营务威力降低 ${Math.round(u.supplyPenalty*100)}%，需恢复粮道与供粮，无法镇静`,state:{},remaining:'粮',time:'随军团补给更新'});
  return statuses.sort((a,c)=>a.priority-c.priority);
}

export const ARMY_STATUS_DISPLAY={blockadeUntil:['截断援路','暂停敌方预备队入场']};
export function statusSources(b,s){
  if(s.key==='hunger'&&s.state.sourceEvent===undefined)return ['军团补给 · 缺粮'];
  if(s.army)return ['军团军略 · '+s.name];
  if(s.key==='shield')return (s.state.layers||[]).filter(l=>l.until>b.tick&&l.amount>0).map(l=>l.label);
  const origins=s.state.sources?.length?s.state.sources:s.state.origins?.length?s.state.origins:[s.state];
  return [...new Set(origins.map(o=>{
    const actor=o.sourceName||b.sides?.flatMap(side=>side.units||[]).find(u=>u.id===o.sourceId)?.name;
    return [actor,o.sourceSkillName,s.state.sourceNote].filter(Boolean).join(' · ')||'未记录来源';
  }))];
}
export function inspectionStatuses(b,u){
  const personal=visibleStatuses(b,u);
  const army=Object.entries(ARMY_STATUS_DISPLAY).filter(([key])=>b.sides?.[u.side]?.[key]>b.tick&&!(['blockadeUntil'].includes(key)&&bondBlocksEffect(b,u,b.sides[u.side].stratagemEffects?.[key]))).map(([key,[name,description]])=>({key,name:b.sides[u.side].stratagemEffects?.[key]?STRATAGEMS[b.sides[u.side].stratagemEffects[key].key].name:name,description:b.sides[u.side].stratagemEffects?.[key]?stratagemEffectText(b.sides[u.side].stratagemEffects[key]):description,army:true,tone:['blockadeUntil'].includes(key)?'debuff':'buff',state:{until:b.sides[u.side][key]},remaining:statusRemaining(b.sides[u.side][key],b.tick),time:statusTimeLabel(b.sides[u.side][key],b.tick)}));
  return [...personal,...army].map(s=>({...s,sources:statusSources(b,s)}));
}
// Compare derived values while holding troops, terrain and all other effects constant.
// This is a marginal contribution, not an additive breakdown of multiplicative buffs.
export function statusAttributeChanges(b,u,s){
  const without={...u,statuses:{...u.statuses}},sides=b.sides.map(side=>({...side,units:(side.units||[]).map(v=>v.id===u.id?without:v)}));
  if(s.dynamic)return [];
  else if(s.army)delete sides[u.side][s.key];
  else if(s.key==='hunger'){without.supplyPenalty=0;delete without.statuses.hunger;}
  else delete without.statuses[s.key];
  const before=unitAttributes(without,{...b,sides}),after=unitAttributes(u,b);
  const labels={...ATTRIBUTE_LABELS,attackInterval:'普攻间隔',damageReduction:'直接减伤',controlResistance:'控制时长减免'};
  return Object.entries(labels).flatMap(([key,name])=>{
    const scale=['damageReduction','controlResistance'].includes(key)?100:1;
    const delta=(after[key]-before[key])*scale;
    return Math.abs(delta)>1e-8?[{key,name,before:before[key]*scale,after:after[key]*scale,delta,unit:scale===100?'百分点':key==='attackInterval'?'回合':key==='move'?'格 / 回合':key==='range'?'格':key==='attackSpeed'?'次 / 秒':''}]:[];
  });
}
export function statusAmounts(b,u,s){
  const rows=[],v=s.state;
  if(s.key==='heavyAttack')rows.push(['剩余重击',v.charges+' 次物理主动普攻']);
  if(s.key==='attackOrb'){
    const stats=unitAttributes(u,b),profile=ATTACK_ORBS[v.skillId];
    rows.push(['剩余次数',v.charges+' 次（普攻命中敌方部队时消耗）']);
    rows.push(v.skillId==='curse'?['强化普攻基数',stats.strategyPower.toFixed(2)+' 谋略威力，替代原普攻']:['每次附加基数',(stats.martialPower*profile.bonus).toFixed(2)+' 武技威力，再按目标抗性、地形等结算']);
  }
  if(['burn','burn','plague'].includes(s.key)){
    const amount=Math.round(v.amount*passiveDamageTaken(b,u,'dot')*(s.key==='plague'?1:fireTerrainFactor(b,u)));
    rows.push(['单次伤害',`${amount} 人（护盾吸收前）`]);
  }
  if(s.key==='regrowth')rows.push(['单次救治上限',`${Math.round(v.amount*(hasStatus(b,u,'plague')?1-.5*(u.statuses.plague.potency??1):1))} 人（受现有伤兵限制）`]);
  if(v.stacks!==undefined)rows.push(['叠层',`${v.stacks} / 3`]);
  if(v.hits!==undefined)rows.push(['剩余抵挡次数',`${v.hits} 次`]);
  if(s.key==='shield')for(const l of v.layers||[])if(l.until>b.tick&&l.amount>0)rows.push([l.label,`${l.amount} · ${statusTimeLabel(l.until,b.tick)}`]);
  return rows;
}
