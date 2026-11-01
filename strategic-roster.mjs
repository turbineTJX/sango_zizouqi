import {domesticStaffing,domesticAssignmentError} from './domestic-staffing.mjs';
import {scoutAssignment} from './scouting-state.mjs';
import {abilityButton} from './ability-reference.mjs';
import {mapNode} from './road-network.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {playerFaction} from './player-faction.mjs';
import {siegeDefenseCandidates} from './siege-defense.mjs';
import {relationshipInfo} from './relationships.mjs';
import {sortRows,sortHeader,sortButton} from './list-sort.mjs';
import {officerRecommendation,compareRecommendations} from './officer-recommendation.mjs';
import {domesticDirectionTraitCatalog} from './officer-traits.mjs';
import {missionStatus} from './officer-missions.mjs';
import {isTransport,remainingPersonnelDays} from './personnel-movement.mjs';
import {cityUnitRows} from './city-units.mjs';
import {TROOPS} from './engine.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {unitTactics} from './tactics.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {cityStaffStatus} from './domestic-feedback.mjs';
import {ACTIONS,DIRECTIONS,assignmentFor,canTrain} from './domestic.mjs';
import {isPlanning,armyBattle} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';
import {APTITUDE_COLUMNS,aptitudeGrade} from './aptitude-display.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OFFICER_STATS=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
export function campaignOfficers(s){
 const town=id=>mapNode(s,id)?.name||'—',rows=new Map();
 const appointments=id=>{const a=assignmentFor(s,id),d=diplomaticAssignment(s,id);return [s.cities.some(c=>c.governor===id)?'太守':'',a?DIRECTIONS[a.direction]+'负责人':'',scoutAssignment(s,id)?'侦察负责人':'',d?DIPLOMACY_DIRECTIONS[d.direction].name+'使臣':''].filter(Boolean);};
 for(const o of cityUnitRows(s).filter(o=>o.faction===playerFaction(s)))rows.set(o.unit.id,{...o,home:o.unit.homeCity,place:town(o.location),status:'驻城部队',duty:appointments(o.unit.id).join(' · ')||'—',appointments:appointments(o.unit.id)});
 for(const a of s.armies.filter(a=>a.faction===playerFaction(s)&&!a.disbanded))for(const unit of a.units){
  const moving=!!a.travel,battle=armyBattle(s,a.id);
  const roles=[a.leader===unit.id?'军团长':'',a.advisor===unit.id?'军师':''].filter(Boolean);
  rows.set(unit.id,{unit,location:moving?null:a.location,home:unit.homeCity,place:moving?`${town(a.travel.from)} → ${town(a.travel.to)}`:town(a.location),status:battle?'交战':moving?'行军':a.route.length?'待出征':'驻军',duty:[roles.join(' / ')||'随军',a.name,...appointments(unit.id)].join(' · '),appointments:appointments(unit.id),army:a});
 }
 const idle=[...s.campaign.idle,...s.armies.filter(a=>a.disbanded).flatMap(a=>a.returningOfficers||[])];
 for(const o of idle.filter(o=>o.faction===playerFaction(s))){
  const duty=assignmentFor(s,o.unit.id),governor=s.cities.find(c=>c.governor===o.unit.id),returning=!s.campaign.idle.includes(o);
  rows.set(o.unit.id,{unit:o.unit,location:o.destination||o.retreating||returning?null:o.location,home:o.unit.homeCity,place:o.destination?`${town(o.location)} → ${town(o.destination)}（${remainingPersonnelDays(s,o)}天）`:town(o.location),status:returning?'待返城':o.retreating?(o.journey?.blocked||'撤离'):o.destination?(isTransport(o)?'运输':'调任'):governor?'太守':duty?'内政':'待命',duty:[governor?'太守':'',duty?DIRECTIONS[duty.direction]+'负责人':''].filter(Boolean).join(' · ')||'—',appointments:appointments(o.unit.id),idle:o,returning});
 }
 for(const r of rows.values())if(r.unit.mission){const m=r.unit.mission;r.location=m.route.length?null:m.location;r.place=town(m.location)+(m.route.length?' → '+town(m.route[0]):'');r.status=missionStatus(m);r.duty=m.type==='diplomacy'?'外交事务':'外出人才任务';}
 for(const r of rows.values()){const t=scoutAssignment(s,r.unit.id);if(t){r.status='工作中 · 侦察';r.duty='侦察负责人 · '+town(t.targetCity);}}
 const idleIds=new Set(s.cities.filter(c=>c.owner===playerFaction(s)).flatMap(c=>cityStaffStatus(s,c).idle.map(o=>o.unit.id)));
 for(const r of rows.values()){
  r.availableIdle=idleIds.has(r.unit.id);
  if(r.unit.mission||r.unit.scouting||r.army)continue;
  if(r.returning)r.duty='返城';
  else if(r.idle?.destination||r.idle?.retreating)r.duty=r.idle.retreating?'撤离':isTransport(r.idle)?'运输':'调任';
  else r.duty=r.appointments.join(' · ')||(r.availableIdle?'空闲':s.campaign.domestic.orders.some(q=>q.officerIds.includes(r.unit.id))?'待执行命令':'待出征');
 }
 return [...rows.values()];
}
export function pickerReason(s,row,pick){
 if(s.finished)return '本局已结束';
 if(!isPlanning(s)&&pick.task!=='defense')return '执行中';
 if(row.returning)return '待返城';
 if(row.unit.scouting&&pick.task!=='expedition')return '侦察中';
 if(pick.task==='domestic'&&pick.direction){const error=domesticAssignmentError(s,pick.city,pick.direction,[...new Set([...(pick.selected||[]),row.unit.id])]);if(error)return error;}
 if(row.unit.mission){if(!['transfer','domestic','expedition'].includes(pick.task))return '外出中';return row.unit.mission.homeCity===pick.city?'':'不属于本城';}
 if(row.idle?.retreating)return '撤离途中';
 if(row.idle?.destination)return '调任途中';
 if(row.location!==pick.city)return '不在本城';
 const c=s.cities.find(c=>c.id===pick.city);
 if(c?.owner!==playerFaction(s))return '非己方据点';
 if(!residentOfficer(s,row.unit.id)&&!(pick.task==='defense'&&row.army?.defense))return row.status+'中';
 if(pick.task==='transfer'&&row.army)return '随军中';
 if(pick.task==='transfer'&&s.cities.some(c=>c.governor===row.unit.id))return '须先解除太守';
 if(pick.task==='draft'){
  if(row.army||row.cityUnit)return '已编制部队';
  if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id))return '围城期间不可编制';
  if(!canTrain(c,row.unit.type))return '本城未解锁兵种';
 }
 if(pick.task==='defense'&&row.army&&!siegeDefenseCandidates(s,pick.city).some(o=>o.unit.id===row.unit.id))return '已参加守城编组';
 if(pick.task==='expedition'){if(row.army)return '已在军团中';if(s.campaign.domestic.orders.some(q=>q.kind==='expedition'&&q.officerIds.includes(row.unit.id)))return '已编入待出征命令';}
 if(pick.task==='domestic'&&assignmentFor(s,row.unit.id)?.direction===pick.direction)return '已在此任职';
 if(pick.task==='governor'&&c.governor===row.unit.id)return '现任太守';
 return '';
}
export const pickerTitle=p=>({governor:'任命太守',domestic:'委任'+DIRECTIONS[p.direction]+'负责人',defense:'战前编制守城部队',draft:'守城编制',transfer:'调任武将',expedition:'编组出征'}[p.task]);
export function officerWorkMarkup(s,id){
 if(!s.campaign?.domestic)return '—';
 const work=currentDomesticWork(s,id),order=s.campaign.domestic.orders.find(q=>q.officerIds.includes(id));
 return (work?`${esc(work.title)}<small>还需 ${Number(work.remaining.toFixed(1))} 天${work.paused?' · 暂停':''}</small>`:'—')+(order?`<small class="queued-duty">待执行：${esc(strategicOrderLabel(s,order))}</small>`:'');
}
export function taskPickerMarkup(s,ui,pick,rows,recs,sort,adapter={}){
 const military=['draft','expedition','defense'].includes(pick.task),main=military&&pick.single,appointment=['domestic','governor'].includes(pick.task),transfer=pick.task==='transfer';
 const keys=pick.task==='domestic'?[DIRECTION_STATS[pick.direction]]:pick.task==='governor'?['politics']:transfer?OFFICER_STATS.map(([key])=>key):military?['leadership','force','intellect']:[],labels=Object.fromEntries(OFFICER_STATS);
 const source=adapter.rows||campaignOfficers(s),chosen=source.filter(r=>pick.selected.includes(r.unit.id)),multi=!pick.single&&['draft','domestic','expedition','defense'].includes(pick.task);
 const traits=pick.task==='domestic'?domesticDirectionTraitCatalog(Object.values(ACTIONS).filter(d=>d.direction===pick.direction)):appointment?[...new Map(source.filter(r=>r.location===pick.city||r.unit.mission?.homeCity===pick.city).flatMap(r=>officerRecommendation(s,r.unit,pick).traits).map(t=>[t.id,t])).values()]:[];
 const direction=ui.personnel?.direction||'desc',scope=adapter.sortScope||'personnel',context=!adapter.rows,located=context&&(appointment||transfer),showTroops=military&&!main;
 const staffing=pick.task==='domestic'?domesticStaffing(s,pick.city,pick.direction,{replacing:pick.selected}):null;
 const used=staffing?new Set([...staffing.officerIds,...pick.selected]).size:chosen.length,limit=staffing?.limit??(pick.single||pick.task==='governor'?1:pick.task==='expedition'?(adapter.limit||10):null);
 const count=`<span class="task-personnel-count${limit!==null&&used>=limit?' full':''}" aria-live="polite">${staffing?'人数':'已选'} <b>${used}${limit===null?'':'/'+limit}</b></span>`;
 const heads='<th>任用</th>'+sortHeader(scope,'name','武将',sort,direction)+keys.map(k=>sortHeader(scope,k,labels[k],sort,direction)).join('')+(main?'<th>兵种适性</th><th>带兵上限</th>':'')+(showTroops?sortHeader(scope,'troops','兵力',sort,direction):'')+(located?'<th>所在</th>':'')+(context?'<th>任职</th><th>事务</th>':'')+(!appointment?'<th>特性</th>':'')+traits.map(t=>`<th>${abilityButton('trait',t.id,t.name)}</th>`).join('');
 const cells=rows.map(r=>{
  const u=r.unit,recommendation=recs.get(u.id),unavailable=adapter.reason?adapter.reason(r):pickerReason(s,r,pick);
  const capacityError=staffing&&domesticAssignmentError(s,pick.city,pick.direction,[...new Set([...pick.selected,u.id])]),hint=capacityError===unavailable?'':unavailable;
  const aptitudes=APTITUDE_COLUMNS.map(([id,label])=>esc(label)+' '+aptitudeGrade(troopAptitude(u,id)));
  return `<tr class="${unavailable?'unavailable':''} ${pick.selected.includes(u.id)?'selected':''}"><td><input type="${multi?'checkbox':'radio'}" name="personnel-choice" ${adapter.choiceAttribute||'data-personnel-choice'}="${u.id}" aria-label="选择${esc(u.name)}" ${pick.selected.includes(u.id)?'checked':''} ${unavailable?'disabled':''}></td><td><button data-action="${adapter.detailAction||'campaign-person-detail'}" data-officer="${u.id}">${esc(u.name)}</button>${hint?`<small>${esc(hint)}</small>`:''}${military&&!main?`<small>${TROOPS[u.type].name} · ${aptitudeGrade(troopAptitude(u,u.type))}</small>`:''}</td>${keys.map(k=>`<td>${u[k]??OFFICER_BY_ID[u.id]?.[k]??'—'}</td>`).join('')}${main?`<td class="picker-aptitudes">${aptitudes.slice(0,2).join(' · ')}<small>${aptitudes.slice(2).join(' · ')}</small></td><td>${troopCapacity(u)}</td>`:''}${showTroops?`<td>${u.troops}</td>`:''}${located?`<td>${esc(r.place||s.cities.find(c=>c.id===r.location)?.name||'—')}</td>`:''}${context?`<td>${esc(r.duty||'空闲')}</td><td>${officerWorkMarkup(s,u.id)}</td>`:''}${!appointment?`<td class="picker-relevant-traits">${recommendation.traits.map(t=>abilityButton('trait',t.id,t.name)).join('')||'—'}</td>`:''}${traits.map(t=>`<td class="task-trait-cell">${recommendation.traits.some(x=>x.id===t.id)?`<button type="button" data-action="ability-reference" data-kind="trait" data-id="${esc(t.id)}" aria-label="${esc(u.name)}：${esc(t.name)}，查看效果">●</button>`:''}</td>`).join('')}</tr>`;
 }).join('');
 const columns=2+keys.length+(main?2:0)+Number(showTroops)+Number(located)+(context?2:0)+Number(!appointment)+traits.length;
 return `<section class="task-personnel"><div class="task-personnel-heading"><div><small>${esc(adapter.title||s.cities?.find(c=>c.id===pick.city)?.name)} · ${pickerTitle(pick)}</small></div>${count}</div>
 <div class="task-personnel-tools"><label>查找武将<input type="search" ${adapter.queryAttribute||'data-personnel-filter'}="query" value="${esc(ui.personnel?.query||'')}" placeholder="姓名 / 字"></label>${sortButton(scope,'recommended','任务推荐',sort,direction)}</div>
 <div class="task-selected selection-lineup"><b>${multi?'已选':'人选'}</b><p>${chosen.map(r=>esc(r.unit.name)).join('、')||'尚未选定'}</p></div><div class="task-personnel-layout"><div class="task-candidate-list" aria-label="本任务候选武将"><table class="personnel-table"><thead><tr>${heads}</tr></thead><tbody>${cells||`<tr><td colspan="${columns}">没有符合条件的武将。</td></tr>`}</tbody></table></div></div></section>`;
}

export function cityRosterMarkup(s,ui,cityId){
 return campaignRosterMarkup(s,ui,null,{cityId});
}
export function campaignRosterMarkup(s,ui,pick=null,scope=null){
 const all=campaignOfficers(s).filter(r=>!scope||r.location===scope.cityId),filter=scope?{...ui.personnel,city:scope.cityId}:ui.personnel||{};
 const dutyFilter=filter.status==='待命'?'空闲':filter.status;
 let rows=all.filter(r=>(!filter.city||r.location===filter.city||pick&&r.unit.mission?.homeCity===filter.city)&&(!dutyFilter||(dutyFilter==='空闲'?r.availableIdle:dutyFilter==='随军'?!!r.army:dutyFilter==='内政'?r.appointments.some(x=>x.endsWith('负责人')&&x!=='侦察负责人'):r.duty.includes(dutyFilter)))&&(!filter.query||[r.unit.name,r.unit.courtesy,...(OFFICER_BY_ID[r.unit.id]?.aliases||[])].some(n=>n?.includes(filter.query.trim()))));
 const sort=filter.sort==='recommended'&&!pick?'politics':filter.sort==='status'?'duty':filter.sort||(pick?'recommended':'politics'),direction=filter.direction||'desc';
 const recommendations=new Map(pick?rows.map(r=>[r.unit.id,officerRecommendation(s,r.unit,pick)]):[]);
 const value=(r,key)=>key==='recommended'?recommendations.get(r.unit.id)?.score:key==='traits'?recommendations.get(r.unit.id)?.traits.length:key==='loyalty'?s.campaign.domestic.loyalty[r.unit.id]??r.unit.loyalty??85:['place','duty'].includes(key)?r[key]:r.unit[key]??OFFICER_BY_ID[r.unit.id]?.[key];
 rows=sort==='recommended'&&pick?[...rows].sort((a,b)=>compareRecommendations({unit:a.unit,recommendation:recommendations.get(a.unit.id)},{unit:b.unit,recommendation:recommendations.get(b.unit.id)})*(direction==='asc'?-1:1)):sortRows(rows,sort,direction,value);
 if(pick){rows.sort((a,b)=>Number(!!pickerReason(s,a,pick))-Number(!!pickerReason(s,b,pick)));return taskPickerMarkup(s,ui,pick,rows,recommendations,sort);}
 const idle=all.filter(r=>r.availableIdle).length;
 return `<div class="personnel-summary"><b>${scope?esc(s.cities.find(c=>c.id===scope.cityId)?.name)+' · 武将 ':'麾下武将 '}${all.length} 人</b><span>空闲 ${idle} · 任职或任务中 ${all.length-idle}</span></div>
 <div class="personnel-toolbar"><label>姓名<input type="search" data-personnel-filter="query" value="${esc(filter.query||'')}" placeholder="姓名 / 字"></label>${scope?'':`<label>所在据点<select data-personnel-filter="city"><option value="">全部据点（含途中）</option>${s.cities.filter(c=>c.owner===playerFaction(s)||all.some(r=>r.location===c.id)).map(c=>`<option value="${c.id}" ${filter.city===c.id?'selected':''}>${c.name} · ${all.filter(r=>r.location===c.id).length}人</option>`).join('')}</select></label>`}<label>任职<select data-personnel-filter="status"><option value="">全部任职</option>${['空闲','内政','太守','侦察','外交','随军','军团长','军师','调任','运输','返城','撤离','待执行命令','待出征'].map(x=>`<option ${dutyFilter===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
 <div class="personnel-table-wrap"><table class="personnel-table"><thead><tr>${sortHeader('personnel','name','武将',sort,direction)}${sortHeader('personnel','place','所在',sort,direction)}${sortHeader('personnel','duty','任职',sort,direction)}<th>事务</th>${OFFICER_STATS.map(([k,n])=>sortHeader('personnel',k,n,sort,direction)).join('')}${sortHeader('personnel','level','等级',sort,direction)}${sortHeader('personnel','loyalty','忠诚',sort,direction)}</tr></thead><tbody>${rows.map(r=>{const u=r.unit,work=currentDomesticWork(s,u.id),queued=s.campaign.domestic.orders.find(q=>q.officerIds.includes(u.id));return `<tr><td><button class="personnel-name" data-action="campaign-person-detail" data-officer="${u.id}">${esc(u.name)} ↗</button></td><td>${esc(r.place)}<small>归属 ${esc(s.cities.find(c=>c.id===r.home)?.name||'—')}</small></td><td>${esc(r.duty)}</td><td>${work?`${esc(work.title)}<small>还需 ${Number(work.remaining.toFixed(1))} 天${work.paused?' · 暂停':''}</small>`:'—'}${queued?`<small class="queued-duty">待执行：${esc(strategicOrderLabel(s,queued))}</small>`:''}</td>${OFFICER_STATS.map(([k])=>`<td>${u[k]??OFFICER_BY_ID[u.id]?.[k]??'—'}</td>`).join('')}<td>${u.level}</td><td>${s.campaign.domestic.loyalty[u.id]??u.loyalty??85}</td></tr>`;}).join('')||'<tr><td colspan="11">没有符合筛选条件的武将。</td></tr>'}</tbody></table></div><p class="personnel-count">显示 ${rows.length} / ${all.length} 人</p>`;
}

export function canPrepareSiegeDefense(s,r){
 if(!r?.awaiting||r.settled||r.kind!=='siege'||s.cities.find(c=>c.id===r.cityId)?.owner!==playerFaction(s))return false;
 return siegeDefenseCandidates(s,r.cityId).length>0;
}
