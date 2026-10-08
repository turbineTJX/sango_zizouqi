import {residentOfficer} from './city-personnel.mjs';
import {ACTIONS,DIRECTIONS,assignmentFor,assignDomestic,dismissDomestic,actionName,cancelOrdersFor,removeDomesticOrder,recordDomesticOrder} from './domestic.mjs';
import {isPlanning,armyBattle,findCampaignRoute,roadLength,orderCampaignArmy,transferOfficer} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
const town=(s,id)=>s.cities.find(c=>c.id===id);
export function strategicOrderLabel(s,q){
 if(q.kind==='march')return `前往${town(s,q.target)?.name||'目标据点'}`;
 if(q.kind==='transfer')return `调任${town(s,q.target)?.name||'目标据点'}`;
 return q.kind==='dismiss'?'解除内政委任':`改任${DIRECTIONS[q.direction]}`;
}
export function currentDomesticWork(s,id){
 const a=assignmentFor(s,id),x=a?.action,c=a&&town(s,a.cityId);
 return x?{officerId:id,name:OFFICER_BY_ID[id].name,actionId:x.id,cityId:c.id,key:x.key,title:actionName(c,x.key),target:town(s,x.targetId)?.name||OFFICER_BY_ID[x.targetId]?.name||'',remaining:x.remaining,paused:x.paused,cost:x.cost}:null;
}
// Initial campaign army splitting runs before domestic orders are initialized.
export const armyWaitingOrder=(s,id)=>s.campaign.domestic?.orders.find(q=>q.kind==='march'&&q.armyId===id);
function normalize(s,command){
 if(command.kind==='march'){
  const a=s.armies.find(a=>a.id===command.armyId);
  return {kind:'march',armyId:command.armyId,cityId:a?.location,officerIds:a?.units.map(u=>u.id)||[],target:command.target,policy:command.policy||'auto'};
 }
 return {kind:command.kind,cityId:command.cityId,officerIds:[...new Set(command.officerIds||[])],...(command.kind==='assign'?{direction:command.direction}:command.kind==='transfer'?{target:command.target}:{})};
}
function check(s,q){
 if(s.finished)return '本局已结束';
 if(!['assign','march','transfer','dismiss'].includes(q.kind)||!q.officerIds.length)return '命令或武将无效';
 if(q.kind==='march'){
  const a=s.armies.find(a=>a.id===q.armyId);
  if(!a||a.disbanded||a.faction!=='cao'||a.location!==q.cityId)return '军团已不在原处';
  if(a.units.length!==q.officerIds.length||a.units.some(u=>!q.officerIds.includes(u.id)))return '军团编制已变化，请重新下令';
  if(armyBattle(s,a.id))return '军团正在交战';
  if(!town(s,q.target)||!['auto','main','side'].includes(q.policy))return '目标或道路选择无效';
  if(q.target!==a.location&&a.units.length>10)return '出征军团最多10队，请先拆分';
  if(!a.units.some(u=>u.troops>0))return '请先征募兵员';
  if(!findCampaignRoute(s,a.travel?.to||a.location,q.target,null,q.policy))return '道路不通';
  return null;
 }
 const c=town(s,q.cityId);if(c?.owner!=='cao')return '原据点已不属于己方';
 if(q.kind==='assign'&&!DIRECTIONS[q.direction])return '内政方向无效';
 if(q.kind==='transfer'&&(q.officerIds.length!==1||town(s,q.target)?.owner!=='cao'))return '调任目标无效';
 for(const id of q.officerIds){
  const o=residentOfficer(s,id);if(!o||o.faction!=='cao'||o.location!==q.cityId)return '武将已离开原据点';
  if(q.kind==='dismiss'&&!assignmentFor(s,id))return '武将已解除委任';
  if(q.kind==='transfer'){
   if(o.army)return '已编制部队，请用军团调动';
   if(s.cities.some(c=>c.governor===id))return '请先解除太守任命';
   if(!findCampaignRoute(s,o.location,q.target,'cao'))return '调任道路不通';
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
 if(q.kind==='march')return orderCampaignArmy(s,q.armyId,q.target,q.policy,{scheduled});
 if(q.kind==='transfer')return transferOfficer(s,q.officerIds[0],q.target,{scheduled});
 for(const id of q.officerIds){const error=q.kind==='assign'?assignDomestic(s,q.cityId,q.direction,id,{scheduled}):dismissDomestic(s,id,{scheduled});if(error)return error;}
 return null;
}
export function requestStrategicOrder(s,command,choice=null){
 if(!isPlanning(s))return {error:'须在筹划阶段下令'};
 if(choice!==null&&!['now','after'].includes(choice))return {error:'执行时机无效'};
 const q=normalize(s,command),error=check(s,q);if(error)return {error};
 const ids=affected(s,q),work=ids.map(id=>currentDomesticWork(s,id)).filter(Boolean),replacing=s.campaign.domestic.orders.filter(old=>old.officerIds.some(id=>q.officerIds.includes(id)));
 if(choice===null&&(work.length||replacing.length))return {confirmation:{command:q,work,replacing}};
 cancelOrdersFor(s,q.officerIds,'收到新的安排');
 if(choice!=='after'||!work.length){const error=apply(s,q);return error?{error}:{applied:true};}
 const groups=q.kind==='assign'?q.officerIds.map(id=>({...q,officerIds:[id]})):[q];
 for(const group of groups){
  const waits=work.filter(w=>group.officerIds.includes(w.officerId)).map(w=>({officerId:w.officerId,actionId:w.actionId}));
  if(!waits.length){const error=apply(s,group);if(error)return {error};continue;}
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
  if(q.kind==='march'&&armyBattle(s,q.armyId)){continue;}
  const error=check(s,q);if(error){removeDomesticOrder(s,q.id,error);continue;}
  if(waiting)continue;
  s.campaign.domestic.orders=s.campaign.domestic.orders.filter(x=>x.id!==q.id);
  const failure=apply(s,q,true);
  recordDomesticOrder(s,q,failure?'order-cancel':'order-done',failure?`后续命令取消：${failure}。`:`当前事务已结束，执行：${strategicOrderLabel(s,q)}。`);
 }
}
export function validateStrategicOrders(s){
 const d=s.campaign.domestic,fail=ok=>{if(!ok)throw new Error('后续命令存档无效');},ids=new Set(),officers=new Set(),int=n=>Number.isSafeInteger(n)&&n>0;
 for(const q of d.orders){
  fail(q&&int(q.id)&&q.id<d.nextId&&!ids.has(q.id)&&int(q.requestedDay)&&q.requestedDay<=s.campaign.day&&town(s,q.cityId)&&['assign','march','transfer','dismiss'].includes(q.kind));ids.add(q.id);
  fail(Array.isArray(q.officerIds)&&q.officerIds.length>0&&q.officerIds.length<=835);
  for(const id of q.officerIds){fail(OFFICER_BY_ID[id]&&!officers.has(id));officers.add(id);const o=residentOfficer(s,id);fail(o&&o.location===q.cityId&&o.faction==='cao');}
  fail(Array.isArray(q.waits)&&q.waits.length>0&&q.waits.length<=q.officerIds.length);const seen=new Set();
  for(const w of q.waits){fail(q.officerIds.includes(w.officerId)&&!seen.has(w.officerId)&&int(w.actionId)&&w.actionId<d.nextId);seen.add(w.officerId);const history=d.workHistory[w.officerId]?.find(x=>x.actionId===w.actionId);fail(assignmentFor(s,w.officerId)?.action?.id===w.actionId||history&&history.status!=='interrupted');}
  if(q.kind==='assign')fail(!!DIRECTIONS[q.direction]);
  if(q.kind==='march'){const a=s.armies.find(a=>a.id===q.armyId);fail(a&&!a.travel&&!a.route.length&&a.units.length<=10&&a.units.length===q.officerIds.length&&a.units.every(u=>q.officerIds.includes(u.id))&&town(s,q.target)&&q.target!==q.cityId&&['auto','main','side'].includes(q.policy));}
  if(q.kind==='transfer')fail(q.officerIds.length===1&&town(s,q.target)&&q.target!==q.cityId&&!residentOfficer(s,q.officerIds[0]).army);
 }
}
