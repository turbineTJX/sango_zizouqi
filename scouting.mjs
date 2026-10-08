import {mapNode,mapNodes} from './map-node-data.mjs';
import {roadCost} from './road-metrics.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {playerFaction} from './player-faction.mjs';
import {NATIONAL_FACTIONS as FACTIONS} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {personnelEvent} from './officer-fates.mjs';
import {recordOfficerActivities} from './officer-activity.mjs';
import {PROGRESSION} from './progression.mjs';
import {settleOfficerMerit} from './campaign-merit.mjs';
import {updateVision,visionPosition,armyObservation,directPointVisible} from './strategic-vision.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {scoutAssignments,scoutAssignment,scoutOperator,scoutingPosition,scoutVisionProxy,scoutRoute,scoutingNeighborhood} from './scouting-state.mjs';
export {scoutAssignments,scoutAssignment,scoutRoute,scoutTargets} from './scouting-state.mjs';
const copy=x=>structuredClone(x);
export function initializeScouting(s){s.campaign.scouting={version:1,seed:(s.seed^0x731ca4b9)>>>0,nextId:1,tasks:[]};}
export function scoutingDurationRange(intellect){
 const r=MOVEMENT_RULES.scouting,max=Math.max(r.minimumDays,Math.ceil(r.baseMaximumDays+Math.max(0,Math.min(100,intellect||0))/100*r.intellectExtension));
 return {min:Math.max(r.minimumDays,max-r.randomSpread),max};
}
function randomDuration(s,intellect){const state=s.campaign.scouting,range=scoutingDurationRange(intellect);state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return range.min+Math.floor(state.seed/4294967296*(range.max-range.min+1));}
export function scoutCandidates(s,cityId,faction=playerFaction(s)){
 return cityPersonnel(s,cityId).filter(o=>o.faction===faction&&!o.army&&!o.unit.mission&&!o.unit.scouting&&!s.cities.some(c=>c.governor===o.unit.id)&&!s.campaign.domestic.assignments.some(a=>a.officerId===o.unit.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(o.unit.id))&&!s.campaign.diplomacy.assignments.some(a=>a.officerId===o.unit.id)&&!plannedOfficer(s,o.unit.id)).sort((a,b)=>Number(a.unit.troops>0)-Number(b.unit.troops>0)||b.unit.intellect-a.unit.intellect||a.unit.id.localeCompare(b.unit.id));
}
function observedCity(c){return {...copy(c),units:copy(c.units.filter(u=>!u.mission))};}
function illuminate(s,t){
 const record=s.campaign.vision.factions[t.faction],p=scoutingPosition(s,t),radius=MOVEMENT_RULES.vision.scout;
 let spot=record.scouted.find(v=>Math.hypot(v.x-p.x,v.y-p.y)<=radius/2);
 if(spot?.seenDay===s.campaign.day)return;
 const duration=randomDuration(s,scoutOperator(s,t).unit.intellect),proxy=scoutVisionProxy(s,t);
 if(!spot){spot={id:record.nextSightId++,...p,...proxy,officerId:t.officerId,seenDay:s.campaign.day,expiresDay:s.campaign.day+duration};record.scouted.push(spot);}
 else Object.assign(spot,{...p,...proxy,officerId:t.officerId,seenDay:s.campaign.day,expiresDay:Math.max(spot.expiresDay,s.campaign.day+duration)});
}
function storeContact(s,t,kind,id,data){
 const key=kind+':'+id;let contact=t.contacts.find(c=>c.key===key),first=!contact;
 if(first){contact={key,kind,id,name:data.name,firstDay:s.campaign.day,report:null};t.contacts.push(contact);}
 contact.report={day:s.campaign.day,receivedDay:s.campaign.day,data};
 if(kind!=='node'&&!directPointVisible(s,kind==='army'?visionPosition(s,data):mapNode(s,id),t.faction)){
  const day=s.campaign.day,r=PROGRESSION.scouting,turn=Math.floor((day-1)/10),nodes=s.campaign.activity.nodes;
  const previous=nodes.filter(n=>n.result.scouting?.faction===t.faction&&n.result.scouting.key===key);
  if(!previous.some(n=>day-n.day<r.freshDays)){
   const used=nodes.filter(n=>n.result.scouting?.faction===t.faction&&n.officerId===t.officerId&&n.result.scouting.turn===turn).reduce((n,x)=>n+x.result.growth.gained,0),amount=Math.min(r.information,Math.max(0,r.maximumPerTurn-used));
   if(amount){settleOfficerMerit(s,scoutOperator(s,t).unit,{sourceId:`scout-information:${t.faction}:${key}:${day}`,amount,faction:t.faction,cityId:t.homeCity,reason:`取得${data.name}有效情报`});nodes.at(-1).result.scouting={faction:t.faction,key,turn};}
  }
 }
 if(first){const u=scoutOperator(s,t).unit,details=kind==='city'?`驻城${data.units.reduce((n,u)=>n+u.troops,0)}人，存粮${Math.floor(data.grain)}。`:kind==='army'?`兵力${data.units.reduce((n,u)=>n+u.troops,0)}人。`:'';
  personnelEvent(s,`scout:${t.id}:${key}:intel`,'SCOUT_INTEL',u,`${u.name}收到${contact.name}的侦察情报：${details}`);
 }
}
function scan(s,t){
 illuminate(s,t);const p=scoutingPosition(s,t),radius=MOVEMENT_RULES.vision.scout,near=v=>Math.hypot(p.x-v.x,p.y-v.y)<=radius;
 for(const c of mapNodes(s))if(near(c)&&c.owner!==t.faction)storeContact(s,t,c.units?'city':'node',c.id,c.units?observedCity(c):copy(c));
 for(const a of s.armies)if(!a.disbanded&&a.faction!==t.faction&&near(visionPosition(s,a)))storeContact(s,t,'army',a.id,armyObservation(s,a));
}
export function dispatchScout(s,cityId,officerId,target,{faction=playerFaction(s),scheduled=false}={}){
 if(s.finished||!scheduled&&s.campaign.phase!=='planning'||mapNode(s,cityId)?.owner!==faction)return '请在筹划阶段从己方城市指派侦察负责人';
 if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===cityId))return '围城期间不能指派侦察';
 const o=scoutCandidates(s,cityId,faction).find(o=>o.unit.id===officerId),route=mapNode(s,target)&&scoutRoute(s,cityId,target);
 if(!o)return '请选择本城未任职且没有其它任务或待执行命令的武将';
 if(!route?.length)return '请选择本城周边据点或相邻城市，斥候不能穿过其它城市继续侦察';
 const t={id:'scout-'+s.campaign.scouting.nextId++,officerId,faction,homeCity:cityId,targetCity:target,location:cityId,route,progress:0,phase:'outbound',paused:false,lastDay:s.campaign.day-1,contacts:[]};
 o.unit.scouting=t.id;s.campaign.scouting.tasks.push(t);
 personnelEvent(s,`scout:${t.id}:out`,'SCOUT_OUT',o.unit,`${o.unit.name}留在${mapNode(s,cityId).name}负责侦察，派出斥候沿路前往${mapNode(s,target).name}。`);
 scan(s,t);recordOfficerActivities(s);updateVision(s);return null;
}
export function recallScout(s,officerId,{faction=playerFaction(s)}={}){
 const t=scoutAssignment(s,officerId);if(!t||t.faction!==faction)return '该武将没有负责的侦察工作';
 const o=scoutOperator(s,t),lost=s.campaign.domestic.people.find(p=>p.id===officerId)?.unit;if(o)delete o.unit.scouting;if(lost)delete lost.scouting;
 s.campaign.scouting.tasks=s.campaign.scouting.tasks.filter(x=>x!==t);
 if(o)personnelEvent(s,`scout:${t.id}:stop`,'SCOUT_RECALL',o.unit,`${o.unit.name}停止负责侦察，恢复在城待命。`);
 recordOfficerActivities(s);updateVision(s);return null;
}
export function reconcileScouting(s){
 for(const t of [...scoutAssignments(s)]){
  const o=scoutOperator(s,t);
  if(!o||o.faction!==t.faction||o.location!==t.homeCity||o.destination||o.retreating||o.unit.mission||mapNode(s,t.homeCity).owner!==t.faction){recallScout(s,t.officerId,{faction:t.faction});continue;}
  t.paused=s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===t.homeCity);
 }
}
export function advanceScouting(s){
 reconcileScouting(s);
 for(const t of [...scoutAssignments(s)]){
  if(t.lastDay===s.campaign.day)continue;t.lastDay=s.campaign.day;
  const o=scoutOperator(s,t);
  if(!o||o.faction!==t.faction||o.location!==t.homeCity||o.destination||o.retreating||o.unit.mission||mapNode(s,t.homeCity).owner!==t.faction){recallScout(s,t.officerId,{faction:t.faction});continue;}
  t.paused=s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===t.homeCity);if(t.paused)continue;
  scan(s,t);let budget=MOVEMENT_RULES.scouting.speed;
  while(t.route.length&&budget>0){const to=t.route[0],a=mapNode(s,t.location),b=mapNode(s,to),cost=roadCost(s,t.location,to),sample=cost*MOVEMENT_RULES.vision.scout/2/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));const used=Math.min(budget,sample,cost-t.progress);t.progress+=used;budget-=used;scan(s,t);
   if(t.progress>=cost){t.location=to;t.route.shift();t.progress=0;scan(s,t);}
  }
  if(!t.route.length)t.phase='watch';
  if(t.phase==='watch'){
   const day=s.campaign.day,turn=Math.floor((day-1)/10),r=PROGRESSION.scouting,nodes=s.campaign.activity.nodes,key='watch:'+t.targetCity;
   const duplicate=nodes.some(n=>n.day===day&&n.result.scouting?.faction===t.faction&&n.result.scouting.key===key);
   const used=nodes.filter(n=>n.result.scouting?.faction===t.faction&&n.officerId===t.officerId&&n.result.scouting.turn===turn).reduce((n,x)=>n+x.result.growth.gained,0),amount=Math.min(r.watchPerDay,Math.max(0,r.maximumPerTurn-used));
   if(!duplicate&&amount){settleOfficerMerit(s,o.unit,{sourceId:`scout-watch:${t.faction}:${t.targetCity}:${day}`,amount,faction:t.faction,cityId:t.homeCity,reason:`维持${mapNode(s,t.targetCity).name}驻察`});nodes.at(-1).result.scouting={faction:t.faction,key,turn};}
  }
 }
 updateVision(s);
}
export function validateScouting(s){
 const v=s.campaign.scouting,fail=x=>{if(!x)throw Error('侦察工作存档无效');},integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 fail(v?.version===1&&integer(v.seed,0,0xffffffff)&&integer(v.nextId,1)&&Array.isArray(v.tasks)&&v.tasks.length<=Object.keys(OFFICER_BY_ID).length);
 const ids=new Set(),officers=new Set();
 for(const t of v.tasks){const o=scoutOperator(s,t);fail(typeof t.id==='string'&&/^scout-\d+$/.test(t.id)&&Number(t.id.slice(6))<v.nextId&&!ids.has(t.id)&&!officers.has(t.officerId)&&Object.hasOwn(FACTIONS,t.faction)&&mapNode(s,t.homeCity)?.units&&mapNode(s,t.targetCity)&&mapNode(s,t.location)&&['outbound','watch'].includes(t.phase)&&typeof t.paused==='boolean'&&integer(t.lastDay,0,s.campaign.day)&&Array.isArray(t.route)&&t.route.length<=mapNodes(s).length&&Number.isFinite(t.progress)&&t.progress>=0&&o?.unit.scouting===t.id&&o.faction===t.faction&&o.location===t.homeCity&&!o.destination&&!o.retreating&&!o.unit.mission);
  const nearby=scoutingNeighborhood(s,t.homeCity);fail(nearby.has(t.location)&&scoutRoute(s,t.homeCity,t.targetCity)?.length&&(t.location===t.homeCity||scoutRoute(s,t.homeCity,t.location)?.length));
  ids.add(t.id);officers.add(t.officerId);let from=t.location;const seen=new Set([from]);for(const to of t.route){fail(!seen.has(to)&&Number.isFinite(roadCost(s,from,to)));seen.add(to);from=to;}
  fail([t.location,...t.route].every((id,index,list)=>nearby.has(id)&&(id===t.homeCity||id===t.targetCity&&index===list.length-1||!s.cities.some(c=>c.id===id))));
  fail(t.route.length?t.phase==='outbound'&&t.progress<roadCost(s,t.location,t.route[0])&&from===t.targetCity:t.progress===0&&t.phase==='watch'&&t.location===t.targetCity);
  fail(!s.campaign.domestic.assignments.some(a=>a.officerId===t.officerId)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(t.officerId))&&!s.campaign.diplomacy.assignments.some(a=>a.officerId===t.officerId)&&!s.cities.some(c=>c.governor===t.officerId));
  fail(Array.isArray(t.contacts)&&t.contacts.length<=mapNodes(s).length+200&&new Set(t.contacts.map(c=>c.key)).size===t.contacts.length);
  for(const c of t.contacts){fail(['city','node','army'].includes(c.kind)&&c.key===c.kind+':'+c.id&&typeof c.name==='string'&&integer(c.firstDay,1,s.campaign.day)&&(c.kind==='army'?typeof c.id==='string'&&/^a\d+$/.test(c.id):!!mapNode(s,c.id))&&c.report);
   for(const r of [c.report]){fail(integer(r.day,c.firstDay,s.campaign.day)&&r.data?.id===c.id&&typeof r.data.name==='string');if(c.kind==='army')fail(Array.isArray(r.data.units)&&r.data.route?.length===0&&r.data.target===null&&r.data.supplyLine===null);else if(c.kind==='city')fail(Array.isArray(r.data.units)&&Number.isFinite(r.data.grain));}
   if(c.report)fail(integer(c.report.receivedDay,c.report.day,s.campaign.day));
  }
 }
 for(const u of [...s.cities.flatMap(c=>c.units),...s.armies.flatMap(a=>a.units),...s.campaign.idle.map(o=>o.unit)])fail(!u.scouting||ids.has(u.scouting)&&officers.has(u.id));
}
