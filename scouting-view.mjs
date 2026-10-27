import {campaignDate} from './national-scenarios.mjs';
import {gateDurability} from './building-durability.mjs';
import {mapNode} from './map-node-data.mjs';
import {scoutCandidates,scoutTargets,scoutRoute,scoutAssignments,scoutingDurationRange} from './scouting.mjs';
import {scoutOperator,scoutStatus} from './scouting-state.mjs';
import {validScoutRoute} from './scouting-state.mjs';
import {roadCost} from './road-metrics.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {playerFaction} from './player-faction.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(v)?Math.floor(v).toLocaleString('zh-CN'):'—';
export function scoutSelection(s,selection={}){
 const faction=playerFaction(s),cities=s.cities.filter(c=>c.owner===faction),city=cities.find(c=>c.id===selection.city);
 const candidates=city?scoutCandidates(s,city.id):[],officer=candidates.find(o=>o.unit.id===selection.officer);
 const targets=officer?scoutTargets(s,city.id):[],target=targets.find(n=>n.id===selection.target);
 const route=target?(selection.route?(validScoutRoute(s,city.id,target.id,selection.route)?selection.route:null):scoutRoute(s,city.id,target.id)):null;
 return {cities,city,candidates,officer,targets,target,route};
}
export function scoutingMarkup(s,selection={},mapMarkup=''){
 const {cities,city,candidates,officer,targets,target,route}=scoutSelection(s,selection),range=scoutingDurationRange(officer?.unit.intellect),days=CAMPAIGN_TIME.daysPerTurn,tasks=scoutAssignments(s).filter(t=>t.faction===playerFaction(s));
 const cost=route?.reduce((sum,id,i)=>sum+roadCost(s,i?route[i-1]:city.id,id),0),besieged=city&&s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===city.id),allowed=s.campaign.phase==='planning'&&!s.finished&&!besieged&&officer&&route?.length;
 const fields=`<div class="scout-fields"><label>派出城市<select id="scout-city"><option value="">选择城市</option>${cities.map(c=>`<option value="${esc(c.id)}" ${city?.id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>执行人<select id="scout-officer" ${city?'':'disabled'}><option value="">选择武将</option>${candidates.map(o=>`<option value="${esc(o.unit.id)}" ${officer?.unit.id===o.unit.id?'selected':''}>${esc(o.unit.name)} · 智 ${o.unit.intellect}</option>`).join('')}</select></label><label>终点<select id="scout-target" ${officer?'':'disabled'}><option value="">选择终点</option>${targets.map(n=>`<option value="${esc(n.id)}" ${target?.id===n.id?'selected':''}>${esc(n.name)}</option>`).join('')}</select></label></div>${city&&!candidates.length?'<p role="status">本城暂无可执行侦察的武将</p>':''}`;
 const missions=tasks.map(t=>{const o=scoutOperator(s,t);return `<article><b>${esc(o?.unit.name)}</b><span>${esc(mapNode(s,t.homeCity).name)} → ${esc(mapNode(s,t.targetCity).name)}</span><small>${scoutStatus(t)}</small><button class="button secondary" data-action="scout-recall" data-officer="${esc(t.officerId)}">停止</button><details class="scout-contact-list"><summary>情报 ${t.contacts.length}</summary>${t.contacts.map(c=>`<p>${esc(c.name)} · ${campaignDate(s,{day:c.report.day})} <button class="personnel-name" data-action="scout-report" data-task="${t.id}" data-key="${esc(c.key)}">查看</button></p>`).join('')||'<p>暂无情报</p>'}</details></article>`;}).join('');
 return `<section class="scouting-workbench command-target-layout"><div class="command-map">${mapMarkup}</div><aside>${fields}${besieged?'<p role="alert">围城中，无法派遣</p>':''}${officer?`<p class="scout-duration">视野 ${range.min/days}–${range.max/days} 回合（${range.min}–${range.max}天）</p>`:''}${route?`<p class="scout-route">预计 ${Math.ceil(cost/MOVEMENT_RULES.scouting.speed)} 天抵达</p><small class="route-edit-hint">拖动中转点改线</small><button class="text-button" data-action="route-reset">重置路线</button>`:''}<button class="button primary" data-action="scout-dispatch" data-city="${city?.id||''}" data-officer="${officer?.unit.id||''}" data-target="${target?.id||''}" ${allowed?'':'disabled'}>派遣</button>${tasks.length?`<h3>侦察中 · ${tasks.length}</h3><div class="scout-missions">${missions}</div>`:''}</aside></section>`;
}
export function scoutingReportMarkup(s,selection={}){
 const t=scoutAssignments(s).find(t=>t.id===selection.task&&t.faction===playerFaction(s)),c=t?.contacts.find(c=>c.key===selection.key);
 if(!c)return {title:'侦察情报',body:'<p>该侦察记录已结束。</p>'};
 const d=c.report.data,fields=c.kind==='city'?[['势力',FACTIONS[d.owner]?.name||'无主'],['本城金',number(d.gold)],['存粮',number(d.grain)],['预备兵',number(d.manpower)],['城门耐久',number(gateDurability(d).hp)],['驻城士兵',number(d.units.reduce((n,u)=>n+u.troops,0))]]:c.kind==='army'?[['势力',FACTIONS[d.faction]?.name||'无主'],['兵力',number(d.units.reduce((n,u)=>n+u.troops,0))],['士气',number(d.morale)],['携粮',number(d.supply)],['观察位置',d.travel?mapNode(s,d.travel.from).name+' → '+mapNode(s,d.travel.to).name:mapNode(s,d.location).name]]:[['类型',({gate:'关卡',port:'港口',junction:'路口'})[d.kind]],['地域',d.province]];
 if(c.kind==='bandit')fields.splice(0,fields.length,['类型','固定贼寨'],['所在',mapNode(s,d.nodeId).name],['兵力',number(d.units.reduce((n,u)=>n+u.troops,0))],['贼将',d.units.length]);
 return {title:c.name,body:`<p>${campaignDate(s,{day:c.report.day})}的侦察报告 · 负责人${esc(scoutOperator(s,t)?.unit.name)}在${esc(mapNode(s,t.homeCity).name)}工作。</p><dl class="info-fields">${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${d.units?`<h3>${c.kind==='army'?'所属部队':'驻城部队'}</h3><div class="personnel-table-wrap"><table><thead><tr><th>武将</th><th>兵种</th><th>士兵</th></tr></thead><tbody>${d.units.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(TROOP_DESIGNS[u.type]?.name)}</td><td>${number(u.troops)}</td></tr>`).join('')||'<tr><td colspan="3">未发现驻军</td></tr>'}</tbody></table></div>`:''}`};
}
