import {campaignDate} from './national-scenarios.mjs';
import {campaignEnding} from './campaign-ending.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=value=>Math.round(value).toLocaleString('zh-CN');
const cache=new WeakMap();
const pageSize=20;
function pages(kind,index,total){
 const last=Math.max(0,Math.ceil(total/pageSize)-1),page=Math.max(0,Math.min(last,Number(index)||0));
 return {page,nav:`<nav class="ending-pages" aria-label="${kind==='officers'?'武将':'战事'}分页"><button data-action="ending-page" data-kind="${kind}" data-page="${page-1}" ${page===0?'disabled':''}>上一页</button><span>第 ${page+1} / ${last+1} 页 · 共 ${n(total)} 项</span><button data-action="ending-page" data-kind="${kind}" data-page="${page+1}" ${page===last?'disabled':''}>下一页</button></nav>`};
}
export function campaignEndingMarkup(s,ui){
 if(!cache.has(s))cache.set(s,campaignEnding(s));const r=cache.get(s);
 if(!r)return '';
 const o=pages('officers',ui.endingOfficersPage,r.officers.length),e=pages('events',ui.endingEventsPage,r.events.length),t=r.territory,b=r.battles,c=r.casualty;
 return `<main class="campaign-ending" aria-labelledby="ending-title"><header class="ending-hero"><p class="eyebrow">${r.observer?'全 AI 观战结束':'全国征途 · 整局回顾'}</p><h1 id="ending-title">${esc(r.title)}</h1><p>${esc(r.scenario)} · ${esc(r.factionName)}${r.observer?'（统一势力）':''} · 历经 ${n(r.days)} 天</p><nav class="ending-toolbar" aria-label="结局操作"><button data-action="ending-export">导出最终存档</button><button data-action="ending-map">返回地图</button><button data-action="ending-new">开启新征途</button><button data-action="settings">设置与存档</button></nav></header>
 <section class="ending-stats" aria-label="整局战绩"><article><h2>疆域</h2><strong>${n(t.initial)} → ${n(t.controlled)}</strong><p>开局 → 结束</p><p>占领 ${n(t.captured)} 次 · 失守 ${n(t.lost)} 次</p></article><article><h2>实际交战</h2><strong>${n(b.total)} 场</strong><p>获胜 ${n(b.wins)} · 败退 ${n(b.losses)} · 收兵 ${n(b.draws)}</p></article><article><h2>本方战损</h2><strong>阵亡 ${n(c.killed)}</strong><p>各战伤兵合计 ${n(c.wounded)} · 逃散 ${n(c.escaped)}</p><p>累计参战 ${n(c.initial)} 人次</p></article></section>
 <section class="ending-section"><h2>武将贡献</h2>${r.officers.length?`<div class="ending-table-scroll"><table><thead><tr><th>武将</th><th>净功绩</th><th>战斗</th><th>内政</th><th>其他</th><th>参战</th></tr></thead><tbody>${r.officers.slice(o.page*pageSize,(o.page+1)*pageSize).map(row=>`<tr><th scope="row">${esc(row.name)}</th><td>${n(row.merit)}</td><td>${n(row.battleMerit)}</td><td>${n(row.domesticMerit)}</td><td>${n(row.otherMerit)}</td><td>${n(row.battles)}</td></tr>`).join('')}</tbody></table></div>${o.nav}`:'<p>本局尚无武将功绩或参战记录。</p>'}</section>
 <section class="ending-section"><h2>战事与疆域变动</h2>${r.events.length?`<ol class="ending-events">${r.events.slice(e.page*pageSize,(e.page+1)*pageSize).map(event=>`<li><span>${campaignDate(s,{day:event.day})} · ${event.kind==='battle'?'交战':'疆域'}</span><p>${esc(event.text)}</p></li>`).join('')}</ol>${e.nav}`:'<p>本局尚无交战或据点易主记录。</p>'}</section></main>`;
}
