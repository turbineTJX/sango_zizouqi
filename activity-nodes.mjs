import {ACTIONS,BUILDINGS} from './domestic-designs.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {mapNode} from './map-node-data.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction} from './player-faction.mjs';
import {validMeritGrowth,PROGRESSION} from './progression.mjs';

// Factual outcomes live in the daily ledger. Reports only select these nodes.
export function appendActivityNode(s,{sourceId,category,phase,faction,officerId=null,officerIds=[],cityId=null,siteId=cityId,key=null,text,result={}}){
 const ledger=s.campaign.activity;if(!ledger)return null;
 const existing=ledger.nodes.find(n=>n.sourceId===sourceId);if(existing)return existing;
 const sequence=ledger.nextSequence++,node={id:'activity:'+sequence,sourceId,sequence,day:s.campaign.day,category,phase,faction:faction||'neutral',officerId,officerIds:[...new Set([officerId,...officerIds].filter(Boolean))],cityId,siteId,key,text,result:structuredClone(result),read:false};
 ledger.nodes.push(node);return node;
}
export function importantActivityNode(n){
 if(n.category==='domestic'&&n.phase==='incident')return true;
 if(n.phase==='merit')return n.result.leveled===true;
 if(n.category==='domestic'&&['harvest','harvest-start'].includes(n.phase))return false;
 if(n.category==='diplomacy')return ['effective','expired','expiring'].includes(n.phase)?n.result?.important===true:['pending','signed','fulfilled','blocked','failed','war','city','prisoner','aid','aid-end','withdrawal'].includes(n.phase);
 if(n.category==='treasure')return ['acquired','delivered'].includes(n.phase);
 if(n.category==='battle'||n.category==='occupation')return true;
 if(n.category==='personnel')return ['DEAD','CAPTIVE','ESCAPED','TRANSPORT_LOST','RANSOM','RELEASE','SCOUT_INTEL'].includes(n.phase);
 if(n.category==='talent')return ['discovered','signed','leave-warning','resigned','changed-side','offer-paused','project-closed','retained','displaced'].includes(n.phase);
 const kind=ACTIONS[n.key]?.kind,r=n.result;
 if(['hire','persuade'].includes(kind)&&['complete','failure'].includes(n.phase)&&!r?.leveled)return false;
 return ['budget-warning','event','pause','order-cancel','cancel'].includes(n.phase)||n.phase==='failure'&&['build','rescue'].includes(kind)||n.phase==='complete'&&(kind==='build'||kind==='research'&&r?.reward?.kind==='technology'||kind==='rescue'&&r.changed||r.leveled);
}
export const pendingActivityReports=s=>(s.campaign?.activity?.nodes||[]).filter(n=>n.faction===playerFaction(s)&&importantActivityNode(n)&&!n.read).sort((a,b)=>a.sequence-b.sequence);
export function acknowledgeActivityReports(s,ids){const selected=new Set(ids);for(const n of s.campaign.activity.nodes)if(selected.has(n.id)&&n.faction===playerFaction(s))n.read=true;}
export function activityNodeEntry(s,n){return {milestone:true,nodeId:n.id,sequence:n.sequence,place:mapNode(s,n.siteId)?.name||'战略事项',action:n.text,progress:null,category:n.category,phase:n.phase};}
export function siteActivityDays(s,id,{beforeDay=s.campaign.day,limit=30}={}){
 const end=Math.min(s.campaign.day,Math.max(1,beforeDay)),start=Math.max(1,end-limit+1),nodes=s.campaign.activity.nodes.filter(n=>n.siteId===id&&n.faction===playerFaction(s));
 return {start,end,rows:Array.from({length:end-start+1},(_,i)=>{const day=end-i;return {day,actions:nodes.filter(n=>n.day===day).map(n=>activityNodeEntry(s,n))};})};
}
export function validateActivityNodes(s,fail){
 const ledger=s.campaign.activity;fail(Array.isArray(ledger.nodes)&&Number.isSafeInteger(ledger.nextSequence)&&ledger.nextSequence>0);
 const ids=new Set(),sources=new Set(),sequences=new Set();let prior=0,day=1;
 for(const n of ledger.nodes){
  fail(n&&Number.isSafeInteger(n.sequence)&&n.sequence>prior&&n.sequence<ledger.nextSequence&&n.id==='activity:'+n.sequence&&typeof n.sourceId==='string'&&n.sourceId.length>0&&!ids.has(n.id)&&!sources.has(n.sourceId));
  fail(Number.isSafeInteger(n.day)&&n.day>=day&&n.day<=s.campaign.day&&['domestic','talent','personnel','battle','occupation','diplomacy','treasure'].includes(n.category)&&typeof n.phase==='string'&&typeof n.faction==='string'&&typeof n.text==='string'&&n.text.length>0&&typeof n.read==='boolean'&&n.result&&typeof n.result==='object');
  fail((n.officerId===null||!!OFFICER_BY_ID[n.officerId])&&Array.isArray(n.officerIds)&&n.officerIds.every(id=>!!OFFICER_BY_ID[id])&&new Set(n.officerIds).size===n.officerIds.length&&(n.officerId===null||n.officerIds.includes(n.officerId))&&[n.cityId,n.siteId].every(id=>id===null||!!mapNode(s,id))&&(n.key===null||!!ACTIONS[n.key]));
  const resourceKeys=['gold','grain','manpower'],resources=(r,signed=false)=>r&&Object.keys(r).sort().join(',')==='gold,grain,manpower'&&resourceKeys.every(k=>Number.isFinite(r[k])&&(signed||r[k]>=0)),r=n.result,reward=r.reward;
  if(r.resourceCredit)fail(resources(r.resourceCredit),'运营入库记录无效');
  if(n.phase==='merit'){
   fail(validMeritGrowth(r.growth)&&r.leveled===(r.growth.before!==r.growth.after),'功绩结算记录无效');
   if(r.scouting)fail(r.scouting.faction===n.faction&&typeof r.scouting.key==='string'&&r.scouting.turn===Math.floor((n.day-1)/10)&&r.growth.gained>=0&&r.growth.gained<=PROGRESSION.scouting.maximumPerTurn,'侦察计功记录无效');
   if(r.transport)fail(r.transport.faction===n.faction&&[r.transport.source,r.transport.target].every(id=>!!mapNode(s,id))&&r.transport.pair===[r.transport.source,r.transport.target].sort().join(':')&&r.transport.turn===Math.floor((n.day-1)/10)&&Number.isFinite(r.transport.value)&&r.transport.value>=0,'运输计功记录无效');
  }
  if(n.phase==='harvest-start')fail(Number.isSafeInteger(r.turn)&&r.turn>0&&resources(r.stocks),'旬首资源记录无效');
  if(n.phase==='harvest'){
   fail(Number.isSafeInteger(r.turn)&&r.turn>0&&resources(r.recurring)&&resources(r.work)&&resources(r.stocks)&&(r.net===null||resources(r.net,true))&&Array.isArray(r.cities)&&r.cities.length<=s.cities.length&&r.cities.every(c=>!!mapNode(s,c.id)&&typeof c.name==='string'&&resources(c.credited)&&resources(c.work)),'收获入库记录无效');
   fail(r.counts&&['officers','buildings','technologies'].every(k=>Number.isSafeInteger(r.counts[k])&&r.counts[k]>=0)&&Array.isArray(r.nodeIds)&&r.nodeIds.every(id=>ids.has(id))&&new Set(r.nodeIds).size===r.nodeIds.length,'收获成果引用无效');
   for(const key of resourceKeys)fail(r.recurring[key]===r.cities.reduce((v,c)=>v+c.credited[key],0)&&r.work[key]===r.cities.reduce((v,c)=>v+c.work[key],0),'收获汇总与各城入库不符');
  }
  if(reward?.kind==='building')fail(!!BUILDINGS[reward.buildingKey]&&!!mapNode(s,reward.siteId)&&Number.isSafeInteger(reward.beforeLevel)&&reward.beforeLevel>=0&&reward.afterLevel===reward.beforeLevel+(reward.mode==='repair'?0:1)&&resources(reward.incomeDelta)&&(reward.mode===undefined||['build','repair'].includes(reward.mode)&&Number.isSafeInteger(reward.beforeHp)&&reward.beforeHp>=0&&reward.beforeHp<=reward.afterHp&&Number.isSafeInteger(reward.afterHp)&&reward.afterHp===reward.maxHp),'设施成果记录无效');
  if(reward?.kind==='technology')fail(TECHNOLOGIES.records.some(t=>t.id===reward.technologyId),'技术成果记录无效');
  if(reward?.kind==='officer')fail(reward.officerId===n.officerId&&!!OFFICER_BY_ID[reward.officerId]&&!!mapNode(s,reward.location)&&(reward.destination===null||!!mapNode(s,reward.destination))&&reward.stats&&['leadership','force','intellect','politics','charm'].every(k=>Number.isFinite(reward.stats[k])&&reward.stats[k]>=0)&&Array.isArray(reward.traits)&&reward.traits.every(t=>typeof t.id==='string'&&typeof t.name==='string'),'人才成果记录无效');
  ids.add(n.id);sources.add(n.sourceId);sequences.add(n.sequence);prior=n.sequence;day=n.day;
 }
 return sequences;
}
