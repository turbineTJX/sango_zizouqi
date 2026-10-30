import {domesticStaffing,domesticAssignmentError} from './domestic-staffing.mjs';
import {mapTargetField,targetMapMarkup} from './map-target-picker.mjs';
import {emptyEquipment,equipmentCost} from './troop-equipment.mjs';
import {armySupplyCapacity} from './army-supply.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {hasStrategicTrait} from './strategic-traits.mjs';
import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {trainingCost} from './troop-training.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {allocateUnitTroops,troopAllocationLimit} from './troop-allocation.mjs';
import {armyDetailsMarkup} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {unitManagementMarkup,unitCommanderField,unitFormationMarkup,unitReviewMarkup,commanderSetupMarkup} from './army-setup-view.mjs';
import {combatComparison,expeditionSelectionMarkup} from './combat-comparison.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {missionUnits} from './officer-missions.mjs';
import {personnelRouteDays} from './personnel-movement.mjs';
import {campaignOfficers,campaignRosterMarkup,pickerReason,pickerTitle} from './strategic-roster.mjs';
import {siegeDefenseCandidates} from './siege-defense.mjs';
import {DIRECTIONS,canTrain,reservedMen} from './domestic.mjs';
import {TROOPS} from './engine.mjs';
import {disbandCityUnits,prepareDepartureUnits,prepareSiegeUnits,findCampaignRoute,dailyConsumption,transferOfficer} from './strategic-campaign.mjs';
import {marchItinerary,remainingMarchDays,roadCost,validMapRoute} from './strategic-movement.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {routeThrough,editRouteWaypoint} from './map-route-editor.mjs';
import {decisionFacts,decisionDetails} from './decision-summary-view.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const town=mapNode;
const preparedCommandUnit=(s,p,id)=>town(s,p.city)?.units.find(u=>u.id===id)||(p.task==='defense'?siegeDefenseCandidates(s,p.city).find(o=>o.army?.defense&&o.unit.id===id)?.unit:null);
const button=(action,label,extra='')=>`<button class="button secondary" data-action="${action}" ${extra}>${label}</button>`;
export const commandSteps=p=>p.task==='expedition'?['formation','unit-review','unit-select','commanders','target','review']:p.task==='march'?['target','review']:p.task==='domestic'?['direction','officers']:p.task==='governor'?['officers']:p.task==='transfer'?['officers','target','review']:['draft','defense'].includes(p.task)?['formation','unit-review','review']:['officers','review'];
const labels={'unit-select':'选择部队',commanders:'编组军团',armies:'选择军团',direction:'选择事务',officers:'选择武将',formation:'编制部队','unit-review':'部队管理',target:'选择终点',review:'确认下令'};
export const commandTitle=p=>p.task==='expedition'?'编组出征':p.task==='march'?'调动军团':p.task==='domestic'?'内政委任':pickerTitle(p);
export function newCommand(s,task,city,{direction,armyId}={}){
 return {task,city,direction,armyId,step:task==='expedition'&&town(s,city)?.units.some(u=>!u.mission&&u.troops>0)?'unit-select':['draft','defense','expedition'].includes(task)?'unit-review':task==='march'?(armyId?'target':'armies'):task==='domestic'&&!direction?'direction':'officers',selected:[],leader:null,advisor:null,types:{},equipment:{},troops:{},cargo:{gold:0,grain:0,manpower:0},reinforce:false,destination:null,policy:'auto'};
}
export function resetCommandTarget(p){
 Object.assign(p,{destination:p.contextDestination||null,route:null,waypoints:[],relay:null,mapUI:null});
}
export function selectCommandOfficers(p,ids){
 const selected=[...new Set(ids)];
 if(selected.length===p.selected.length&&selected.every(id=>p.selected.includes(id)))return;
 p.selected=selected;
 for(const role of ['leader','advisor'])if(!selected.includes(p[role]))p[role]=null;
 if(['expedition','transfer'].includes(p.task))resetCommandTarget(p);
 if(p.task==='transfer'){p.cargo={gold:0,grain:0,manpower:0};p.cycles=0;}
}
export function selectCommandArmy(s,p,id){
 const a=s.armies.find(a=>a.id===id&&a.faction===playerFaction(s));
 if(!a)return '请选择己方军团';
 Object.assign(p,{armyId:a.id,city:a.location,step:'target'});resetCommandTarget(p);return null;
}
export function changeCommandUnit(s,p,id,field,value){
 const c=town(s,p.city),unit=campaignOfficers(s).find(r=>r.unit.id===id)?.unit;
 const guard=p.task==='defense'&&siegeDefenseCandidates(s,p.city).some(o=>o.army?.defense&&o.unit.id===id);
 if(!unit||!['type','troops','siege','ship'].includes(field)||p.disbandIds?.includes(id)||!c?.units.some(u=>u.id===id)&&!p.selected.includes(id)&&p.unitOfficer!==id&&!guard)return '部队不存在';
 const current=field==='type'?p.types[id]||unit.type:field==='troops'?p.troops?.[id]??unit.troops:(p.equipment?.[id]||unit.equipment||emptyEquipment())[field]||null;
 if(current===(field==='troops'?Number(value):value||null))return null;
 if(p.task==='expedition')resetCommandTarget(p);
 p.selected=[...new Set([...p.selected,id])];
 p.formationPool=[...new Set([...(p.formationPool||[]),id])];
 if(['siege','ship'].includes(field)){p.equipment??={};p.equipment[id]??=structuredClone(unit.equipment||emptyEquipment());p.equipment[id][field]=value||null;}
 else if(field==='type')p.types[id]=value;
 else (p.troops??={})[id]=Number(value);
 return null;
}
function routeItineraryMarkup(s,p,route,speed){
 if(!route)return '';
 s=intelligenceWorld(s);
 const trip=marchItinerary(s,route.from,route.route,speed,p.policy),days=trip.days+(typeof speed==='number'?0:remainingMarchDays(s,speed));
 return `<p class="route-itinerary">${Number.isFinite(days)?`预计 ${days} 天抵达（${Number((days/10).toFixed(1))} 回合）`:'当前路线无法抵达'}</p>`;
}
export function commandRoute(s,p){
 s=intelligenceWorld(s);
 const a=s.armies.find(a=>a.id===p.armyId),from=p.task==='march'?(a?.travel?.to||a?.location):p.city;
 if(!from||!p.destination)return null;
 if(p.task==='transfer'&&p.relay){if(p.relay===from||p.relay===p.destination||town(s,p.relay)?.owner!==playerFaction(s))return null;const first=findCampaignRoute(s,from,p.relay,playerFaction(s)),last=findCampaignRoute(s,p.relay,p.destination,playerFaction(s));if(!first||!last)return null;let at=from,cost=0;const route=[...first,...last];for(const id of route){cost+=roadCost(s,at,id);at=id;}return {from,route,cost};}
 const route=p.route?(validMapRoute(s,from,p.destination,p.route)?p.route:null):findCampaignRoute(s,from,p.destination,p.task==='transfer'?playerFaction(s):null,p.policy);
 if(!route)return null;
 let at=from,cost=0;for(const id of route){cost+=roadCost(s,at,id,p.policy);at=id;}
 return {route,cost,from};
}
// Build the complete proposed formation on a copy. Cancellation never spends resources.
export function prepareCommandFormation(s,p){
 if(p.task==='defense')return prepareSiegeUnits(s,p.battleId,p.selected,p.types,p.reinforce,p.troops,p.disbandIds,p.equipment);
 const next=structuredClone(s),rows=campaignOfficers(next);
 if(!p.selected.length&&!p.disbandIds?.length)return {error:'请选择武将'};
 for(const id of p.selected){const row=rows.find(r=>r.unit.id===id),error=row?pickerReason(next,row,p.task==='draft'&&row.cityUnit?{...p,task:'defense'}:p):'武将已离开';if(error)return {error};}
 if(p.task==='expedition'){const away=missionUnits(next).filter(u=>p.selected.includes(u.id)).map(u=>({u,m:u.mission}));for(const x of away)delete x.u.mission;const error=prepareDepartureUnits(next,p.city,p.selected,p.types,p.reinforce,p.troops,p.disbandIds,p.equipment);for(const x of away)x.u.mission=x.m;return error?{error}:{state:next,cityId:p.city,gold:town(s,p.city).gold-town(next,p.city).gold,grain:town(s,p.city).grain-town(next,p.city).grain,men:town(s,p.city).manpower-town(next,p.city).manpower};}
 const error=prepareDepartureUnits(next,p.city,p.selected,p.types,p.reinforce,p.troops,p.disbandIds,p.equipment);if(error)return {error};
 const c=town(next,p.city);
 return {state:next,cityId:c.id,gold:town(s,p.city).gold-town(next,p.city).gold,grain:town(s,p.city).grain-town(next,p.city).grain,men:town(s,p.city).manpower-town(next,p.city).manpower};
}
export function commandReadinessError(s,p){
 if(p.step==='direction')return DIRECTIONS[p.direction]?'':'请选择委任方向';
 if(['unit-select','officers','commanders','target'].includes(p.step)&&p.task!=='march'){
  if(!p.selected.length)return p.task==='expedition'?'请选择出征部队':'请选择武将';
  if(p.task==='expedition'&&p.selected.length>10)return `超出 ${p.selected.length-10} 队，每军团最多 10 队`;
 }
 if(p.step==='unit-select')return prepareCommandFormation(s,p).error||'';
 if(p.step==='officers'){
  if(p.task==='domestic'){const error=domesticAssignmentError(s,p.city,p.direction,p.selected);if(error)return error;}
  const rows=campaignOfficers(s);
  for(const id of p.selected){const row=rows.find(r=>r.unit.id===id);if(!row)return '所选武将已离开';const error=pickerReason(s,row,p);if(error)return `${row.unit.name}：${error}`;}
 }
 if(p.step==='commanders'||p.step==='target'&&p.task==='expedition'){
  if(!p.selected.includes(p.leader))return '请选择军团长';
  if(!p.selected.includes(p.advisor))return '请选择军师';
 }
 if(p.step==='target'){
  if(!p.destination)return '请在地图选择终点';
  if(p.task!=='march'&&p.destination===p.city)return '终点不能是派出城市';
  if(p.task==='transfer'&&town(intelligenceWorld(s),p.destination)?.owner!==playerFaction(s))return '调任终点须为己方城市';
  if(!commandRoute(s,p))return p.route?'所选中转路线不通，请重置路线':p.task==='transfer'?'没有连接终点的己方通路':'没有连接终点的可用道路';
  if(p.task==='transfer'&&!missionUnits(s).some(u=>p.selected.includes(u.id))){
   const error=transferOfficer(intelligenceWorld(s),p.selected[0],p.destination,{cargo:p.cargo,relay:p.relay,cycles:p.cycles,checkOnly:true});
   if(error==='本城可用金、粮草或预备兵不足'){
    const c=town(s,p.city),available={gold:c.gold,grain:c.grain,manpower:c.manpower-reservedMen(c)};
    return Object.entries(available).filter(([key,n])=>p.cargo[key]>n).map(([key,n])=>`${({gold:'金',grain:'粮',manpower:'预备兵'})[key]}还差 ${p.cargo[key]-n}`).join(' · ');
   }
   if(error)return error;
  }
 }
 if(p.step==='formation')return !p.unitOfficer?'请选择部队主将':prepareCommandFormation(s,{...p,selected:[...new Set([...p.selected,p.unitOfficer])]}).error||'';
 if(p.step==='unit-review')return p.task==='expedition'&&!p.selected.length?(town(s,p.city).units.some(u=>!u.mission&&!p.disbandIds?.includes(u.id))?'':'本城暂无部队，请新增编制'):prepareCommandFormation(s,p).error||'';
 return '';
}
export const commandCanAdvance=(s,p)=>!commandReadinessError(s,p);
export function commandMarkup(s,ui,mapMarkup){
 const p=ui.officerPick,steps=commandSteps(p),index=steps.indexOf(p.step),rows=campaignOfficers(p.task==='expedition'&&['commanders','target','review'].includes(p.step)?prepareCommandFormation(s,p).state||s:s),chosen=p.selected.map(id=>rows.find(r=>r.unit.id===id)).filter(Boolean),c=town(s,p.city),a=s.armies.find(a=>a.id===p.armyId);
 const preparedIds=p.task==='defense'?siegeDefenseCandidates(s,p.city).filter(o=>o.cityUnit||o.army).map(o=>o.unit.id):(c?.units||[]).filter(u=>!u.mission).map(u=>u.id);
 const missing=commandReadinessError(s,p),canAdvance=!missing,selectionStep=['unit-select','officers'].includes(p.step);
 const footerStatus=`<span class="command-selection-status" id="command-readiness" role="status">${esc(missing||(selectionStep?`已选 ${p.selected.length}${p.step==='unit-select'?' / 10 队':' 人'}`:''))}</span>`;
 let body='';
 if(p.step==='commanders')body='<h3>军团编组</h3>'+commanderSetupMarkup(s,chosen.map(r=>r.unit),p,{city:p.city});
 if(p.step==='direction')body=`<h3>为${esc(c.name)}选择委任方向</h3><div class="command-choices">${Object.entries(DIRECTIONS).map(([id,name])=>{const slots=domesticStaffing(s,p.city,id),people=s.campaign.domestic.assignments.filter(x=>x.cityId===p.city&&x.direction===id);return button('campaign-command-direction',`<b>${name} · ${slots.used} / ${slots.limit} 人</b><small>${DOMESTIC_STAT_LABELS[DIRECTION_STATS[id]]}＋适用特性</small><small>${people.length?people.map(x=>rows.find(r=>r.unit.id===x.officerId)?.unit.name).join('、'):'尚无负责人'}</small>`,`data-direction="${id}"`);}).join('')}</div>`;
 if(p.step==='officers')body=campaignRosterMarkup(s,ui,p);
 if(p.step==='target'){
  const route=commandRoute(s,p),observed=intelligenceWorld(s),eligible=(p.task==='transfer'?observed.cities:mapNodes(observed)).filter(x=>p.task!=='transfer'||x.owner===playerFaction(s)),destination=town(observed,p.destination);
  body=`<div class="command-target-layout"><div class="command-map">${targetMapMarkup(mapMarkup,eligible.filter(x=>p.task==='march'||x.id!==p.city).map(x=>x.id),p.destination)}</div><aside><h3>${esc(c?.name)} → ${esc(destination?.name||'选择终点')}</h3><p>${chosen.length} 名武将</p>${p.destination&&!route?'<p role="alert">目的地不可达</p>':''}</aside></div>`;
 }
 if(p.step==='unit-select'){const prepared=prepareCommandFormation(s,{...p,selected:p.formationPool||p.selected}),poolRows=campaignOfficers(prepared.state||s);const ids=[...new Set([...(p.formationPool||[]),...c.units.filter(u=>!u.mission).map(u=>u.id)])].filter(id=>!p.disbandIds?.includes(id));const candidates=rankOfficerCandidates(prepared.state||s,ids.map(id=>poolRows.find(r=>r.unit.id===id)?.unit).filter(Boolean),{task:'expedition',city:c.id}).map(x=>x.unit);body=expeditionSelectionMarkup(s,candidates.filter(u=>p.selected.includes(u.id)),candidates,new Map(poolRows.map(row=>[row.unit.id,pickerReason(prepared.state||s,row,p)])));}
 if(p.step==='formation')body=unitCommanderField(rows.find(r=>r.unit.id===p.unitOfficer)?.unit,'campaign-unit-choose')+`<h3>兵种与兵力</h3>${unitFormationMarkup(rows.filter(r=>r.unit.id===p.unitOfficer).map(({unit:u})=>({...u,type:p.types[u.id]||u.type,equipment:p.equipment?.[u.id]||u.equipment,troops:p.troops?.[u.id]??u.troops})),{equipmentCity:c,types:Object.keys(TROOPS).filter(type=>canTrain(c,type)||TROOPS[type].category==='troop'&&c.units.some(u=>u.type===type)),troopsAttribute:'data-command-troops',troopsMax:u=>commandTroopLimit(s,c,p,rows,u.id)})}${formationSummary(s,{...p,selected:[...new Set([...p.selected,p.unitOfficer].filter(Boolean))]})}`;
 if(p.step==='formation'&&p.choosingMain)return {title:'选择主将',subtitle:'单选',body:campaignRosterMarkup(s,ui,{...p,single:true,selected:p.unitOfficer?[p.unitOfficer]:[]}),footer:button('campaign-unit-picker-back','返回')};
 if(p.step==='review'){
  const route=commandRoute(s,p),formation=['draft','defense','expedition'].includes(p.task),preview=formation?prepareCommandFormation(s,p):null,prepared=preview?.state?campaignOfficers(preview.state):rows,units=chosen.map(r=>prepared.find(x=>x.unit.id===r.unit.id)?.unit||r.unit);
  const trip=route?`${esc(town(s,route.from)?.name)} → ${esc(town(s,p.destination)?.name)}`:esc(c?.name),routeDetail=route?decisionDetails('路线详情',`<p>${[route.from,...route.route].map(id=>esc(town(s,id).name)).join(' → ')}</p>`):'';
  body=`<div class="command-decree"><h3>${p.task==='march'?esc(a?.name):trip}</h3>`;
  if(formation){
   body+=`<p>${units.length} 队 · ${units.reduce((n,u)=>n+u.troops,0).toLocaleString()} 人</p>`+decisionFacts([['编制金',preview.gold??'—'],['编制粮',preview.grain??'—'],...(p.task==='expedition'?[['携粮',Math.min(town(preview.state||s,p.city).grain,armySupplyCapacity(units))],['军团长',units.find(u=>u.id===p.leader)?.name],['军师',units.find(u=>u.id===p.advisor)?.name]]:[])]);
   if(preview.error)body+=`<p role="alert">${esc(preview.error)}</p>`;
   const army={units,leader:p.leader,advisor:p.advisor,morale:80,hunger:c.hunger};
   if(p.task==='expedition')body+=routeItineraryMarkup(s,p,route,army);
   body+=decisionDetails('部队与属性',p.task==='expedition'?armyDetailsMarkup(army)+combatComparison(s,units,army):unitReviewMarkup(units));
  }else if(p.task==='march'&&a){body+=`<p>${trip}</p>`+decisionFacts([['兵力',a.units.reduce((n,u)=>n+u.troops,0)],['携粮',Math.floor(a.supply)],['日耗粮',dailyConsumption(s,a)]])+routeItineraryMarkup(s,p,route,a)+decisionDetails('军团详情',armyDetailsMarkup(a));}
  else if(p.task==='transfer')body+=`<p>${chosen.length} 名武将 · ${chosen.map(r=>esc(r.unit.name)).join('、')}</p>`;
  else body+=`<p>${chosen.map(r=>esc(r.unit.name)).join('、')} · ${esc(p.task==='domestic'?DIRECTIONS[p.direction]:p.task==='governor'?'太守':commandTitle(p))}</p>`;
  body+=routeDetail+'</div>';
 }
 if(p.step==='unit-review'){const ids=[...new Set([...preparedIds,...p.selected])].filter(id=>!p.disbandIds?.includes(id));body=unitManagementMarkup(ids.map(id=>rows.find(r=>r.unit.id===id)?.unit).filter(Boolean).map(u=>({...u,type:p.types[u.id]||u.type,equipment:p.equipment?.[u.id]||u.equipment,troops:p.troops[u.id]??u.troops})),{equipmentCity:c,editAction:'campaign-unit-edit',disbandAction:'campaign-unit-disband',newAction:'campaign-unit-new',workbench:p.workbench,types:Object.keys(TROOPS).filter(type=>canTrain(c,type)||TROOPS[type].category==='troop'&&c.units.some(u=>u.type===type)),troopsAttribute:'data-command-troops',troopsMax:u=>commandTroopLimit(s,c,p,rows,u.id)})+(p.selected.length||p.disbandIds?.length?formationSummary(s,p):'');}
 if(p.step==='formation'&&!p.choosingMain){const ids=[...new Set([...preparedIds,...p.selected])].filter(id=>!p.disbandIds?.includes(id));const units=ids.map(id=>rows.find(r=>r.unit.id===id)?.unit).filter(Boolean).map(u=>({...u,type:p.types[u.id]||u.type,equipment:p.equipment?.[u.id]||u.equipment,troops:p.troops[u.id]??u.troops}));body=unitManagementMarkup(units,{editAction:'campaign-unit-edit',newAction:'campaign-unit-new',editorId:p.unitOfficer,editorHtml:body,workbench:p.workbench});}
 if(['formation','unit-review','review'].includes(p.step)&&['draft','defense','expedition'].includes(p.task)){const returned=(p.disbandIds||[]).reduce((n,id)=>{const u=preparedCommandUnit(s,p,id);return n+(u?u.troops+u.wounded:0);},0);body='<p class="command-reserves">预备兵：'+c.manpower+' 人'+(returned?' · 待解散返还：'+returned+' 人（含伤兵）':'')+'</p>'+body;if(p.disbandIds?.length)body+='<p>待解散：'+p.disbandIds.map(id=>esc(preparedCommandUnit(s,p,id)?.name||id)).join('、')+'。兵员返还 · 编制金不返还</p>'; }
 if(p.task==='transfer'&&['target','review'].includes(p.step)){
  const transport=chosen.some(r=>r.unit.troops>0||r.unit.wounded>0)||p.cargo.gold>0||p.cargo.grain>0||p.cargo.manpower>0,route=commandRoute(s,p);
  const carrier=chosen[0]&&{unit:chosen[0].unit,location:p.city,destination:p.destination,cargo:p.cargo,...(p.cycles?{convoyCycle:{leg:'out'}}:{})};
  let cargo='<section class="transport-cargo">',options='';
  if(chosen.length===1&&hasStrategicTrait(chosen[0].unit,'cycleCargo'))options+=p.step==='target'?`<label class="strategy-field">批次<select data-transfer-cycles>${[0,2,3,4,5].map(n=>`<option value="${n}" ${(p.cycles||0)===n?'selected':''}>${n?n+'批':'单次'}</option>`).join('')}</select></label>`:p.cycles?`<p>运粮 ${p.cycles} 批</p>`:'';
  if(chosen.length===1&&hasStrategicTrait(chosen[0].unit,'relayCargo'))options+=p.step==='target'?`<div class="strategy-field">接力${mapTargetField('relay',p.relay?town(s,p.relay)?.name:'选择接力城')}<button class="text-button" data-action="transfer-relay-clear">直达</button></div>`:p.relay?`<p>接力：${esc(town(s,p.relay)?.name||'无效据点')}</p>`:'';
  cargo+=p.step==='target'?`<div class="transport-fields">${[['gold','金',c.gold],['grain','粮',Math.floor(c.grain)],['manpower','预备兵',Math.max(0,c.manpower-c.domestic.reserved)]].map(([key,label,max])=>`<label class="strategy-field">${label}<input type="number" min="0" max="${max}" step="1" inputmode="numeric" data-transfer-cargo="${key}" value="${p.cargo[key]}" aria-describedby="command-readiness" aria-invalid="${!Number.isSafeInteger(p.cargo[key])||p.cargo[key]<0||p.cargo[key]>max}"><small>可用 ${max.toLocaleString()}</small></label>`).join('')}</div>`:decisionFacts([['金',p.cargo.gold],['粮',p.cargo.grain],['预备兵',p.cargo.manpower]]);
  const soldiers=chosen.reduce((n,r)=>n+r.unit.troops,0),wounded=chosen.reduce((n,r)=>n+r.unit.wounded,0);
  if(soldiers||wounded)cargo+=`<p>随行兵力 ${soldiers.toLocaleString()}${wounded?' · 伤兵 '+wounded.toLocaleString():''}</p>`;
  const arrival=route&&carrier?`${p.cycles?'首批预计':'预计'} ${personnelRouteDays(intelligenceWorld(s),carrier,route.route,{relay:p.relay})} 天抵达`:'尚未选择可达终点';
  if(p.step!=='target'&&route)cargo+=`<p class="route-itinerary">${arrival}</p>`;
  if(options)cargo+=p.step==='target'?`<details class="decision-details transport-options" ${p.cycles||p.relay?'open':''}><summary>运输选项</summary>${options}</details>`:options;
  if(transport&&p.step!=='target')cargo+='<small class="decision-risk">遇敌损失随行部队与物资</small>';
  cargo+='</section>';
  if(p.step==='target'){
   body=body.replace(/<\/aside><\/div>$/,cargo+'</aside></div>');
   const manifest=[['gold','金'],['grain','粮'],['manpower','预备兵']].filter(([key])=>p.cargo[key]>0).map(([key,name])=>`${name} ${p.cargo[key].toLocaleString()}`).join(' · ')||'未携物资';
   body=body.replace(/<aside>([\s\S]*?)<\/aside>/,`<aside class="command-sidebar"><div class="command-sidebar-scroll">$1</div><div class="command-sidebar-summary" role="status"><b>${arrival}</b><span>${manifest}</span>${transport?'<small class="decision-risk">遇敌损失随行部队与物资</small>':''}</div></aside>`);
  }else body+=cargo;
 }
 if(p.step==='target'&&['march','expedition'].includes(p.task)){
   const route=commandRoute(s,p),marching=a||{units:chosen.map(r=>r.unit),leader:p.leader,advisor:p.advisor,morale:80,hunger:0},speed=marching;
   const summary=`<h3>${esc(a?.name||'出征军团')}</h3>${decisionFacts([['部队',marching.units.length+' 队'],['兵力',marching.units.reduce((n,u)=>n+u.troops,0).toLocaleString()+' 人']])}<p class="command-destination">${esc(town(s,route?.from||a?.travel?.to||a?.location||p.city)?.name)} <span aria-hidden="true">→</span> <b>${esc(town(s,p.destination)?.name||'选择终点')}</b></p>${routeItineraryMarkup(s,p,route,speed)}${route?'<small class="route-edit-hint">拖动中转点改线</small>'+button('route-reset','重置路线'):''}`;
   const origin=route?.from||(p.task==='march'?(a?.travel?.to||a?.location):p.city),eligible=mapNodes(intelligenceWorld(s)).filter(n=>n.id!==origin).map(n=>n.id);
   body=`<div class="command-target-layout"><div class="command-map">${targetMapMarkup(mapMarkup,eligible,p.destination)}</div><aside>${summary}</aside></div>`;
   return {title:commandTitle(p),subtitle:'',body:'<div class="command-flow">'+body+'</div>',footer:footerStatus+button('campaign-command-cancel','取消')+(p.task==='expedition'?button('campaign-command-back','返回编组'):'')+`<button class="button primary" data-action="campaign-command-next" aria-describedby="command-readiness" ${canAdvance?'':'disabled'}>确认终点</button>`};
 }
 return {title:commandTitle(p),subtitle:`${esc(c?.name)}${a?' · '+esc(a.name):''} · ${labels[p.step]}`,body:`<div class="command-flow">${body}</div>`,footer:`${footerStatus}${p.task==='expedition'&&p.step==='unit-select'?button('campaign-unit-list','编制'):''}${button('campaign-command-cancel',['domestic','governor'].includes(p.task)?'返回':'取消')}${p.step==='formation'?button('campaign-unit-list','返回'):index>0&&p.task!=='domestic'&&p.step!=='unit-select'?button('campaign-command-back','上一步'):''}${['direction','armies'].includes(p.step)?'':`<button class="button primary" data-action="${p.step==='review'||(['domestic','governor'].includes(p.task)&&p.step==='officers')?'campaign-pick-confirm':'campaign-command-next'}" aria-describedby="command-readiness" ${canAdvance?'':'disabled'}>${['domestic','governor'].includes(p.task)&&p.step==='officers'?'确认':p.step==='review'?'下令':p.step==='formation'?'确认':'下一步'}</button>`}`};
}
function formationSummary(s,p){const preview=prepareCommandFormation(s,p);if(preview.error)return `<p role="alert">${esc(preview.error)}</p>`;const c=town(preview.state,p.city),units=p.task==='defense'?preview.state.armies.filter(a=>a.defense&&a.location===p.city).flatMap(a=>a.units):c.units;return `<p class="command-cost">驻城编制 · 新增兵员 ${preview.men} · 消耗 ${preview.gold} 金 / ${preview.grain} 粮</p><p>${units.filter(u=>p.selected.includes(u.id)).map(u=>`${esc(u.name)}：${TROOPS[u.type].name} ${u.troops} 人`).join('；')}</p>`;}

function commandTroopLimit(s,c,p,rows,id){
 const selected=new Set([...p.selected,id]),units=rows.filter(r=>selected.has(r.unit.id)).map(r=>({...r.unit,type:p.types[r.unit.id]||r.unit.type,equipment:p.equipment?.[r.unit.id]||r.unit.equipment}));
 const equipment=units.reduce((n,u)=>{const row=rows.find(r=>r.unit.id===u.id),original=row.unit,prepared=c.units.some(x=>x.id===u.id)||p.task==='defense'&&row.army?.defense;const men=original.troops+original.wounded;return n+(!prepared?trainingCost({...original,type:u.type},men,c):original.type!==u.type?trainingCost(u.type,men,c):0)+equipmentCost(u.equipment,original.equipment,men,c);},0);
 return troopAllocationLimit(s,{...c,gold:Math.max(0,c.gold-equipment),manpower:c.manpower+(p.disbandIds||[]).reduce((n,id)=>{const u=preparedCommandUnit(s,p,id);return n+(u?u.troops+u.wounded:0);},0)},units.find(u=>u.id===id),p.troops,units);
}

export function removeCommandUnit(s,p,id){
 const existing=preparedCommandUnit(s,p,id);
 if(!existing&&!p.selected.includes(id))return '部队不存在';
 if(existing){const preview=structuredClone(s);const error=p.task==='defense'?prepareSiegeUnits(s,p.battleId,[],{},false,{},[id]).error:disbandCityUnits(preview,p.city,[id]);if(error)return error;p.disbandIds=[...new Set([...(p.disbandIds||[]),id])];}
 for(const key of ['selected','formationPool','armySelection'])if(p[key])p[key]=p[key].filter(x=>x!==id);
 for(const role of ['leader','advisor'])if(p[role]===id)p[role]=null;
 if(p.task==='expedition')resetCommandTarget(p);
 delete p.types[id];delete p.troops[id];if(p.equipment)delete p.equipment[id];if(p.unitOfficer===id)p.unitOfficer=null;
 return '';
}

export function selectCommandPoint(s,p,id,{resetRoute=false}={}){
 const a=s.armies.find(a=>a.id===p.armyId),origin=p.task==='march'?(a?.travel?.to||a?.location):p.city;
 if(!mapNode(s,id)||id===origin)return '请选择其它地点';
 if(id===p.destination&&!resetRoute)return null;
 const route=findCampaignRoute(intelligenceWorld(s),origin,id,null,p.policy);
 if(!route||!validMapRoute(s,origin,id,route))return '此路线不可达或重复经过已选地点，请返回重新选择';
 p.route=route;p.destination=id;p.waypoints=[];return null;
}
export function editCommandWaypoint(s,p,index,id){
 const current=commandRoute(s,p);if(!current)return false;
 const observed=intelligenceWorld(s),next=editRouteWaypoint({...p,route:current.route},current.from,p.destination,index,id,via=>routeThrough(current.from,p.destination,via,(a,b,blocked)=>findCampaignRoute({...observed,roads:observed.roads.filter(edge=>edge.every(n=>!blocked.has(n)))},a,b,null,p.policy),route=>validMapRoute(observed,current.from,p.destination,route)));
 if(!next)return false;Object.assign(p,next);return true;
}
