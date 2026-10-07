import {officerActivityDays} from './officer-activity.mjs';
import {siteActivityDays} from './activity-nodes.mjs';
import {nationalScenario} from './national-scenarios.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=(s,day)=>{const spec=nationalScenario(s.campaign.scenarioId),d=day-1;return spec?`${spec.year+Math.floor(d/360)}年${Math.floor(d%360/30)+1}月${d%30+1}日`:'第 '+day+' 天';};
export const officerActivityMarkup=(s,id,beforeDay,nodeId=null)=>activityDaysMarkup(s,officerActivityDays(s,id,{beforeDay:beforeDay||s.campaign.day}),nodeId);
export const siteActivityMarkup=(s,id,beforeDay,nodeId=null)=>activityDaysMarkup(s,siteActivityDays(s,id,{beforeDay:beforeDay||s.campaign.day}),nodeId);
function activityDaysMarkup(s,{start,end,rows},nodeId){
 const button=(label,day,disabled)=>`<button class="button secondary" data-action="campaign-activity-page" data-day="${day}" ${disabled?'disabled':''}>${label}</button>`;
 return `<div class="officer-activity-ledger"><p class="muted">${date(s,start)} — ${date(s,end)} · 每日位置、事务与结果，同日变化按发生顺序保留。</p><div class="officer-activity-days">${rows.map(({day,actions})=>`<article data-activity-day="${day}"><h4 style="grid-row:1 / span ${Math.max(1,actions.length)}">${esc(date(s,day))}<small>第 ${day} 天</small></h4>${actions.map(a=>`<div class="officer-activity-entry ${a.milestone?'activity-milestone':''} ${a.nodeId===nodeId?'activity-selected':''}" ${a.nodeId?`data-activity-node="${esc(a.nodeId)}"`:''}><b>${a.milestone?'事项 · ':''}${esc(a.place)}${a.progress!==null?' · '+a.progress+'%':''}</b><span>${esc(a.action)}</span></div>`).join('')||'<p class="muted">当日无事项记录</p>'}</article>`).join('')}</div><nav class="officer-activity-paging">${button('较早30天',start-1,start<=1)}${button('较近30天',Math.min(s.campaign.day,end+30),end>=s.campaign.day)}</nav></div>`;
}
