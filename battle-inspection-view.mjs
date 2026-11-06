import {integerText} from './number-rules.mjs';
import {battleUnitSummary,battleTacticConditions} from './battle-info.mjs';
import {battleHealth,battleHealthText,battleHealthStyle} from './battle-health-view.mjs';
import {COMBAT} from './combat-rules.mjs';
import {unitTactics,shieldAmount} from './tactics.mjs';
import {tacticUsesLeft,tacticUseLimit} from './tactic-tempo.mjs';
import {hidden} from './battle-status-rules.mjs';
import {inspectionStatuses,statusIcon,statusAttributeChanges,statusAmounts} from './status-display.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coreFields=new Set(['阵营 / 状态','当前行动','当前兵 / 可恢复上限 / 原上限','本场伤兵','当前战意']);
export function battleInspectionBriefMarkup(b,u){
 if(u.side===1&&b.deploymentLocked&&hidden(b,u))return '<section class="battle-info-current battle-unit-brief">敌军伏兵，尚未识破</section>';
 const health=battleHealth(u),rows=new Map(battleUnitSummary(b,u));
 const action=b.result?rows.get('当前行动'):u.status==='reserve'?u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick?'援军尚未抵达':'后备待命':!b.deploymentLocked&&b.tick===0?'待命':rows.get('当前行动');
 return `<section class="battle-info-current battle-unit-brief" data-side="${u.side}" aria-label="战况简报"><div class="battle-brief-health" style="${battleHealthStyle(health)}"><div><span>兵力</span><b title="${battleHealthText(health)}">${health.current} / ${health.recoverable} / ${health.maximum}</b></div><span class="battle-inspection-health" role="progressbar" aria-label="兵力" aria-valuemin="0" aria-valuemax="${health.maximum}" aria-valuenow="${health.current}" aria-valuetext="${battleHealthText(health)}"><i></i></span></div><dl class="battle-brief-meters"><div><dt>战意</dt><dd>${u.intent||0}<small> / ${COMBAT.intentCap}</small></dd></div><div><dt>护盾</dt><dd>${shieldAmount(b,u)}</dd></div></dl><p class="battle-brief-action" title="${esc(action)}">${esc(action)}</p></section>`;
}
export function battleInspectionTacticsMarkup(b,u){
 return `<div class="battle-brief-tactics" aria-label="战法">${unitTactics(u).map(s=>`<button class="button secondary battle-brief-tactic${s.special?' special':''}" data-action="tactic-detail" data-inspect="${esc(u.id)}" data-skill="${esc(s.id)}" title="${esc(battleTacticConditions(b,u,s).join('；')||'查看战法')}"><span>${esc(s.name)}</span><small>${s.passive?'被动':`${tacticUsesLeft(u,s)} / ${tacticUseLimit(u,s)}`}</small></button>`).join('')||'<span class="muted">未携带战法</span>'}</div>`;
}
export function battleInspectionContextMarkup(b,u){
 return `<dl class="battle-info-fields">${battleUnitSummary(b,u).filter(([key])=>!coreFields.has(key)).map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}
export function battleInspectionStatusesMarkup(b,u){
 if(u.side===1&&b.deploymentLocked&&hidden(b,u))return '';
 const statuses=inspectionStatuses(b,u);
 const duration=s=>s.state.charges!==undefined?s.time:Number.isFinite(s.state.until)?(s.remaining?`剩余 ${s.remaining} 战斗回合`:'即将结束'):s.time;
 return `<section class="battle-brief-effects" aria-label="状态"><h3>状态 <small>${statuses.length?`${statuses.length}项`:'无'}</small></h3>${statuses.length?`<div class="inspection-statuses">${statuses.map(s=>{
  const amounts=statusAmounts(b,u,s),changes=statusAttributeChanges(b,u,s),number=integerText;
  return `<details class="effect-tile tone-${esc(s.tone)}" data-status="${esc(s.key)}"><summary data-status-trigger>${statusIcon(s.key)}<span><b>${esc(s.name)}</b></span><em>${esc(duration(s))}</em></summary><div class="effect-details"><p>${esc(s.description)}</p><dl>${s.sources.map(source=>`<div><dt>来源</dt><dd>${esc(source)}</dd></div>`).join('')}${amounts.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${changes.length?`<details class="status-values"><summary>属性变化</summary><p class="muted">无此状态 → 生效后</p><dl>${changes.map(r=>`<div><dt>${esc(r.name)}</dt><dd>${number(r.before)} → ${number(r.after)}${esc(r.unit)}</dd></div>`).join('')}</dl></details>`:''}</div></details>`;
 }).join('')}</div>`:''}</section>`;
}
