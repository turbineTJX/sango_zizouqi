import {abilityButton} from './ability-reference.mjs';
import {mapNode} from './road-network.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {playerFaction} from './player-faction.mjs';
import {relationshipInfo} from './relationships.mjs';
import {sortRows,sortHeader,sortButton} from './list-sort.mjs';
import {officerRecommendation,compareRecommendations} from './officer-recommendation.mjs';
import {missionStatus} from './officer-missions.mjs';
import {isTransport} from './personnel-movement.mjs';
import {cityUnitRows} from './city-units.mjs';
import {TROOPS} from './engine.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {unitTactics} from './tactics.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {ACTIONS,DIRECTIONS,assignmentFor,canTrain} from './domestic.mjs';
import {isPlanning,armyBattle} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OFFICER_STATS=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
export function campaignOfficers(s){
 const town=id=>mapNode(s,id)?.name||'—',rows=new Map();
 const appointments=id=>{const a=assignmentFor(s,id);return [s.cities.some(c=>c.governor===id)?'太守':'',a?DIRECTIONS[a.direction]+'负责人':''].filter(Boolean);};
 for(const o of cityUnitRows(s).filter(o=>o.faction===playerFaction(s)))rows.set(o.unit.id,{...o,home:o.unit.homeCity,place:town(o.location),status:'驻城部队',duty:appointments(o.unit.id).join(' · ')||'—',appointments:appointments(o.unit.id)});
 for(const a of s.armies.filter(a=>a.faction===playerFaction(s)&&!a.disbanded))for(const unit of a.units){
  const moving=!!a.travel,battle=armyBattle(s,a.id);
  rows.set(unit.id,{unit,location:moving?null:a.location,home:unit.homeCity,place:moving?`${town(a.travel.from)} → ${town(a.travel.to)}`:town(a.location),status:battle?'交战':moving?'行军':a.route.length?'待出征':'驻军',duty:[a.name,...appointments(unit.id)].join(' · '),appointments:appointments(unit.id),army:a});
 }
 const idle=[...s.campaign.idle,...s.armies.filter(a=>a.disbanded).flatMap(a=>a.returningOfficers||[])];
 for(const o of idle.filter(o=>o.faction===playerFaction(s))){
  const duty=assignmentFor(s,o.unit.id),governor=s.cities.find(c=>c.governor===o.unit.id),returning=!s.campaign.idle.includes(o);
  rows.set(o.unit.id,{unit:o.unit,location:o.destination||returning?null:o.location,home:o.unit.homeCity,place:o.destination?`${town(o.location)} → ${town(o.destination)}（${o.remainingDays}天）`:town(o.location),status:returning?'待返城':o.destination?(isTransport(o)?'运输':'调任'):governor?'太守':duty?'内政':'待命',duty:[governor?'太守':'',duty?DIRECTIONS[duty.direction]+'负责人':''].filter(Boolean).join(' · ')||'—',appointments:appointments(o.unit.id),idle:o,returning});
 }
 for(const r of rows.values())if(r.unit.mission){const m=r.unit.mission;r.location=m.route.length?null:m.location;r.place=town(m.location)+(m.route.length?' → '+town(m.route[0]):'');r.status=missionStatus(m);r.duty='外出人才任务';}
 return [...rows.values()];
}
export function pickerReason(s,row,pick){
 if((!isPlanning(s)&&pick.task!=='defense')||s.finished)return '执行期间不可委任';
 if(row.returning)return '待返城';
 if(row.unit.mission){if(!['transfer','domestic','expedition'].includes(pick.task))return '外出任务中，须先返城';return row.unit.mission.homeCity===pick.city?'':'不属于本城';}
 if(row.idle?.destination)return '调任途中';
 if(row.location!==pick.city)return '不在本城';
 const c=s.cities.find(c=>c.id===pick.city);
 if(c?.owner!==playerFaction(s))return '非己方据点';
 if(!residentOfficer(s,row.unit.id)&&!(pick.task==='defense'&&row.army?.defense))return row.status+'中';
 if(pick.task==='transfer'&&row.army)return '已在出征军团中，请通过军团调动';
 if(pick.task==='transfer'&&s.cities.some(c=>c.governor===row.unit.id))return '须先解除太守';
 if(pick.task==='draft'){
  if(row.army||row.cityUnit)return '已编制部队';
  if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id))return '围城期间不可编制';
  if(!canTrain(c,row.unit.type))return '本城未解锁兵种';
 }
 if(pick.task==='defense'&&row.army)return '已参加守城编组';
 if(pick.task==='expedition'){if(row.army)return '已在军团中';if(s.campaign.domestic.orders.some(q=>q.kind==='expedition'&&q.officerIds.includes(row.unit.id)))return '已编入待出征命令';}
 if(pick.task==='domestic'&&assignmentFor(s,row.unit.id)?.direction===pick.direction)return '已在此任职';
 if(pick.task==='governor'&&c.governor===row.unit.id)return '现任太守';
 return '';
}
export const pickerTitle=p=>({governor:'任命太守',domestic:'委任'+DIRECTIONS[p.direction]+'负责人',defense:'战前编制守城部队',draft:'预编守城部队',transfer:'调任武将',expedition:'编组出征'}[p.task]);
export function taskPickerMarkup(s,ui,pick,rows,recs,sort,adapter={}){
 const military=['draft','expedition','defense'].includes(pick.task),keys=pick.task==='domestic'?[DIRECTION_STATS[pick.direction]]:pick.task==='governor'?['politics']:military?['leadership','force','intellect']:[],labels=Object.fromEntries(OFFICER_STATS);
 const source=adapter.rows||campaignOfficers(s),chosen=source.filter(r=>pick.selected.includes(r.unit.id)),multi=!pick.single&&['draft','domestic','expedition','defense'].includes(pick.task);
 const traits=[...new Map(source.filter(r=>adapter.rows||r.location===pick.city||r.unit.mission?.homeCity===pick.city).flatMap(r=>officerRecommendation(s,r.unit,pick).traits).map(t=>[t.id,t])).values()];
 const direction=ui.personnel?.direction||'desc',traitId=t=>'task-trait-'+t.id;
 const appointment=['domestic','governor'].includes(pick.task),scope=adapter.sortScope||'personnel',tab=!appointment&&ui.personnel?.tab==='traits'?'traits':'abilities',traitPages=Math.max(1,Math.ceil(traits.length/4)),traitPage=Math.min(ui.personnel?.traitPage||0,traitPages-1),visibleTraits=appointment?traits:tab==='traits'?traits.slice(traitPage*4,traitPage*4+4):[],showAbilities=tab==='abilities',showRelations=tab==='relations';
 const tabs=`<nav class="picker-tabs" aria-label="候选信息分页签">${[['abilities',['domestic','governor'].includes(pick.task)?'基本':'能力与兵力'],['traits','相关特性']].map(([key,name])=>`<button type="button" class="button secondary" data-action="task-picker-tab" data-scope="${scope}" data-tab="${key}" aria-pressed="${tab===key}">${name}</button>`).join('')}</nav>${tab==='traits'&&traits.length?`<nav class="picker-trait-pages" aria-label="特性列翻页"><button class="button secondary" data-action="task-picker-traits" data-scope="${scope}" data-page="${traitPage-1}" ${traitPage===0?'disabled':''}>上一组</button><span>特性 ${traitPage+1} / ${traitPages} · 每组最多四项</span><button class="button secondary" data-action="task-picker-traits" data-scope="${scope}" data-page="${traitPage+1}" ${traitPage+1>=traitPages?'disabled':''}>下一组</button></nav>`:''}`;
 const purpose=pick.single?'选择这支部队的主将（单选）':pick.task==='domestic'?`为${DIRECTIONS[pick.direction]}选择负责人`:pick.task==='governor'?'选择主持本城政务的太守':pick.task==='transfer'?'选择调往其它据点的武将':'选择此次参军的武将与部队';
 return `<section class="task-personnel"><div class="task-personnel-heading"><div><small>${esc(adapter.title||s.cities?.find(c=>c.id===pick.city)?.name)} · ${pickerTitle(pick)}</small><h3>${purpose}</h3></div><span>已选 ${chosen.length}${pick.single?' / 1':pick.task==='expedition'?' / '+(adapter.limit||10):''} 人</span></div>
 <div class="task-personnel-tools"><label>查找武将<input type="search" ${adapter.queryAttribute||'data-personnel-filter'}="query" value="${esc(ui.personnel?.query||'')}" placeholder="姓名 / 字"></label>${sortButton(adapter.sortScope||'personnel','recommended','任务推荐',sort,direction)}</div>
 ${appointment?'':tabs}${tab==='traits'&&!traits.length?'<p class="muted">暂无适用特性</p>':''}<div class="task-personnel-layout"><div class="task-candidate-list" aria-label="本任务候选武将"><table class="personnel-table"><thead><tr><th>任用</th>${sortHeader(adapter.sortScope||'personnel','name','武将',sort,direction)}${(showAbilities?keys:[]).map(k=>sortHeader(adapter.sortScope||'personnel',k,labels[k],sort,direction)).join('')}${military&&showAbilities?sortHeader(scope,'troops','兵力',sort,direction):''}${showAbilities&&['domestic','governor'].includes(pick.task)?'<th>所在</th><th>任职</th><th>事务</th>':''}${showRelations?'<th>与已选武将连携</th>':''}${visibleTraits.map(t=>`<th><button type="button" data-action="ability-reference" data-kind="trait" data-id="${esc(t.id)}" aria-label="查看${esc(t.name)}效果">${esc(t.name)}</button></th>`).join('')}</tr></thead><tbody>${rows.map(r=>{const u=r.unit,recommendation=recs.get(u.id),unavailable=adapter.reason?adapter.reason(r):pickerReason(s,r,pick);return `<tr class="${unavailable?'unavailable':''} ${pick.selected.includes(u.id)?'selected':''}"><td><input type="${multi?'checkbox':'radio'}" name="personnel-choice" ${adapter.choiceAttribute||'data-personnel-choice'}="${u.id}" aria-label="选择${esc(u.name)}" ${pick.selected.includes(u.id)?'checked':''} ${unavailable?'disabled':''}></td><td><button data-action="${adapter.detailAction||'campaign-person-detail'}" data-officer="${u.id}">${esc(u.name)}</button><small>${esc(unavailable||r.status)}</small>${military?`<small>${TROOPS[u.type].name} · ${['C','B','A','S'][troopAptitude(u,u.type)]}</small>`:''}</td>${(showAbilities?keys:[]).map(k=>`<td>${u[k]??OFFICER_BY_ID[u.id]?.[k]??'—'}</td>`).join('')}${military&&showAbilities?`<td>${u.troops}</td>`:''}${showAbilities&&['domestic','governor'].includes(pick.task)?`<td>${esc(r.place||s.cities.find(c=>c.id===r.location)?.name||'—')}</td><td>${esc(r.duty||r.status||'待命')}</td><td>${(()=>{const work=currentDomesticWork(s,u.id);return work?esc(work.title)+' · '+Number(work.remaining.toFixed(1))+'天':'—';})()}</td>`:''}${showRelations?`<td>${chosen.filter(x=>x.unit.id!==u.id).map(x=>{const r=relationshipInfo(u.id,x.unit.id,s.relationshipScores,s.relationshipTypes);return `<small>${esc(x.unit.name)} · ${r.label} ${r.chance}%</small>`;}).join('')||'待选择同伴'}</td>`:''}${visibleTraits.map(t=>`<td class="task-trait-cell">${recommendation.traits.some(x=>x.id===t.id)?`<button type="button" data-action="ability-reference" data-kind="trait" data-id="${esc(t.id)}" aria-label="${esc(u.name)}：${esc(t.name)}，查看效果">●</button>`:'—'}</td>`).join('')}</tr>`;}).join('')||`<tr><td colspan="${2+(showAbilities?keys.length+Number(military)+visibleTraits.length+( ['domestic','governor'].includes(pick.task)?3:0):showRelations?1:visibleTraits.length)}">没有符合条件的武将。</td></tr>`}</tbody></table></div></div>

 <div class="task-selected"><b>${multi?'已选':'人选'}</b><p>${chosen.map(r=>esc(r.unit.name)).join('、')||'尚未选定'}</p><small>${pick.task==='domestic'?`${DIRECTIONS[pick.direction]} · ${labels[DIRECTION_STATS[pick.direction]]}`:military?'确认后生效。':'确认后生效。'}</small></div></section>`;
}
export function campaignRosterMarkup(s,ui,pick=null){
 const all=campaignOfficers(s),filter=ui.personnel||{},selected=pick?.selected||[];
 let rows=all.filter(r=>(!filter.city||r.location===filter.city||pick&&r.unit.mission?.homeCity===filter.city)&&(!filter.status||r.status===filter.status||(filter.status==='太守'&&r.appointments.includes('太守'))||(filter.status==='内政'&&r.appointments.some(x=>x.endsWith('负责人'))))&&(!filter.query||[r.unit.name,r.unit.courtesy,...(OFFICER_BY_ID[r.unit.id]?.aliases||[])].some(n=>n?.includes(filter.query.trim()))));
 const sort=filter.sort==='recommended'&&!pick?'politics':filter.sort||(pick?'recommended':'politics');
 const recommendations=new Map(pick?rows.map(r=>[r.unit.id,officerRecommendation(s,r.unit,pick)]):[]);
 const direction=filter.direction||'desc';
 const value=(r,key)=>key==='recommended'?recommendations.get(r.unit.id)?.score:key==='traits'?recommendations.get(r.unit.id)?.traits.map(t=>t.name).join('、'):key==='loyalty'?s.campaign.domestic.loyalty[r.unit.id]??r.unit.loyalty??85:key==='place'?r.place:key==='status'?r.status+' '+r.duty:r.unit[key]??OFFICER_BY_ID[r.unit.id]?.[key];
 rows=sort==='recommended'&&pick?[...rows].sort((a,b)=>compareRecommendations({unit:a.unit,recommendation:recommendations.get(a.unit.id)},{unit:b.unit,recommendation:recommendations.get(b.unit.id)})*(direction==='asc'?-1:1)):sortRows(rows,sort,direction,value);
 if(pick)rows.sort((a,b)=>Number(!!pickerReason(s,a,pick))-Number(!!pickerReason(s,b,pick)));

 if(pick)return taskPickerMarkup(s,ui,pick,rows,recommendations,sort);
 return `<div class="personnel-summary"><b>${pick?esc(adapter.title||s.cities?.find(c=>c.id===pick.city)?.name)+' · '+pickerTitle(pick):'麾下武将 '+all.length+' 人'}</b><span>${pick?'可选 '+all.filter(r=>!pickerReason(s,r,pick)).length+' 人 · 已选 '+selected.length+' 人':'待命 '+all.filter(r=>r.status==='待命').length+' · 内政 / 太守 '+all.filter(r=>r.appointments.length).length+' · 已编部队 '+all.filter(r=>r.army||r.cityUnit).length}</span></div>
 <div class="personnel-toolbar"><label>姓名<input type="search" data-personnel-filter="query" value="${esc(filter.query||'')}" placeholder="姓名 / 字"></label><label>所在据点<select data-personnel-filter="city"><option value="">全部据点（含途中）</option>${s.cities.filter(c=>c.owner===playerFaction(s)||all.some(r=>r.location===c.id)).map(c=>`<option value="${c.id}" ${filter.city===c.id?'selected':''}>${c.name} · ${all.filter(r=>r.location===c.id).length}人</option>`).join('')}</select></label><label>状态<select data-personnel-filter="status"><option value="">全部状态</option>${['待命','内政','太守','驻城部队','驻军','待出征','行军','交战','调任','运输','待返城','赴访途中','外地接洽','办事结束，返城途中','任务中止，返城途中'].map(x=>`<option ${filter.status===x?'selected':''}>${x}</option>`).join('')}</select></label></div>

 <div class="personnel-table-wrap"><table class="personnel-table"><thead><tr>${pick?'<th>选择</th>':''}${sortHeader('personnel','name','武将',sort,ui.personnel?.direction||'desc')}${pick?'<th>任务适性与相关特性</th>':''}${['draft','expedition','defense'].includes(pick?.task)?'<th>编制参考</th>':''}${sortHeader('personnel','place','所在 / 归属',sort,direction)}${sortHeader('personnel','status','状态 / 职务',sort,direction)}${OFFICER_STATS.map(([k,n])=>sortHeader('personnel',k,n,sort,direction)).join('')}${sortHeader('personnel','level','等级',sort,direction)}${sortHeader('personnel','loyalty','忠诚',sort,direction)}</tr></thead><tbody>${rows.map(r=>{const u=r.unit,reason=pick?pickerReason(s,r,pick):'',work=currentDomesticWork(s,u.id),queued=s.campaign.domestic.orders.find(q=>q.officerIds.includes(u.id));return `<tr class="${reason?'unavailable':''}">${pick?`<td><input type="${['draft','domestic','expedition','defense'].includes(pick.task)?'checkbox':'radio'}" name="personnel-choice" data-personnel-choice="${u.id}" aria-label="选择${esc(u.name)}" ${selected.includes(u.id)?'checked':''} ${reason?'disabled':''}>${reason?`<small>${reason}</small>`:''}</td>`:''}<td><button class="personnel-name" data-action="campaign-person-detail" data-officer="${u.id}">${esc(u.name)} ↗</button></td>${pick?`<td class="personnel-recommendation"><b>推荐 ${recommendations.get(u.id).score}</b>${recommendations.get(u.id).reasons.map(x=>`<small>${esc(x)}</small>`).join('')}${recommendations.get(u.id).traits.map(t=>abilityButton('trait',t.id,t.name)).join('')||'<small>无此任务相关特性</small>'}</td>`:''}${['draft','expedition','defense'].includes(pick?.task)?`<td>${TROOPS[u.type].name} · ${['C','B','A','S'][troopAptitude(u,u.type)]}<small>现役 ${u.troops} / 上限 ${troopCapacity(u)}</small><small>${unitTactics(u).map(t=>esc(t.name)).join('、')||'暂无携带战法'}</small></td>`:''}<td>${esc(r.place)}<small>归属 ${esc(s.cities.find(c=>c.id===r.home)?.name||'—')}</small></td><td>${r.status}<small>${esc(r.duty)}</small>${work?`<small>${esc(work.title)} · 余 ${Number(work.remaining.toFixed(2))} 天${work.paused?' · 暂停':''}</small>`:''}${queued?`<small class="queued-duty">待：${esc(strategicOrderLabel(s,queued))}</small>`:''}</td>${OFFICER_STATS.map(([k])=>`<td>${u[k]??OFFICER_BY_ID[u.id]?.[k]??'—'}</td>`).join('')}<td>${u.level}</td><td>${s.campaign.domestic.loyalty[u.id]??u.loyalty??85}</td></tr>`;}).join('')||`<tr><td colspan="11">没有符合筛选条件的武将。</td></tr>`}</tbody></table></div><p class="personnel-count">显示 ${rows.length} / ${all.length} 人${pick?' · 灰色条目列明不可任用原因':''}</p>`;
}
