import {playerFaction} from './player-faction.mjs';
import {campaignOfficers,OFFICER_STATS} from './strategic-roster.mjs';
import {campaignInfoIndex} from './campaign-info.mjs';
import {mapNode} from './road-network.mjs';
import {liveSoldiers,armyBattle,isPlanning} from './strategic-campaign.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const FACTION_DIRECTORIES={city:'据点',army:'军团',officer:'人才',unit:'部队',battle:'战场'};
export function factionDirectoryRows(s,kind){
 const own=playerFaction(s),town=id=>mapNode(s,id)?.name||'途中';
 if(kind==='city')return s.cities.filter(c=>c.owner===own).map(c=>({id:c.id,name:c.name,place:c.province,grain:c.grain,manpower:c.manpower,count:campaignOfficers(s).filter(r=>r.location===c.id).length}));
 if(kind==='army')return s.armies.filter(a=>a.faction===own&&!a.disbanded&&!a.defense).map(a=>({id:a.id,name:a.name,place:a.travel?town(a.travel.from)+' → '+town(a.travel.to):town(a.location),status:armyBattle(s,a.id)?'交战':a.travel?'行军':a.task,troops:liveSoldiers(s,a),count:a.units.filter(u=>u.troops>0).length,supply:a.supply}));
 if(kind==='officer')return campaignOfficers(s).map(r=>({id:r.unit.id,name:r.unit.name,place:r.place,status:r.status,duty:r.duty,...Object.fromEntries(OFFICER_STATS.map(([k])=>[k,r.unit[k]]))}));
 if(kind==='unit')return campaignInfoIndex(s).unit.filter(r=>r.faction===own&&!r.personFate).map(r=>({id:r.unit.id,name:r.unit.name+'部队',place:r.army?.travel?town(r.army.travel.from)+' → '+town(r.army.travel.to):town(r.city),army:r.army?.name||'城内独立部队',troops:r.unit.troops,wounded:r.unit.wounded}));
 if(kind==='battle')return s.campaign.battles.filter(r=>!r.settled&&r.battle.sides.some(x=>x.faction===own)).map(r=>({id:r.id,name:r.name,place:r.cityId?town(r.cityId):'野战',status:r.awaiting?'待布阵':r.control==='manual'?'亲自指挥':'委托作战',day:r.startedDay}));
 return [];
}
const COLUMNS={city:[['name','据点'],['place','地域'],['count','武将'],['grain','粮草'],['manpower','预备兵']],army:[['name','军团'],['place','位置'],['status','状态'],['count','部队'],['troops','现役兵力'],['supply','携粮']],officer:[['name','武将'],['place','所在'],['status','状态'],['duty','任职'],...OFFICER_STATS],unit:[['name','部队'],['place','所在'],['army','军团'],['troops','现役兵力'],['wounded','伤兵']],battle:[['name','战场'],['place','地点'],['status','状态'],['day','开战日']]};
export function factionDirectoryMarkup(s,kind,filter={}){
 const columns=COLUMNS[kind]||COLUMNS.city,all=factionDirectoryRows(s,kind),query=(filter.query||'').trim(),sort=columns.some(([k])=>k===filter.sort)?filter.sort:'name',direction=filter.direction||'asc';
 const rows=sortRows(all.filter(r=>[r.name,r.place,r.status,r.duty,r.army].some(v=>String(v||'').includes(query))),sort,direction,(r,k)=>r[k]);
 const button=(r)=>'<button class="personnel-name" data-action="faction-object" data-kind="'+kind+'" data-id="'+esc(r.id)+'">'+esc(r.name)+' ↗</button>';
 return '<section class="faction-directory" data-directory-kind="'+kind+'"><label class="strategy-field">查找<input id="faction-directory-query" type="search" value="'+esc(filter.query||'')+'" placeholder="名称 / 所在 / 状态"></label><p>本势力 · '+rows.length+' / '+all.length+' 项</p><div class="personnel-table-wrap"><table class="personnel-table"><thead><tr>'+columns.map(([k,n])=>sortHeader('faction-directory',k,n,sort,direction)).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+columns.map(([k])=>'<td>'+(k==='name'?button(r):esc(r[k]))+'</td>').join('')+'</tr>').join('')+(rows.length?'':'<tr><td colspan="'+columns.length+'">暂无'+FACTION_DIRECTORIES[kind]+'。</td></tr>')+'</tbody></table></div></section>';
}

export function mapQuickDirectory(s,ui){
 const kind=['city','army','battle'].includes(ui.mapQuickKind)?ui.mapQuickKind:'city',query=ui.mapQuickQueries?.[kind]||'',all=factionDirectoryRows(s,kind),rows=all.filter(r=>[r.name,r.place,r.status].some(v=>String(v||'').includes(query.trim())));
 const selected=kind==='city'?ui.city:kind==='army'?ui.army:ui.directoryBattle;
 const current=rows.find(r=>String(r.id)===String(selected)),battle=kind==='battle'&&current?s.campaign.battles.find(r=>r.id===current.id):null;
 const quick=current?'<div class="map-quick-actions"><b>'+esc(current.name)+'</b>'+(kind==='battle'?'<button class="button primary" data-action="campaign-focus" data-battle="'+esc(current.id)+'" '+(isPlanning(s)?'disabled':'')+'>'+(battle.awaiting?'战前布阵':'进入战场')+'</button><button class="button secondary" data-action="campaign-history" data-battle="'+esc(current.id)+'">战场快照</button>':'<button class="button primary" data-action="campaign-info-detail" data-kind="'+kind+'" data-id="'+esc(current.id)+'">查看'+FACTION_DIRECTORIES[kind]+'</button><button class="button secondary" data-action="map-quick-manage" data-kind="'+kind+'" data-id="'+esc(current.id)+'">'+(kind==='city'?'管理据点':'调度军团')+'</button>')+'</div>':'';

 return '<section class="city-directory map-quick-directory" aria-label="本势力快速选择"><header><h2>快速选择</h2><button data-action="map-directory-toggle" aria-label="收起快速选择">×</button></header><nav aria-label="快速选择分类">'+['city','army','battle'].map(k=>'<button data-action="map-quick-open" data-kind="'+k+'" aria-pressed="'+(kind===k)+'">'+FACTION_DIRECTORIES[k]+' '+factionDirectoryRows(s,k).length+'</button>').join('')+'</nav><label>查找<input id="map-quick-query" type="search" value="'+esc(query)+'" placeholder="名称 / 位置 / 状态"></label><div class="city-directory-list">'+rows.map(r=>'<button class="city-directory-item '+(String(selected)===String(r.id)?'selected':'')+'" data-action="map-quick-select" data-kind="'+kind+'" data-id="'+esc(r.id)+'" aria-pressed="'+(String(selected)===String(r.id))+'"><b>'+esc(r.name)+'</b><small>'+esc(r.place)+(r.status?' · '+esc(r.status):'')+'</small><small>'+(kind==='city'?'武将 '+r.count+' · 粮 '+r.grain:kind==='army'?r.count+' 队 · '+r.troops+' 人':'第 '+r.day+' 天开战')+'</small></button>').join('')+(rows.length?'':'<p>暂无符合条件的'+FACTION_DIRECTORIES[kind]+'。</p>')+'</div>'+quick+'<button class="button secondary" data-action="faction-directory" data-kind="'+kind+'">详细列表</button></section>';
}
