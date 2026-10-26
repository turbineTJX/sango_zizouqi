import {domesticStaffing,domesticStaffingLimit,domesticStaffingBonuses} from './domestic-staffing.mjs';
import {DOMESTIC_STAFFING_RULES as STAFFING_RULES} from './data/design/domestic-actions.mjs';
import {battleAppointmentsMarkup} from './battle-appointments-view.mjs';
import {gateDurability,buildingDurability,DURABLE_BUILDINGS} from './building-durability.mjs';
import {technologyMarkup} from './technology-view.mjs';
import {citySoldierLabel} from './city-budget.mjs';
import {domesticPriority} from './faction-affairs.mjs';
import {incidentWorkMarkup,cityIncidentMarkup} from './domestic-incident-view.mjs';
import {effectiveDomesticChance} from './domestic-incidents.mjs';
import {domesticApprovalMarkup} from './domestic-proposal-view.mjs';
import {domesticConfidence,pendingDomesticProposals} from './domestic.mjs';
import {intelligenceWorld,cityVisible,visionEnabled,fogMarkup,armyVisionRadius} from './strategic-vision.mjs';
import {campaignInfoDetail,campaignInfoSections} from './campaign-info.mjs';
import {diplomacyMarkup} from './diplomacy-view.mjs';
import {replayFrames,replayFrame} from './campaign-replay.mjs';
import {battleDays} from './player-time.mjs';
import {staffSummaryMarkup} from './domestic-feedback.mjs';
import {strategicHUD} from './strategic-hud.mjs';
import {marchModes} from './strategic-traits.mjs';
import {FACTION_DIRECTORIES,factionDirectoryRows,mapQuickDirectory} from './faction-directory.mjs';
import {factionStrategicProfile} from './strategic-ai.mjs';
import {siegeDefenseOptionsMarkup} from './military-flow.mjs';
import {domesticReference,buildingReference} from './domestic-reference.mjs';
import {abilityButton} from './ability-reference.mjs';
import {detailLink} from './ui-detail-table.mjs';
import {mapObjectMenu} from './map-object-menu.mjs';
import {mapNode,nodeKindName,isJunction} from './road-network.mjs';
import {grainCapacity} from './domestic.mjs';

import {metropolitanCenter,metropolitanMembers,buildingLocations,buildingSiteName,constructionSiteAvailable} from './metropolitan-areas.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {contributionText} from './progression.mjs';
import {playerFaction,isPlayerControlled} from './player-faction.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
import {armyMapMarkers,battleMapMarkers} from './strategic-army-markers.mjs';
import {metropolitanSiteName} from './city-classification.mjs';
import {infoLink,campaignInfoIndex} from './campaign-info.mjs';
import {pendingOrdersMarkup} from './strategic-order-view.mjs';
import {armyWaitingOrder} from './strategic-orders.mjs';
import {campaignRoads,roadCost,renderRoads,renderMarchRoute,renderSupplyRoute} from './strategic-movement.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {campaignOfficers} from './strategic-roster.mjs';
import {nationalScenario,campaignDate} from './national-scenarios.mjs';
import {CAMPAIGN,PROJECTS,calendar,isPlanning,activeBattles,armyBattle,armyPosition,armyActionPoints,liveSoldiers,dailyConsumption,canEditArmy,readDailySnapshot,supplyConnection} from './strategic-campaign.mjs';
import {FACTIONS,TROOPS} from './engine.mjs';
import {BATTLE_TERRAINS} from './battlefield.mjs';
import {strategicArtMap} from './art-strategic-map.mjs';
import {projectCost,reliefAmount,governorSkillList} from './strategic-campaign.mjs';
import {passiveList,PASSIVES} from './passives.mjs';
import {DIRECTIONS,BUILDINGS,ACTIONS,TECHS,actionName,assignmentFor,cityMilitary,siegeOpening,canTrain} from './domestic.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';


const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const button=(action,label,disabled=false,extra='')=>`<button class="button secondary" data-action="${action}" ${disabled?'disabled':''} ${extra}>${label}</button>`;
export function campaignBattleBar(s){const d=calendar(s),r=s.campaign.battles.find(r=>r.id===s.campaign.focusId);return `<div id="campaign-battle-bar" class="campaign-battle-bar"><span><b>${campaignDate(s)}</b>　交战第 ${d.day-(r?.startedDay||d.day)+1} 天 / ${CAMPAIGN.maxBattleDays} 天</span><div>${button('campaign-day','推进本日')}${button('campaign-map','交还委托')}</div></div>`;}
export function strategicView(s,ui){
  s=intelligenceWorld(s);
  const d=calendar(s),planning=isPlanning(s),a=s.armies.find(a=>a.id===ui.army)||s.armies.find(a=>a.faction===playerFaction(s)),selected=s.cities.find(c=>c.id===ui.city)||s.cities.find(c=>c.owner===playerFaction(s))||s.cities[0];
  const live=activeBattles(s),pending=live.filter(r=>r.awaiting||r.battle.reinforcementCouncil==='pending'),tabs=ui.strategyTab==='node'?{node:'节点'}:ui.strategyTab==='battle'?{battle:'战场'}:ui.strategyTab==='army'?{army:'军团'}:{city:'据点',officers:'人事'};
  const tab=ui.strategyTab||'city';
  return `<main class="campaign strategy-page strategy-map-first ${ui.paused?'map-paused':''} ${ui.mapPanelOpen?'panel-open':''} ${ui.mapDirectoryOpen?'directory-open':''}">${strategicHUD(s,ui)}
  ${s.cities.some(c=>c.owner===playerFaction(s)&&c.budget.warning)?`<aside class="city-budget-alerts" role="alert"><b>城市钱粮不足</b>${s.cities.filter(c=>c.owner===playerFaction(s)&&c.budget.warning).map(c=>`<button data-action="domestic-alert-city" data-town="${c.id}">${esc(c.name)} · ${c.budget.warning.includes("gold")?"金不足":""}${c.budget.warning.includes("grain")?" 粮不足":""}</button>`).join("")}</aside>`:""}
  ${pending.map(r=>`<section class="encounter-callout"><div><b>${esc(r.name)}</b></div><div>${siegeDefenseOptionsMarkup(s,r)}${button(r.battle.reinforcementCouncil?'campaign-focus':'campaign-prepare',r.battle.reinforcementCouncil?'部署':'开战',false,`data-battle="${r.id}"`)}${r.battle.reinforcementCouncil?button('reinforcement-continue','继续作战',false,`data-battle="${r.id}"`):''}</div></section>`).join('')}
  <div class="strategy-layout">${mapQuickDirectory(s,ui)}<section class="strategy-map-panel"><div class="strategy-map-caption"><b>${s.campaign.scenarioId?'当前操作区域':'中原战区'}</b><span><i class="legend-own"></i>己方　<i class="legend-enemy"></i>敌军　<span class="supply-key">实线：道路 · 虚线：横向小路 · 蓝线：粮道</span></span></div>${map(s,ui,a)}<div class="strategy-map-caption"><b>${s.armies.filter(a=>a.route.length&&!armyBattle(s,a.id)).length} 支军团行军中</b></div></section>
  <aside class="strategy-panel"><button class="map-panel-close" data-action="map-panel-toggle">收起</button><nav class="strategy-tabs">${Object.entries(tabs).map(([key,label])=>`<button data-action="campaign-tab" data-tab="${key}" class="${tab===key?'active':''}">${label}</button>`).join('')}</nav>${tab==='node'?nodePanel(s,mapNode(s,ui.city)):tab==='city'?cityPanel(s,selected,ui):tab==='army'?armyPanel(s,a):tab==='officers'?officerPanel(s,selected):battlesPanel({...s,campaign:{...s.campaign,battles:s.campaign.battles.filter(r=>r.id===ui.directoryBattle),archive:[]}},planning)}</aside></div>
  ${pendingDomesticProposals(s).length?'<aside class="city-budget-alerts"><button data-action="domestic-proposals">待处理 '+pendingDomesticProposals(s).length+'</button></aside>':''}${mapObjectMenu(s,ui.mapObject)}</main>`;
}
export function campaignJournalMarkup(s,requested='all'){
 s=intelligenceWorld(s);
 const tabs={all:'全部',domestic:'内政',personnel:'人员',battle:'战事',orders:'命令'},tab=Object.hasOwn(tabs,requested)?requested:'all';
 const date=entry=>campaignDate(s,entry.day?{day:entry.day}:{turn:entry.turn,period:true});
 const row=(date,text)=>`<article class="campaign-journal-row"><time>${esc(date)}</time><p>${text.replace(/^第\s*\d+\s*(?:旬|天)[\s·：:]*/u,'')}</p></article>`;
 let body='';
 if(tab==='all')body=s.logs.map(e=>row(date(e),esc(e.text))).join('');
 if(tab==='domestic'){
  body=s.campaign.domestic.events.filter(e=>e.faction===playerFaction(s)).slice(0,80).map(e=>{const city=mapNode(s,e.cityId)?.name;return row(date(e),`${city&&!e.text.includes(city)?`<b>${esc(city)}</b> · `:''}${esc(e.text)}`);}).join('');
  const report=s.campaign.turnReports[0];
  if(report)body+=`<details class="strategy-ledger"><summary>${campaignDate(s,{turn:report.turn,period:true})}收支</summary>${report.items.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`;
 }
 if(tab==='personnel')body=s.campaign.domestic.people.filter(p=>p.fate&&p.status==='CAPTIVE'&&(p.fate.originalFaction===playerFaction(s)||p.fate.captor===playerFaction(s))).map(p=>row(campaignDate(s,{day:p.fate.day}),`${infoLink('officer',p.id,p.unit.name)} · ${p.custody?'押送途中':'被俘'} · ${esc(FACTIONS[p.fate.captor].name)}`)).join('')+s.campaign.personnelEvents.slice(0,80).map(e=>row(date(e),esc(e.text))).join('');
 if(tab==='orders')body=pendingOrdersMarkup(s);
 if(tab==='battle')body=battlesPanel(s,isPlanning(s))+strategicAIMarkup(s);
 return `<section class="campaign-journal"><nav class="info-tabs" aria-label="日志分类">${Object.entries(tabs).map(([key,label])=>`<button class="button ${tab===key?'primary':'secondary'}" data-action="journal-tab" data-tab="${key}" aria-pressed="${tab===key}">${label}</button>`).join('')}</nav><div class="campaign-journal-content" data-journal-tab="${tab}">${body||'<p class="muted">暂无记录</p>'}</div></section>`;
}
export function strategicAIMarkup(s){
 if(visionEnabled(s))return '';
 if(!s.campaign.ai)return '';
 const phase={prepare:'筹备',assemble:'集结',attack:'出征交战',consolidate:'巩固守备',complete:'已完成',cancelled:'已取消'},ai=s.campaign.ai;
 const profiles=Object.keys(ai.factions).map(f=>{const p=factionStrategicProfile(s,f);return `<p><b>${esc(FACTIONS[f]?.name)} · ${esc(p.name)}</b><br><small>${{bold:'偏重扩张与军备',balanced:'兼顾扩张与发展',cautious:'偏重守备与发展'}[p.style]} · 军事研判${p.judgment>=80?'细致':p.judgment>=60?'稳健':'粗略'}</small></p>`;}).join('');
 const plans=ai.plans.filter(p=>!['complete','cancelled'].includes(p.phase)).map(p=>`<p><b>${esc(FACTIONS[p.faction]?.name)} · ${phase[p.phase]}</b> ${esc(s.cities.find(c=>c.id===p.staging)?.name)} → ${esc(s.cities.find(c=>c.id===p.target)?.name)}<br><small>${p.officerIds.length} 支部队 · ${esc(p.reason)}</small></p>`).join('');
 const recent=ai.decisions.slice(0,12).map(d=>`<p><small>${campaignDate(s,{day:d.day})} · ${esc(FACTIONS[d.faction]?.name)} · ${esc(d.name)}</small> ${esc(d.reason)}${d.target?' · '+esc(s.cities.find(c=>c.id===d.target)?.name):''}</p>`).join('');
 return `<details class="strategy-ledger faction-plans"><summary>诸侯动向 · 势力计划与调度</summary>${profiles}${plans}${recent||'<p>暂无动向</p>'}</details>`;
}
export const commandMap=(s,ui,a)=>map(intelligenceWorld(s),ui,a);
function map(s,ui,a){
  const artwork=strategicArtMap(s,ui,a);if(artwork)return artwork;
  const byId=id=>mapNode(s,id),selected=ui.city,line=a?supplyConnection(s,a):null;
  const legs=line?line.path.slice(1).map((id,i)=>[byId(line.path[i]),byId(id)]):[];
  if(line&&a.travel)legs.push([byId(a.location),armyPosition(s,a)]);
  return `<svg class="strategy-world" viewBox="100 25 820 760" aria-label="中原军团与粮道地图"><defs><pattern id="strategy-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#899b85" stroke-opacity=".055"/></pattern></defs><rect x="100" y="25" width="820" height="760" fill="url(#strategy-grid)"/><path d="M150 175 Q280 130 400 220 T780 210 Q800 255 900 300" class="strategy-river"/><text x="610" y="208" class="river-label">黄 河</text><path d="M170 100l40-40 40 40m-30 0 45-60 45 60M150 410l35-50 35 50m-10 0 40-65 40 65" class="strategy-mountains"/>
  ${renderRoads(s)}
  ${renderMarchRoute(s,a)}
  ${renderSupplyRoute(s,a,line)}
  ${s.cities.map(c=>`<g data-city="${c.id}" tabindex="0" role="button" aria-label="${c.name}，${FACTIONS[c.owner].name}" class="strategy-city ${c.owner} ${selected===c.id?'selected':''}" transform="translate(${c.x} ${c.y})">${citySoldierLabel(s,c,-36)}<circle r="27"/><path d="M-14 11V-5h5v-9h5v7h8v-7h5v9h5v16Z"/><text y="48">${c.name}</text><text class="city-stock" y="64">粮 ${fmt(c.grain)}</text></g>`).join('')}
  ${armyMapMarkers(s,ui)}
  ${battleMapMarkers(s)}${fogMarkup(s)}</svg>`;
}
function metropolitanMarkup(s,c){
 const center=metropolitanCenter(s,c),members=metropolitanMembers(s,c);
 if(center.citySize!=='large')return '';
 return `<details class="metropolitan-summary"><summary>都市圈</summary><div class="metropolitan-members">${members.map(n=>`<button data-action="map-city-inspect" data-town="${esc(n.id)}">${esc(n.name)}<small>${metropolitanSiteName(n,center)}${constructionSiteAvailable(s,center,n.id)?'':' · 暂不可建设'}</small></button>`).join('')}</div></details>`;
}
function domesticDirections(s,c,officers,editable){
 return `<div class="domestic-directions">${Object.entries(DIRECTIONS).map(([direction,name])=>{
  const slots=domesticStaffing(s,c.id,direction),assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction),record=s.campaign.domestic.cooperation[c.id+':'+direction];
  return `<article class="domestic-direction" data-direction="${direction}"><h3>${name} · ${DOMESTIC_STAT_LABELS[DIRECTION_STATS[direction]]}<small class="duty-badge ${assignments.length?'staffed':'vacant'}">${assignments.length} / ${slots.limit} 人${slots.reserved?' · 待任'+slots.reserved+'人':''}</small></h3>
   ${assignments.map(a=>{const x=a.action,u=officers.find(o=>o.unit.id===a.officerId)?.unit;return `<div class="domestic-assignee" data-domestic-officer="${a.officerId}"><div class="domestic-assignee-heading"><button class="personnel-name" data-action="campaign-person-detail" data-officer="${a.officerId}">${esc(u?.name||OFFICER_BY_ID[a.officerId].name)} ↗</button>${button('domestic-dismiss','解除',!editable,`data-officer="${a.officerId}" aria-label="解除${esc(u?.name||OFFICER_BY_ID[a.officerId].name)}的${name}委任"`)}</div>${x?`${detailLink('事务说明',[{name:actionName(c,x.key),rows:[['办理人','',u?.name||OFFICER_BY_ID[a.officerId].name],['事务','',actionName(c,x.key)],['地点','',buildingSiteName(s,x.siteId||c.id)],['目标','',TECHS[x.targetId]?.name||OFFICER_BY_ID[x.targetId]?.name||c.name],['剩余时间','',Number(x.remaining.toFixed(2))+' 天'],['已付费用','',x.cost+' 金'],['成功率','',domesticConfidence(effectiveDomesticChance(s,a))],['进度','',x.paused?'暂停':'办理中']]}],actionName(c,x.key))}<span>${esc(buildingSiteName(s,x.siteId||c.id))} · 剩余${Number(x.remaining.toFixed(2))}天 · 已付${x.cost}金 · 成功率：${domesticConfidence(effectiveDomesticChance(s,a))}${x.paused?' · 暂停':''}</span>${incidentWorkMarkup(s,a)}${x.traitIds.length?`<small>事务特性：${x.traitIds.map(id=>abilityButton('trait',id,PASSIVES[id].name)).join(' ')}</small>`:''}`:`<p>${esc(a.waiting)}</p>`}</div>`;}).join('')}
   ${domesticReference(direction)}${button('campaign-pick','委任武将',!editable||!slots.remaining,`data-task="domestic" data-town="${c.id}" data-direction="${direction}"`)}
   ${record?detailLink('协作记录',[{name:name,rows:[['时间','',campaignDate(s,{turn:record.turn,period:true})],['武将','',OFFICER_BY_ID[record.officerId].name+' · '+OFFICER_BY_ID[record.helperId].name],['事务','',actionName(c,record.actionKey)],['机会','',Math.round(record.chance*100)+'%'],['成果','',!record.success?'未触发':record.actual>0?(record.mode==='chance'?'成功率':record.mode==='progress'?'施工进度（天）':'行动成果')+' +'+Number(record.actual.toFixed(3))+(record.mode==='chance'?'个百分点':''):'无额外成果'],['关系','',String(record.relationGain||0)]]}],'协作记录'):''}<small>${Object.entries(BUILDINGS).filter(([,b])=>b.direction===direction).map(([key,b])=>buildingReference(c,key)).join(' · ')}</small></article>`;
 }).join('')}</div>`;
}
export function cityDomesticMarkup(s,id,ui={}){
 const c=s.cities.find(c=>c.id===id);if(!c)return '<p>据点已不存在。</p>';
 const own=isPlayerControlled(s,c.owner),expansion=domesticStaffingBonuses(c);
 return `<section class="domestic-workbench"><header><h3>${esc(c.name)} · 内政</h3><p>本城金 ${fmt(c.gold)} · 本城粮草 ${fmt(c.grain)} · 预备兵 ${fmt(c.manpower)}</p><p data-domestic-capacity>每方向上限 ${domesticStaffingLimit(c)} 人 · ${detailLink('扩容规则',[{name:'内政岗位',rows:[['初始名额','',STAFFING_RULES.base+'人／方向'],['建设扩容','',`开局设施基础上每增加${STAFFING_RULES.buildingLevelsPerSlot}级已建设施，各方向增加1人，最多增加${STAFFING_RULES.constructionBonusMaximum}人；已解锁 +${expansion.construction}人`],['技术扩容','',`每完成${STAFFING_RULES.technologiesPerSlot}项科技，各方向增加1人，最多增加${STAFFING_RULES.technologyBonusMaximum}人；已解锁 +${expansion.technology}人`],['最大名额','',STAFFING_RULES.maximum+'人／方向；已解锁名额永久保留，待执行改任预留目标岗位']]}],'扩容规则')}</p>${cityIncidentMarkup(s,c)}${own?infoLink('city',c.id,'收支预算','收支预算'):''}</header>${own?domesticApprovalMarkup(s,{cityId:c.id}):''}${metropolitanMarkup(s,c)}${staffSummaryMarkup(s,c)}${domesticDirections(s,c,cityPersonnel(s,c.id),own&&isPlanning(s))}</section>`;
}
function cityPanel(s,c,ui){
  if(!cityVisible(s,c.id))return '<div class="strategy-panel-body"><h2>'+esc(c.name)+'</h2>'+campaignInfoSections(campaignInfoDetail(s,'city',c.id))+'</div>';
  const own=isPlayerControlled(s,c.owner),editable=isPlanning(s)&&own,officers=cityPersonnel(s,c.id);
  const military=cityMilitary(s,c),opening=siegeOpening(c,s.campaign.day);
  return `<div class="strategy-panel-body"><div class="panel-title"><span class="eyebrow">${FACTIONS[c.owner].name} · ${c.province}</span><h2>${c.name}</h2>${infoLink('city',c.id,'详情')}</div><div class="strategy-stats"><span>本城金<b>${fmt(c.gold)}</b></span><span>存粮<b>${fmt(c.grain)} / ${fmt(grainCapacity(c))}</b></span><span>预备兵<b>${fmt(c.manpower)}</b><small>已预留 ${fmt(c.domestic.reserved)}</small></span><span>城内士兵<b>${fmt(military.troops)}</b><small>${military.units}支部队</small></span><span>城内伤兵<b>${fmt(military.wounded)}</b></span><span>城门耐久<b>${fmt(gateDurability(c).hp)} / ${fmt(gateDurability(c).maxHp)}</b></span><span>守城首发<b>战意 +${Math.floor(opening.intent)} · 护盾 ${Math.round(opening.shield*100)}%</b></span></div>${own?infoLink('city',c.id,'收支预算','收支预算'):''}
  ${own?`<details class="city-affairs" data-city-disclosure="${c.id}:offices" ${ui.cityDisclosures?.[c.id+':offices']?'open':''}><summary>太守</summary><div class="governor-slot"><div><small>太守</small><b>${esc(OFFICER_BY_ID[c.governor]?.name||'未任命')}</b></div>${button('campaign-pick','任命',!editable,`data-task="governor" data-town="${c.id}"`)}${c.governor?button('campaign-clear-governor','解除',!editable,`data-town="${c.id}"`):''}</div>
  ${domesticReference()}${governorSkillList(s,c).map(p=>abilityButton('trait',p.id,p.name)).join('')}

  </details><details class="city-affairs" data-city-disclosure="${c.id}:affairs" ${ui.cityDisclosures?.[c.id+':affairs']?'open':''}><summary>内政</summary>${domesticDirections(s,c,officers,editable)}</details>
  <details class="city-affairs"><summary>驻城部队 · ${c.units.length} 队</summary><div class="strategy-officers">${c.units.map(u=>`<div><button class="personnel-name" data-action="campaign-person-detail" data-officer="${u.id}">${esc(u.name)} ↗</button><span>${TROOPS[u.type].name} · ${fmt(u.troops)} 人</span></div>`).join('')||'<p>尚未编制部队。</p>'}</div></details><details class="city-affairs" data-city-disclosure="${c.id}:technology" ${ui.cityDisclosures?.[c.id+':technology']?'open':''}><summary>城市科技</summary>${technologyMarkup(s,c)}</details>
  ${metropolitanMarkup(s,c)}<details class="domestic-facilities"><summary>设施</summary>
  ${c.project?`<div class="project-progress"><b>${c.project.mode==='repair'?'修复'+DURABLE_BUILDINGS[c.project.key].name:PROJECTS[c.project.key].name}</b><span>${esc(buildingSiteName(s,c.project.siteId||c.id))} · ${fmt(buildingDurability(c,c.project.key,c.project.siteId).hp)} / ${fmt(buildingDurability(c,c.project.key,c.project.siteId).maxHp)} · ${c.project.mode==='repair'?'修复中':'施工中'}</span></div>`:'<p class="strategy-muted">暂无在建工程</p>'}
  <div class="project-list">${Object.entries(PROJECTS).map(([key,p])=>`<article><div><b>${p.name} <small>Lv.${c[p.field]}</small></b><small>${buildingLocations(s,c,p.field).map(n=>esc(n.name)+' '+n.level+'级 · '+fmt(buildingDurability(c,p.field,n.id).hp)+' / '+fmt(buildingDurability(c,p.field,n.id).maxHp)).join(' · ')||'未建'}</small>${buildingReference(c,key)}</div></article>`).join('')}</div>
  </details>`:''}</div>`;
}
export function factionAffairsMarkup(s,tab='domestic'){
 if(tab==='diplomacy')return '<section class="faction-affairs">'+diplomacyMarkup(s)+'</section>';
 const editable=isPlanning(s)&&!s.finished&&!s.campaign.allAI;
 return `<section class="faction-affairs"><h3>内政</h3>${domesticApprovalMarkup(s)}<div class="faction-priorities">${domesticPriority(s).map((d,i)=>`<div><b>${i+1} · ${DIRECTIONS[d]}</b>${button('faction-priority-up','上移',!editable||i===0,`data-direction="${d}"`)}</div>`).join('')}</div>${button('faction-appoint','统一委任',!editable)}</section>`;
}
function armyPanel(s,a){
  if(!a)return '<div class="strategy-panel-body">暂无出征军团</div>';
  const own=isPlayerControlled(s,a.faction),can=canEditArmy(s,a),r=armyBattle(s,a.id),need=dailyConsumption(s,a),connection=supplyConnection(s,a),byId=id=>mapNode(s,id),location=a.travel?`${byId(a.travel.from).name} → ${byId(a.travel.to).name}`:byId(a.location).name;
  return `<div class="strategy-panel-body"><h2>${esc(a.name)}</h2>${infoLink('army',a.id,'查看军团详情')}<p>${location} · ${armyWaitingOrder(s,a.id)?'等待内政完成后出发':r?'正在交战':a.task}</p><div class="strategy-stats"><span>编制<b>${a.units.filter(u=>u.troops>0).length} 队</b><small>待整编 ${a.units.filter(u=>u.troops===0).length} 人</small></span><span>现役兵力<b>${fmt(liveSoldiers(s,a))}</b></span><span>${{normal:'常行',light:'轻装',forced:'急行'}[a.marchMode||'normal']}行动力<b>${armyActionPoints(a).toFixed(1)} 点</b></span><span>每日耗粮<b>${need.toFixed(1)}</b></span><span>携粮<b>${fmt(a.supply)} / ${fmt(a.supplyCapacity)}</b></span><span>脱离补给可维持<b>${need?(a.supply/need).toFixed(1):'—'} 天</b></span></div>
  <div class="supply-status ${a.hunger?'danger':''}"><b>${connection?`粮道连接 · ${byId(connection.source).name}`:'粮道未连接'}</b><span>昨日运入 ${fmt(a.supplyIn)} · 缺粮程度 ${a.hunger.toFixed(1)} 天</span><small>${a.hunger?'缺粮累计五天后部队解散':''}</small></div>
  ${a.route.length?`<p class="march-road-summary">${a.route.map((to,i)=>{const from=i?a.route[i-1]:a.location,road=i===0&&a.travel?(a.travel.road||'main'):a.roadPolicy;const cost=roadCost(s,from,to,road);return `${byId(from).name} → ${byId(to).name}：${campaignRoads(s,from,to).find(r=>r.cost===cost)?.name} ${cost} 点`;}).join('；')}</p>`:''}

  <p>视野半径 ${armyVisionRadius(a).toLocaleString('zh-CN',{maximumFractionDigits:2})}</p>
  ${own?`<div class="strategy-actions">${button('campaign-order','调动军团',!isPlanning(s)||!!r)}${marchModes(a).length>1?button('march-mode-open','行军方式',!isPlanning(s)||!!r):''}${button('army','调整编制',!can)}${isJunction(s,a.location)?'':button('recruit','征募整补',!can)}</div>${r?button('campaign-focus','战场',isPlanning(s),`data-battle="${r.id}"`):''}`:''}
  ${s.campaign.ai?.decisions.find(d=>d.armyId===a.id)?`<p class="strategy-muted"><b>军团方略</b> · ${esc(s.campaign.ai.decisions.find(d=>d.armyId===a.id).reason)}</p>`:''}
  <div class="strategy-officers">${a.units.map(u=>`<div><span>${u.name}<small>${u.troops>0?TROOPS[u.type].name:'随军待整编 · 暂不参战'} · 归属 ${byId(u.homeCity)?.name||'—'}</small></span><b>${fmt(u.troops)}<small>伤兵 ${fmt(u.wounded)}</small></b></div>`).join('')}</div></div>`;
}
function officerPanel(s,c){
 const own=isPlayerControlled(s,c.owner),local=own?campaignOfficers(s).filter(r=>r.location===c.id):campaignInfoIndex(s).officer.filter(r=>r.city===c.id&&!r.personFate).map(r=>({...r,status:r.army?'驻军':'驻城',duty:'—'})),editable=isPlanning(s)&&own;
 return `<div class="strategy-panel-body"><div class="panel-title"><span class="eyebrow">本据点 ${local.length} 人</span><h2>${esc(c.name)} · 人事</h2></div><div class="strategy-actions">${own?button('campaign-city-personnel','武将',false,`data-town="${c.id}"`):infoLink('city',c.id,'驻城武将')}</div>${own?`<div class="personnel-task-grid">${button('campaign-pick','守城编制',!editable,`data-task="draft" data-town="${c.id}"`)}${button('campaign-pick','调任',!editable,`data-task="transfer" data-town="${c.id}"`)}</div>`:''}<div class="strategy-officers">${local.map(r=>`<div>${own?`<button class="personnel-name" data-action="campaign-person-detail" data-officer="${r.unit.id}">${esc(r.unit.name)} ↗</button>`:infoLink('officer',r.unit.id,r.unit.name)}<span>${r.status}<small>${esc(r.duty)}</small></span></div>`).join('')||'<p>本据点暂无武将。</p>'}</div></div>`;
}
export const campaignBattleName=r=>r.name.replace(/(?:之战|攻守战|港口战|关卡战|遭遇战|战)$/u,'')+'之战';
export const campaignBattleDate=(s,day)=>campaignDate(s,{day});
export function battlesPanel(s,planning){
 s=intelligenceWorld(s);
 const records=[...s.campaign.battles].sort((a,b)=>Number(a.settled)-Number(b.settled)||b.startedDay-a.startedDay);
 const dates=r=>esc(campaignBattleDate(s,r.startedDay))+(r.settled||r.endedDay?'<small class="campaign-ended">结束：'+esc(campaignBattleDate(s,r.endedDay))+'</small>':'');
 const row=r=>`<tr><td>${esc(campaignBattleName(r))}</td><td>${r.settled?'已结束':r.awaiting||r.battle.reinforcementCouncil?'尚未开战':r.control==='manual'?'亲自指挥':'委托交战'}</td><td>${r.battle.sides.map(x=>esc(FACTIONS[x.faction].name)+'<br>'+fmt(x.units.reduce((n,u)=>n+u.hp,0))+' 人').join('<hr>')}</td><td>${dates(r)}</td><td>${r.settled?esc(r.report.reason):'进行中'}</td><td>${button(r.settled?'campaign-replay':s.campaign.allAI?'campaign-history':'campaign-focus','进入',false,`data-battle="${r.id}"`)}</td></tr>`;
 return `<div class="strategy-panel-body"><div class="battle-table-wrap"><table class="battle-overview"><thead><tr><th>战役</th><th>状态</th><th>交战双方</th><th>发生时间</th><th>战果</th><th>操作</th></tr></thead><tbody>${records.map(row).join('')||'<tr><td colspan="6">暂无战役</td></tr>'}${(s.campaign.archive||[]).map(r=>`<tr><td>${esc(campaignBattleName(r))}</td><td>已归档</td><td>—</td><td>${dates(r)}</td><td>${esc(r.reason)}</td><td>${button('campaign-archive','进入',false,`data-battle="${r.id}"`)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
export function replayMarkup(s,r,index,playing){
 const frames=replayFrames(r),frame=replayFrame(r,index);if(!frame)return '<p>暂无回放记录。</p>';
 return `<p>${campaignDate(s,{day:frame.day})}${frame.final?' · 最终战果':' · 日初状态'}</p><div class="replay-controls">${button('replay-prev','上一日',index<=0)}${button('replay-toggle',playing?'暂停':'播放',index>=frames.length-1)}${button('replay-next','下一日',index>=frames.length-1)}${button('replay-reset','重播')}<label>进度 <input id="campaign-replay-frame" type="range" min="0" max="${frames.length-1}" value="${index}"></label></div>${snapshotMarkup(s,r,frame.day,{},frame.battle)}`;
}
export function snapshotMarkup(s,r,requestedDay,sorting={},replayBattle=null){
  const day=r.snapshots.some(x=>x.day===Number(requestedDay))?Number(requestedDay):r.snapshots.at(-1).day,b=replayBattle||readDailySnapshot(r,day);
  return `${replayBattle?'':`<p>${campaignDate(s,{day})}${r.settled?' · 已结束':''}</p><label class="strategy-field">选择日期<select id="campaign-snapshot-day">${r.snapshots.map(x=>`<option value="${x.day}" ${x.day===day?'selected':''}>${campaignDate(s,{day:x.day})}</option>`).join('')}</select></label>`}<div class="snapshot-board">${b.sides.flatMap(x=>x.units).filter(u=>u.status==='active').map(u=>`<span class="side-${u.side}" style="grid-column:${u.x+1};grid-row:${u.y+1}" title="${esc(u.name)}，${u.hp}人">${esc(u.name)}<small>${fmt(u.hp)}</small></span>`).join('')}</div><div class="snapshot-tables">${b.sides.map(side=>`<section><h3>${FACTIONS[side.faction].name}</h3><table><thead><tr>${[['name','部队'],['hp','余兵'],['intent','战意'],['status','状态']].map(([k,n])=>sortHeader('snapshot',k,n,sorting.sort,sorting.direction)).join('')}</tr></thead><tbody>${(sorting.sort?sortRows(side.units,sorting.sort,sorting.direction,(u,k)=>k==='status'?({active:'在场',reserve:'预备',defeated:'溃败',withdrawn:'撤离'})[u.status]:u[k]):side.units).map(u=>`<tr><td>${esc(u.name)}</td><td>${fmt(u.hp)}</td><td>${u.intent}</td><td>${({active:'在场',reserve:'预备',defeated:'溃败',withdrawn:'撤离'})[u.status]}</td></tr>`).join('')}</tbody></table></section>`).join('')}</div>${r.report?`<h3>最终战果 · ${r.report.reason}</h3>${battleAppointmentsMarkup(r.report.appointments,r.armies)}${(r.report.growth||[]).map(g=>`<p><b>${esc(g.name)}</b> · 功绩 ${g.gained>=0?'+':'−'}${Math.abs(g.gained)} · ${g.after!==g.before?`${g.before} → ${g.after}级`:`${g.after}级`}<br><small>${esc(contributionText(g.contribution))} · 奖励 ${g.award}，扣罚 ${g.penalty||0}${g.unlocked.length?` · 习得：${g.unlocked.map(esc).join("、")}`:""}</small></p>`).join('')}${r.report.stats.map(x=>`<p>${FACTIONS[x.faction].name}：余兵 ${fmt(x.remaining)}，伤兵 ${fmt(x.wounded)}，阵亡 ${fmt(x.killed)}，逃散 ${fmt(x.escaped)}</p>`).join('')}`:''}<div class="battle-logs">${b.logs.slice(0,8).map(x=>`<p>${esc(x.text)}</p>`).join('')}</div>`;
}

function nodePanel(s,n){
 if(!n)return '<p>请选择节点。</p>';
 const armies=s.armies.filter(a=>!a.disbanded&&!a.travel&&a.location===n.id),terrain=n.kind==='port'?'水陆战场':n.kind==='gate'?'高地战场':'野外战场';
 const center=metropolitanCenter(s,n),metropolitan=['junction','gate','port'].includes(n.kind)&&center.citySize==='large';
 return `<div class="strategy-panel-body"><h2>${esc(n.name)}</h2><p>${nodeKindName(n)} · ${terrain}</p>${metropolitan?`<p>${esc(center.name)}都市圈</p>${button('map-city-inspect','查看建设',false,`data-town="${esc(n.id)}"`)}${center.owner===playerFaction(s)?button('city-domestic','内政',false,`data-town="${esc(center.id)}"`):''}`:''}<h3>驻守军团</h3>${armies.length?armies.map(a=>`<p>${infoLink('army',a.id,a.name)} · ${FACTIONS[a.faction].name} · ${fmt(liveSoldiers(s,a))} 人</p>`).join(''):'<p>无驻军</p>'}</div>`;
}
