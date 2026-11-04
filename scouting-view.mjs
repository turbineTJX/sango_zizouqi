import {assignmentField} from './assignment-picker.mjs';
import {mapTargetField} from './map-target-picker.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {gateDurability} from './building-durability.mjs';
import {mapNode} from './map-node-data.mjs';
import {scoutCandidates,scoutTargets,scoutRoute,scoutAssignments,scoutingDurationRange,scoutJourney} from './scouting.mjs';
import {scoutOperator,scoutStatus} from './scouting-state.mjs';
import {validScoutRoute} from './scouting-state.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {playerFaction} from './player-faction.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(v)?Math.floor(v).toLocaleString('zh-CN'):'—';
export function scoutSelection(s,selection={}){
 const faction=playerFaction(s),cities=s.cities.filter(c=>c.owner===faction),city=cities.find(c=>c.id===selection.city);
 const candidates=city?scoutCandidates(s,city.id,playerFaction(s),{reassign:true}):[],officer=candidates.find(o=>o.unit.id===selection.officer);
 const targets=officer?scoutTargets(s,city.id):[],target=targets.find(n=>n.id===selection.target);
 const route=target?(selection.route?(validScoutRoute(s,city.id,target.id,selection.route)?selection.route:null):scoutRoute(s,city.id,target.id)):null;
 return {cities,city,candidates,officer,targets,target,route};
}
export function scoutingMarkup(s,selection={},mapMarkup=''){
 const {cities,city,candidates,officer,targets,target,route}=scoutSelection(s,selection),range=scoutingDurationRange(officer?.unit.intellect),days=CAMPAIGN_TIME.daysPerTurn,tasks=scoutAssignments(s).filter(t=>t.faction===playerFaction(s));
 const trip=route&&scoutJourney(s,city.id,route),besieged=city&&s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===city.id),allowed=s.campaign.phase==='planning'&&!s.finished&&!besieged&&officer&&trip&&city.gold>=trip.gold;
 const fields=`<div class="scout-fields">${assignmentField('scout-city','派出城市',city?.name,{kind:'scout-city',selection:city?.id})}${assignmentField('scout-officer','执行人',officer?.unit.name,{kind:'scout-officer',disabled:!city,selection:officer?.unit.id})}<div>${assignmentField('scout-target','终点',target?.name,{kind:'scout-target',disabled:!officer,selection:target?.id})}${mapTargetField('scout-target','地图选点',{disabled:!officer})}</div></div>${city&&!candidates.length?'<p role="status">本城暂无可执行侦察的武将</p>':''}`;
 const missions=tasks.map(t=>{const o=scoutOperator(s,t),remaining=scoutJourney(s,t.location,t.route,t.progress);return `<article><b>${esc(o?.unit.name)}</b><span>${esc(mapNode(s,t.homeCity).name)} → ${esc(mapNode(s,t.targetCity).name)}</span><small>${scoutStatus(t)} · 剩余 ${remaining?.days??0} 天 · 已付 ${t.paidGold} 金</small><button class="button secondary" data-action="scout-recall" data-officer="${esc(t.officerId)}">停止</button><details class="scout-contact-list"><summary>情报 ${t.contacts.length}</summary>${t.contacts.map(c=>`<p>${esc(c.name)} · ${campaignDate(s,{day:c.report.day})} <button class="personnel-name" data-action="scout-report" data-task="${t.id}" data-key="${esc(c.key)}">查看</button></p>`).join('')||'<p>暂无情报</p>'}</details></article>`;}).join('');
 const readiness=stateMessage();
 function stateMessage(){
  if(s.finished)return '本局已结束';
  if(s.campaign.phase!=='planning'){const nextDay=(Math.floor(((s.campaign.day||1)-1)/days)+1)*days+1;return `当前为执行阶段；请在${campaignDate(s,{day:nextDay})}新旬筹划时派遣侦察`;}
  if(besieged)return '围城中，无法派遣';
  if(!city)return '请选择派出城市';
  if(!officer)return candidates.length?'请选择执行人':'本城暂无可用武将';
  if(!target)return '请选择侦察终点';
  if(!route?.length)return '当前路线不可达';
  if(city.gold<trip.gold)return `本城金不足，需 ${trip.gold} 金`;
  return `${city.name} → ${target.name} · ${trip.days} 天 · ${trip.gold} 金`;
 }
 return `<section class="scouting-workbench command-target-layout"><div class="command-map">${mapMarkup}</div><aside>${fields}${officer?`<dl class="scout-preview">${trip?`<div><dt>预计用时</dt><dd class="scout-route">${trip.days} 天</dd></div><div><dt>费用</dt><dd class="scout-cost">${trip.gold} 金</dd></div><div><dt>本城金</dt><dd>${number(city.gold)}</dd></div>`:''}<div><dt>视野持续</dt><dd class="scout-duration">${range.min/days}–${range.max/days} 回合（${range.min}–${range.max}天）</dd></div></dl>`:''}${route?'<div class="scout-route-tools"><button class="text-button" data-action="route-reset">重置路线</button></div>':''}${tasks.length?`<h3>侦察中 · ${tasks.length}</h3><div class="scout-missions">${missions}</div>`:''}</aside></section><footer class="map-command-footer"><span class="command-selection-status" id="scout-readiness" role="status">${esc(readiness)}</span><button class="button primary" data-action="scout-dispatch" aria-describedby="scout-readiness" data-city="${city?.id||''}" data-officer="${officer?.unit.id||''}" data-target="${target?.id||''}" ${allowed?'':'disabled'}>派遣</button></footer>`;
}
export function scoutingReportMarkup(s,selection={}){
 const t=scoutAssignments(s).find(t=>t.id===selection.task&&t.faction===playerFaction(s)),c=t?.contacts.find(c=>c.key===selection.key);
 if(!c)return {title:'侦察情报',body:'<p>该侦察记录已结束。</p>'};
 const d=c.report.data,fields=c.kind==='city'?[['势力',FACTIONS[d.owner]?.name||'无主'],['本城金',number(d.gold)],['存粮',number(d.grain)],['预备兵',number(d.manpower)],['城门耐久',number(gateDurability(d).hp)],['主将在城兵力',number(d.units.reduce((n,u)=>n+u.troops,0))]]:c.kind==='army'?[['势力',FACTIONS[d.faction]?.name||'无主'],['兵力',number(d.units.reduce((n,u)=>n+u.troops,0))],['士气',number(d.morale)],['携粮',number(d.supply)],['观察位置',d.travel?mapNode(s,d.travel.from).name+' → '+mapNode(s,d.travel.to).name:mapNode(s,d.location).name]]:[['类型',({gate:'关卡',port:'港口',junction:'路口'})[d.kind]],['地域',d.province]];
 if(c.kind==='bandit')fields.splice(0,fields.length,['类型','固定贼寨'],['所在',mapNode(s,d.nodeId).name],['兵力',number(d.units.reduce((n,u)=>n+u.troops,0))],['贼将',d.units.length]);
 return {title:c.name,body:`<p>${campaignDate(s,{day:c.report.day})} · ${esc(scoutOperator(s,t)?.unit.name)}</p><dl class="info-fields">${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${d.units?`<h3>${c.kind==='army'?'所属部队':'驻城部队（主将在城）'}</h3><div class="personnel-table-wrap"><table><thead><tr><th>武将</th><th>兵种</th><th>士兵</th></tr></thead><tbody>${d.units.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(TROOP_DESIGNS[u.type]?.name)}</td><td>${number(u.troops)}</td></tr>`).join('')||'<tr><td colspan="3">未发现驻军</td></tr>'}</tbody></table></div>`:''}`};
}
