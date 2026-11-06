// Domain-restricted chronicles: explicit intervals, causal dependencies and
// cumulative resources. No world mutation, random sampling or battle rollouts.
import {validateTurnPlan} from './task-ledger.mjs';
const terminal = new Set(['complete', 'cancelled', 'failed']);
export const liveChronicle = t => !terminal.has(t.status);
export const newCoordination = () => ({version:3, nextId:1, missions:[], search:{}, events:[],turnPlan:null,reviewDay:0});
const integer = x => Number.isSafeInteger(x) && x >= 0;

export function chronicleError(tasks, capacities = {}) {
 const ids=new Set(),byId=new Map(tasks.map(t=>[t.id,t]));
 for(const t of tasks){
  if(!t||typeof t.id!=='string'||ids.has(t.id))return 'duplicate-task';ids.add(t.id);
  if(!integer(t.start)||!integer(t.end)||t.end<=t.start)return 'invalid-interval';
  if(!Array.isArray(t.after)||!Array.isArray(t.claims)||!Array.isArray(t.conditions)||!Array.isArray(t.effects))return 'invalid-contract';
  for(const id of t.after){const p=byId.get(id);if(!p||p.end>t.start)return 'unsupported-precedence';}
  for(const c of t.claims)if(typeof c.resource!=='string'||!integer(c.amount)||c.amount===0)return 'invalid-resource';
 }
 const visiting=new Set(),visited=new Set();
 const visit=t=>{if(visiting.has(t.id))return false;if(visited.has(t.id))return true;visiting.add(t.id);for(const id of t.after)if(!visit(byId.get(id)))return false;visiting.delete(t.id);visited.add(t.id);return true;};
 if(tasks.some(t=>!visit(t)))return 'dependency-cycle';
 // Each condition must be supplied by a real initial fact or by an explicit
 // causal predecessor; predicted effects are never entered into actual facts.
 for(const t of tasks)for(const c of t.conditions){
  if(c.source==='initial')continue;
  const provider=byId.get(c.source);
  if(!provider||provider.end>t.start||!t.after.includes(provider.id)||!provider.effects.some(e=>e.key===c.key&&e.value===c.value))return 'unsupported-condition';
  if(tasks.some(q=>q!==provider&&q!==t&&q.end>provider.end&&q.start<t.end&&q.effects.some(e=>e.key===c.key&&e.value!==c.value)))return 'causal-threat';
 }
 const resources=new Set(tasks.flatMap(t=>t.claims.map(c=>c.resource)));
 for(const resource of resources){
  const capacity=capacities[resource]??(resource.startsWith('officer:')?1:0);
  if(!integer(capacity))return 'invalid-capacity';
  const uses=tasks.flatMap(t=>t.claims.filter(c=>c.resource===resource).map(c=>({...c,start:t.start,end:t.end})));
  for(const time of new Set(uses.map(u=>u.start)))if(uses.filter(u=>u.start<=time&&time<u.end).reduce((n,u)=>n+u.amount,0)>capacity)return 'resource-conflict:'+resource;
 }
 return null;
}

// Methods arrive in domain priority order. A failed complete method leaves
// the accepted plan untouched; deterministic work units bound backtracking.
export function firstChronicleMethod({accepted=[],methods,capacities={},facts={},budget=128}){
 let checks=0;
 for(const method of methods){
  if(checks>=budget)return {tasks:null,checks,reason:'budget'};checks++;
  if(method.tasks.some(t=>t.conditions.some(c=>c.source==='initial'&&facts[c.key]!==c.value)))continue;
  const tasks=[...accepted,...method.tasks];if(chronicleError(tasks,capacities))continue;
  return {tasks:method.tasks,checks,reason:null};
 }
 return {tasks:null,checks,reason:'no-method'};
}

export function transitionChronicle(task,status,{day,revision,facts={},reason=null}={}){
 if(revision!==task.revision||terminal.has(task.status))return false;
 const transitions={reserved:['authorized','cancelled','failed'],authorized:['executing','cancelled','failed'],executing:['handoff','failed','cancelled'],handoff:['complete','failed','cancelled']};
 if(!transitions[task.status]?.includes(status)||!integer(day))return false;
 if(status==='complete'&&!task.effects.every(e=>facts[e.key]===e.value))return false;
 task.status=status;task.updatedDay=day;task.reason=reason;task.revision++;return true;
}

// Compare and swap the whole ownership change. Stale completion messages
// cannot release resources that a successor now owns.
export function handoffChronicle(tasks,fromId,to,{revision,facts,capacities={}}){
 const from=tasks.find(t=>t.id===fromId);
 if(!from||from.revision!==revision||from.status!=='handoff'||!from.effects.every(e=>facts[e.key]===e.value))return null;
 const next=tasks.filter(t=>t!==from&&liveChronicle(t));
 if(chronicleError([...next,to],capacities))return null;
 return tasks.map(t=>t===from?{...t,status:'complete',revision:t.revision+1}:t).concat(structuredClone(to));
}

export function validateCoordination(v,day,validOfficer,validCity,validFaction,fail){
 fail(v?.version===3&&integer(v.nextId)&&v.nextId>0&&Array.isArray(v.missions)&&v.missions.length<=256&&Array.isArray(v.events)&&v.events.length<=80&&v.search&&typeof v.search==='object'&&integer(v.reviewDay)&&v.reviewDay<=day&&(v.reviewDay===0||(v.reviewDay-1)%10===0));
 fail(v.turnPlan===null||v.turnPlan&&typeof v.turnPlan==='object');
 if(v.turnPlan)validateTurnPlan(v.turnPlan,day,fail);
 const ids=new Set(),claimed=new Set();
 for(const m of v.missions){
  fail(m&&integer(m.id)&&m.id>0&&m.id<v.nextId&&!ids.has(m.id));ids.add(m.id);
  fail(validFaction(m.faction)&&validCity(m.cityId)&&validCity(m.target)&&m.cityId!==m.target&&['frontline'].includes(m.kind));
  fail(m.purpose===undefined||['preparation','garrison'].includes(m.purpose));
  fail(['reserved','authorized','executing','handoff','complete','failed','cancelled'].includes(m.status)&&integer(m.revision)&&integer(m.createdDay)&&m.createdDay>0&&m.createdDay<=day&&integer(m.updatedDay)&&m.updatedDay>=m.createdDay&&m.updatedDay<=day);
  fail(Array.isArray(m.officerIds)&&m.officerIds.length>0&&m.officerIds.every(validOfficer)&&new Set(m.officerIds).size===m.officerIds.length&&typeof m.reason==='string'&&m.reason.length<=160);
  fail(m.requirements&&['gold','grain','manpower','defensePower'].every(k=>integer(m.requirements[k]??0)));
  if(liveChronicle(m))for(const id of m.officerIds){fail(!claimed.has(id));claimed.add(id);}
 }
 for(const [f,c]of Object.entries(v.search)){
  fail(validFaction(f)&&integer(c.offset)&&typeof c.signature==='string'&&c.signature.length<=40000);
  fail(Array.isArray(c.order)&&c.order.every(k=>typeof k==='string'&&k.split('>').length===2&&k.split('>').every(validCity))&&new Set(c.order).size===c.order.length&&[...c.order].sort().join('|')===c.signature);
 }
 for(const e of v.events)fail(integer(e.day)&&e.day<=day&&typeof e.reason==='string'&&e.reason.length<=160&&integer(e.missionId));
 if(v.observations!==undefined){
  fail(v.observations&&typeof v.observations==='object'&&!Array.isArray(v.observations)&&Object.keys(v.observations).length<=10000);
  for(const [key,o]of Object.entries(v.observations)){const parts=key.split('>');fail(parts.length===2&&validFaction(parts[0])&&validCity(parts[1])&&integer(o.day)&&o.day>0&&o.day<=day&&typeof o.signature==='string'&&o.signature.length<=40000);}
 }
}
