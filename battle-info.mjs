import {sideBonds} from './bonds.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {isDeploying,attackRange,battleWounded} from './engine.mjs';
import {hasStatus,unitTactics,readyTactic} from './tactics.mjs';
import {tacticUsesLeft,tacticUseLimit} from './tactic-tempo.mjs';
import {TERRAIN_NAMES,unitTerrain} from './battlefield.mjs';
import {hidden} from './battle-status-rules.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number((v||0).toFixed(2));
import {retreatLabel} from './battle-retreat.mjs';
const stateNames={active:'在场',reserve:'预备队',defeated:'已溃败',withdrawn:'已撤离'};
const fields=rows=>`<dl class="battle-info-fields">${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
export function battleTacticConditions(b,u,s){
 const reasons=[];
 if(b.result)reasons.push('战斗已结束');
 else if(isDeploying(b))reasons.push('战前布阵，尚未开战');
 if(u.status!=='active'||u.hp<=0)reasons.push((stateNames[u.status]||'不在场')+'，不能施放');
 if(b.sides[u.side].retreat)reasons.push('全军撤退中');
 else if(u.withdrawing)reasons.push('部队撤离中');
 for(const [key,label]of [['confuse','混乱'],['seal','封技'],['stealth','伏兵']])if(hasStatus(b,u,key))reasons.push(label+'中');
 if(s.passive)return [hasStatus(b,u,'stealth')?'伏兵生效中，首击破隐':u.entryStatusesApplied?'本场首次入场效果已使用':'首次合法入场时触发'];
 if(tacticUsesLeft(u,s)<=0)reasons.push('本场次数已用尽');
 if((u.intent||0)<Math.max(s.threshold,s.intentCost))reasons.push('战意不足，还差 '+num(Math.max(s.threshold,s.intentCost)-(u.intent||0)));
 const cd=Math.max(0,(u.skillReady?.[s.id]||0)-b.tick),recovery=Math.max(0,(u.tacticRecoveryUntil||0)-b.tick);
 if(cd)reasons.push('独立冷却剩余 '+num(cd)+' 日');
 if(recovery)reasons.push('调息剩余 '+num(recovery)+' 日');
 if(s.attackOrb&&hasStatus(b,u,'attackOrb'))reasons.push('当前强化普攻剩余 '+u.statuses.attackOrb.charges+' 次');
 return reasons;
}
export function battleUnitSummary(b,u){
 if(u.side===1&&!isDeploying(b)&&hidden(b,u))return [['阵营 / 状态','敌军 · 伏兵'],['战场位置','尚未识破'],['当前行动','无法观测']];
 const side=b.sides[u.side],reserve=u.status==='reserve';
 const location=u.status==='active'?`第 ${u.x+1} 列 / 第 ${u.y+1} 行 · ${TERRAIN_NAMES[unitTerrain(b,u)]}`:reserve?'场外预备区':u.status==='withdrawn'?'已离开战场':'已退出战斗';
 let action=b.result?'战斗已结束':isDeploying(b)?'等待确认布阵':u.status!=='active'?(stateNames[u.status]||'不在场'):side.retreat?'执行全军撤退':hasStatus(b,u,'confuse')?'混乱，阵位失序':u.action||'等待行动';
 const rows=[['阵营 / 状态',(u.side===0?'我军':'敌军')+' · '+(stateNames[u.status]||u.status)],['战场位置',location],['当前行动',action],['现役 / 本场初始',`${num(u.hp)} / ${num(u.initial)}`],['本场伤兵',num(battleWounded(u))],['当前战意',num(u.intent)]];
 rows.push(['在场羁绊',Object.entries(sideBonds(b,u.side)).map(([id,v])=>`${BOND_DESIGNS[id].name} ${v.points}点（${v.tier}档）`).join('、')||'无']);
 if((u.bondEntry?.zocUntil||0)>b.tick)rows.push(['骑将入场突破',`无视ZOC · 剩余 ${u.bondEntry.zocUntil-b.tick} 回合`]);
 if((u.bondEntry?.powerUntil||0)>b.tick)rows.push(['先登入场',`武技威力 +${Math.round(u.bondEntry.power*100)}% · 剩余 ${u.bondEntry.powerUntil-b.tick} 回合`]);
 const reserveReward=side.bondReserve?.awarded.find(a=>a.id===u.id);if(reserveReward)rows.push(['蓄锐入场','已领取'+BOND_DESIGNS.bondReserve.intent+'战意及'+BOND_DESIGNS.bondReserve.entrySteps+'回合疾行、速攻'+(reserveReward.skill?'；普通小战法额外一次额度':'')]);
 for(const [key,label]of [['peachFury','桃园奋战'],['peachInvincible','桃园无敌']])if((u.statuses?.[key]?.until||0)>b.tick)rows.push([label,'剩余 '+(u.statuses[key].until-b.tick)+' 回合']);
 rows.push(['撤离',retreatLabel(u.retreatAt)]);
 if(u.withdrawing&&u.status==='active')rows.push(['撤离状态','前往己方出口，途中仍可受击；离场后本场不再入场']);
 if(reserve&&!b.result)rows.push(['入场条件',side.retreat?'撤退中，不再入场':(u.arrivalTick||0)>b.tick?'援军尚未抵达，余 '+(u.arrivalTick-b.tick)+' 日':side.blockadeUntil>b.tick?'援路受阻，余 '+(side.blockadeUntil-b.tick)+' 日':isDeploying(b)?'战前预备队':'等待合法空位，按补位规则入场']);
 if(u.status==='active'&&!b.result&&!isDeploying(b))rows.push(['普攻间隔剩余',num(u.cooldown)+' 日'],['战法调息剩余',num(Math.max(0,(u.tacticRecoveryUntil||0)-b.tick))+' 日']);
 const targets=[...new Set((b.effects||[]).filter(e=>e.from===u.id&&e.phase==='impact').map(e=>e.to))];
 if(targets.length)rows.push(['本日实际作用对象',targets.map(id=>b.sides.flatMap(s=>s.units).find(x=>x.id===id)?.name||(id===b.siege?.gate.id?'城门':id)).join('、')]);
 return rows;
}
export function battleUnitSummaryMarkup(b,u){return `<section class="battle-info-current" data-battle-info="current"><h3>当前战况 <small>第 ${b.tick} 日 · 查看时暂停</small></h3>${fields(battleUnitSummary(b,u))}</section>`;}
export function battleTacticDetailMarkup(b,u,s){
 const reasons=battleTacticConditions(b,u,s),equipped=unitTactics(u).some(t=>t.id===s.id);
 if(!equipped)reasons.unshift('本场未携带');
 let state=reasons.join('；'),target='—';
 if(equipped&&!reasons.length&&!s.passive){const ready=readyTactic(b,u,attackRange(b,u));state=ready?.skill.id===s.id?'当前条件满足，等待自动行动检查':ready?'优先施放「'+ready.skill.name+'」':'当前没有符合引擎条件的目标或施放机会';if(ready?.skill.id===s.id)target=ready.target.name;}
 const rows=[['当前可用情况',state||'持续光环'],['按当前局面可施放的目标',target]];
 if(!s.passive)rows.push(['剩余次数',`${tacticUsesLeft(u,s)} / ${tacticUseLimit(u,s)}`],['战意 / 门槛 / 消耗',`${num(u.intent)} / ${s.threshold} / ${s.intentCost}`],['独立冷却剩余',num(Math.max(0,(u.skillReady?.[s.id]||0)-b.tick))+' 日'],['共享调息剩余',num(Math.max(0,(u.tacticRecoveryUntil||0)-b.tick))+' 日']);
 return `<section class="battle-info-current" data-battle-info="tactic"><h3>本场战法状态 <small>第 ${b.tick} 日</small></h3>${fields(rows)}</section>`;
}
