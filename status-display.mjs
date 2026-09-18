import {COMBAT} from './combat-rules.mjs';

const entry=(name,icon,tone,priority,description)=>({name,icon,tone,priority,description});
export function statusDescription(key,state={}){
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
  phalanx:entry('枪阵','shield','buff',15,'减伤 30%，停止移动并免疫击退'),
  ward:entry('战法减伤','shield','buff',16,'减少所受直接伤害'),
  illusion:entry('幻卫','shield','buff',17,'抵挡有限次数的直接命中，不抵挡持续伤害'),
  regrowth:entry('回春','heal','buff',18,'每步救治已有伤兵，受伤兵预算和减疗限制'),
  phase:entry('奇门','move','buff',19,'暂时无视敌方拦截，仍遵守占位及水陆限制'),
  pursuit:entry('后阵追击','target','buff',20,'优先追击后排，对弓弩普攻增强'),
  bulwark:entry('铁壁','shield','buff',21,'防御 +30%、军纪 +20%，移动减半'),
  riposte:entry('反击','sword','buff',22,'受到近邻直接攻击时反击，每步最多一次'),
  camp:entry('营垒','shield','buff',23,'防御提高 25%'),
  nexus:entry('阵枢','confuse','buff',24,'谋略威力与军纪提高 20%'),
  anchored:entry('抛锚','shield','buff',25,'减伤 25%，停止移动'),
  emplaced:entry('架设','target','buff',26,'攻击 +20%、普攻与投石射程 +1，停止移动'),
  burningAttack:entry('燃击','fire','buff',27,'普通攻击续叠灼烧'),
  cursingAttack:entry('咒击','confuse','buff',28,'普攻改用谋略威力，并续叠衰咒'),
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
  const statuses=Object.entries(u.statuses||{}).filter(([,s])=>s.until>b.tick).map(([key,s])=>({key,...STATUS_DISPLAY[key],description:statusDescription(key,s),state:s,remaining:statusRemaining(s.until,b.tick),time:statusTimeLabel(s.until,b.tick)}));
  if(u.supplyPenalty)statuses.push({key:'hunger',...STATUS_DISPLAY.hunger,description:`攻击、武技威力与谋略威力降低 ${Math.round(u.supplyPenalty*100)}%，需恢复粮道与供粮，无法净化`,state:{},remaining:'粮',time:'随军团每日补给更新'});
  return statuses.sort((a,c)=>a.priority-c.priority);
}
