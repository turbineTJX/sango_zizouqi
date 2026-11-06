import {remainingDaysText} from './number-rules.mjs';
import {knownBanditCamps} from './bandit-state.mjs';
import {administrationKnown,cityInformation} from './information-display.mjs';
import {playerFaction} from './player-faction.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {scoutAssignment,scoutStatus} from './scouting-state.mjs';
import {mapNode} from './road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {missionStatus} from './officer-missions.mjs';
import {roadCost,marchItinerary,remainingMarchDays} from './strategic-movement.mjs';
import {isTransport,currentPersonnelSpeed,remainingPersonnelDays} from './personnel-movement.mjs';
import {isDeploying} from './engine.mjs';
import {armyBattle,roadLength} from './strategic-campaign.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {DIRECTIONS} from './domestic.mjs';
import {DIPLOMACY_GOALS,DIPLOMACY_DIRECTIONS,DIPLOMACY_RULES} from './data/design/diplomacy-rules.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
const days=v=>remainingDaysText(v)+' 天';
const town=(s,id)=>mapNode(s,id)?.name||'位置未确认';
const route=(s,t)=>`${town(s,t.from)} → ${town(s,t.to)}（途中）`;
const battleLabel=r=>r.awaiting?'遭遇敌军，等待指挥决定':isDeploying(r.battle)?'战前布阵':r.control==='manual'?'交战中 · 亲自指挥':'交战中 · 委托作战';
export function armyDestinationLabel(s,a){
 const camp=a.faction===playerFaction(s)&&knownBanditCamps(s,playerFaction(s)).find(c=>(!a.banditTarget||c.id===a.banditTarget)&&c.nodeId===a.target&&c.clearedDay===null);
 return camp?.name||town(s,a.target);
}
function armyStatus(s,a){
 const battle=armyBattle(s,a.id),waiting=s.campaign.domestic.orders.find(q=>q.kind==='march'&&q.armyId===a.id),rest=Math.max(0,a.cooldownDay-s.campaign.day);
 const result=[['位置',battle?.kind==='siege'?town(s,battle.cityId):a.travel?route(s,a.travel):town(s,a.location)],['动向',battle?battleLabel(battle):waiting?'待执行':rest?'战后休整':a.travel&&a.task==='行军中'||a.route.length&&(a.travel||s.junctions?.some(n=>n.id===a.location))?'沿道路行军':a.route.length?'待出发':'驻扎待命']];
 if(battle)result.push(['战场',battle.name],['交战时间',`${s.campaign.day-battle.startedDay+1} 天`]);
 if(a.travel&&!battle){const length=roadLength(s,a.travel.from,a.travel.to);result.push(['路段进度',`${Math.min(100,Math.max(0,Math.round(a.travel.progress/length*100)))}%`]);}
 if(a.route.length&&!battle&&!waiting){
  const remaining=(a.travel?remainingMarchDays(s,a):0)+marchItinerary(s,a.travel?.to||a.location,a.travel?a.route.slice(1):a.route,a,a.roadPolicy).days;
  result.push(['剩余行程',Number.isFinite(remaining)?`约 ${remaining} 天（按当前速度，不含停留）`:'当前无法通行']);
 }
 if(rest&&!battle)result.push(['休整剩余',days(rest)]);
 if(a.target)result.push(['行军目的地',armyDestinationLabel(s,a)]);
 if(waiting)result.push(['等待命令',strategicOrderLabel(s,waiting)]);
 return result;
}
// Derived live status, kept separate from static attributes and safe for read-only consumers.
export function campaignCurrentStatus(s,type,entry,index){
 if(type==='army')return armyStatus(s,entry);
 if(type==='unit'||type==='officer'){
  const r=entry,id=r.unit.id,work=currentDomesticWork(s,id),assignment=s.campaign.domestic.assignments.find(a=>a.officerId===id),order=s.campaign.domestic.orders.find(q=>q.officerIds.includes(id));
  const scout=scoutAssignment(s,id);if(scout)return [['动向','在城负责侦察'],['位置',town(s,scout.homeCity)],['侦察终点',town(s,scout.targetCity)],['斥候',scoutStatus(scout)],['斥候位置',town(s,scout.location)+(scout.route.length?' → '+town(s,scout.route[0]):'')],['工作状态',scout.paused?'暂停':'办理中']];
  if(r.personFate){const p=r.personFate;return [['动向',p.status==='DEAD'?'已战死':p.custody?'被俘，押送途中':'被俘，等待赎回或释放'],['位置',town(s,p.cityId)+(p.custody?' → '+town(s,p.custody.route[0]):'')],['事由',p.fate.reason],['发生日期',campaignDate(s,{day:p.fate.day})]];}
  if(r.unit.mission){const m=r.unit.mission,p=m.type==='diplomacy'&&[...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts].find(p=>p.id===m.projectId),speed=m.captiveId?DIPLOMACY_RULES.captiveSpeed:m.cargo?DIPLOMACY_RULES.cargoSpeed:DIPLOMACY_RULES.lightSpeed;return [...(type==='unit'&&r.stationedCity?[['部队驻地',town(s,r.stationedCity)]]:[]),[type==='unit'?'主将动向':'动向',missionStatus(m)],[type==='unit'?'主将位置':'位置',town(s,m.location)+(m.route.length?' → '+town(s,m.route[0]):'')],['派出城',town(s,m.homeCity)],['目的地',town(s,m.targetCity)],['当前事务',p?DIPLOMACY_GOALS[p.goal]:work?.title||'返城'],...(!p&&m.phase==='work'?[['当地办理剩余',days(work?.remaining??0)]]:[]),...(m.cargo?[['押运物资',`${m.cargo.amount}${m.cargo.kind==='grain'?'粮':'预备兵'}`]]:[]),['每日行动力',String(speed)],['路段进度',m.route.length?Math.floor(m.progress/roadCost(s,m.location,m.route[0])*100)+'%':'已抵达']];}
  const siege=s.campaign.battles.find(b=>!b.settled&&b.kind==='siege'&&b.cityId===r.city);
  const result=r.army?armyStatus(s,r.army):[
   ['位置',r.returning?'返城安排中':r.idle?.destination?route(s,{from:r.idle.location,to:r.idle.destination}):town(s,r.city)],
   ['动向',r.returning?'待返城':r.idle?.retreating?(r.idle.journey?.blocked||'撤离途中'):r.idle?.destination?(r.idle.journey?.blocked||(isTransport(r.idle)?'运输途中':r.idle.movementReason||'调任途中')):siege?'据点被围 · 内政暂停':work?work.paused?'内政事务暂停':'办理内政事务':order?'待执行':assignment?`${DIRECTIONS[assignment.direction]}任职 · ${assignment.waiting||'等待新事务'}`:s.cities.some(c=>c.governor===id)?'驻城任太守':r.prepared?'驻城备战':!administrationKnown(s,r.faction)?'在城':'驻城待命']]
  ;
  if(r.idle?.destination)result.push([r.returning?'返城目的地':'调任目的地',town(s,r.idle.destination)],['调任 / 返城剩余',days(remainingPersonnelDays(s,r.idle))]);
  if(r.idle?.destination||r.idle?.retreating){const o=r.idle;result.push(['每日行动力',String(currentPersonnelSpeed(s,o))],['行军方式',o.retreating?'撤离队':isTransport(o)?'运输队':'轻装行军']);if(o.journey?.route.length)result.push(['当前路段',town(s,o.location)+' → '+town(s,o.journey.route[0])]);if(isTransport(o))result.push(['运输物资',`金 ${o.cargo?.gold||0} · 粮草 ${o.cargo?.grain||0} · 预备兵 ${o.cargo?.manpower||0}`],['随行部队',`${o.unit.troops} 人 · 伤兵 ${o.unit.wounded} 人`]);}
  if(work)result.push(['内政事务',`${work.title}${work.target?' · '+work.target:''}`],['事务剩余',days(work.remaining)+(work.paused||siege?' · 暂停':'')]);
  const diplomatic=diplomaticAssignment(s,id);if(diplomatic&&administrationKnown(s,r.faction))result.push(['外交任职',DIPLOMACY_DIRECTIONS[diplomatic.direction].name+' · '+diplomatic.waiting]);
  if(order&&!result.some(([label])=>label==='等待命令'))result.push(['等待命令',strategicOrderLabel(s,order)],['执行时机','事务完成后']);
  const battle=r.army&&armyBattle(s,r.army.id),unit=battle?.battle.sides.flatMap(side=>side.units).find(u=>u.id===id&&u.armyId===r.army.id);
  if(r.army&&r.unit.troops===0&&!unit)result.push(['人员状态','随军待整编'],['参战资格','无现役兵，不可参战']);
  if(unit)result.push(['战场状态',({active:'在场',reserve:'预备队',defeated:'已溃败',withdrawn:'已撤离'})[unit.status]||unit.status],['行动',unit.action||'等待行动'],['战场兵力',String(Math.round(unit.hp))],['战意',String(Math.round(unit.intent))]);
  return result;
 }
 if(type==='city'){
  const hiddenAdministration=!administrationKnown(s,entry.owner);
  const siege=s.campaign.battles.find(b=>!b.settled&&b.kind==='siege'&&b.cityId===entry.id),assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===entry.id);
  const result=[['位置',entry.province||'—'],['当前局势',siege?'正在遭受围攻':'未被围攻'],['正在办理',hiddenAdministration?'未知':assignments.filter(a=>a.action).map(a=>`${index.officer.find(r=>r.unit.id===a.officerId)?.unit.name||'武将'}：${currentDomesticWork(s,a.officerId)?.title}（余 ${days(a.action.remaining)}${a.action.paused||siege?' · 暂停':''}）`).join('；')||'暂无正在办理的内政事务'],['待执行命令',hiddenAdministration?'未知':String(s.campaign.domestic.orders.filter(q=>q.cityId===entry.id).length)+' 项']];
  if(siege)result.push(['战场',siege.name],['战役状态',battleLabel(siege)]);
  return result;
 }
 const armies=index.army.filter(a=>a.faction===entry.id),cities=index.city.filter(c=>c.owner===entry.id&&cityInformation(s,c.id).state!=='unknown'),battles=s.campaign.battles.filter(b=>!b.settled&&b.battle.sides.some(side=>side.faction===entry.id));
 const partial=!administrationKnown(s,entry.id);
 return [[partial?'已知辖境':'势力辖境',cities.map(c=>c.name).join('、')||(partial?'未知':'暂无据点')],['当前战事',battles.map(b=>b.name).join('、')||(partial?'未发现战事':'暂无进行中的战役')],['军团动向',armies.map(a=>`${a.name}：${armyStatus(s,a).find(([label])=>label==='动向')[1]}`).join('；')||(partial?'未发现军团':'暂无出征军团')],['内政事务',partial?'未知':String(s.campaign.domestic.assignments.filter(a=>a.action&&cities.some(c=>c.id===a.cityId)).length)+' 项办理中'],['调任途中',partial?'未知':String(index.officer.filter(r=>r.faction===entry.id&&r.idle?.destination).length)+' 人']];
}
