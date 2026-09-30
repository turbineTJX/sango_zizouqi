import {abilityButton} from './ability-reference.mjs';
import {mapNode,isJunction} from './road-network.mjs';
import {armyDetailSections} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
import {traitMarkup} from './officer-roster.mjs';
import {ransomCost} from './officer-fates.mjs';
import {campaignCurrentStatus} from './campaign-info-status.mjs';
import {unitAttributes,ATTRIBUTE_LABELS} from './unit-stats.mjs';
import {FACTIONS,TROOPS} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {OFFICER_STATS} from './strategic-roster.mjs';
import {unitTactics} from './tactics.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {STRATAGEMS,officerStratagems} from './stratagems.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {DIRECTIONS} from './domestic.mjs';
import {armyBattle,liveSoldiers,dailyConsumption} from './strategic-campaign.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(v)?Math.round(v).toLocaleString('zh-CN'):'—';
export const INFO_TYPES={city:'据点',army:'军团',unit:'部队',officer:'武将',faction:'势力'};
export const infoLink=(type,id,label)=>`<button class="personnel-name" data-action="campaign-info-detail" data-kind="${type}" data-id="${esc(id)}">${esc(label)} ↗</button>`;
// Only instantiated campaign people are indexed; undiscovered talent is not exposed.
export function campaignInfoIndex(s){
 const armies=s.armies.filter(a=>!a.disbanded),people=new Map();
 for(const c of s.cities)for(const unit of c.units)people.set(unit.id,{unit,faction:unit.mission?.faction||c.owner,city:unit.mission?(unit.mission.route.length?null:unit.mission.location):c.id,stationedCity:c.id,prepared:true});
 for(const a of armies)for(const unit of a.units)people.set(unit.id,{unit,faction:a.faction,city:a.travel?null:a.location,army:a,prepared:unit.troops>0});
 for(const o of [...s.campaign.idle,...s.armies.filter(a=>a.disbanded).flatMap(a=>a.returningOfficers||[])])if(!people.has(o.unit.id))people.set(o.unit.id,{unit:o.unit,faction:o.faction,city:o.unit.mission?(o.unit.mission.route.length?null:o.unit.mission.location):o.destination||o.retreating?null:o.location,prepared:o.unit.troops>0||o.unit.wounded>0,idle:o,returning:!s.campaign.idle.includes(o)});
 for(const p of s.campaign.domestic.people.filter(p=>p.fate&&(p.fate.originalFaction===playerFaction(s)||p.fate.captor===playerFaction(s))))people.set(p.id,{unit:p.unit,faction:p.fate.originalFaction,city:p.cityId,personFate:p});
 return {city:s.cities,army:armies,unit:[...people.values()].filter(r=>r.prepared),officer:[...people.values()],faction:[...new Set([...s.cities.map(c=>c.owner),...armies.map(a=>a.faction),...[...people.values()].map(r=>r.faction)])].filter(Boolean).map(id=>({id,name:FACTIONS[id]?.name||id}))};
}
const fields=items=>`<dl class="info-fields">${items.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${value??'—'}</dd></div>`).join('')}</dl>`;
const section=(id,title,html)=>({id,title,html});
const links=(rows,fn)=>rows.map(fn).join(' ')||'<p class="muted">暂无记录</p>';
export function campaignInfoDetail(s,type,id){
 const ix=campaignInfoIndex(s),entry=ix[type]?.find(x=>(x.unit?.id||x.id)===id);
 if(!entry)return {title:'对象已不在当前名册',sections:[]};
 const town=id=>mapNode(s,id)?.name||'—',faction=id=>infoLink('faction',id,FACTIONS[id]?.name||id),city=id=>id?(isJunction(s,id)?esc(town(id)):infoLink('city',id,town(id))):'途中',person=id=>id?infoLink('officer',id,ix.officer.find(r=>r.unit.id===id)?.unit.name||OFFICER_BY_ID[id]?.name||id):'未任命';
 const units=rows=>links(rows,r=>infoLink('unit',r.unit.id,`${r.unit.name} · ${TROOPS[r.unit.type]?.name} · ${n(r.unit.troops)}人`));
 let title=entry.name||entry.unit?.name,sections=[];
 if(type==='city'){
  const c=entry,local=ix.officer.filter(r=>r.city===id&&!r.personFate);
  sections=[section('overview','据点概况',fields([['势力',faction(c.owner)],['地域',esc(c.province)],['类型',esc(({city:'城池',gate:'关隘',port:'港口'})[c.kind]||c.kind||'城池')],['太守',person(c.governor)]])),section('resources','城防与资源',fields([['存粮',n(c.grain)],['预备兵',n(c.manpower)],['已预留兵员',n(c.domestic?.reserved)],['城门耐久',n(c.gateHp)],['城墙等级',n(c.walls)],['粮仓等级',n(c.granary)]])),section('units','驻城部队',units(ix.unit.filter(r=>(r.stationedCity||r.city)===id&&!r.army))),section('armies','驻扎军团',links(ix.army.filter(a=>!a.travel&&a.location===id),a=>infoLink('army',a.id,a.name))),section('officers','驻城武将',links(local,r=>person(r.unit.id))),section('work','内政任职与事务',links(local,r=>{const w=currentDomesticWork(s,r.unit.id),duties=s.campaign.domestic.assignments.filter(a=>a.officerId===r.unit.id).map(a=>DIRECTIONS[a.direction]);return `<p>${person(r.unit.id)} · ${esc(duties.join('、')||'未委任')}${w?` · ${esc(w.title)} · 余 ${esc(w.remaining)} 天${w.paused?' · 暂停':''}`:''}</p>`;}))];
 }else if(type==='army'){
  const a=entry;
  sections=[section('overview','军团概况',fields([['势力',faction(a.faction)],['位置',a.travel?`${city(a.travel.from)} → ${city(a.travel.to)}`:city(a.location)],['状态',armyBattle(s,a.id)?'交战中':a.travel?'行军中':esc(a.task||'驻扎')],['目的地',a.target?city(a.target):'无']])),...armyDetailSections(a,{person,soldiers:liveSoldiers(s,a),consumption:dailyConsumption(s,a)}),section('units','所属部队',units(ix.unit.filter(r=>r.army?.id===id)))];
 }else if(type==='unit'||type==='officer'){
  const r=entry,u=r.unit,work=currentDomesticWork(s,id),order=s.campaign.domestic.orders.find(o=>o.officerIds.includes(id));
  sections=[section('overview',type==='unit'?'部队归属':'武将身份',fields([['势力',faction(r.faction)],['所在',u.mission?`${city(u.mission.location)}${u.mission.route.length?' → '+city(u.mission.route[0]):''}`:r.army?.travel?`${city(r.army.travel.from)} → ${city(r.army.travel.to)}`:r.idle?.destination?`${city(r.idle.location)} → ${city(r.idle.destination)}`:city(r.city)],['军团',r.army?infoLink('army',r.army.id,r.army.name):r.prepared?(r.idle?.retreating?'撤离队':r.idle?.destination?'运输队随行部队':'城内独立部队'):'未编制'],[type==='unit'?'主将':'所领部队',type==='unit'?person(id):r.prepared?infoLink('unit',id,u.name+'部队'):'未编制']])),section('attributes','能力与成长',fields([...OFFICER_STATS.map(([k,label])=>[label,n(u[k]??OFFICER_BY_ID[id]?.[k])]),['等级',n(u.level)],['功绩',n(u.merit)],['角色说明',esc(u.trait)]])),section('traits','特性',traitMarkup(u)),section('troops','兵力与兵种',fields([['兵种',esc(TROOPS[u.type]?.name)],['适性',esc(['C','B','A','S'][troopAptitude(u,u.type)])],['现役（战略编制）',n(u.troops)],['伤兵（战略编制）',n(u.wounded)],['兵力上限',n(troopCapacity(u))]])),section('combat','部队属性',fields(Object.entries(ATTRIBUTE_LABELS).map(([key,label])=>[label,n(unitAttributes(u)[key])]))),section('tactics','战法',links(unitTactics(u),t=>abilityButton('tactic',t.id,t.name))),section('stratagems','持有军略',links(officerStratagems(id),key=>abilityButton('stratagem',key,STRATAGEMS[key].name))+'<p class="muted">仅基础智力≥70者拥有军略，任军团长或军师时提供。</p>'),section('work','任职与待执行命令',fields([['太守',links(s.cities.filter(c=>c.governor===id),c=>city(c.id))],['内政任职',esc(s.campaign.domestic.assignments.filter(a=>a.officerId===id).map(a=>DIRECTIONS[a.direction]).join('、')||'无')],['当前事务',work?`${esc(work.title)} · 余 ${esc(work.remaining)} 天${work.paused?' · 暂停':''}`:'无'],['等待命令',order?esc(strategicOrderLabel(s,order)):'无']]))];
 }else {
  const cities=ix.city.filter(c=>c.owner===id),armies=ix.army.filter(a=>a.faction===id),people=ix.officer.filter(r=>r.faction===id&&!r.personFate),troops=ix.unit.filter(r=>r.faction===id);
  sections=[section('overview','势力概况',fields([['据点',n(cities.length)],['军团',n(armies.length)],['部队',n(troops.length)],['武将',n(people.length)],['现役兵力（战略编制）',n(troops.reduce((sum,r)=>sum+r.unit.troops,0))],['据点存粮',n(cities.reduce((sum,c)=>sum+c.grain,0))]])),section('cities','所属据点',links(cities,c=>city(c.id))),section('armies','出征军团',links(armies,a=>infoLink('army',a.id,a.name))),section('units','所属部队',units(troops)),section('officers','麾下武将',links(people,r=>person(r.unit.id)))];
 }
 sections.unshift(section('status','当前状态 · 第 '+s.campaign.day+' 天',fields(campaignCurrentStatus(s,type,entry,ix).map(([label,value])=>[label,esc(value)]))));
 if(entry.personFate?.status==='CAPTIVE'){const p=entry.personFate;sections.push(section('custody','俘虏处置',`<p>${p.custody?'正在押送至'+esc(town(p.custody.destination)):'关押于'+esc(town(p.cityId))} · 赎金 ${ransomCost(p)}</p>${!p.custody&&s.campaign.phase==='planning'?(p.fate.originalFaction===playerFaction(s)?`<button class="button secondary" data-action="personnel-ransom" data-id="${esc(p.id)}">支付 ${ransomCost(p)} 金赎回</button>`:p.fate.captor===playerFaction(s)?`<button class="button secondary" data-action="personnel-release" data-id="${esc(p.id)}">释放俘虏</button>`:''):''}`));}
 return {title:type==='unit'?title+'部队':title,sections};
}
// Consumers may choose section IDs without copying the detail renderer or campaign rules.
export function campaignInfoSections(detail,{sections=null}={}){return detail.sections.filter(s=>!sections||sections.includes(s.id)).map(s=>`<section class="info-section" data-info-section="${s.id}"><h3>${esc(s.title)}</h3>${s.html}</section>`).join('');}
const dossierPages={
 city:[['基本',['status','overview','resources']],['驻军',['units','armies']],['武将与内政',['officers','work']]],
 army:[['基本',['status','overview','supply']],['所属部队',['units','followers']],['指挥与军略',['command','strategy','bonds']]],
 unit:[['基本',['status','overview','troops','custody']],['能力与战法',['combat','tactics']],['所属武将',['attributes','traits','stratagems','work']]],
 officer:[['基本',['status','overview','work','custody']],['能力',['attributes','traits','troops','combat']],['战法与军略',['tactics','stratagems']]],
 faction:[['基本',['status','overview']],['城池与军团',['cities','armies']],['部队与武将',['units','officers']]]
};
function dossierMarkup(s,type,view,ix,detail){
 const entry=ix[type].find(r=>(r.unit?.id||r.id)===view.id);
 if(!entry)return '<p class="muted">对象已不在当前名册，请返回名册查看。</p>';
 const pages=dossierPages[type],page=pages.some(([key])=>key===view.page)?view.page:pages[0][0];
 const faction=entry.faction||entry.owner,portrait=entry.unit||(type==='army'?entry.units.find(u=>u.id===entry.leader):type==='city'?ix.officer.find(r=>r.unit.id===entry.governor)?.unit:null);
 const siblings=ix[type].filter(r=>type==='faction'||(r.faction||r.owner)===faction);
 const jump=type==='unit'?infoLink('officer',entry.unit.id,'查看主将 · '+entry.unit.name):type==='officer'&&entry.prepared?infoLink('unit',entry.unit.id,'查看所领部队'):'';
 return `<div class="info-dossier ${view.objectOnly?'info-single-object':''}" data-info-kind="${type}">${view.objectOnly?'':`<aside class="info-object-list" aria-label="${INFO_TYPES[type]}名册"><h3>${INFO_TYPES[type]}名册 <small>${siblings.length}</small></h3>${siblings.map(r=>{const id=r.unit?.id||r.id;return `<button class="info-object ${id===view.id?'selected':''}" data-action="campaign-info-peer" data-kind="${type}" data-id="${esc(id)}" aria-current="${id===view.id?'true':'false'}">${esc(r.unit?.name||r.name)}${type==='unit'?'部队':''}</button>`;}).join('')}</aside>`}<aside class="info-identity">${portrait?`<div class="info-portrait" data-art-portrait="${esc(portrait.id)}"><span>${esc(portrait.name)}</span></div>`:`<div class="info-emblem">${INFO_TYPES[type]}</div>`}<small>${INFO_TYPES[type]} · ${esc(FACTIONS[faction]?.name||entry.name)}</small><h3>${esc(detail.title)}</h3>${portrait&&type!=='officer'?`<p>${type==='city'?'太守':type==='army'?'军团长':'主将'} · ${esc(portrait.name)}</p>`:''}${jump}<p class="muted">第 ${s.campaign.day} 天 · 当前情报</p></aside><div class="info-dossier-content"><nav class="info-tabs" aria-label="详情分类">${pages.map(([key])=>`<button class="button ${page===key?'primary':'secondary'}" data-action="campaign-info-page" data-page="${key}" aria-pressed="${page===key}">${key}</button>`).join('')}</nav>${type==='unit'&&page==='所属武将'?`<div class="info-member-link">${jump}<p class="muted">查看武将身份、能力、特性及当前任职。</p></div>`:''}${campaignInfoSections(detail,{sections:pages.find(([key])=>key===page)[1]})}</div></div>`;
}
export function campaignInfoMarkup(s,view={}){
 const type=INFO_TYPES[view.type]?view.type:'city',ix=campaignInfoIndex(s);
 if(view.id){const detail=campaignInfoDetail(s,type,view.id);return {title:detail.title,body:dossierMarkup(s,type,view,ix,detail)};}
 const faction=r=>FACTIONS[r.faction||r.owner]?.name||'—',town=id=>s.cities.find(c=>c.id===id)?.name||'途中';
 const col=(key,label,value)=>({key,label,value});
 const name=col('name','名称',r=>r.name||r.unit?.name),owner=col('faction','势力',faction);
 const columns={
 city:[name,owner,col('province','地域',r=>r.province),col('grain','存粮',r=>r.grain),col('manpower','预备兵',r=>r.manpower),col('gateHp','城门耐久',r=>r.gateHp)],
 army:[name,owner,col('location','位置',r=>r.travel?town(r.travel.from)+' → '+town(r.travel.to):town(r.location)),col('status','状态',r=>armyBattle(s,r.id)?'交战中':r.travel?'行军中':r.task||'驻扎'),col('troops','现役兵力',r=>liveSoldiers(s,r)),col('units','部队数',r=>r.units.length),col('supply','携粮',r=>r.supply),col('morale','士气',r=>r.morale)],
 unit:[name,owner,col('city','所在',r=>town(r.city)),col('army','军团',r=>r.army?.name||'城内独立部队'),col('type','兵种',r=>TROOPS[r.unit.type]?.name),col('troops','现役兵力',r=>r.unit.troops),col('wounded','伤兵',r=>r.unit.wounded),col('level','等级',r=>r.unit.level)],
 officer:[name,owner,col('city','所在',r=>town(r.city)),...OFFICER_STATS.map(([key,label])=>col(key,label,r=>r.unit[key]??OFFICER_BY_ID[r.unit.id]?.[key])),col('level','等级',r=>r.unit.level)],
 faction:[name,col('cities','据点数',r=>ix.city.filter(c=>c.owner===r.id).length),col('armies','军团数',r=>ix.army.filter(a=>a.faction===r.id).length),col('officers','武将数',r=>ix.officer.filter(o=>o.faction===r.id&&!o.personFate).length),col('troops','现役兵力',r=>ix.unit.filter(o=>o.faction===r.id).reduce((sum,o)=>sum+o.unit.troops,0))]
 }[type];
 const sort=columns.some(c=>c.key===view.sort)?view.sort:'name',direction=view.direction||'asc',query=(view.query||'').trim();
 const rows=sortRows(ix[type].filter(r=>[r.name,r.unit?.name,FACTIONS[r.faction||r.owner]?.name].some(v=>v?.includes(query))),sort,direction,(r,key)=>columns.find(c=>c.key===key).value(r));
 return {title:'天下情报',body:`<nav class="info-tabs">${Object.entries(INFO_TYPES).map(([key,label])=>`<button class="button ${type===key?'primary':'secondary'}" data-action="campaign-info-tab" data-kind="${key}" aria-pressed="${type===key}">${label} ${ix[key].length}</button>`).join('')}</nav><label class="strategy-field">搜索名称 / 势力<input id="campaign-info-query" type="search" value="${esc(view.query||'')}" placeholder="输入名称"></label><p class="muted">共 ${rows.length} 项</p><div class="personnel-table-wrap"><table class="personnel-table info-directory"><thead><tr>${columns.map(c=>sortHeader('info',c.key,c.label,sort,direction)).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${c.key==='name'?infoLink(type,r.unit?.id||r.id,c.value(r)):typeof c.value(r)==='number'?n(c.value(r)):esc(c.value(r))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}">没有符合条件的记录。</td></tr>`}</tbody></table></div>`};
}
