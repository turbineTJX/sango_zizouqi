import {validMapRoute} from "./strategic-movement.mjs";
import {intelligenceWorld} from './strategic-vision.mjs';
import {mapNode} from './road-network.mjs';
import {playerFaction,isAIControlled} from './player-faction.mjs';
import {strategicDepartureError} from './strategic-ai.mjs';
import {threatenedTransportRoute} from './strategic-movement.mjs';
import {missionOfficer,missionUnits,recallOfficerMission,missionStatus} from './officer-missions.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {DIRECTIONS,TECHS,assignmentFor,assignDomestic,dismissDomestic,actionName,cancelOrdersFor,removeDomesticOrder,recordDomesticOrder} from './domestic.mjs';
import {prepareDepartureUnits,expeditionError,launchExpedition,isPlanning,armyBattle,findCampaignRoute,orderCampaignArmy,transferOfficer} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {requestDiplomaticInterruption,clearDiplomaticAppointments} from './diplomacy.mjs';
const town=mapNode;
export function strategicOrderLabel(s,q){
 if(q.kind==='expedition')return `编组出征${town(s,q.target)?.name||'目标据点'}`;
 if(q.kind==='march')return `前往${town(s,q.target)?.name||'目标据点'}`;
 if(q.kind==='transfer')return `调任${town(s,q.target)?.name||'目标据点'}`;
 return q.kind==='dismiss'?'解除内政委任':`改任${DIRECTIONS[q.direction]}`;
}
export function currentDomesticWork(s,id){
 const a=assignmentFor(s,id),x=a?.action,c=a&&town(s,a.cityId);
 return x?{officerId:id,name:OFFICER_BY_ID[id].name,actionId:x.id,cityId:c.id,key:x.key,title:actionName(c,x.key)+(missionOfficer(s,id)?' · '+missionStatus(missionOfficer(s,id).unit.mission):''),target:TECHS[x.targetId]?.name||town(s,x.targetId)?.name||OFFICER_BY_ID[x.targetId]?.name||'',remaining:x.remaining,paused:x.paused,cost:x.cost}:null;
}
// Initial campaign army splitting runs before domestic orders are initialized.
export const armyWaitingOrder=(s,id)=>s.campaign.domestic?.orders.find(q=>q.kind==='march'&&q.armyId===id);
function normalize(s,command){
 if(command.kind==='expedition')return {kind:'expedition',cityId:command.cityId,officerIds:[...new Set(command.officerIds||[])],leader:command.leader,advisor:command.advisor,target:command.target,policy:command.policy||'auto',...(command.route?{route:[...command.route]}:{}),minSupply:command.minSupply??0};
 if(command.kind==='march'){
  const a=s.armies.find(a=>a.id===command.armyId);
  return {kind:'march',armyId:command.armyId,cityId:a?.location,officerIds:a?.units.map(u=>u.id)||[],target:command.target,policy:command.policy||'auto',...(command.route?{route:[...command.route]}:{})};
 }
 return {kind:command.kind,cityId:command.cityId,officerIds:[...new Set(command.officerIds||[])],...(command.kind==='assign'?{direction:command.direction}:command.kind==='transfer'?{target:command.target,cargo:{gold:0,grain:0,manpower:0,...command.cargo},relay:command.relay||null,cycles:command.cycles||0,safeOnly:command.safeOnly===true,...(command.route?{route:[...command.route]}:{})}:{})};
}
function check(s,q){
 const faction=q.faction;
 if(q.officerIds.some(id=>missionOfficer(s,id))){const local=structuredClone(s);for(const u of missionUnits(local))delete u.mission;return check(local,q);}
 if(s.finished)return '本局已结束';
 if(!['assign','march','expedition','transfer','dismiss'].includes(q.kind)||!q.officerIds.length)return '命令或武将无效';
 if(q.officerIds.some(id=>residentOfficer(s,id)?.unit.scouting))return '该武将正在负责侦察，请先停止侦察';
 if(q.kind==='expedition'){const error=expeditionError(s,q,{scheduled:true,faction});if(error)return error;if(!Number.isSafeInteger(q.minSupply)||q.minSupply<0||q.minSupply>q.officerIds.length*900)return '携粮要求无效';return town(s,q.cityId).grain<q.minSupply?'粮草未达到出征要求':null;}
 if(q.kind==='march'){
  const a=s.armies.find(a=>a.id===q.armyId);
  if(!a||a.disbanded||a.faction!==faction||a.location!==q.cityId)return '军团已不在原处';
  if(a.units.length!==q.officerIds.length||a.units.some(u=>!q.officerIds.includes(u.id)))return '军团编制已变化，请重新下令';
  if(armyBattle(s,a.id))return '军团正在交战';
  if(!town(s,q.target)||!['auto','main'].includes(q.policy))return '目标或道路选择无效';
  if(q.target!==a.location&&a.units.filter(u=>u.troops>0).length>10)return '出征军团最多10队，请先拆分';
  if(!a.units.some(u=>u.troops>0))return '请先征募兵员';
  if(q.route!==undefined&&!validMapRoute(s,a.travel?.to||a.location,q.target,q.route))return '所选道路不连续或已失效';
  if(!findCampaignRoute(s,a.travel?.to||a.location,q.target,null,q.policy))return '道路不通';
  return null;
 }
 const c=town(s,q.cityId);if(c?.owner!==faction)return '原据点已不属于己方';
 if(q.kind==='assign'&&!DIRECTIONS[q.direction])return '内政方向无效';
 if(q.kind==='transfer'&&(q.officerIds.length!==1||town(s,q.target)?.owner!==faction))return '调任目标无效';
 for(const id of q.officerIds){
  const o=residentOfficer(s,id);if(!o||o.faction!==faction||o.location!==q.cityId)return '武将已离开原据点';
  if(q.kind==='dismiss'&&!assignmentFor(s,id))return '武将已解除委任';
  if(q.kind==='transfer'){
   const error=transferOfficer(s,id,q.target,{scheduled:true,cargo:q.cargo,relay:q.relay,cycles:q.cycles,route:q.route,checkOnly:true,faction});if(error)return error;
   if(s.cities.some(c=>c.governor===id))return '请先解除太守任命';
   const path=q.route||(q.relay?[...findCampaignRoute(s,o.location,q.relay,faction),...findCampaignRoute(s,q.relay,q.target,faction)]:findCampaignRoute(s,o.location,q.target,faction));if(!path)return '调任道路不通';
   if(q.safeOnly&&threatenedTransportRoute(intelligenceWorld(s,faction),o.location,path,faction))return '运输道路出现敌军，取消本次安排';
  }
 }
 return null;
}
function affected(s,q){
 if(q.kind==='march'){const a=s.armies.find(a=>a.id===q.armyId);if(!a.travel&&q.target===a.location)return [];}
 if(q.kind==='transfer'&&q.target===q.cityId)return [];
 return q.officerIds.filter(id=>q.kind!=='assign'||assignmentFor(s,id)?.direction!==q.direction);
}
function apply(s,q,scheduled=false){
 const faction=q.faction;
 if(q.kind==='expedition'){const error=launchExpedition(s,q,{scheduled,faction});if(!error)clearDiplomaticAppointments(s,q.officerIds);return error;}
 if(q.kind==='march')return orderCampaignArmy(s,q.armyId,q.target,q.policy,{scheduled,faction,path:q.route});
 if(q.kind==='transfer'){const error=transferOfficer(s,q.officerIds[0],q.target,{scheduled,cargo:q.cargo,relay:q.relay,cycles:q.cycles,route:q.route,faction});if(!error)clearDiplomaticAppointments(s,q.officerIds);return error;}
 for(const id of q.officerIds){const error=q.kind==='assign'?assignDomestic(s,q.cityId,q.direction,id,{scheduled,faction}):dismissDomestic(s,id,{scheduled,faction});if(error)return error;}
 clearDiplomaticAppointments(s,q.officerIds);
 return null;
}
export function requestStrategicOrder(s,command,choice=null){
 if(s.campaign.allAI)return {error:'全 AI 观战由 AI 安排军政事务'};
 return requestFactionOrder(s,playerFaction(s),command,choice,false);
}
// Controller identity is explicit; never swap the player's faction or treasury.
export function requestFactionOrder(s,faction,command,choice='after',scheduled=true){
 if(!scheduled&&!isPlanning(s))return {error:'须在筹划阶段下令'};
 const diplomatic=requestDiplomaticInterruption(s,faction,command,choice);if(diplomatic)return diplomatic;
 if(command.kind==='expedition'&&command.formation){
  const next=structuredClone(s),away=missionUnits(next).filter(u=>command.officerIds.includes(u.id)).map(u=>({u,m:u.mission}));for(const x of away)delete x.u.mission;const error=prepareDepartureUnits(next,command.cityId,command.officerIds,command.formation.types,command.formation.reinforce,command.formation.troops,command.formation.disbandIds,command.formation.equipment);for(const x of away)x.u.mission=x.m;if(error)return {error};
  const clean={...command};delete clean.formation;const result=requestFactionOrder(next,faction,clean,choice,scheduled);
  if(result.confirmation)result.confirmation.command=structuredClone(command);
  else if(!result.error)Object.assign(s,next);
  return result;
 }

 if(!scheduled&&!isPlanning(s))return {error:'须在筹划阶段下令'};
 if(choice!==null&&!['now','after'].includes(choice))return {error:'执行时机无效'};
 const q={...normalize(s,command),faction},error=check(s,q);if(error)return {error};
 const ids=affected(s,q),work=ids.map(id=>currentDomesticWork(s,id)).filter(Boolean),replacing=s.campaign.domestic.orders.filter(old=>old.officerIds.some(id=>q.officerIds.includes(id)));
 if(choice===null&&(work.length||replacing.length))return {confirmation:{command:q,work,replacing}};
 cancelOrdersFor(s,q.officerIds,'收到新的安排');
 const travelers=q.officerIds.map(id=>missionOfficer(s,id)).filter(Boolean);if(choice==='now')for(const o of travelers)recallOfficerMission(s,o.unit);
 if(!travelers.length&&(choice!=='after'||!work.length)){const error=apply(s,q,scheduled);return error?{error}:{applied:true};}
 const groups=q.kind==='assign'?q.officerIds.map(id=>({...q,officerIds:[id]})):[q];
 for(const group of groups){
  const waits=work.filter(w=>group.officerIds.includes(w.officerId)).map(w=>({officerId:w.officerId,actionId:w.actionId}));
  if(!waits.length){const error=apply(s,group,scheduled);if(error)return {error};continue;}
  const order={...group,id:s.campaign.domestic.nextId++,requestedDay:s.campaign.day,waits};
  s.campaign.domestic.orders.push(order);recordDomesticOrder(s,order,'order-wait',`${group.officerIds.map(id=>OFFICER_BY_ID[id].name).join('、')}：完成当前事务后${strategicOrderLabel(s,order)}。`);
 }
 return {queued:true};
}
export function resolveStrategicOrders(s){
 for(const q of [...s.campaign.domestic.orders]){
  let failed=false,waiting=false;
  for(const w of q.waits){
   if(assignmentFor(s,w.officerId)?.action?.id===w.actionId){waiting=true;continue;}
   const result=s.campaign.domestic.workHistory[w.officerId]?.find(x=>x.actionId===w.actionId);
   if(!result||result.status==='interrupted'){removeDomesticOrder(s,q.id,'原事务被中止或岗位已变化');failed=true;break;}
  }
  if(failed)continue;
  if(q.kind==='march'&&armyBattle(s,q.armyId)||q.kind==='expedition'&&s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===q.cityId)){continue;}
  const error=check(s,q);if(error){removeDomesticOrder(s,q.id,error);continue;}
  if(waiting)continue;
  if(q.kind==='expedition'&&isAIControlled(s,q.faction)){
   const safety=strategicDepartureError(s,q);if(safety){removeDomesticOrder(s,q.id,safety);continue;}
  }
  s.campaign.domestic.orders=s.campaign.domestic.orders.filter(x=>x.id!==q.id);
  const failure=apply(s,q,true);
  recordDomesticOrder(s,q,failure?'order-cancel':'order-done',failure?`后续命令取消：${failure}。`:`当前事务已结束，执行：${strategicOrderLabel(s,q)}。`);
 }
}
export function validateStrategicOrders(s){
 const d=s.campaign.domestic,fail=ok=>{if(!ok)throw new Error('后续命令存档无效');},ids=new Set(),officers=new Set(),int=n=>Number.isSafeInteger(n)&&n>0;
 for(const q of d.orders){
  const faction=q.faction;fail(typeof faction==='string'&&s.cities.some(c=>c.owner===faction));
  fail(q&&int(q.id)&&q.id<d.nextId&&!ids.has(q.id)&&int(q.requestedDay)&&q.requestedDay<=s.campaign.day&&town(s,q.cityId)&&['assign','march','expedition','transfer','dismiss'].includes(q.kind));ids.add(q.id);
  fail(Array.isArray(q.officerIds)&&q.officerIds.length>0&&q.officerIds.length<=Object.keys(OFFICER_BY_ID).length);
  for(const id of q.officerIds){fail(OFFICER_BY_ID[id]&&!officers.has(id));officers.add(id);const o=residentOfficer(s,id)||missionOfficer(s,id);fail(o&&o.location===q.cityId&&o.faction===faction);}
  fail(Array.isArray(q.waits)&&q.waits.length>0&&q.waits.length<=q.officerIds.length);const seen=new Set();
  for(const w of q.waits){fail(q.officerIds.includes(w.officerId)&&!seen.has(w.officerId)&&int(w.actionId)&&w.actionId<d.nextId);seen.add(w.officerId);const history=d.workHistory[w.officerId]?.find(x=>x.actionId===w.actionId);fail(assignmentFor(s,w.officerId)?.action?.id===w.actionId||history&&history.status!=='interrupted');}
  if(q.route!==undefined)fail(validMapRoute(s,q.cityId,q.target,q.route));
  if(q.kind==='expedition')fail(Number.isSafeInteger(q.minSupply)&&q.minSupply>=0&&q.minSupply<=q.officerIds.length*900&&q.officerIds.length<=10&&q.officerIds.includes(q.leader)&&q.officerIds.includes(q.advisor)&&!Object.hasOwn(q,'deputy')&&town(s,q.target)&&q.target!==q.cityId&&['auto','main'].includes(q.policy));
  if(q.kind==='assign')fail(!!DIRECTIONS[q.direction]);
  if(q.kind==='march'){const a=s.armies.find(a=>a.id===q.armyId);fail(a&&!a.travel&&!a.route.length&&a.units.filter(u=>u.troops>0).length<=10&&a.units.length===q.officerIds.length&&a.units.every(u=>q.officerIds.includes(u.id))&&town(s,q.target)&&q.target!==q.cityId&&['auto','main'].includes(q.policy));}
  if(q.kind==='transfer'){fail(typeof q.safeOnly==='boolean'&&q.cargo&&['gold','grain','manpower'].every(k=>Number.isSafeInteger(q.cargo[k])&&q.cargo[k]>=0));} if(q.cycles!==undefined)fail(Number.isInteger(q.cycles)&&q.cycles>=0&&q.cycles<=5&&q.cycles!==1);
  if(q.relay)fail(q.kind==='transfer'&&town(s,q.relay)&&q.relay!==q.target&&q.relay!==q.cityId);
  if(q.kind==='transfer')fail(q.officerIds.length===1&&town(s,q.target)&&q.target!==q.cityId&&!(residentOfficer(s,q.officerIds[0])||missionOfficer(s,q.officerIds[0])).army);
 }
}
