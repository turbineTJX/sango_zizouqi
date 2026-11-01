import {administrationKnown,cityInformation} from './information-display.mjs';
import {cityFinanceMarkup,factionFinanceMarkup} from './finance-view.mjs';
import {gateDurability} from './building-durability.mjs';
import {treasureUnitMarkup} from './treasure-view.mjs';
import {equipmentNames} from './troop-equipment.mjs';
import {intelligenceWorld,cityVisible,intelligenceLabel,visionEnabled} from './strategic-vision.mjs';
import {unitVisualSummary} from './army-inspection.mjs';
import {citySizeName,metropolitanSiteName} from './city-classification.mjs';
import {metropolitanCenter,metropolitanMembers,metropolitanMemberCounts} from './metropolitan-areas.mjs';
import {abilityButton} from './ability-reference.mjs';
import {mapNode,isJunction} from './road-network.mjs';
import {armyDetailSections,armyInfoCounts,armySupplyInfo} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {activityArtScene} from './officer-art-scenes.mjs';
import {ACTIONS} from './domestic-designs.mjs';
import {officerActivities} from './officer-activity.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
import {traitChips} from './trait-display.mjs';
import {personalBondsMarkup} from './bond-display.mjs';
import {aptitudesMarkup,aptitudeGrade} from './aptitude-display.mjs';
import {ransomCost} from './officer-fates.mjs';
import {campaignCurrentStatus,armyDestinationLabel} from './campaign-info-status.mjs';
import {officerActivityMarkup,siteActivityMarkup} from './officer-activity-view.mjs';
import {unitAttributes,ATTRIBUTE_LABELS} from './unit-stats.mjs';
import {FACTIONS,TROOPS} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {OFFICER_STATS} from './strategic-roster.mjs';
import {unitTactics} from './tactics.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {STRATAGEMS,officerStratagems} from './stratagems.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {DIRECTIONS,cityMilitary} from './domestic.mjs';
import {armyBattle,liveSoldiers,dailyConsumption} from './strategic-campaign.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(v)?Math.round(v).toLocaleString('zh-CN'):'—';
export const INFO_TYPES={city:'据点',army:'军团',unit:'部队',officer:'武将',faction:'势力'};
export function campaignInfoMenu(scope='self'){
 const tabs=[['self','本势力'],['all','天下'],['other','典籍']];
 const items=scope==='other'?[['trait','特性'],['tactic','战法'],['bond','羁绊'],['stratagem','军略']]:[['faction','势力'],['city','据点'],['army','军团'],['officer','武将'],['unit','部队']];
 return {title:'情报',body:`<div class="intelligence-menu"><nav class="intelligence-tabs" aria-label="情报范围">${tabs.map(([key,label])=>`<button class="button ${scope===key?'primary':'secondary'}" data-action="info-menu-scope" data-scope="${key}" aria-pressed="${scope===key}">${label}</button>`).join('')}</nav><div class="intelligence-grid">${items.map(([key,label])=>`<button class="button secondary" data-action="${scope==='other'?'info-reference':'info-menu-list'}" data-kind="${key}">${label}</button>`).join('')}</div></div>`};
}
export const infoLink=(type,id,label,page=null)=>`<button class="personnel-name" data-action="campaign-info-detail" data-kind="${type}" data-id="${esc(id)}"${page?` data-page="${esc(page)}"`:""}>${esc(label)}</button>`;
// Only instantiated campaign people are indexed; undiscovered talent is not exposed.
export function campaignInfoIndex(s){
 s=intelligenceWorld(s);
 const armies=s.armies.filter(a=>!a.disbanded),people=new Map();
 for(const c of s.cities.filter(c=>cityVisible(s,c.id)))for(const unit of c.units.filter(u=>!u.mission||c.owner===playerFaction(s)))people.set(unit.id,{unit,faction:unit.mission?.faction||c.owner,city:unit.mission?(unit.mission.route.length?null:unit.mission.location):c.id,stationedCity:c.id,prepared:true});
 for(const a of armies)for(const member of armyInfoCounts(s,a).members){const unit={...member.unit,troops:member.soldiers,wounded:member.wounded};people.set(unit.id,{unit,faction:a.faction,city:a.travel?null:a.location,army:a,prepared:unit.troops>0||unit.wounded>0});}
 for(const o of [...s.campaign.idle,...s.armies.filter(a=>a.disbanded).flatMap(a=>a.returningOfficers||[])])if(!people.has(o.unit.id))people.set(o.unit.id,{unit:o.unit,faction:o.faction,city:o.unit.mission?(o.unit.mission.route.length?null:o.unit.mission.location):o.destination||o.retreating?null:o.location,prepared:o.unit.troops>0||o.unit.wounded>0,idle:o,returning:!s.campaign.idle.includes(o)});
 for(const p of s.campaign.domestic.people.filter(p=>p.fate&&(p.fate.originalFaction===playerFaction(s)||p.fate.captor===playerFaction(s))))people.set(p.id,{unit:p.unit,faction:p.fate.originalFaction,city:p.cityId,personFate:p});
 return {city:s.cities,army:armies,unit:[...people.values()].filter(r=>r.prepared),officer:[...people.values()],faction:[...new Set([...s.cities.filter(c=>cityInformation(s,c.id).state!=='unknown').map(c=>c.owner),...armies.map(a=>a.faction),...[...people.values()].map(r=>r.faction)])].filter(Boolean).map(id=>({id,name:FACTIONS[id]?.name||id}))};
}
const fields=items=>`<dl class="info-fields">${items.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${value??'—'}</dd></div>`).join('')}</dl>`;
const section=(id,title,html)=>({id,title,html});
const links=(rows,fn)=>rows.map(fn).join(' ')||'<p class="muted">暂无记录</p>';
function metropolisSection(s,c){
 const center=metropolitanCenter(s,c),members=metropolitanMembers(s,c),counts=metropolitanMemberCounts(s,c);
 return section('metropolis','都市圈',fields([['府',n(counts.prefecture)],['港口',n(counts.port)],['关卡',n(counts.gate)]]).replace('class="info-fields"','class="info-fields metropolitan-counts"')+`<table class="personnel-table metropolitan-table"><thead><tr><th>名称</th><th>类型</th></tr></thead><tbody>${members.map(node=>`<tr data-metropolitan-member="${esc(node.id)}"><td>${esc(node.name)}</td><td>${metropolitanSiteName(node,center)}</td></tr>`).join('')}</tbody></table>`);
}
export function campaignInfoDetail(s,type,id,{activityBefore=null,finance=true}={}){
 s=intelligenceWorld(s);
 const ix=campaignInfoIndex(s),entry=ix[type]?.find(x=>(x.unit?.id||x.id)===id);
 if(!entry)return {title:'已离开名册',sections:[]};
 const town=id=>mapNode(s,id)?.name||'—',faction=id=>infoLink('faction',id,FACTIONS[id]?.name||id),city=(id,label=town(id))=>id?(isJunction(s,id)?esc(label):infoLink('city',id,label)):'途中',person=id=>id?infoLink('officer',id,ix.officer.find(r=>r.unit.id===id)?.unit.name||OFFICER_BY_ID[id]?.name||id):'未任命';
 const units=(rows,{withWounded=false}={})=>rows.length?`<div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>部队</th><th>兵种</th><th>${withWounded?'现役兵':'兵力'}</th>${withWounded?'<th>伤兵</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr><td>${infoLink('unit',r.unit.id,r.unit.name)}</td><td>${esc(TROOPS[r.unit.type]?.name)}</td><td class="numeric">${n(r.unit.troops)}</td>${withWounded?`<td class="numeric">${n(r.unit.wounded)}</td>`:''}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">暂无部队</p>';
 let title=entry.name||entry.unit?.name,sections=[];
 if(type==='city'&&!cityVisible(s,id)){
  const i=cityInformation(s,id),c=entry,military=cityMilitary(s,c),durability=gateDurability(c);
  return {title:c.name,sections:[section('status','情报状态',`<p>${esc(intelligenceLabel(s,id))}</p>`),metropolisSection(s,c),section('overview','据点概况',fields([[i.state==='unknown'?'势力':'最后获知势力',i.state==='unknown'?'未知':faction(c.owner)],['地域',esc(c.province)],['类型',esc(citySizeName(c))]])),section('resources','最后侦察结果',i.data?'<p class="muted">兵力不含主将外出留城兵</p>'+fields([['现役兵',n(military.troops)],['预备兵',n(c.manpower)],['伤兵',n(military.wounded)],['城防耐久',n(durability.hp)+' / '+n(durability.maxHp)],['本城金',n(c.gold)],['存粮',n(c.grain)],['城墙等级',n(c.walls)]]):'<p class="muted">未知</p>')]};
 }
 if(type==='city'){
  const c=entry,local=ix.officer.filter(r=>r.city===id&&!r.personFate),military=cityMilitary(s,c),durability=gateDurability(c);
  const absentTroops=c.units.filter(u=>u.mission).reduce((sum,u)=>sum+u.troops,0),absentNote=absentTroops?`<p class="muted">主将外出留城兵 ${n(absentTroops)} · 暂不可参战</p>`:'';
  sections=[section('overview','据点概况',fields([['势力',faction(c.owner)],['地域',esc(c.province)],['类型',esc(c.kind==='city'?citySizeName(c):({gate:'关隘',port:'港口'})[c.kind]||c.kind||'城池')],['太守',person(c.governor)]])),section('resources','城防与资源',fields([['现役兵',n(military.troops)],...(absentTroops?[['其中主将外出留城兵',n(absentTroops)]]:[]),['预备兵',n(c.manpower)],['伤兵',n(military.wounded)],['城防耐久',n(durability.hp)+' / '+n(durability.maxHp)],['本城金',n(c.gold)],['存粮',n(c.grain)],['已预留兵员',n(c.domestic?.reserved)],['城墙等级',n(c.walls)],['粮仓等级',n(c.granary)]])),section('units','驻城部队',absentNote+units(ix.unit.filter(r=>(r.stationedCity||r.city)===id&&!r.army))),section('armies','驻扎军团',links(ix.army.filter(a=>!a.travel&&a.location===id),a=>infoLink('army',a.id,a.name))),section('officers','驻城武将',links(local,r=>person(r.unit.id))),section('work','内政',!administrationKnown(s,c.owner)?'<p class="muted">未知</p>':`<div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>武将</th><th>任职</th><th>事务</th><th>剩余</th></tr></thead><tbody>${local.map(r=>{const w=currentDomesticWork(s,r.unit.id),duties=s.campaign.domestic.assignments.filter(a=>a.officerId===r.unit.id).map(a=>DIRECTIONS[a.direction]).concat(r.unit.scouting?'侦察':[]);return `<tr><td>${person(r.unit.id)}</td><td>${esc(duties.join('、')||'—')}</td><td>${w?esc(w.title):'—'}${w?.paused?'（暂停）':''}</td><td>${w?esc(Number(w.remaining.toFixed(1)))+' 天':'—'}</td></tr>`;}).join('')||'<tr><td colspan="4">暂无武将</td></tr>'}</tbody></table></div>`)];
  sections.push(metropolisSection(s,c));
 }else if(type==='army'){
  const a=entry,counts=armyInfoCounts(s,a),supply=armySupplyInfo(s,a),members=new Map(counts.members.map(m=>[m.unit.id,m]));
  const rows=ix.unit.filter(r=>r.army?.id===id).map(r=>{const m=members.get(r.unit.id);return {...r,unit:{...r.unit,troops:m?.soldiers??r.unit.troops,wounded:m?.wounded??r.unit.wounded}};});
  sections=[section('overview','军团概况',fields([['势力',faction(a.faction)],['位置',a.travel?`${city(a.travel.from)} → ${city(a.travel.to)}`:city(a.location)],['状态',armyBattle(s,a.id)?'交战中':a.travel?'行军中':esc(a.task||'驻扎')],['目的地',a.target?city(a.target,armyDestinationLabel(s,a)):'无']])),...armyDetailSections(a,{person,...counts,consumption:dailyConsumption(s,a),supplyLabel:supply?.label}),section('units','所属部队',units(rows,{withWounded:true}))];
 }else if(type==='unit'||type==='officer'){
  const r=entry,u=r.unit,hiddenWork=!administrationKnown(s,r.faction),work=currentDomesticWork(s,id),order=s.campaign.domestic.orders.find(o=>o.officerIds.includes(id));
  sections=[section('overview',type==='unit'?'归属':'归属',fields([['势力',faction(r.faction)],['所在',type==='unit'&&u.mission&&r.stationedCity?city(r.stationedCity):u.mission?`${city(u.mission.location)}${u.mission.route.length?' → '+city(u.mission.route[0]):''}`:r.army?.travel?`${city(r.army.travel.from)} → ${city(r.army.travel.to)}`:r.idle?.destination?`${city(r.idle.location)} → ${city(r.idle.destination)}`:city(r.city)],['军团',r.army?infoLink('army',r.army.id,r.army.name):r.idle?.returningHome?'未编入军团':r.prepared?(r.idle?.retreating?'撤离队':r.idle?.destination?'运输队随行部队':u.mission?'城内独立部队 · 主将外出':'城内独立部队'):'未编制'],[type==='unit'?'主将':'所领部队',type==='unit'?person(id):r.prepared?infoLink('unit',id,u.name+'部队'):'未编制']])),section('attributes','能力',fields([...OFFICER_STATS.map(([k,label])=>[label,n(u[k]??OFFICER_BY_ID[id]?.[k])]),['等级',n(u.level)],['功绩',n(u.merit)],...(r.faction===playerFaction(s)?[['忠诚',n(s.campaign.domestic.loyalty[id]??u.loyalty??85)]]:[])])),section('aptitudes','兵种适性',aptitudesMarkup(u)),section('traits','特性',traitChips(u)),section('bonds','羁绊',personalBondsMarkup(u)),section('troops','兵力与兵种',fields([['兵种',esc(TROOPS[u.type]?.name)],['携带装备',esc(equipmentNames(u))],['适性',aptitudeGrade(troopAptitude(u,u.type))],['现役',n(u.troops)],['伤兵',n(u.wounded)],['兵力上限',n(troopCapacity(u))]])),section('combat','部队属性',fields(Object.entries(ATTRIBUTE_LABELS).map(([key,label])=>[label,n(unitAttributes(u)[key])]))),section('tactics','战法',links(unitTactics(u),t=>abilityButton('tactic',t.id,t.name))),section('stratagems','军略',links(officerStratagems(id),key=>abilityButton('stratagem',key,STRATAGEMS[key].name))),section('work','任职与命令',fields([['太守',links(s.cities.filter(c=>c.governor===id),c=>city(c.id))],['内政任职',hiddenWork?'未知':esc(s.campaign.domestic.assignments.filter(a=>a.officerId===id).map(a=>DIRECTIONS[a.direction]).join('、')||'无')],['当前事务',hiddenWork?'未知':work?`${esc(work.title)} · 余 ${esc(work.remaining)} 天${work.paused?' · 暂停':''}`:'无'],['等待命令',hiddenWork?'未知':order?esc(strategicOrderLabel(s,order)):'无']]))];
 }else {
  const cities=ix.city.filter(c=>c.owner===id&&cityInformation(s,c.id).state!=='unknown'),armies=ix.army.filter(a=>a.faction===id),people=ix.officer.filter(r=>r.faction===id&&!r.personFate),troops=ix.unit.filter(r=>r.faction===id);
  const partial=!administrationKnown(s,id),grain=cities.some(c=>Number.isFinite(c.grain))?cities.reduce((sum,c)=>sum+(c.grain??0),0):null;
  sections=[section('overview','势力概况',fields([[partial?'已知据点':'据点',n(cities.length)],[partial?'可见军团':'军团',n(armies.length)],[partial?'可见部队':'部队',n(troops.length)],[partial?'可见武将':'武将',n(people.length)],[partial?'可见现役兵':'现役兵力',n(troops.reduce((sum,r)=>sum+r.unit.troops,0))],[partial?'已知存粮':'据点存粮',grain===null?'未知':n(grain)]])),section('cities','所属据点',links(cities,c=>city(c.id))),section('armies','出征军团',links(armies,a=>infoLink('army',a.id,a.name))),section('units','所属部队',units(troops)),section('officers','麾下武将',links(people,r=>person(r.unit.id)))];
 }
 if(type==='city'&&entry.owner===playerFaction(s))sections.push(section('finance','收支预算',finance?cityFinanceMarkup(s,entry):''));
 if(type==='faction'&&id===playerFaction(s))sections.push(section('finance','收支预算',finance?factionFinanceMarkup(s,id):''));
 if(type==='unit'||type==='officer')sections.push(section('treasure','宝物',treasureUnitMarkup(entry.unit,{manage:entry.faction===playerFaction(s)})));
 if(type==='officer')sections=sections.filter(section=>section.id!=='combat'&&(section.id!=='troops'||entry.prepared));
 if(type==='unit')sections.unshift(section('visual','部队能力',unitVisualSummary(entry.unit)));
 if(type==='officer'&&(!visionEnabled(s)||entry.faction===playerFaction(s)))sections.push(section('activity','动态',officerActivityMarkup(s,id,activityBefore)));
 if(type==='city'&&(!visionEnabled(s)||entry.owner===playerFaction(s)))sections.push(section('activity','动态',siteActivityMarkup(s,id,activityBefore)));
 sections.unshift(section('status','状态',fields(campaignCurrentStatus(s,type,entry,ix).map(([label,value])=>[label,esc(value)]))));
 if(entry.personFate?.status==='CAPTIVE'){const p=entry.personFate;sections.push(section('custody','俘虏处置',`<p>${p.custody?'正在押送至'+esc(town(p.custody.destination)):'关押于'+esc(town(p.cityId))} · 赎金 ${ransomCost(p)}</p>${!p.custody&&s.campaign.phase==='planning'?(p.fate.originalFaction===playerFaction(s)?`<button class="button secondary" data-action="personnel-ransom" data-id="${esc(p.id)}">赎回</button>`:p.fate.captor===playerFaction(s)?`<button class="button secondary" data-action="personnel-release" data-id="${esc(p.id)}">释放</button>`:''):''}`));}
 return {title,sections};
}
// Consumers may choose section IDs without copying the detail renderer or campaign rules.
export function campaignInfoSections(detail,{sections=null,omitTitle=null}={}){return detail.sections.filter(s=>!sections||sections.includes(s.id)).map(s=>`<section class="info-section" data-info-section="${s.id}">${s.title===omitTitle?'':`<h3>${esc(s.title)}</h3>`}${s.html}</section>`).join('');}
const dossierPageLabels={'当前动态':'动态','所属部队':'部队','所属武将':'武将','指挥与军略':'指挥','武将与内政':'内政'};
const dossierPages={
 city:[['基本',['status','overview','resources']],['都市圈',['metropolis']],['收支预算',['finance']],['驻军',['units','armies']],['武将与内政',['officers','work']],['当前动态',['activity']]],
 army:[['基本',['status','overview','supply']],['所属部队',['units','followers']],['指挥与军略',['command','strategy','bonds']]],
 unit:[['基本',['visual','status','overview','troops','custody','treasure']],['能力',['combat']],['战法',['tactics']],['军略',['stratagems']],['特性',['traits']],['羁绊',['bonds']],['所属武将',['attributes','aptitudes','work']]],
 officer:[['基本',['status','overview','work','troops','custody','treasure']],['当前动态',['activity']],['能力',['attributes']],['兵种适性',['aptitudes']],['特性',['traits']],['羁绊',['bonds']],['战法',['tactics']],['军略',['stratagems']]],
 faction:[['基本',['status','overview']],['收支预算',['finance']],['城池与军团',['cities','armies']],['部队与武将',['units','officers']]]
};
function dossierMarkup(s,type,view,ix,detail){
 const entry=ix[type].find(r=>(r.unit?.id||r.id)===view.id);
 if(!entry)return '<p class="muted">对象已离开名册</p>';
 const pages=dossierPages[type].filter(([,ids])=>ids.some(id=>detail.sections.some(section=>section.id===id))),page=pages.some(([key])=>key===view.page)?view.page:pages[0][0];
 const faction=entry.faction||entry.owner,portrait=entry.unit||(type==='army'?entry.units.find(u=>u.id===entry.leader):null);
 const siblings=ix[type].filter(r=>type==='faction'||(r.faction||r.owner)===faction);
 const jump=type==='unit'?infoLink('officer',entry.unit.id,'主将'):type==='officer'&&entry.prepared?infoLink('unit',entry.unit.id,'部队'):'';
 return `<div class="info-dossier ${view.objectOnly?'info-single-object':''}" data-info-kind="${type}">${view.objectOnly?'':`<aside class="info-object-list" aria-label="${INFO_TYPES[type]}名册"><h3>${INFO_TYPES[type]}名册 <small>${siblings.length}</small></h3>${siblings.map(r=>{const id=r.unit?.id||r.id;return `<button class="info-object ${id===view.id?'selected':''}" data-action="campaign-info-peer" data-kind="${type}" data-id="${esc(id)}" aria-current="${id===view.id?'true':'false'}">${esc(r.unit?.name||r.name)}</button>`;}).join('')}</aside>`}<aside class="info-identity"${portrait?'':' hidden'}>${portrait?`<button type="button" class="info-portrait" data-action="campaign-info-detail" data-kind="officer" data-id="${esc(portrait.id)}" aria-label="查看${esc(portrait.name)}武将详情" data-art-portrait="${esc(portrait.id)}" data-art-scene="${type==='city'?'domestic':['army','unit'].includes(type)?'command':page==='当前动态'?activityArtScene(officerActivities(s).get(portrait.id),ACTIONS[s.campaign.domestic.assignments.find(a=>a.officerId===portrait.id)?.action?.key]):'detail'}"><span>${esc(portrait.name)}</span></button>`:''}${portrait&&!['officer','unit'].includes(type)?`<p>${type==='city'?'太守':type==='army'?'军团长':'主将'} · ${esc(portrait.name)}</p>`:''}${jump}</aside><div class="info-dossier-content"><nav class="info-tabs" aria-label="详情分类">${pages.map(([key])=>`<button class="button ${page===key?'primary':'secondary'}" data-action="campaign-info-page" data-page="${key}" aria-pressed="${page===key}">${dossierPageLabels[key]||key}</button>`).join('')}</nav>${type==='unit'&&page==='所属武将'?`<div class="info-member-link">${jump}</div>`:''}${campaignInfoSections(detail,{sections:pages.find(([key])=>key===page)[1],omitTitle:page})}</div></div>`;
}
// Keep each list's filters in UI memory, independently of object details and saves.
export function rememberInfoDirectory(ui){
 const view=ui.infoView;if(!view||view.id)return;
 ui.infoDirectories??={};ui.infoDirectories[(view.scope||'self')+':'+view.type]={...view};
}
export function selectInfoDirectory(ui,type,scope=ui.infoView?.scope||ui.infoScope||'self'){
 rememberInfoDirectory(ui);ui.infoDirectories??={};
 ui.infoView={...ui.infoDirectories[scope+':'+type],type,scope};
 ui.infoScope=scope;ui.infoHistory=[];
 return ui.infoView;
}
export function campaignInfoMarkup(s,view={}){
 s=intelligenceWorld(s);
 const type=INFO_TYPES[view.type]?view.type:'city',ix=campaignInfoIndex(s);
 if(view.id){const detail=campaignInfoDetail(s,type,view.id,{activityBefore:view.activityBefore,finance:view.page==='收支预算'});return {title:detail.title,body:dossierMarkup(s,type,view,ix,detail)};}
 const faction=r=>type==='city'&&cityInformation(s,r.id).state==='unknown'?'未知':FACTIONS[r.faction||r.owner]?.name||'—',town=id=>s.cities.find(c=>c.id===id)?.name||'途中';
 const numericKeys=new Set(['gold','grain','manpower','gateHp','troops','units','supply','morale','wounded','leadership','force','intellect','politics','charm','level','cities','armies','officers']);
 const col=(key,label,value)=>({key,label,value,numeric:numericKeys.has(key)});
 const name=col('name',type==='officer'?'姓名':INFO_TYPES[type],r=>r.name||r.unit?.name),owner=col('faction','势力',faction);
 const columns={
 city:[name,owner,col('intel','情报',r=>intelligenceLabel(s,r.id)),col('province','地域',r=>r.province),col('gold','金',r=>r.gold),col('grain','存粮',r=>r.grain),col('manpower','预备兵',r=>r.manpower),col('gateHp','耐久',r=>r.buildings?gateDurability(r).hp:null)],
 army:[name,owner,col('location','所在',r=>r.travel?town(r.travel.from)+' → '+town(r.travel.to):town(r.location)),col('status','状态',r=>armyBattle(s,r.id)?'交战中':r.travel?'行军中':r.task||'驻扎'),col('troops','兵力',r=>liveSoldiers(s,r)),col('units','部队',r=>armyInfoCounts(s,r).unitCount),col('supply','携粮',r=>r.supply),col('morale','士气',r=>r.morale)],
 unit:[name,owner,col('city','所在',r=>town(r.unit.mission&&r.stationedCity?r.stationedCity:r.city)),col('army','军团',r=>r.army?.name||(r.unit.mission?'城内独立部队 · 主将外出':'城内独立部队')),col('type','兵种',r=>TROOPS[r.unit.type]?.name),col('troops','兵力',r=>r.unit.troops),col('wounded','伤兵',r=>r.unit.wounded),col('level','等级',r=>r.unit.level)],
 officer:[name,owner,col('city','所在',r=>town(r.city)),...OFFICER_STATS.map(([key,label])=>col(key,label,r=>r.unit[key]??OFFICER_BY_ID[r.unit.id]?.[key])),col('level','等级',r=>r.unit.level)],
 faction:[name,col('cities','据点',r=>ix.city.filter(c=>c.owner===r.id&&cityInformation(s,c.id).state!=='unknown').length),col('armies','军团',r=>ix.army.filter(a=>a.faction===r.id).length),col('officers','武将',r=>ix.officer.filter(o=>o.faction===r.id&&!o.personFate).length),col('troops','兵力',r=>ix.unit.filter(o=>o.faction===r.id).reduce((sum,o)=>sum+o.unit.troops,0))]
 }[type];
 const sort=columns.some(c=>c.key===view.sort)?view.sort:'name',direction=view.direction||'asc',query=(view.query||'').trim();
 const scoped=key=>ix[key].filter(r=>view.scope!=='self'||(key==='faction'?r.id:r.faction||r.owner)===playerFaction(s));
 const all=scoped(type),searchColumns=columns.filter(c=>['name','faction','city','location','province','army','status','type'].includes(c.key));
 const rows=sortRows(all.filter(r=>searchColumns.some(c=>String(c.value(r)??'').includes(query))),sort,direction,(r,key)=>columns.find(c=>c.key===key).value(r));
 return {title:INFO_TYPES[type]+'情报',body:`<section class="information-directory">${type==='faction'&&view.scope!=='self'&&visionEnabled(s)?'<p class="muted">他势力仅计已知数</p>':''}<nav class="directory-tabs" aria-label="情报分类">${Object.entries(INFO_TYPES).map(([key,label])=>`<button data-action="campaign-info-tab" data-kind="${key}" aria-pressed="${type===key}">${label} ${scoped(key).length}</button>`).join('')}</nav><div class="directory-toolbar"><label class="strategy-field">查找<input id="campaign-info-query" type="search" value="${esc(view.query||'')}" placeholder="名称 / 势力 / 所在"></label><div class="info-scope-filter" aria-label="情报范围">${[['self','本势力'],['all','天下']].map(([key,label])=>`<button data-action="campaign-info-scope" data-scope="${key}" aria-pressed="${(view.scope==='self'?'self':'all')===key}">${label}</button>`).join('')}</div><p class="personnel-count">${rows.length} / ${all.length} 项</p>${query?'<button class="button secondary" data-action="campaign-info-clear">清空</button>':''}</div><div class="personnel-table-wrap" tabindex="0" aria-label="${INFO_TYPES[type]}情报列表"><table class="personnel-table info-directory"><thead><tr>${columns.map(c=>sortHeader('info',c.key,c.label,sort,direction)).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td${c.numeric?' class="numeric"':''}>${c.key==='name'?infoLink(type,r.unit?.id||r.id,c.value(r)):typeof c.value(r)==='number'?n(c.value(r)):esc(c.value(r))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}">${query?'没有符合条件的记录。':'暂无'+INFO_TYPES[type]+'。'}</td></tr>`}</tbody></table></div></section>`};
}
