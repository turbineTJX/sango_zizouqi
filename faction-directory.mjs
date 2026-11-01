import {campaignDate} from './national-scenarios.mjs';
import {talentPanel} from './talent-view.mjs';
import {cityStaffStatus} from './domestic-feedback.mjs';
import {playerFaction} from './player-faction.mjs';
import {campaignOfficers,OFFICER_STATS,officerWorkMarkup} from './strategic-roster.mjs';
import {campaignInfoIndex} from './campaign-info.mjs';
import {mapNode} from './road-network.mjs';
import {liveSoldiers,armyBattle,isPlanning} from './strategic-campaign.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
import {traitChips} from './trait-display.mjs';
import {unitTactics} from './tactics.mjs';
import {officerStratagems,STRATAGEMS} from './stratagems.mjs';
import {abilityButton} from './ability-reference.mjs';
import {APTITUDE_COLUMNS,aptitudeGrade} from './aptitude-display.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {personalBondsMarkup} from './bond-display.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const FACTION_DIRECTORIES={city:'据点',army:'军团',officer:'人才',unit:'部队',battle:'战场'};
export const FACTION_DIRECTORY_TITLES={city:'据点一览',army:'军团一览',officer:'人才名册',unit:'部队一览',battle:'战场一览'};
const OFFICER_PAGES={status:'任职',abilities:'能力',aptitudes:'兵种适性',traits:'特性',bonds:'羁绊',tactics:'战法',stratagems:'军略'};
function officerDirectoryMarkup(s,filter){
 const tab=Object.hasOwn(OFFICER_PAGES,filter.tab)?filter.tab:'status',query=(filter.query||'').trim();
 const columns={status:[['name','姓名'],['place','所在'],['duty','任职'],['work','事务']],abilities:[['name','姓名'],...OFFICER_STATS,['level','等级'],['loyalty','忠诚']],aptitudes:[['name','姓名'],...APTITUDE_COLUMNS],traits:[['name','姓名'],['traits','特性']],bonds:[['name','姓名'],['bonds','羁绊']],tactics:[['name','姓名'],['tactics','战法']],stratagems:[['name','姓名'],['stratagems','军略']]}[tab];
 const all=campaignOfficers(s),rows=all.filter(r=>[r.unit.name,r.unit.courtesy,r.place,r.duty].some(v=>String(v||'').includes(query)));
 const sort=columns.some(([k])=>k===filter.sort)?filter.sort:'name',direction=filter.direction||'asc';
 const value=(r,k)=>APTITUDE_COLUMNS.some(([id])=>id===k)?troopAptitude(r.unit,k):k==='loyalty'?s.campaign.domestic.loyalty[r.unit.id]??r.unit.loyalty??85:k==='name'?r.unit.name:r[k]??r.unit[k];
 const cell=(r,k)=>{
  const u=r.unit;
  if(k==='name')return `<button class="personnel-name" data-action="faction-object" data-kind="officer" data-id="${esc(u.id)}"><span class="directory-portrait" data-art-portrait="${esc(u.id)}" data-art-scene="roster" aria-hidden="true"><span>${esc(u.name.slice(-1))}</span></span>${esc(u.name)}</button>`;
  if(k==='traits')return traitChips(u);
  if(k==='bonds')return personalBondsMarkup(u,null,{compact:true});
  if(tab==='aptitudes')return aptitudeGrade(value(r,k));
  if(k==='tactics')return unitTactics(u).map(t=>abilityButton('tactic',t.id,t.name)).join('')||'—';
  if(k==='stratagems')return officerStratagems(u.id).map(id=>abilityButton('stratagem',id,STRATAGEMS[id].name)).join('')||'—';
  if(k==='work')return officerWorkMarkup(s,u.id);
  return esc(value(r,k));
 };
 return `<section class="faction-directory officer-directory" data-directory-kind="officer">
 <nav class="directory-tabs" aria-label="人才名册分类">${Object.entries(OFFICER_PAGES).map(([key,label])=>`<button type="button" data-action="officer-directory-tab" data-tab="${key}" aria-pressed="${tab===key}">${label}</button>`).join('')}</nav>
 <div class="directory-toolbar"><label class="strategy-field">查找人才<input id="faction-directory-query" type="search" value="${esc(filter.query||'')}" placeholder="姓名 / 字 / 所在 / 任职"></label><p class="personnel-count" aria-live="polite">${query?`显示 ${rows.length} / ${all.length} 人`:`共 ${all.length} 人`}</p></div>
 <div class="personnel-table-wrap"><table class="personnel-table" data-officer-page="${tab}"><thead><tr>${columns.map(([k,label])=>['work','traits','bonds','tactics','stratagems'].includes(k)?`<th>${label}</th>`:sortHeader('faction-directory',k,label,sort,direction)).join('')}</tr></thead><tbody>${sortRows(rows,sort,direction,value).map(r=>`<tr>${columns.map(([k])=>`<td${typeof value(r,k)==='number'?' class="numeric"':''}>${cell(r,k)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}">没有符合条件的人才。</td></tr>`}</tbody></table></div>
 ${tab==='status'?talentPanel(s):''}</section>`;
}
const cityWorkClass=r=>r.idle>0?'city-needs-work':'city-fully-assigned';
export function factionDirectoryRows(s,kind){
 const own=playerFaction(s),town=id=>mapNode(s,id)?.name||'途中';
 if(kind==='city'){
  const people=campaignOfficers(s);
  return s.cities.filter(c=>c.owner===own).map(c=>{const x=cityStaffStatus(s,c);return {id:c.id,name:c.name,place:c.province,staff:x.filled+'/6',idle:x.idle.length,idleNames:x.idle.map(o=>o.unit.name),governor:x.governor?.name||'未任命',grain:c.grain,manpower:c.manpower,count:people.filter(r=>r.location===c.id).length};});
 }
 if(kind==='army')return s.armies.filter(a=>a.faction===own&&!a.disbanded&&!a.defense).map(a=>({id:a.id,name:a.name,place:a.travel?town(a.travel.from)+' → '+town(a.travel.to):town(a.location),status:armyBattle(s,a.id)?'交战':a.travel?'行军':a.task,troops:liveSoldiers(s,a),count:a.units.filter(u=>u.troops>0).length,supply:a.supply}));
 if(kind==='officer')return campaignOfficers(s).map(r=>({id:r.unit.id,name:r.unit.name,place:r.place,status:r.status,duty:r.duty,...Object.fromEntries(OFFICER_STATS.map(([k])=>[k,r.unit[k]]))}));
 if(kind==='unit')return campaignInfoIndex(s).unit.filter(r=>r.faction===own&&!r.personFate).map(r=>({id:r.unit.id,name:r.unit.name,place:r.army?.travel?town(r.army.travel.from)+' → '+town(r.army.travel.to):town(r.unit.mission&&r.stationedCity?r.stationedCity:r.city),army:r.army?.name||(r.unit.mission?'城内独立部队 · 主将外出':'城内独立部队'),type:TROOP_DESIGNS[r.unit.type]?.name,aptitude:troopAptitude(r.unit),troops:r.unit.troops,wounded:r.unit.wounded}));
 if(kind==='battle')return s.campaign.battles.filter(r=>!r.settled&&r.battle.sides.some(x=>x.faction===own)).map(r=>({id:r.id,name:r.name,place:r.cityId?town(r.cityId):'野战',status:r.awaiting?'待布阵':r.control==='manual'?'亲自指挥':'委托作战',day:r.startedDay}));
 return [];
}
const COLUMNS={city:[['name','据点'],['place','地域'],['count','武将'],['governor','太守'],['staff','内政'],['idle','空闲'],['grain','粮草'],['manpower','预备兵']],army:[['name','军团'],['place','所在'],['status','状态'],['count','部队'],['troops','兵力'],['supply','携粮']],officer:[['name','武将'],['place','所在'],['duty','任职'],...OFFICER_STATS],unit:[['name','部队'],['type','兵种'],['aptitude','适性'],['place','所在'],['army','军团'],['troops','兵力'],['wounded','伤兵']],battle:[['name','战场'],['place','地点'],['status','状态'],['day','开战']]};
export function factionDirectoryMarkup(s,kind,filter={}){
 if(kind==='officer')return officerDirectoryMarkup(s,filter);
 const columns=COLUMNS[kind]||COLUMNS.city,all=factionDirectoryRows(s,kind),query=(filter.query||'').trim(),sort=columns.some(([k])=>k===filter.sort)?filter.sort:'name',direction=filter.direction||'asc';
 const rows=sortRows(all.filter(r=>[r.name,r.type,r.place,r.status,r.duty,r.army].some(v=>String(v||'').includes(query))),sort,direction,(r,k)=>r[k]);
 const button=(r)=>'<button class="personnel-name" data-action="faction-object" data-kind="'+kind+'" data-id="'+esc(r.id)+'">'+esc(r.name)+'</button>';
 return '<section class="faction-directory" data-directory-kind="'+kind+'"><div class="directory-toolbar"><label class="strategy-field">查找<input id="faction-directory-query" type="search" value="'+esc(filter.query||'')+'" placeholder="名称 / 所在 / 状态"></label><p class="personnel-count">'+rows.length+' / '+all.length+' 项</p></div>'+'<div class="personnel-table-wrap"><table class="personnel-table"><thead><tr>'+columns.map(([k,n])=>sortHeader('faction-directory',k,n,sort,direction)).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr '+(kind==='city'?'class="'+cityWorkClass(r)+'" data-idle-count="'+r.idle+'"':'')+'>'+columns.map(([k])=>'<td'+(typeof r[k]==='number'&&k!=='day'?' class="numeric"':'')+'>'+(k==='name'?button(r):esc(k==='day'?campaignDate(s,{day:r[k]}):k==='aptitude'?aptitudeGrade(r[k]):r[k]))+'</td>').join('')+'</tr>').join('')+(rows.length?'':'<tr><td colspan="'+columns.length+'">暂无'+FACTION_DIRECTORIES[kind]+'。</td></tr>')+'</tbody></table></div></section>';
}

export function mapQuickDirectory(s,ui){
 const kind=['city','army','battle'].includes(ui.mapQuickKind)?ui.mapQuickKind:'city',query=ui.mapQuickQueries?.[kind]||'',all=factionDirectoryRows(s,kind),idleOnly=kind==='city'&&ui.mapCityFilter==='idle';
 const rows=all.filter(r=>(!idleOnly||r.idle>0)&&[r.name,r.place,r.status,...(r.idleNames||[])].some(v=>String(v||'').includes(query.trim())));
 if(kind==='city')rows.sort((a,b)=>Number(b.idle>0)-Number(a.idle>0)||b.idle-a.idle||a.name.localeCompare(b.name,'zh-CN'));
 const selected=kind==='city'?ui.city:kind==='army'?ui.army:ui.directoryBattle;
 const current=rows.find(r=>String(r.id)===String(selected)),battle=kind==='battle'&&current?s.campaign.battles.find(r=>r.id===current.id):null;
 const quick=current?'<div class="map-quick-actions"><b>'+esc(current.name)+'</b>'+(kind==='battle'?'<button class="button primary" data-action="campaign-focus" data-battle="'+esc(current.id)+'" '+(isPlanning(s)?'disabled':'')+'>'+(battle.awaiting?'战前布阵':'进入战场')+'</button><button class="button secondary" data-action="campaign-history" data-battle="'+esc(current.id)+'">战场快照</button>':'<button class="button primary" data-action="campaign-info-detail" data-kind="'+kind+'" data-id="'+esc(current.id)+'">详情</button><button class="button secondary" data-action="map-quick-manage" data-kind="'+kind+'" data-id="'+esc(current.id)+'">'+(kind==='city'?'管理':'管理')+'</button>')+'</div>':'';

 const idleCities=kind==='city'?all.filter(r=>r.idle>0).length:0;
 const staff=kind==='city'&&current?`<div class="map-quick-staff"><b>${esc(current.name)} · ${current.idle?'空闲 '+current.idle+' 人':'无空闲武将'}</b>${current.idle?`<p>${esc(current.idleNames.join('、'))}</p>`:''}<div class="map-staff-actions"><button class="button primary" data-action="city-idle-assign" data-town="${esc(current.id)}">委任</button><button class="button secondary" data-action="map-quick-manage" data-kind="city" data-id="${esc(current.id)}">管理</button><button class="button secondary" data-action="campaign-info-detail" data-kind="city" data-id="${esc(current.id)}">详情</button></div></div>`:'';
 const filters=kind==='city'?`<div class="city-work-filter" aria-label="空闲武将筛选"><button data-action="map-city-filter" data-filter="all" aria-pressed="${!idleOnly}">全部 ${all.length}</button><button data-action="map-city-filter" data-filter="idle" aria-pressed="${idleOnly}">有空闲 ${idleCities}</button></div>`:'';
 const row=r=>`<button class="city-directory-item ${kind==='city'?cityWorkClass(r):''} ${String(selected)===String(r.id)?'selected':''}" data-action="map-quick-select" data-kind="${kind}" data-id="${esc(r.id)}" ${kind==='city'?`data-idle-count="${r.idle}" aria-label="${esc(r.name+' · '+(r.idle?'空闲 '+r.idle+' 人':'无空闲武将'))}"`:''} aria-pressed="${String(selected)===String(r.id)}">${kind==='city'?`<span class="city-row-top"><b>${esc(r.name)}</b><strong class="city-work-status">${r.idle?'空闲 '+r.idle+' 人':'无空闲'}</strong></span><small>${esc(r.place)} · 内政 ${r.staff}</small>`:`<b>${esc(r.name)}</b><small>${esc(r.place)}${r.status?' · '+esc(r.status):''}</small><small>${kind==='army'?r.count+' 队 · '+r.troops+' 人':campaignDate(s,{day:r.day})+'开战'}</small>`}</button>`;
 return '<section class="city-directory map-quick-directory" aria-label="'+(kind==='city'?'自辖城市':'本势力快速选择')+'"><header><h2>'+(kind==='city'?'城市':FACTION_DIRECTORIES[kind])+'</h2><button data-action="map-directory-toggle" aria-label="收起快速选择">×</button></header><nav aria-label="快速选择分类">'+['city','army','battle'].map(k=>'<button data-action="map-quick-open" data-kind="'+k+'" aria-pressed="'+(kind===k)+'">'+(k==='city'?'城市':FACTION_DIRECTORIES[k])+' '+(k===kind?all.length:factionDirectoryRows(s,k).length)+'</button>').join('')+'</nav>'+filters+'<label>查找<input id="map-quick-query" type="search" value="'+esc(query)+'" placeholder="'+(kind==='city'?'城市 / 空闲武将':'名称 / 位置 / 状态')+'"></label><div class="city-directory-list">'+rows.map(row).join('')+(rows.length?'':'<p>暂无符合条件的'+FACTION_DIRECTORIES[kind]+'。</p>')+'</div>'+staff+(kind==='city'?'':quick)+'<button class="button secondary" data-action="faction-directory" data-kind="'+kind+'">列表</button></section>';
}
