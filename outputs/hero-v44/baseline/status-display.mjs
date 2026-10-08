import {formationAura} from './support-rules.mjs';
import {ATTACK_ORBS,attackOrbDescription} from './attack-orbs.mjs';
import {COMBAT} from './combat-rules.mjs';
import {unitAttributes,ATTRIBUTE_LABELS} from './unit-stats.mjs';
import {passiveDamageTaken} from './passives.mjs';
import {fireTerrainFactor} from './terrain-rules.mjs';

const entry=(name,icon,tone,priority,description)=>({name,icon,tone,priority,description});
export function statusDescription(key,state={}){
  if(key==='attackOrb')return attackOrbDescription(state.skillId);
  const factor=state.potency??1,p=n=>Number((n*factor).toFixed(1));
  const dynamic={
    armorBreak:`防御降低 ${p(20)}%`,weaken:`攻击降低 ${p(20)}%`,valor:`攻击提高 ${p(25)}%`,
    phalanx:`减伤 ${p(30)}%，停止移动并免疫击退`,anchored:`减伤 ${p(25)}%，停止移动`,
    blight:`受到的治疗降低 ${p(50)}%`,slow:`移动速度降低 ${p(50)}%`,
    bulwark:`防御 +${p(30)}%、军纪 +${p(20)}%，移动减半`,camp:`防御提高 ${p(25)}%`,
    nexus:`谋略威力与军纪提高 ${p(20)}%`,emplaced:`攻击 +${p(20)}%、普攻与投石射程 +1，停止移动`,
    curse:`每层攻击、谋略威力与军纪降低 ${p(6)}%，最多三层`,
    shaken:`普攻间隔增加 ${p(25)}%，谋略威力降低 ${p(15)}%`,
    illusion:`分担直接命中的 ${p(50)}%，每次最多兵力上限 ${p(8)}%，剩余 ${state.hits??0} 次；不抵挡持续伤害`,
    ward:`减少所受直接伤害 ${state.percent??0}%`,
  };
  return dynamic[key]||STATUS_DISPLAY[key]?.description||'';
}
export const STATUS_DISPLAY={
  hunger:entry('缺粮','plague','debuff',6,'军团口粮不足，削弱攻击与战法威力；恢复补给后逐日解除，无法用战场净化消除'),
  stun:entry('眩晕','stun','control',0,'不能移动、攻击或施放战法，暂时失去拦截能力'),
  confuse:entry('混乱','confuse','control',1,'随机转移阵位，无法攻击或施法，暂时失去拦截能力'),
  burn:entry('灼烧','fire','damage',2,'持续损失兵力；最多三层，随当前地形修正，可净化'),
  scorch:entry('火攻','fire','damage',3,'军略造成的持续伤害，随当前地形修正，可净化'),
  plague:entry('疫伤','plague','damage',4,'持续损失兵力，可净化'),
  seal:entry('封技','seal','control',5,'无法施放战法，仍可普攻与移动'),
  taunt:entry('嘲讽','target','control',6,'优先攻击或合法接近嘲讽来源'),
  slow:entry('迟滞','slow','debuff',7,'移动速度减半'),
  armorBreak:entry('破防','shield','debuff',8,'防御降低 20%'),
  blight:entry('减疗','plague','debuff',9,'受到的治疗降低 50%'),
  weaken:entry('疲弱','sword','debuff',10,'攻击降低 20%'),
  curse:entry('衰咒','confuse','debuff',11,'每层攻击、谋略威力与军纪降低 6%，最多三层'),
  shaken:entry('震军','slow','debuff',12,'普攻间隔增加 25%，谋略威力降低 15%'),
  shield:entry('护盾','shield','buff',13,'不同来源独立到期，优先消耗最早到期层'),
  resolve:entry('坚定','shield','buff',14,'暂时免疫眩晕、混乱与嘲讽'),
  phalanx:entry('方阵','shield','buff',15,'减伤 30%，停止移动并免疫击退'),
  ward:entry('战法减伤','shield','buff',16,'减少所受直接伤害'),
  illusion:entry('幻卫','shield','buff',17,'抵挡有限次数的直接命中，不抵挡持续伤害'),
  regrowth:entry('休整','heal','buff',18,'每步救治已有伤兵，受伤兵预算和减疗限制'),
  phase:entry('奇门','move','buff',19,'暂时无视敌方拦截，仍遵守占位及水陆限制'),
  pursuit:entry('后阵追击','target','buff',20,'优先追击后排，对弓弩普攻增强'),
  bulwark:entry('坚阵','shield','buff',21,'防御 +30%、军纪 +20%，移动减半'),
  riposte:entry('反击','sword','buff',22,'受到近邻直接攻击时反击，每步最多一次'),
  camp:entry('营垒','shield','buff',23,'防御提高 25%'),
  nexus:entry('阵枢','confuse','buff',24,'谋略威力与军纪提高 20%'),
  anchored:entry('抛锚','shield','buff',25,'减伤 25%，停止移动'),
  emplaced:entry('架设','target','buff',26,'攻击 +20%、普攻与投石射程 +1，停止移动'),
  burningAttack:entry('燃击','fire','buff',27,'普通攻击续叠灼烧'),
  attackOrb:entry('强化普攻','target','buff',14,'下几次普攻附带战法效果'),
  strategyAttack:entry('谋攻','sword','buff',29,'普攻改用 0.8 倍谋略威力，受军纪抵御'),
  haste:entry('疾行','move','buff',30,'移动力增加 1'),
  valor:entry('奋战','sword','buff',31,'攻击提高 25%'),
  phaseLock:entry('奇门间隔','slow','neutral',32,'间隔结束前不能再次获得奇门'),
};
const ICONS={
  stun:'M12 2l2.2 5.4L20 6l-2.6 5.1L22 15l-6 .7L15 22l-4-4.4L6 21l.4-6L1 12l5.7-2L6 4l4.5 2.6Z',
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
  return steps?`${steps} 步 · ${(steps*COMBAT.stepMs/1000).toFixed(1)} 秒`:'本步结束';
}
export function visibleStatuses(b,u){
  const statuses=Object.entries(u.statuses||{}).filter(([,s])=>s.until>b.tick).map(([key,s])=>({key,...STATUS_DISPLAY[key],description:statusDescription(key,s),state:s,...(key==='attackOrb'?{name:s.sourceSkillName+' · 强化普攻',remaining:s.charges,time:'剩余 '+s.charges+' 次部队普攻 · 不随时间消耗'}:{remaining:statusRemaining(s.until,b.tick),time:statusTimeLabel(s.until,b.tick)})}));
  const aura=formationAura(b,u);if(aura)statuses.push({key:'formationAura',name:'协阵光环',icon:'heal',tone:'buff',priority:30,dynamic:true,description:`相邻辅兵协阵：每 6 步救治最多兵力上限 ${(aura.factor*.5).toFixed(2)}% 的已有伤兵、恢复 ${Math.round(2*aura.factor)} 战意；受减疗、伤兵额度和战意上限限制；不提高攻防，同类只取最强`,state:{sourceId:aura.source.id,sourceName:aura.source.name,sourceSkillName:'协阵'},remaining:'邻',time:'相邻时持续生效'});
  if(u.supplyPenalty)statuses.push({key:'hunger',...STATUS_DISPLAY.hunger,description:`攻击、武技威力与谋略威力降低 ${Math.round(u.supplyPenalty*100)}%，需恢复粮道与供粮，无法净化`,state:{},remaining:'粮',time:'随军团每日补给更新'});
  return statuses.sort((a,c)=>a.priority-c.priority);
}

export const ARMY_STATUS_DISPLAY={
  assaultUntil:['全军猛攻','攻击提高 25%'],fortifyUntil:['坚壁之策','防御、军纪提高 20%'],
  disruptUntil:['虚实之策','攻击、防御、军纪降低 15%'],hasteUntil:['疾行赴援','移速 +1，与个人疾行不叠加'],
  rangeUntil:['引弦远射','弓弩射程 +2'],recoveryUntil:['休养生息','在场各队每步救治初始兵力 1% 的本场伤兵'],
  blockadeUntil:['断敌援路','暂停敌方预备队入场'],reliefUntil:['后军固阵','预备队入场时获得 15% 护盾，放宽轮换条件'],
};
export function statusSources(b,s){
  if(s.key==='hunger')return ['军团补给 · 缺粮'];
  if(s.army)return ['军团军略 · '+s.name];
  if(s.key==='shield')return (s.state.layers||[]).filter(l=>l.until>b.tick&&l.amount>0).map(l=>l.label);
  const origins=s.state.origins?.length?s.state.origins:[s.state];
  return [...new Set(origins.map(o=>{
    const actor=o.sourceName||b.sides?.flatMap(side=>side.units||[]).find(u=>u.id===o.sourceId)?.name;
    return [actor,o.sourceSkillName,s.state.sourceNote].filter(Boolean).join(' · ')||'未记录来源';
  }))];
}
export function inspectionStatuses(b,u){
  const personal=visibleStatuses(b,u);
  const army=Object.entries(ARMY_STATUS_DISPLAY).filter(([key])=>b.sides?.[u.side]?.[key]>b.tick).map(([key,[name,description]])=>({key,name,description,army:true,tone:['disruptUntil','blockadeUntil'].includes(key)?'debuff':'buff',state:{until:b.sides[u.side][key]},remaining:statusRemaining(b.sides[u.side][key],b.tick),time:statusTimeLabel(b.sides[u.side][key],b.tick)}));
  return [...personal,...army].map(s=>({...s,sources:statusSources(b,s)}));
}
// Compare derived values while holding troops, terrain and all other effects constant.
// This is a marginal contribution, not an additive breakdown of multiplicative buffs.
export function statusAttributeChanges(b,u,s){
  const without={...u,statuses:{...u.statuses}},sides=b.sides.map(side=>({...side,units:(side.units||[]).map(v=>v.id===u.id?without:v)}));
  if(s.dynamic)for(const side of sides)side.units=side.units.map(v=>({...v,tactics:v.tactics?.filter(id=>id!=='passage')}));
  else if(s.army)delete sides[u.side][s.key];
  else if(s.key==='hunger')without.supplyPenalty=0;
  else delete without.statuses[s.key];
  const before=unitAttributes(without,{...b,sides}),after=unitAttributes(u,b);
  const labels={...ATTRIBUTE_LABELS,attackInterval:'普攻间隔',damageReduction:'直接减伤',controlResistance:'控制时长减免'};
  return Object.entries(labels).flatMap(([key,name])=>{
    const scale=['damageReduction','controlResistance'].includes(key)?100:1;
    const delta=(after[key]-before[key])*scale;
    return Math.abs(delta)>1e-8?[{key,name,before:before[key]*scale,after:after[key]*scale,delta,unit:scale===100?'百分点':key==='attackInterval'?'步':key==='move'?'格 / 步':key==='range'?'格':key==='attackSpeed'?'次 / 秒':''}]:[];
  });
}
export function statusAmounts(b,u,s){
  const rows=[],v=s.state;
  if(s.key==='attackOrb'){
    const stats=unitAttributes(u,b),profile=ATTACK_ORBS[v.skillId];
    rows.push(['剩余次数',v.charges+' 次（普攻命中敌方部队时消耗）']);
    rows.push(v.skillId==='curse'?['强化普攻基数',stats.strategyPower.toFixed(2)+' 谋略威力，替代原普攻']:['每次附加基数',(stats.martialPower*profile.bonus).toFixed(2)+' 武技威力，再按目标抗性、地形等结算']);
  }
  if(['burn','scorch','plague'].includes(s.key)){
    const amount=Math.round(v.amount*passiveDamageTaken(b,u,'dot')*(s.key==='plague'?1:fireTerrainFactor(b,u)));
    rows.push(['当前每步伤害',`${amount} 人（护盾吸收前）`]);
  }
  if(s.key==='formationAura'){const aura=formationAura(b,u);if(aura){rows.push(['结算间隔','每 6 步；距下次 '+(6-b.tick%6)+' 步']);rows.push(['每次救治上限',Math.round(u.maxHp*.005*aura.factor*((u.statuses?.blight?.until||0)>b.tick?1-.5*(u.statuses.blight.potency??1):1))+' 人（受现有伤兵限制）']);rows.push(['每次恢复战意',Math.round(2*aura.factor)+'（不超过 100）']);}}
  if(s.key==='regrowth')rows.push(['每步救治上限',`${Math.round(v.amount*((u.statuses?.blight?.until||0)>b.tick?1-.5*(u.statuses.blight.potency??1):1))} 人（受现有伤兵限制）`]);
  if(s.key==='recoveryUntil')rows.push(['每步救治上限',`${Math.round(u.maxHp*.01*((u.statuses?.blight?.until||0)>b.tick?1-.5*(u.statuses.blight.potency??1):1))} 人（受现有伤兵限制）`]);
  if(s.key==='illusion')rows.push(['单次吸收上限',`${Math.round(u.maxHp*.08*(v.potency??1))} 人`]);
  if(v.stacks!==undefined)rows.push(['叠层',`${v.stacks} / 3`]);
  if(v.hits!==undefined)rows.push(['剩余抵挡次数',`${v.hits} 次`]);
  if(s.key==='shield')for(const l of v.layers||[])if(l.until>b.tick&&l.amount>0)rows.push([l.label,`${l.amount} · ${statusTimeLabel(l.until,b.tick)}`]);
  return rows;
}
