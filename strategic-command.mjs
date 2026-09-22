import {mapNode,mapNodes} from './road-network.mjs';
import {trainingCost} from './troop-training.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {allocateUnitTroops,troopAllocationLimit} from './troop-allocation.mjs';
import {armyDetailsMarkup} from './army-details.mjs';
import {playerFaction} from './player-faction.mjs';
import {unitManagementMarkup,unitCommanderField,unitFormationMarkup,unitReviewMarkup,commanderSetupMarkup} from './army-setup-view.mjs';
import {combatComparison} from './combat-comparison.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {missionUnits} from './officer-missions.mjs';
import {PERSONNEL_SPEED,TRANSPORT_SPEED} from './personnel-movement.mjs';
import {campaignOfficers,campaignRosterMarkup,pickerReason,pickerTitle} from './strategic-roster.mjs';
import {DIRECTIONS,canTrain} from './domestic.mjs';
import {armyCommanders,armyStratagems,STRATAGEMS,FACTIONS,TROOPS} from './engine.mjs';
import {disbandCityUnits,prepareDepartureUnits,prepareSiegeUnits,armyBattle,isPlanning,findCampaignRoute,prepareCityUnits,changeCityTroop,recruitCityUnits,armyActionPoints,dailyConsumption} from './strategic-campaign.mjs';
import {roadCost,validMapRoute} from './strategic-movement.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {troopAptitude} from './tactic-learning.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const town=mapNode;
const button=(action,label,extra='')=>`<button class="button secondary" data-action="${action}" ${extra}>${label}</button>`;
export const commandSteps=p=>p.task==='expedition'?['formation','unit-review','unit-select','commanders','target','review']:p.task==='march'?['target','review']:p.task==='domestic'?['direction','officers','review']:p.task==='transfer'?['officers','target','review']:['draft','defense'].includes(p.task)?['formation','unit-review','review']:['officers','review'];
const labels={'unit-select':'选择已编部队',commanders:'编组军团',armies:'选择军团',direction:'选择事务',officers:'选择武将',formation:'编制部队','unit-review':'部队管理',target:'选择目的地',review:'确认下令'};
export const commandTitle=p=>p.task==='expedition'?'编组出征':p.task==='march'?'调动军团':p.task==='domestic'?'内政委任':pickerTitle(p);
export function newCommand(s,task,city,{direction,armyId}={}){
 return {task,city,direction,armyId,step:['draft','defense','expedition'].includes(task)?'unit-review':task==='march'?(armyId?'target':'armies'):task==='domestic'&&!direction?'direction':'officers',selected:[],leader:null,advisor:null,deputy:null,types:{},troops:{},cargo:{grain:0,manpower:0},reinforce:false,destination:null,policy:'auto'};
}
export function commandRoute(s,p){
 const a=s.armies.find(a=>a.id===p.armyId),from=p.task==='march'?(a?.travel?.to||a?.location):p.city;
 if(!from||!p.destination)return null;
 const route=p.route?(validMapRoute(s,from,p.destination,p.route)?p.route:null):findCampaignRoute(s,from,p.destination,p.task==='transfer'?playerFaction(s):null,p.policy);
 if(!route)return null;
 let at=from,cost=0;for(const id of route){cost+=roadCost(s,at,id,p.policy);at=id;}
 return {route,cost,from};
}
// Build the complete proposed formation on a copy. Cancellation never spends resources.
export function prepareCommandFormation(s,p){
 if(p.task==='defense')return prepareSiegeUnits(s,p.battleId,p.selected,p.types,p.reinforce,p.troops,p.disbandIds);
 const next=structuredClone(s),rows=campaignOfficers(next);
 if(!p.selected.length&&!p.disbandIds?.length)return {error:'请选择武将'};
 for(const id of p.selected){const row=rows.find(r=>r.unit.id===id),error=row?pickerReason(next,row,p.task==='draft'&&row.cityUnit?{...p,task:'defense'}:p):'武将已离开';if(error)return {error};}
 if(p.task==='expedition'){const away=missionUnits(next).filter(u=>p.selected.includes(u.id)).map(u=>({u,m:u.mission}));for(const x of away)delete x.u.mission;const error=prepareDepartureUnits(next,p.city,p.selected,p.types,p.reinforce,p.troops,p.disbandIds);for(const x of away)x.u.mission=x.m;return error?{error}:{state:next,cityId:p.city,gold:s.gold-next.gold,grain:town(s,p.city).grain-town(next,p.city).grain,men:town(s,p.city).manpower-town(next,p.city).manpower};}
 const error=prepareDepartureUnits(next,p.city,p.selected,p.types,p.reinforce,p.troops,p.disbandIds);if(error)return {error};
 const c=town(next,p.city);
 return {state:next,cityId:c.id,gold:s.gold-next.gold,grain:town(s,p.city).grain-town(next,p.city).grain,men:town(s,p.city).manpower-town(next,p.city).manpower};
}
export function commandCanAdvance(s,p){
 if(p.step==='unit-select')return p.selected.length>0&&p.selected.length<=10;
 if(p.step==='commanders')return p.selected.includes(p.leader)&&p.selected.includes(p.advisor)&&(!p.deputy||p.selected.includes(p.deputy));
 if(p.step==='direction')return !!DIRECTIONS[p.direction];
 if(p.step==='officers')return p.selected.length>0&&(p.task!=='expedition'||p.selected.length<=10);
 if(p.step==='target')return !!p.destination&&(p.task==='march'||p.destination!==p.city&&(p.task==='expedition'||town(s,p.destination)?.owner===playerFaction(s)))&&!!commandRoute(s,p);
 if(p.step==='formation')return !!p.unitOfficer&&!prepareCommandFormation(s,{...p,selected:[...new Set([...p.selected,p.unitOfficer])]}).error;
 if(p.step==='unit-review')return p.task==='expedition'&&!p.selected.length?town(s,p.city).units.some(u=>!u.mission&&!p.disbandIds?.includes(u.id)):!prepareCommandFormation(s,p).error;
 return true;
}
export function commandMarkup(s,ui,mapMarkup){
 const p=ui.officerPick,steps=commandSteps(p),index=steps.indexOf(p.step),rows=campaignOfficers(p.task==='expedition'&&['commanders','target','review'].includes(p.step)?prepareCommandFormation(s,p).state||s:s),chosen=p.selected.map(id=>rows.find(r=>r.unit.id===id)).filter(Boolean),c=town(s,p.city),a=s.armies.find(a=>a.id===p.armyId);
 const trail=`<nav class="command-steps" aria-label="下令步骤">${steps.map((step,i)=>step==='formation'?'':`<button data-action="campaign-command-step" data-step="${step}" ${i>=index?'disabled':''} aria-current="${i===index?'step':'false'}"><small>${steps.includes('formation')?i:i+1}</small>${labels[step]}</button>`).join('')}</nav>`;
 let body='';
 if(p.step==='commanders')body='<h3>编制出征军团</h3>'+commanderSetupMarkup(s,chosen.map(r=>r.unit),p,{city:p.city});
 if(p.step==='direction')body=`<h3>为${esc(c.name)}选择委任方向</h3><div class="command-choices">${Object.entries(DIRECTIONS).map(([id,name])=>{const people=s.campaign.domestic.assignments.filter(x=>x.cityId===p.city&&x.direction===id);return button('campaign-command-direction',`<b>${name}</b><small>${DOMESTIC_STAT_LABELS[DIRECTION_STATS[id]]}＋适用特性</small><small>${people.length?people.map(x=>rows.find(r=>r.unit.id===x.officerId)?.unit.name).join('、'):'尚无负责人'}</small>`,`data-direction="${id}"`);}).join('')}</div>`;
 if(p.step==='officers')body=campaignRosterMarkup(s,ui,p);
 if(p.step==='target'){
  const route=commandRoute(s,p),eligible=(p.task==='transfer'?s.cities:mapNodes(s)).filter(x=>p.task!=='transfer'||x.owner===playerFaction(s)),destination=town(s,p.destination);
  body=`<h3>${p.task==='march'?esc(a?.name):chosen.map(r=>esc(r.unit.name)).join('、')} · 请在舆图选择目的地</h3><div class="command-target-layout"><div class="command-map">${mapMarkup.replaceAll('data-junction=','data-command-city=').replaceAll('data-city=','data-command-city=').replaceAll('data-campaign-army=','data-command-army=').replaceAll('data-transport-officer=','data-command-transport=').replaceAll('data-action="campaign-focus"','data-command-battle')}</div><aside><label class="strategy-field">查找目的地<select id="command-destination"><option value="">请选择据点或路口</option>${eligible.filter(x=>p.task==='march'||x.id!==p.city).map(x=>`<option value="${x.id}" ${p.destination===x.id?'selected':''}>${esc(x.name)} · ${x.kind==='junction'?'野外路口':FACTIONS[x.owner].name}</option>`).join('')}</select></label>${destination?.kind==='junction'?`<h3>${esc(destination.name)}</h3><p>野外路口 · 可停驻、转向。驻军可拦截经过的运输队并截断此处粮道；没有城防与本地产出。</p>`:destination?`<h3>${esc(destination.name)}</h3><p>${FACTIONS[destination.owner].name} · 存粮 ${Math.floor(destination.grain)} · 预备兵 ${destination.manpower}</p><p>在城武将 ${rows.filter(r=>r.location===destination.id).length} 人</p>`:'<p>点选据点或路口查看路线；可沿相连道路逐段选择经由路口。</p>'}<p>点目的地自动规划；点相连道路逐段选路。重新点目的地可重置路线。</p><p>${route?`路线：${[route.from,...route.route].map(id=>esc(town(s,id).name)).join(' → ')}<br>道路消耗 ${route.cost} 点${a?` · 每日行动力 ${armyActionPoints(a).toFixed(1)}`:''}`:p.destination?'此目的地不可达，请重新选择。':''}</p>${p.task==='transfer'&&destination?.owner!==playerFaction(s)&&p.destination?'<p>调任只能选择己方据点。</p>':''}</aside></div>`;
 }
 if(p.step==='unit-select'){const prepared=prepareCommandFormation(s,{...p,selected:p.formationPool||p.selected}),poolRows=campaignOfficers(prepared.state||s);const ids=[...new Set([...(p.formationPool||[]),...c.units.filter(u=>!u.mission).map(u=>u.id)])].filter(id=>!p.disbandIds?.includes(id));const candidates=rankOfficerCandidates(prepared.state||s,ids.map(id=>poolRows.find(r=>r.unit.id===id)?.unit).filter(Boolean),{task:'expedition',city:c.id}).map(x=>x.unit);body=combatComparison(s,candidates.filter(u=>p.selected.includes(u.id)),null,{only:['relations'],relationCandidates:candidates,relationPicker:{attribute:'data-command-army-unit',workStatus:true}});}
 if(p.step==='formation')body=unitCommanderField(rows.find(r=>r.unit.id===p.unitOfficer)?.unit,'campaign-unit-choose')+`<h3>安排兵种与整补</h3><p>${esc(c.name)}当前允许编制：${Object.keys(TROOPS).filter(type=>canTrain(c,type)).map(type=>TROOPS[type].name).join("、")}。未解锁兵种需由本据点技术负责人研究并试制。</p>${unitFormationMarkup(rows.filter(r=>r.unit.id===p.unitOfficer).map(({unit:u})=>({...u,type:p.types[u.id]||u.type,troops:p.troops?.[u.id]??u.troops})),{types:Object.keys(TROOPS).filter(type=>canTrain(c,type)),troopsAttribute:'data-command-troops',troopsMax:u=>commandTroopLimit(s,c,p,rows,u.id)})}${formationSummary(s,p)}`;
 if(p.step==='formation'&&p.choosingMain)return {title:'选择部队主将',subtitle:'单选',body:campaignRosterMarkup(s,ui,{...p,single:true,selected:p.unitOfficer?[p.unitOfficer]:[]}),footer:button('campaign-unit-picker-back','返回部队表单')};
 if(p.step==='review'){
  const route=commandRoute(s,p);
  body=`<h3>请核阅这道命令</h3><div class="command-decree"><small>${esc(c?.name)} · ${commandTitle(p)}</small><h2>${p.task==='march'?esc(a?.name):chosen.map(r=>esc(r.unit.name)).join('、')}</h2><p>${p.task==='domestic'?`委任为${DIRECTIONS[p.direction]}负责人，持续办理该方向事务。`:p.task==='governor'?'任命为本城太守。':['draft','defense'].includes(p.task)?'编制驻城部队，保留现有内政任职。':`由${esc(c?.name)}前往${esc(town(s,p.destination)?.name)}。`}</p>${route?`<p>${[route.from,...route.route].map(id=>esc(town(s,id).name)).join(' → ')} · 道路消耗 ${route.cost} 点</p>`:''}${p.task==='expedition'?`<p>军团长 ${esc(rows.find(r=>r.unit.id===p.leader)?.unit.name)} · 军师 ${esc(rows.find(r=>r.unit.id===p.advisor)?.unit.name)} · 副将 ${esc(rows.find(r=>r.unit.id===p.deputy)?.unit.name||'无')}<br>拨付携粮 ${Math.min(c.grain,chosen.length*900)} · ${chosen.length} 队</p>`:''}${a?`<p>${a.units.length} 队 · 现役 ${a.units.reduce((n,u)=>n+u.troops,0)} 人 · 携粮 ${Math.floor(a.supply)} · 每日耗粮 ${dailyConsumption(s,a).toFixed(1)}</p><p>${a.units.map(u=>esc(u.name)).join('、')}</p>`:''}${['draft','expedition','defense'].includes(p.task)?formationSummary(s,p):''}</div>`;
 }
 if(['review'].includes(p.step)&&['draft','defense','expedition'].includes(p.task)){const preview=prepareCommandFormation(s,p);const prepared=preview.state?campaignOfficers(preview.state):rows;const units=p.selected.map(id=>prepared.find(r=>r.unit.id===id)?.unit).filter(Boolean);body+=p.step==='unit-review'||p.task!=='expedition'?unitReviewMarkup(p.step==='unit-review'?units.filter(u=>u.id===p.unitOfficer):units):armyDetailsMarkup({units,leader:p.leader,advisor:p.advisor,deputy:p.deputy,morale:80,hunger:c.hunger})+combatComparison(s,units,{leader:p.leader,advisor:p.advisor,deputy:p.deputy});}
 if(p.step==='unit-review'){const ids=[...new Set([...c.units.filter(u=>!u.mission).map(u=>u.id),...p.selected])].filter(id=>!p.disbandIds?.includes(id));body=unitManagementMarkup(ids.map(id=>rows.find(r=>r.unit.id===id)?.unit).filter(Boolean).map(u=>({...u,type:p.types[u.id]||u.type,troops:p.troops[u.id]??u.troops})),{editAction:'campaign-unit-edit',disbandAction:'campaign-unit-disband',newAction:'campaign-unit-new'});}
 if(['formation','unit-review','review'].includes(p.step)&&['draft','defense','expedition'].includes(p.task)){const returned=(p.disbandIds||[]).reduce((n,id)=>{const u=c.units.find(u=>u.id===id);return n+(u?u.troops+u.wounded:0);},0);body='<p class="command-reserves">据点现有预备兵：'+c.manpower+' 人'+(returned?' · 待解散返还：'+returned+' 人（含伤兵）':'')+'</p>'+body;if(p.disbandIds?.length)body+='<p>待解散：'+p.disbandIds.map(id=>esc(c.units.find(u=>u.id===id)?.name||id)).join('、')+'。兵员返还本城预备兵，编制金不返还；确认下令后生效。</p>'; }
 if(p.task==='transfer'&&['target','review'].includes(p.step)){
  const transport=chosen.some(r=>r.unit.troops>0||r.unit.wounded>0)||p.cargo.grain>0||p.cargo.manpower>0,route=commandRoute(s,p),speed=transport?TRANSPORT_SPEED:PERSONNEL_SPEED;
  body+=`<section class="transport-cargo"><h3>随行部队与物资</h3><p>${chosen.some(r=>r.cityUnit)?'已编制部队随将调任，到达后编入目的地驻城部队。':'人才单独调任不显示地图标记；携带物资或预备兵时组成运输队。'}</p>${p.step==='target'?`<label class="strategy-field">携带粮草（本城 ${Math.floor(c.grain)}）<input type="number" min="0" max="${Math.floor(c.grain)}" step="1" data-transfer-cargo="grain" value="${p.cargo.grain}"></label><label class="strategy-field">携带预备兵（可用 ${Math.max(0,c.manpower-c.domestic.reserved)}）<input type="number" min="0" max="${Math.max(0,c.manpower-c.domestic.reserved)}" step="1" data-transfer-cargo="manpower" value="${p.cargo.manpower}"></label>`:`<p>运送粮草 ${p.cargo.grain} · 预备兵 ${p.cargo.manpower} · 随行部队 ${chosen.reduce((n,r)=>n+r.unit.troops,0)} 人 / 伤兵 ${chosen.reduce((n,r)=>n+r.unit.wounded,0)} 人</p>`}<p>${transport?'运输队 · 在大地图显示':'人才轻装移动 · 不在大地图显示'} · 每日 ${speed} 行动力${route?' · 预计 '+Math.ceil(route.cost/speed)+' 天':''}</p><small>运输队快速沿道路输运；途中遇敌，所带部队和物资全部损失，武将另行判定去向。粮仓不足则等待卸载。</small></section>`;
 }
 if(p.step==='target'&&['march','expedition'].includes(p.task)){
   const chosen=p.destination&&commandCanAdvance(s,p);
   const popup=chosen?'<section class="map-point-menu" role="group" aria-label="选点操作"><h3>'+esc(town(s,p.destination)?.name)+'</h3><small>'+(town(s,p.destination)?.kind==='junction'?'野外路口':'据点')+'</small><p>已选 '+(p.route?.length||commandRoute(s,p)?.route.length||0)+' 段道路</p>'+button('map-route-continue','继续行进（选下一点）')+button('map-route-end','设为终点')+button('map-route-back','返回（到上一点选择）')+button('campaign-command-cancel','取消')+'</section>':'<section class="map-point-menu"><h3>请选择'+(p.mapRoute?.length?'下一点':'行军路线')+'</h3><p>在大地图点击据点、路口或相连道路。</p>'+button('map-route-back','返回（到上一点选择）')+button('campaign-command-cancel','取消')+'</section>';
   body=body.replace(/<aside>[\s\S]*?<\/aside>/, '<aside>'+popup+'</aside>');
   return {title:commandTitle(p),subtitle:'选点 → 继续行进或设为终点 → 核阅下令',body:'<div class="command-flow">'+body+'</div>',footer:p.task==='expedition'&&!chosen?button('campaign-command-back','返回编组'):''};
 }
 return {title:commandTitle(p),subtitle:`${esc(c?.name)}${a?' · '+esc(a.name):''} · ${labels[p.step]}`,body:`<div class="command-flow">${trail}${body}</div>`,footer:`${['draft','defense','expedition'].includes(p.task)&&p.step!=='unit-review'?button('campaign-unit-new','新增部队'):''}${button('campaign-command-cancel','取消命令')}${p.step==='formation'?button('campaign-unit-list','返回部队列表'):index>0?button('campaign-command-back','上一步'):''}${['direction','armies'].includes(p.step)?'':`<button class="button primary" data-action="${p.step==='review'?'campaign-pick-confirm':'campaign-command-next'}" ${commandCanAdvance(s,p)?'':'disabled'}>${p.step==='review'?'下达命令':p.step==='formation'?'确认编制这支部队':p.step==='officers'?'选好了 · 继续':'下一步'}</button>`}`};
}
function formationSummary(s,p){const preview=prepareCommandFormation(s,p);if(preview.error)return `<p role="alert">${esc(preview.error)}</p>`;const c=town(preview.state,p.city),units=p.task==='defense'?preview.state.armies.filter(a=>a.defense&&a.location===p.city).flatMap(a=>a.units):c.units;return `<p class="command-cost">驻城编制 · 新增兵员 ${preview.men} · 消耗 ${preview.gold} 金 / ${preview.grain} 粮</p><p>${units.filter(u=>p.selected.includes(u.id)).map(u=>`${esc(u.name)}：${TROOPS[u.type].name} ${u.troops} 人`).join('；')}</p>`;}

function commandTroopLimit(s,c,p,rows,id){
 const selected=new Set([...p.selected,id]),units=rows.filter(r=>selected.has(r.unit.id)).map(r=>({...r.unit,type:p.types[r.unit.id]||r.unit.type}));
 const equipment=units.reduce((n,u)=>{const original=rows.find(r=>r.unit.id===u.id).unit;return n+(!c.units.some(x=>x.id===u.id)||original.type!==u.type?trainingCost(u.type,original.troops+original.wounded):0);},0);
 return troopAllocationLimit({...s,gold:Math.max(0,s.gold-equipment)},{...c,manpower:c.manpower+(p.disbandIds||[]).reduce((n,id)=>{const u=c.units.find(u=>u.id===id);return n+(u?u.troops+u.wounded:0);},0)},units.find(u=>u.id===id),p.troops,units);
}

export function removeCommandUnit(s,p,id){
 const c=town(s,p.city),existing=c?.units.find(u=>u.id===id);
 if(!existing&&!p.selected.includes(id))return '部队不存在';
 if(existing){const preview=structuredClone(s);const error=p.task==='defense'?prepareSiegeUnits(s,p.battleId,[],{},false,{},[id]).error:disbandCityUnits(preview,p.city,[id]);if(error)return error;p.disbandIds=[...new Set([...(p.disbandIds||[]),id])];}
 for(const key of ['selected','formationPool','armySelection'])if(p[key])p[key]=p[key].filter(x=>x!==id);
 for(const role of ['leader','advisor','deputy'])if(p[role]===id)p[role]=null;
 delete p.types[id];delete p.troops[id];if(p.unitOfficer===id)p.unitOfficer=null;
 return '';
}

export function selectCommandPoint(s,p,id){
 const a=s.armies.find(a=>a.id===p.armyId),origin=p.task==='march'?(a?.travel?.to||a?.location):p.city;
 const prefix=p.mapRoute||[],from=prefix.at(-1)||origin;
 if(!mapNode(s,id)||id===from)return '请选择其它地点';
 const leg=findCampaignRoute(s,from,id,null,'auto'),route=leg&&[...prefix,...leg];
 if(!route||!validMapRoute(s,origin,id,route))return '此路线不可达或重复经过已选地点，请返回重新选择';
 p.route=route;p.destination=id;return null;
}
export function continueCommandRoute(p){
 if(!p.destination||!p.route)return;
 (p.mapHistory||=[]).push({destination:p.destination,route:[...p.route]});
 p.mapRoute=[...p.route];p.destination=null;delete p.route;
}
export function backCommandRoute(p){
 const last=p.mapHistory?.pop();
 p.mapRoute=[...(p.mapHistory?.at(-1)?.route||[])];
 p.destination=last?.destination||null;
 if(last)p.route=[...last.route];else delete p.route;
}
