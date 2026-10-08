import {DOMESTIC_INCIDENT_RULES as RULES,DOMESTIC_INCIDENTS as EVENTS} from './data/design/domestic-incidents.mjs';
import {DOMESTIC_OUTCOME_RULES as OUTCOMES} from './data/design/domestic-actions.mjs';
import {ACTIONS,DIRECTIONS} from './domestic-designs.mjs';
import {residentOfficer,cityPersonnel} from './city-personnel.mjs';
import {productiveBuildingLevel} from './metropolitan-areas.mjs';
import {relationshipInfo,changeRelationshipScore,validRelationshipScores} from './relationships.mjs';
import {syncResourceTotals} from './city-resources.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {mapNode} from './map-node-data.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
export {DOMESTIC_INCIDENT_RULES,DOMESTIC_INCIDENTS} from './data/design/domestic-incidents.mjs';
const turn=s=>Math.floor((s.campaign.day-1)/10)+1;
const neutral=Object.freeze({chance:0,quantity:1,progress:1});
export function initializeDomesticIncidents(s){
 s.campaign.domestic.incidents={enabled:true,seed:(s.seed^0x79a5b38f)>>>0,checks:{},factionChecks:{},used:{},cities:{},events:[]};
}
export function incidentRandom(s){const d=s.campaign.domestic.incidents;d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296;}
function present(s,a){
 const o=residentOfficer(s,a.officerId),c=mapNode(s,a.cityId);
 return !!o&&o.location===a.cityId&&o.faction===c?.owner&&!o.unit.mission&&!o.unit.scouting&&!a.proposal&&!a.action?.paused&&!plannedOfficer(s,a.officerId)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(a.officerId))&&!s.campaign.battles.some(b=>!b.settled&&(b.cityId===a.cityId||o.army&&b.armyIds.includes(o.army.id)));
}
const matchingWork=(a,b)=>a.direction===b.direction&&a.cityId===b.cityId&&(!b.action?['build','repair','research'].includes(ACTIONS[a.action.key].kind)&&a.action.siteId===a.cityId:a.action.key===b.action.key&&a.action.siteId===b.action.siteId&&(!['hire','persuade','reassure'].includes(ACTIONS[a.action.key].kind)||a.action.targetId===b.action.targetId));
export function incidentFor(s,a){
 const id=a?.action?.incidentId;if(id===null||id===undefined)return null;
 const r=s.campaign.domestic.incidents.events.find(e=>e.id===id);if(!r||!r.actionIds.includes(a.action.id)||!r.officerIds.includes(a.officerId)||!present(s,a))return null;
 if(EVENTS[r.code].social){
  const other=s.campaign.domestic.assignments.find(b=>b.officerId!==a.officerId&&r.officerIds.includes(b.officerId));
  if(!other||!present(s,other)||other.direction!==a.direction)return null;
  if(other.action){if(!matchingWork(a,other)||!r.actionIds.includes(other.action.id))return null;}
  else{
   const original=r.actionIds.find(id=>id!==a.action.id),finished=original&&(s.campaign.domestic.workHistory[other.officerId]||[]).find(x=>x.actionId===original);
   // Finishing one participant first must not remove the other participant's
   // saved effect in the same settlement. The colleague remains at this post.
   if(original?(!finished||!['completed','failed'].includes(finished.status)||finished.key!==a.action.key||finished.siteId!==r.siteId):!matchingWork(a,other))return null;
  }
 }
 return r;
}
export const incidentModifiers=(s,a)=>{const r=incidentFor(s,a);return r?EVENTS[r.code]:neutral;};
export const effectiveDomesticChance=(s,a)=>Math.max(OUTCOMES.minChance,Math.min(OUTCOMES.maxChance,(a?.action?.chance||OUTCOMES.minChance)+incidentModifiers(s,a).chance));
export function incidentSupport(s,a,before,after){
 const r=incidentFor(s,a);if(r?.code!=='unity'||after<=before)return null;
 return {day:s.campaign.day,success:true,helperId:r.officerIds.find(id=>id!==a.officerId),actual:after-before,after};
}
function prune(s){
 const d=s.campaign.domestic.incidents,active=new Set([...s.campaign.domestic.assignments.map(a=>a.action?.incidentId),...s.cities.map(c=>c.domestic.suspended?.incidentId)].filter(id=>id!==null&&id!==undefined)),recent=new Set(d.events.slice(-RULES.historyLimit).map(e=>e.id));
 d.events=d.events.filter(e=>active.has(e.id)||recent.has(e.id));
}
const resourceNames={gold:'金',grain:'粮',manpower:'预备兵'};
const stocks=c=>Object.fromEntries(Object.keys(resourceNames).map(k=>[k,c[k]]));
function storyCapacity(s,c,e){
 const key=e.story?.resource;if(!key)return 0;
 if(e.story.amount<0)return Math.max(0,Math.floor(c[key]-(key==='manpower'?c.domestic.reserved:0)));
 const cap=key==='grain'?ECONOMY_RULES.capacity.grainBase+c.granary*ECONOMY_RULES.capacity.grainPerGranary:key==='manpower'?ECONOMY_RULES.capacity.manpowerMax:Infinity;
 return Math.max(0,Math.floor(cap-c[key]));
}
function storyResidents(s,c,sourceId,current){
 return cityPersonnel(s,c.id).filter(o=>{
  const a=s.campaign.domestic.assignments.find(a=>a.officerId===o.unit.id);
  return o.unit.id!==sourceId&&o.faction===c.owner&&!o.unit.mission&&!o.unit.scouting&&!o.destination&&s.campaign.domestic.incidents.used[o.unit.id]!==current&&(!a?.action||a.action.siteId===c.id)&&!s.campaign.battles.some(b=>!b.settled&&(b.cityId===c.id||o.army&&b.armyIds.includes(o.army.id)));
 }).sort((a,b)=>a.unit.id.localeCompare(b.unit.id));
}
const actorWeight=(u,type)=>type==='bold'?1+u.force/50+(u.personality||0)/3:type==='civil'?1+(u.politics+u.charm)/100:1;
function chooseStoryActor(s,entries,e,check){
 const weights=entries.map(p=>actorWeight(p.person.unit,e.story.actor)),total=weights.reduce((a,b)=>a+b,0);check.peerRoll=incidentRandom(s);
 let n=check.peerRoll*total;for(let i=0;i<entries.length;i++){n-=weights[i];if(n<0)return entries[i];}return entries.at(-1);
}
function settleIncident(s,c,r,e){
 const before=stocks(c),key=e.story?.resource;
 if(key){const amount=Math.min(Math.abs(e.story.amount),storyCapacity(s,c,e)),actual=e.story.amount>0?amount:-amount;c[key]+=actual;}
 const after=stocks(c);r.resources={before,after,reserved:c.domestic.reserved,delta:Object.fromEntries(Object.keys(resourceNames).map(k=>[k,Math.round((after[k]-before[k])*1e8)/1e8]))};
 // Only the world changes; a running battle keeps its opening relationship snapshot.
 const world={relationshipScores:s.relationshipScores,relationshipTypes:s.relationshipTypes},a=r.sourceOfficerId,b=r.otherOfficerId,old=relationshipInfo(a,b,world.relationshipScores,world.relationshipTypes);
 const error=changeRelationshipScore(world,a,b,e.relationDelta);if(error)throw new Error(error);
 const next=relationshipInfo(a,b,world.relationshipScores,world.relationshipTypes);r.relationship={key:old.key,before:old.score,after:next.score,beforeType:old.type,afterType:next.type,delta:next.score-old.score};
 syncResourceTotals(s);
}
export function domesticIncidentText(s,r){
 const e=EVENTS[r.code],source=OFFICER_BY_ID[r.sourceOfficerId].name,other=OFFICER_BY_ID[r.otherOfficerId].name,work=ACTIONS[r.sourceKey].name;
 const story=e.story?e.story.text.replaceAll('{source}',source).replaceAll('{other}',other):source+'与'+other+'合办「'+work+'」。'+e.description;
 const changes=Object.entries(r.resources.delta).filter(([,n])=>n!==0).map(([k,n])=>'本城'+resourceNames[k]+(n<0?'减少':'增加')+Math.abs(n));
 const relation=r.relationship.delta;changes.push(source+'与'+other+'的交情'+(relation<0?'转疏，友好度下降'+(-relation):relation>0?'渐笃，友好度提高'+relation:'未变'));
 const narrative=e.story?`${source}办理「${work}」期间，${story.startsWith(source)?story.slice(source.length):story}`:story;
 return `${mapNode(s,r.cityId).name}奏报 · ${e.name}：${narrative}${changes.join('；')}。`;
}
export function planDomesticIncidents(s,{available,emit}={}){
 const d=s.campaign.domestic.incidents;if(!d.enabled)return;
 prune(s);
 const groups=new Map(),current=turn(s),working=s.campaign.domestic.assignments.filter(a=>present(s,a));
 for(const a of s.campaign.domestic.assignments){if(!present(s,a))continue;const key=a.cityId+':'+a.direction;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 const factions=new Map();
 for(const [key,group]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const c=mapNode(s,group[0].cityId);
  if(!group.some(a=>a.action&&a.action.incidentId===null&&d.used[a.officerId]!==current&&available(s,c,a.action)))continue;
  if(!factions.has(c.owner))factions.set(c.owner,[]);factions.get(c.owner).push([key,group]);
 }
 const chosen=[];
 for(const [faction,entries]of [...factions].sort(([a],[b])=>a.localeCompare(b))){
  if(d.factionChecks[faction]?.turn===current)continue;
  const roll=incidentRandom(s),check={turn:current,day:s.campaign.day,roll,groupKey:null,code:null};d.factionChecks[faction]=check;
  if(roll>=RULES.triggerChance)continue;
  const selected=entries[Math.floor(incidentRandom(s)*entries.length)];check.groupKey=selected[0];chosen.push(selected);
 }
 for(const [key,group]of chosen){
  if(d.checks[key]?.turn===current||d.cities[group[0].cityId]?.turn===current&&d.cities[group[0].cityId].count>=RULES.cityLimit)continue;
  group.sort((a,b)=>a.officerId.localeCompare(b.officerId));
  const actors=group.filter(a=>a.action&&a.action.incidentId===null&&d.used[a.officerId]!==current&&available(s,mapNode(s,a.cityId),a.action));if(!actors.length)continue;
  const pairs=actors.flatMap(a=>group.filter(b=>b!==a&&matchingWork(a,b)&&d.used[b.officerId]!==current&&(!b.action||b.action.incidentId===null&&available(s,mapNode(s,b.cityId),b.action))).map(b=>({a,b,relation:relationshipInfo(a.officerId,b.officerId,s.relationshipScores,s.relationshipTypes)}))).filter(p=>p.relation.score>=RULES.closeRelation||p.relation.type==='disliked'&&p.relation.score<=RULES.hostileRelation);
  const check={turn:current,day:s.campaign.day,pairRoll:null,ambientRoll:null,peerRoll:null,code:null};d.checks[key]=check;
  let actor,source,otherId,partner=null,relation=null,code=null;
  if(pairs.length){const p=pairs[Math.floor(incidentRandom(s)*pairs.length)];check.pairRoll=incidentRandom(s);if(check.pairRoll<(p.relation.score>=RULES.closeRelation?p.relation.chance/100*RULES.closeChanceMultiplier:RULES.hostileChance)){actor=p.a;partner=p.b;relation=p.relation.score;code=relation>=RULES.closeRelation?'unity':'rivalry';}}
  if(!code){
   source=actors[Math.floor(incidentRandom(s)*actors.length)];const c=mapNode(s,source.cityId),targets=working.filter(a=>a.cityId===c.id&&a.action&&a.action.incidentId===null&&d.used[a.officerId]!==current&&available(s,c,a.action));
   const peers=source.action.siteId===c.id?storyResidents(s,c,source.officerId,current):[];
   const pool=Object.entries(EVENTS).filter(([,e])=>!e.social).flatMap(([id,e])=>{
    if(e.story.resource&&(storyCapacity(s,c,e)<(e.story.amount>0?e.story.amount*RULES.minimumRewardShare:1)||e.story.building&&productiveBuildingLevel(s,c,e.story.building)<=0))return [];
    const entries=peers.flatMap(person=>{const target=targets.find(a=>a.officerId===person.unit.id);return e.kinds?target&&(!e.directions||e.directions.includes(target.direction))&&e.kinds.includes(ACTIONS[target.action.key].kind)?[{person,target}]:[]:[{person,target:null}];});
    return entries.length?[{id,entries}]:[];
   });
   if(!pool.length)continue;const pick=pool[Math.floor(incidentRandom(s)*pool.length)],entry=chooseStoryActor(s,pick.entries,EVENTS[pick.id],check);code=pick.id;actor=entry.target;otherId=entry.person.unit.id;
  }
  source=source||actor;const e=EVENTS[code],actorsAffected=actor?[actor,...(partner?.action?[partner]:[])]:[],affected=actor?[actor.officerId,...(partner?[partner.officerId]:[])]:[];
  otherId=otherId||partner.officerId;
  const r={id:s.campaign.domestic.nextId++,code,turn:current,day:s.campaign.day,cityId:source.cityId,siteId:actor?.action.siteId||source.cityId,direction:actor?.direction||e.directions[0],sourceOfficerId:source.officerId,sourceDirection:source.direction,sourceActionId:source.action.id,sourceKey:source.action.key,otherOfficerId:otherId,officerIds:affected,actionIds:actorsAffected.map(a=>a.action.id),relation};
  const participants=[...new Set([r.sourceOfficerId,r.otherOfficerId,...r.officerIds])];
  r.participants=participants.map(id=>{const o=residentOfficer(s,id),a=s.campaign.domestic.assignments.find(a=>a.officerId===id);return {id,faction:o.faction,cityId:o.location,direction:a?.direction||null,key:a?.action?.key||null};});
  settleIncident(s,mapNode(s,r.cityId),r,e);d.events.push(r);check.code=code;d.factionChecks[mapNode(s,r.cityId).owner].code=code;for(const a of actorsAffected)a.action.incidentId=r.id;for(const id of participants)d.used[id]=current;
  const count=d.cities[r.cityId]?.turn===current?d.cities[r.cityId].count:0;d.cities[r.cityId]={turn:current,count:count+1};
  const resourceCredit=Object.fromEntries(Object.keys(resourceNames).map(k=>[k,Math.max(0,r.resources.delta[k])]));
  emit(s,{...source,officerIds:participants},'incident',domesticIncidentText(s,r),{siteId:r.siteId,incident:structuredClone(r),...(Object.values(resourceCredit).some(n=>n>0)?{resourceCredit}:{})});
 }
}
export function validateDomesticIncidents(s,fail){
 const d=s.campaign.domestic.incidents,current=turn(s),day=s.campaign.day,map=x=>x&&typeof x==='object'&&!Array.isArray(x),int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 fail(d&&typeof d.enabled==='boolean'&&int(d.seed,0xffffffff)&&map(d.checks)&&map(d.factionChecks)&&map(d.used)&&map(d.cities)&&Array.isArray(d.events),'内政事件状态无效');
 fail(Object.keys(d.checks).length<=s.cities.length*Object.keys(DIRECTIONS).length&&Object.keys(d.used).length<=Object.keys(OFFICER_BY_ID).length&&Object.keys(d.cities).length<=s.cities.length,'内政事件次数记录无效');
 for(const [key,c]of Object.entries(d.checks)){const i=key.lastIndexOf(':');fail(mapNode(s,key.slice(0,i))&&DIRECTIONS[key.slice(i+1)]&&int(c.turn,current)&&c.turn>0&&int(c.day,day)&&c.day>0&&c.turn===Math.floor((c.day-1)/10)+1&&(c.code===null||EVENTS[c.code])&&[c.pairRoll,c.ambientRoll,c.peerRoll].every(n=>n===null||Number.isFinite(n)&&n>=0&&n<1),'内政事件随机判定无效');}
 for(const [id,t]of Object.entries(d.used))fail(OFFICER_BY_ID[id]&&int(t,current)&&t>0,'内政事件参与记录无效');
 for(const [id,c]of Object.entries(d.cities))fail(mapNode(s,id)&&int(c.turn,current)&&c.turn>0&&int(c.count,RULES.cityLimit)&&c.count>0,'内政事件城市次数无效');
 fail(Object.keys(d.factionChecks).length<=s.cities.length,'内政事件势力次数无效');
 for(const [faction,c]of Object.entries(d.factionChecks)){
  const i=c.groupKey?.lastIndexOf(':');fail(typeof faction==='string'&&faction.length>0&&(s.cities.some(city=>city.owner===faction)||s.campaign.activity.nodes.some(n=>n.faction===faction))&&int(c.turn,current)&&c.turn>0&&int(c.day,day)&&c.day>0&&c.turn===Math.floor((c.day-1)/10)+1&&Number.isFinite(c.roll)&&c.roll>=0&&c.roll<1&&(c.groupKey===null||typeof c.groupKey==='string'&&mapNode(s,c.groupKey.slice(0,i))&&DIRECTIONS[c.groupKey.slice(i+1)])&&(c.code===null||EVENTS[c.code]&&c.roll<RULES.triggerChance&&c.groupKey!==null),'内政事件势力随机判定无效');
 }
 const ids=new Set(),forceTurns=new Set();let previous=0;
 for(const r of d.events){
  const e=EVENTS[r.code];fail(e&&int(r.id)&&r.id>previous&&r.id<s.campaign.domestic.nextId&&int(r.turn,current)&&r.turn>0&&int(r.day,day)&&r.day>0&&r.turn===Math.floor((r.day-1)/10)+1&&s.cities.some(c=>c.id===r.cityId)&&mapNode(s,r.siteId)&&DIRECTIONS[r.direction]&&(!e.directions||e.directions.includes(r.direction))&&OFFICER_BY_ID[r.sourceOfficerId]&&OFFICER_BY_ID[r.otherOfficerId]&&r.otherOfficerId!==r.sourceOfficerId&&DIRECTIONS[r.sourceDirection]&&ACTIONS[r.sourceKey]?.direction===r.sourceDirection&&int(r.sourceActionId)&&r.sourceActionId<r.id,'内政事件记录无效');
  fail(Array.isArray(r.officerIds)&&r.officerIds.length===(e.social?2:e.kinds?1:0)&&new Set(r.officerIds).size===r.officerIds.length&&r.officerIds.every(id=>OFFICER_BY_ID[id])&&Array.isArray(r.actionIds)&&r.actionIds.length>=(e.social||e.kinds?1:0)&&r.actionIds.length<=r.officerIds.length&&new Set(r.actionIds).size===r.actionIds.length&&r.actionIds.every(id=>int(id)&&id<r.id),'内政事件人员或事务无效');
  fail(e.social?int(r.relation,100)&&(r.code==='unity'?r.relation>=RULES.closeRelation:r.relation<=RULES.hostileRelation):r.relation===null,'内政事件关系快照无效');
  const people=[r.sourceOfficerId,r.otherOfficerId];fail(Array.isArray(r.participants)&&r.participants.length===2&&new Set(r.participants.map(p=>p.id)).size===2&&r.participants.every(p=>people.includes(p.id)&&p.cityId===r.cityId&&typeof p.faction==='string'&&(p.direction===null||DIRECTIONS[p.direction])&&(p.key===null||ACTIONS[p.key]?.direction===p.direction))&&r.participants[0].faction===r.participants[1].faction,'内政事件实际当事人无效');
  const forceTurn=r.participants[0].faction+':'+r.turn;fail(!forceTurns.has(forceTurn),'同一势力本旬重复发生内政事件');forceTurns.add(forceTurn);
  const relation=r.relationship;fail(relation&&int(relation.before,100)&&int(relation.after,100)&&relation.delta===relation.after-relation.before&&validRelationshipScores({[relation.key]:relation.before},{[relation.key]:relation.beforeType})&&validRelationshipScores({[relation.key]:relation.after},{[relation.key]:relation.afterType}),'内政事件交情结算无效');
  const world={relationshipScores:{[relation.key]:relation.before},relationshipTypes:{[relation.key]:relation.beforeType}},old=relationshipInfo(...people,world.relationshipScores,world.relationshipTypes);fail(relation.key===old.key&&(!e.social||r.relation===relation.before)&&changeRelationshipScore(world,...people,e.relationDelta)===null,'内政事件交情来源无效');
  const next=relationshipInfo(...people,world.relationshipScores,world.relationshipTypes);fail(next.score===relation.after&&next.type===relation.afterType,'内政事件交情结果不符');
  const receipt=r.resources,keys=Object.keys(resourceNames);fail(receipt&&[receipt.before,receipt.after,receipt.delta].every(v=>map(v)&&Object.keys(v).sort().join(',')==='gold,grain,manpower')&&keys.every(k=>Number.isFinite(receipt.before[k])&&receipt.before[k]>=0&&Number.isFinite(receipt.after[k])&&receipt.after[k]>=0&&Number.isSafeInteger(receipt.delta[k])&&Math.abs(receipt.after[k]-receipt.before[k]-receipt.delta[k])<1e-6),'内政事件资源凭据无效');
  fail(int(receipt.reserved)&&receipt.before.manpower>=receipt.reserved&&receipt.after.manpower>=receipt.reserved,'内政事件损害已预留兵源');
  for(const k of keys){const expected=e.story?.resource===k?e.story.amount:0,n=receipt.delta[k];fail(expected>0?n>=0&&n<=expected:expected<0?n<=0&&n>=expected:n===0,'内政事件资源变化超出设计');}
  const node=s.campaign.activity.nodes.find(n=>n.phase==='incident'&&n.result.incident?.id===r.id);
  fail(node&&JSON.stringify(node.result.incident)===JSON.stringify(r)&&node.officerId===r.sourceOfficerId&&node.key===r.sourceKey&&node.faction===r.participants[0].faction&&people.every(id=>node.officerIds.includes(id)),'内政事件与原始奏报不符');
  const credit=Object.fromEntries(keys.map(k=>[k,Math.max(0,receipt.delta[k])]));fail(Object.values(credit).some(n=>n>0)?JSON.stringify(node.result.resourceCredit)===JSON.stringify(credit):node.result.resourceCredit===undefined,'内政事件入库与收获凭据不符');
  ids.add(r.id);previous=r.id;
 }
 const actions=[...s.campaign.domestic.assignments.filter(a=>a.action).map(a=>({a,x:a.action})),...s.cities.filter(c=>c.domestic.suspended).map(c=>({a:null,x:c.domestic.suspended}))];
 for(const {a,x}of actions){fail(x.incidentId===null||ids.has(x.incidentId),'内政事务事件来源无效');if(x.incidentId===null)continue;const r=d.events.find(r=>r.id===x.incidentId),e=EVENTS[r.code];fail(r.actionIds.includes(x.id)&&r.direction===ACTIONS[x.key].direction&&r.siteId===x.siteId&&(!e.kinds||e.kinds.includes(ACTIONS[x.key].kind))&&(!a||r.officerIds.includes(a.officerId)&&r.cityId===a.cityId),'内政事件与办理事务不符');}
}
