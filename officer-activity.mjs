import {scoutAssignment} from './scouting-state.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {ACTIONS,BUILDINGS,DIRECTIONS} from './domestic-designs.mjs';
import {mapNode} from './map-node-data.mjs';
import {roadCost,roadDistance} from './road-metrics.mjs';
import {constructionSiteAvailable} from './metropolitan-areas.mjs';
import {activityNodeEntry,validateActivityNodes} from './activity-nodes.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';

export const ACTIVITY_VERSION=2;
export const domesticWorkplace=def=>!def?null:def.kind==='build'?def.value:['research','trial'].includes(def.kind)?'workshop':def.kind==='heal'?'clinic':def.kind==='recruit'?'barracks':def.kind==='repair'||def.kind==='prepare'&&def.value==='shield'?'walls':def.kind==='prepare'?'drill':def.kind==='rescue'&&def.value==='mold'||def.kind==='trade'&&def.value==='buy'?'granary':def.direction==='agriculture'?'farm':def.direction==='talent'?'hall':def.direction==='military'?'walls':'commerce';
const clamp=n=>Math.max(0,Math.min(100,Math.floor(n)));

// One read-only projection supplies the daily ledger and building occupants.
export function officerActivities(s,{all=true}={}){
 const byId=new Map(),assignments=new Map((s.campaign.domestic?.assignments||[]).map(a=>[a.officerId,a]));
 const battles=new Map();for(const r of s.campaign.battles.filter(r=>!r.settled))for(const id of r.armyIds)battles.set(id,r);
 const sieges=new Set(s.campaign.battles.filter(r=>!r.settled&&r.kind==='siege').map(r=>r.cityId));
 const governors=new Map(s.cities.filter(c=>c.governor).map(c=>[c.governor,c]));
 const nodes=new Map([...s.cities,...(s.junctions||[])].map(c=>[c.id,c]));
 const town=id=>nodes.get(id)?.name||'位置未确认';
 const state=(faction,siteId,code,action,buildingKey=null,paused=false)=>({faction: faction||'neutral',siteId:siteId||null,fromId:null,toId:null,progress:null,buildingKey,paused,code,place:siteId?town(siteId):'—',action});
 const journey=(faction,fromId,toId,progress,code,action)=>({...state(faction,fromId,code,action),fromId,toId,progress:clamp(progress),place:town(fromId)+' → '+town(toId)+'（途中）'});
 function person(unit,faction,location,{army=null,idle=null,returning=false}={}){
  const id=unit.id,a=assignments.get(id),x=a?.action,def=x&&ACTIONS[x.key],m=unit.mission;
  let v;
  if(m){
   const label=m.type==='diplomacy'?m.blocked|| (m.phase==='return'?'外交返程':m.purpose==='cargo'?'外交押运':m.purpose==='prisoner'?'外交押送俘虏':m.phase==='outbound'?'外交出使途中':'外交接洽／等待方案批准'):m.phase==='outbound'?'赴访途中':m.phase==='work'?'外地接洽人才':m.cancelled?'任务中止，返城途中':'办事结束，返城途中';
   const building=m.type==='diplomacy'&&m.purpose==='cargo'?(m.cargo?.kind==='manpower'?'barracks':'granary'):'hall';
   v=m.route.length?journey(m.faction,m.location,m.route[0],m.progress/roadCost(s,m.location,m.route[0])*100,'mission',label):state(m.faction,m.location,'mission',label,m.phase==='work'?building:null,!!m.blocked);
  }else if(idle?.destination||idle?.retreating){
   const o=idle,to=o.journey?.route[0],blocked=o.journey?.blocked,transport=o.unit.troops>0||o.unit.wounded>0||o.cargo?.gold>0||o.cargo?.grain>0||o.cargo?.manpower>0||o.convoyCycle;
   const label=blocked|| (o.retreating?'撤离途中':transport?'运输途中':o.movementReason||'调任途中');
   v=to?journey(faction,o.location,to,o.journey.progress/roadCost(s,o.location,to)*100,'travel',label):state(faction,o.location,'travel',label,null,!!blocked);
  }else if(army){
   const battle=battles.get(army.id),live=battle?.battle.sides.flatMap(side=>side.units).find(u=>u.id===id&&u.armyId===army.id);
   if(battle){const status=battle.awaiting?'等待战前决策':!battle.battle.deploymentLocked?'战前布阵':({active:'参战',reserve:'预备待命',defeated:'部队溃败',withdrawn:'撤离战场'})[live?.status]||'随军待整编';v=state(faction,battle.cityId,'battle',battle.name+' · '+status);v.place=(battle.kind==='siege'?town(battle.cityId):town(battle.cityId)+'附近')+' · 战场';}
   else if(army.travel){const t=army.travel;v=journey(faction,t.from,t.to,t.progress/roadDistance(s,t.from,t.to)*100,'march',army.name+' · 行军');}
   else v=state(faction,army.location,'army',army.name+' · '+(army.cooldownDay>s.campaign.day?'战后休整':unit.troops===0?'随军待整编':army.route.length?'待出发':'驻扎待命'));
  }else if(returning)v=state(faction,location,'return','等待战役结算后返城');
  else if(unit.scouting){const t=scoutAssignment(s,id);v=state(faction,location,'scouting','负责侦察'+(t?.paused?' · 暂停':''),'hall',!!t?.paused);}
  else if(x&&def){
   const siteId=x.siteId||a.cityId,c=mapNode(s,a.cityId),paused=!!x.paused||sieges.has(siteId)||def.kind==='build'&&!constructionSiteAvailable(s,c,siteId);
   v=state(faction,siteId,'domestic',def.name+(paused?' · 暂停':''),domesticWorkplace(def),paused);
  }else if(governors.has(id))v=state(faction,location,'governor','担任太守，处理城务');
  else if(diplomaticAssignment(s,id)){const d=diplomaticAssignment(s,id);v=state(faction,location,'diplomacy',DIPLOMACY_DIRECTIONS[d.direction].name+'任职 · '+d.waiting);}
  else if(a)v=state(faction,location,'assigned',DIRECTIONS[a.direction]+'任职 · '+(a.waiting||'等待新事务'));
  else v=state(faction,location,'idle',sieges.has(location)?'据点被围，驻城待命':unit.troops>0?'驻城备战':'驻城待命');
  if(v.buildingKey)v.place+=' · '+BUILDINGS[v.buildingKey].name;
  byId.set(id,{id,name:unit.name,...v});
 }
 for(const c of s.cities)for(const u of c.units)person(u,c.owner,c.id);
 for(const a of s.armies.filter(a=>!a.disbanded))for(const u of a.units)person(u,a.faction,a.location,{army:a});
 for(const o of s.campaign.idle)person(o.unit,o.faction,o.location,{idle:o});
 for(const a of s.armies)for(const o of a.returningOfficers||[])if(!byId.has(o.unit.id))person(o.unit,o.faction,o.location,{returning:true});
 if(all)for(const p of s.campaign.domestic.people){
  const name=p.unit?.name||OFFICER_BY_ID[p.id]?.name||p.id,f=p.fate?.originalFaction||'neutral';let v;
  if(p.status==='CAPTIVE'){const t=p.custody;v=t?.route.length?journey(f,p.cityId,t.route[0],t.progress/roadCost(s,p.cityId,t.route[0])*100,'captive','被俘，押送途中'):state(f,p.cityId,'captive','被俘，关押中');}
  else if(p.status==='DEAD')v=state(f,p.fate?p.cityId:null,'dead',p.fate?'已战死 · '+p.fate.reason:'已故');
  else if(p.status==='NOT_DEBUTED'||p.status==='EXCLUDED')v=state(f,null,'absent','尚未登场');
  else if(p.travel){const t=p.travel;v=journey(f,p.cityId,t.path[0],t.progress/roadCost(s,p.cityId,t.path[0])*100,'free-travel','在野游历');}
  else v=state(f,p.cityId,'free',s.campaign.talent.records[p.id]?.phase==='SEEK'?'在野求仕':'在野闲居');
  byId.set(p.id,{id:p.id,name,...v});
 }
 if(all)for(const [id,u] of Object.entries(OFFICER_BY_ID))if(!byId.has(id))byId.set(id,{id,name:u.name,...state('neutral',null,'absent','尚未登场')});
 return byId;
}

export function initializeOfficerActivities(s){s.campaign.activity={version:ACTIVITY_VERSION,records:{},nodes:[],nextSequence:1};recordOfficerActivities(s);}
export function recordOfficerActivities(s,{all=true}={}){
 const ledger=s.campaign.activity;if(!ledger)return;
 const day=s.campaign.day;
 for(const [id,{id:unusedId,name:unusedName,...snapshot}] of officerActivities(s,{all})){
  const history=ledger.records[id]??=[],last=history.at(-1);
  if(last&&JSON.stringify(last.snapshot)===JSON.stringify(snapshot)){if(last.toDay!==day)last.toDay=day;continue;}
  history.push({fromDay:day,toDay:day,sequence:ledger.nextSequence++,snapshot});
 }
}

// Expand saved intervals into individual days only for the requested UI page.
export function officerActivityDays(s,id,{beforeDay=s.campaign.day,limit=30}={}){
 const end=Math.min(s.campaign.day,Math.max(1,beforeDay)),start=Math.max(1,end-limit+1),history=s.campaign.activity?.records[id]||[],rows=[];
 const nodes=(s.campaign.activity?.nodes||[]).filter(n=>n.officerIds.includes(id));
 for(let day=end;day>=start;day--){const actions=[...history.filter(r=>r.fromDay<=day&&r.toDay>=day).map(r=>({...r.snapshot,sequence:r.sequence})),...nodes.filter(n=>n.day===day).map(n=>activityNodeEntry(s,n))].sort((a,b)=>a.sequence-b.sequence);rows.push({day,actions});}
 const live=officerActivities(s).get(id);
 if(rows[0]?.day===s.campaign.day&&live){const {id:unusedId,name:unusedName,...snapshot}=live,actions=rows[0].actions,last=actions.findLast(a=>!a.milestone),saved=last&&Object.fromEntries(Object.entries(last).filter(([key])=>key!=='sequence'));if(!last||JSON.stringify(saved)!==JSON.stringify(snapshot))actions.push(snapshot);}
 return {start,end,rows};
}

export function validateOfficerActivities(s){
 const ledger=s.campaign.activity,fail=x=>{if(!x)throw Error('武将每日行动记录无效');},int=n=>Number.isSafeInteger(n)&&n>=1&&n<=s.campaign.day;
 fail(ledger?.version===ACTIVITY_VERSION&&ledger.records&&typeof ledger.records==='object'&&!Array.isArray(ledger.records));
 fail(Object.keys(ledger.records).length===Object.keys(OFFICER_BY_ID).length);
 const sequences=validateActivityNodes(s,fail);
 for(const [id,history] of Object.entries(ledger.records)){
  fail(Object.hasOwn(OFFICER_BY_ID,id)&&Array.isArray(history)&&history.length>0);let last=null;
  for(const r of history){const v=r.snapshot;fail(int(r.fromDay)&&int(r.toDay)&&r.toDay>=r.fromDay&&(!last?r.fromDay===1:r.fromDay>=last.toDay&&r.fromDay<=last.toDay+1));
   fail(Number.isSafeInteger(r.sequence)&&r.sequence>0&&r.sequence<ledger.nextSequence&&!sequences.has(r.sequence)&&(!last||r.sequence>last.sequence));sequences.add(r.sequence);
   fail(v&&['faction','code','place','action'].every(k=>typeof v[k]==='string'&&v[k].length<=200)&&typeof v.paused==='boolean'&&[v.siteId,v.fromId,v.toId].every(id=>id===null||!!mapNode(s,id))&&(v.buildingKey===null||!!BUILDINGS[v.buildingKey]));
   fail(v.progress===null||Number.isInteger(v.progress)&&v.progress>=0&&v.progress<=100);fail((v.fromId===null)===(v.toId===null)&&(v.progress===null)===(v.fromId===null));last=r;
  }
  fail(last.toDay<=s.campaign.day);
 }
}
