import {scoutAssignment,scoutStatus} from './scouting-state.mjs';
import {mapNode} from './road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {missionStatus} from './officer-missions.mjs';
import {roadCost} from './strategic-movement.mjs';
import {isTransport,personnelSpeed} from './personnel-movement.mjs';
import {isDeploying} from './engine.mjs';
import {armyBattle,roadLength} from './strategic-campaign.mjs';
import {currentDomesticWork,strategicOrderLabel} from './strategic-orders.mjs';
import {DIRECTIONS} from './domestic.mjs';
import {DIPLOMACY_GOALS,DIPLOMACY_DIRECTIONS,DIPLOMACY_RULES} from './data/design/diplomacy-rules.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
const days=v=>Number(v.toFixed(2))+' 天';
const town=(s,id)=>mapNode(s,id)?.name||'位置未确认';
const route=(s,t)=>`${town(s,t.from)} → ${town(s,t.to)}（途中）`;
const battleLabel=r=>r.awaiting?'遭遇敌军，等待指挥决定':isDeploying(r.battle)?'战前布阵':r.control==='manual'?'交战中 · 亲自指挥':'交战中 · 委托作战';
function armyStatus(s,a){
 const battle=armyBattle(s,a.id),waiting=s.campaign.domestic.orders.find(q=>q.kind==='march'&&q.armyId===a.id),rest=Math.max(0,a.cooldownDay-s.campaign.day);
 const result=[['所在位置',battle?.kind==='siege'?town(s,battle.cityId):a.travel?route(s,a.travel):town(s,a.location)],['正在做什么',battle?battleLabel(battle):waiting?'等待内政事务完成后执行军令':rest?'战后休整':a.travel||a.route.length&&s.junctions?.some(n=>n.id===a.location)?'沿道路行军':a.route.length?'待出发':'驻扎待命']];
 if(battle)result.push(['当前战役',battle.name],['战斗进度',`第 ${s.campaign.day-battle.startedDay+1} 天 · 已进行 ${battle.battle.tick} 日`]);
 if(a.travel&&!battle){const length=roadLength(s,a.travel.from,a.travel.to);result.push(['当前路段进度',`${Math.min(100,Math.max(0,Math.round(a.travel.progress/length*100)))}%`]);}
 if(rest&&!battle)result.push(['休整剩余',days(rest)]);
 if(a.target)result.push(['行军目的地',town(s,a.target)]);
 if(waiting)result.push(['等待命令',strategicOrderLabel(s,waiting)]);
 return result;
}
// Derived live status, kept separate from static attributes and safe for read-only consumers.
export function campaignCurrentStatus(s,type,entry,index){
 if(type==='army')return armyStatus(s,entry);
 if(type==='unit'||type==='officer'){
  const r=entry,id=r.unit.id,work=currentDomesticWork(s,id),assignment=s.campaign.domestic.assignments.find(a=>a.officerId===id),order=s.campaign.domestic.orders.find(q=>q.officerIds.includes(id));
  const scout=scoutAssignment(s,id);if(scout)return [['正在做什么','在城工作 · 负责侦察'],['所在位置',town(s,scout.homeCity)],['侦察终点',town(s,scout.targetCity)],['模拟斥候',scoutStatus(scout)],['斥候位置',town(s,scout.location)+(scout.route.length?' → '+town(s,scout.route[0]):'')],['工作状态',scout.paused?'暂停':'办理中'],['视野持续时间','由负责人智力随机决定，智力越高持续越久']];
  if(r.personFate){const p=r.personFate;return [['正在做什么',p.status==='DEAD'?'已战死':p.custody?'被俘，押送途中':'被俘，等待赎回或释放'],['所在位置',town(s,p.cityId)+(p.custody?' → '+town(s,p.custody.route[0]):'')],['事由',p.fate.reason],['发生日期','第 '+p.fate.day+' 天']];}
  if(r.unit.mission){const m=r.unit.mission,p=m.type==='diplomacy'&&[...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts].find(p=>p.id===m.projectId),speed=m.captiveId?DIPLOMACY_RULES.captiveSpeed:m.cargo?DIPLOMACY_RULES.cargoSpeed:DIPLOMACY_RULES.lightSpeed;return [['正在做什么',missionStatus(m)],['所在位置',town(s,m.location)+(m.route.length?' → '+town(s,m.route[0]):'')],['所属岗位',town(s,m.homeCity)],['接洽或交付目的地',town(s,m.targetCity)],['当前事务',p?DIPLOMACY_GOALS[p.goal]:work?.title||'返城'],...(!p&&m.phase==='work'?[['当地办理剩余',days(work?.remaining??0)]]:[]),...(m.cargo?[['实际押运',`${m.cargo.amount}${m.cargo.kind==='grain'?'粮':'预备兵'}`]]:[]),['每日行动力',String(speed)],['路段进度',m.route.length?Math.floor(m.progress/roadCost(s,m.location,m.route[0])*100)+'%':'已抵达']];}
  const siege=s.campaign.battles.find(b=>!b.settled&&b.kind==='siege'&&b.cityId===r.city);
  const result=r.army?armyStatus(s,r.army):[
   ['所在位置',r.returning?'返城安排中':r.idle?.destination?route(s,{from:r.idle.location,to:r.idle.destination}):town(s,r.city)],
   ['正在做什么',r.returning?'等待战役结算后返城':r.idle?.retreating?(r.idle.journey?.blocked||'撤离途中'):r.idle?.destination?(r.idle.journey?.blocked||(isTransport(r.idle)?'运输途中':r.idle.movementReason||'调任途中')):siege?'据点被围 · 内政暂停':work?work.paused?'内政事务暂停':'办理内政事务':order?'等待原事务完成后执行命令':assignment?`${DIRECTIONS[assignment.direction]}任职 · ${assignment.waiting||'等待新事务'}`:s.cities.some(c=>c.governor===id)?'驻城任太守':r.prepared?'驻城备战':'驻城待命']]
  ;
  if(r.idle?.destination)result.push([r.returning?'返城目的地':'调任目的地',town(s,r.idle.destination)],['调任 / 返城剩余',days(r.idle.remainingDays)]);
  if(r.idle?.destination||r.idle?.retreating){const o=r.idle;result.push(['每日行动力',String(personnelSpeed(o))],['地图显示',o.retreating?'撤离队':isTransport(o)?'运输队':'轻装人才，不显示']);if(o.journey?.route.length)result.push(['当前路段',town(s,o.location)+' → '+town(s,o.journey.route[0])]);if(isTransport(o))result.push(['运输物资',`金 ${o.cargo?.gold||0} · 粮草 ${o.cargo?.grain||0} · 预备兵 ${o.cargo?.manpower||0}`],['随行部队',`${o.unit.troops} 人 · 伤兵 ${o.unit.wounded} 人`]);}
  if(work)result.push(['当前内政事务',`${work.title}${work.target?' · '+work.target:''}`],['事务剩余',days(work.remaining)+(work.paused||siege?' · 暂停':'')]);
  const diplomatic=diplomaticAssignment(s,id);if(diplomatic)result.push(['外交任职',DIPLOMACY_DIRECTIONS[diplomatic.direction].name+' · '+diplomatic.waiting]);
  if(order&&!result.some(([label])=>label==='等待命令'))result.push(['等待命令',strategicOrderLabel(s,order)],['执行时机','完成原事务后自动执行；期间不接新事务']);
  const battle=r.army&&armyBattle(s,r.army.id),unit=battle?.battle.sides.flatMap(side=>side.units).find(u=>u.id===id&&u.armyId===r.army.id);
  if(r.army&&r.unit.troops===0&&!unit)result.push(['人员状态','随军待整编'],['参战资格','尚无现役兵员，不能参战或提供军略；原任职保留']);
  if(unit)result.push(['战场状态',({active:'在场',reserve:'预备队',defeated:'已溃败',withdrawn:'已撤离'})[unit.status]||unit.status],['当前战斗行动',unit.action||'等待行动'],['战场实时兵力',String(Math.round(unit.hp))],['当前战意',String(Math.round(unit.intent))]);
  return result;
 }
 if(type==='city'){
  const siege=s.campaign.battles.find(b=>!b.settled&&b.kind==='siege'&&b.cityId===entry.id),assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===entry.id);
  const result=[['所在位置',[entry.province,entry.name].filter(Boolean).join(' · ')],['当前局势',siege?'正在遭受围攻':'未被围攻'],['正在办理',assignments.filter(a=>a.action).map(a=>`${index.officer.find(r=>r.unit.id===a.officerId)?.unit.name||'武将'}：${currentDomesticWork(s,a.officerId)?.title}（余 ${days(a.action.remaining)}${a.action.paused||siege?' · 暂停':''}）`).join('；')||'暂无正在办理的内政事务'],['待执行命令',String(s.campaign.domestic.orders.filter(q=>q.cityId===entry.id).length)+' 项']];
  if(siege)result.push(['当前战役',siege.name],['战役状态',battleLabel(siege)]);
  return result;
 }
 const armies=index.army.filter(a=>a.faction===entry.id),cities=index.city.filter(c=>c.owner===entry.id),battles=s.campaign.battles.filter(b=>!b.settled&&b.battle.sides.some(side=>side.faction===entry.id));
 return [['势力辖境',cities.map(c=>c.name).join('、')||'暂无据点'],['当前战事',battles.map(b=>b.name).join('、')||'暂无进行中的战役'],['军团动向',armies.map(a=>`${a.name}：${armyStatus(s,a).find(([label])=>label==='正在做什么')[1]}`).join('；')||'暂无出征军团'],['内政事务',String(s.campaign.domestic.assignments.filter(a=>a.action&&cities.some(c=>c.id===a.cityId)).length)+' 项办理中'],['调任途中',String(index.officer.filter(r=>r.faction===entry.id&&r.idle?.destination).length)+' 人']];
}
