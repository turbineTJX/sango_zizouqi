import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction} from './player-faction.mjs';
import {assignmentFor} from './domestic.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function interruptionMarkup(s,{command,work,replacing}){
 return `<p>新命令：<b>${esc(strategicOrderLabel(s,command))}</b></p><div class="work-conflicts">${work.map(w=>`<article><b>${esc(w.name)}</b><span>${esc(w.title)}${w.target?' · '+esc(w.target):''}</span><small>剩余 ${Number(w.remaining.toFixed(2))} 天${w.paused?' · 已暂停':''} · 已付 ${w.cost} 金</small></article>`).join('')}</div>${replacing.length?`<p>此操作将替换已有后续命令：${replacing.map(q=>esc(strategicOrderLabel(s,q))).join('、')}。</p>`:''}<p class="strategy-muted">外出武将选择立即执行时，会立即中止任务并沿路返回，抵达后执行新安排；不会瞬移。其余立即执行会中止未完成的事务，费用与建设进度按中止规则结算。完成后执行会保存后续命令；${['march','expedition'].includes(command.kind)?'全军等上述事务全部结束后出发，先完成的人不再接新事务。':'每人完成当前事务后自动执行新安排。'}外出任务须办完并返城；围城或工程延期会顺延等待。</p>`;
}
export function pendingOrdersMarkup(s){
 const orders=s.campaign.domestic.orders.filter(q=>q.faction===playerFaction(s));if(!orders.length)return '';
 return `<section class="strategy-ledger pending-orders"><h3>待执行命令 · ${orders.length}</h3>${orders.map(q=>`<article><div><b>${esc(strategicOrderLabel(s,q))}</b><small>${s.cities.find(c=>c.id===q.cityId)?.name} · 第 ${q.requestedDay} 天下令</small><p>${q.waits.map(w=>{const work=currentDomesticWork(s,w.officerId);return work&&work.actionId===w.actionId?`${esc(work.name)}：${esc(work.title)}，剩余 ${Number(work.remaining.toFixed(2))} 天${work.paused?'（暂停）':''}`:esc(OFFICER_BY_ID[w.officerId]?.name)+'：已完成，等待同军团其他事务';}).join('<br>')}</p></div><button class="button secondary" data-action="campaign-cancel-order" data-order="${q.id}">取消等待</button></article>`).join('')}</section>`;
}
export function officerWorkMarkup(s,id){
 const work=currentDomesticWork(s,id),order=s.campaign.domestic.orders.find(q=>q.officerIds.includes(id)),history=s.campaign.domestic.workHistory[id]||[];
 return `<section class="officer-work"><h3>当前内政事务</h3><p>${work?`${esc(work.title)}${work.target?' · '+esc(work.target):''} · 剩余 ${Number(work.remaining.toFixed(2))} 天${work.paused?' · 暂停中':''} · 已付 ${work.cost} 金`:esc(assignmentFor(s,id)?.waiting||'无正在执行的内政事务')}</p>${order?`<p class="queued-duty">完成后：${esc(strategicOrderLabel(s,order))}</p>`:''}<details><summary>个人事务记录 · 最近 ${history.length} 项</summary>${history.map(x=>`<p><small>第 ${x.startedDay}～${x.endedDay} 天 · ${({completed:'完成',failed:'未达预期',interrupted:'中止'})[x.status]}</small><br>${esc(x.text)}</p>`).join('')||'<p>暂无已结束事务。</p>'}</details></section>`;
}
