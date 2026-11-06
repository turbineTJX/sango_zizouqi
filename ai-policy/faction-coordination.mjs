import {firstChronicleMethod,liveChronicle} from './chronicle.mjs';
import {residentOfficer} from '../city-personnel.mjs';
import {isAITurnStart} from '../ai-turn.mjs';
import {resourceCommitments} from './resource-commitments.mjs';

// A capability is scoped to this synchronous execution of a real saved task.
// It cannot survive a cancellation, be serialized as blanket authority, or
// grant an unrelated destination merely by copying an officer's name.
const authorizations=new WeakMap();
export const currentFactionTask=s=>authorizations.get(s)||null;
export function withFactionTask(s,owner,execute){
 const previous=authorizations.get(s);authorizations.set(s,owner);
 try{return execute();}finally{if(previous)authorizations.set(s,previous);else authorizations.delete(s);}
}
function permits(row,q){
 const p=row.owner,ids=q.officerIds||[];
 if(row.kind==='capture')return ['expedition','march'].includes(q.kind)&&[p.staging,p.target].includes(q.target)&&ids.every(id=>p.officerIds.includes(id));
 if(row.kind==='concentration')return q.kind==='transfer'&&q.target===p.staging&&ids.every(id=>p.intendedIds.includes(id));
 if(row.kind==='staffing')return q.kind==='assign'&&q.cityId===p.cityId&&q.direction===p.direction;
 if(row.kind==='support')return ['expedition','march'].includes(q.kind)&&q.target===p.target;
 return false;
}

export const frontlineMissions=(s,faction=null)=>(s.campaign.ai?.coordination?.missions||[]).filter(m=>liveChronicle(m)&&(!faction||m.faction===faction));

// One query interface for concrete execution records. These are projections,
// not independently saved copies of claims. Executors still own real actions.
export function officerCommitments(s,id,{excludeDiplomacyId=null,ignoreConcentration=false}={}){
 const ai=s.campaign.ai,rows=[];
 const add=(kind,p,cityId,target)=>rows.push({kind,owner:p,faction:p.faction,cityId,target});
 if(!ignoreConcentration){
  for(const p of ai?.concentrations||[])if(p.status==='active'&&p.officerIds.includes(id))add('concentration',p,p.staging,p.target);
  for(const m of frontlineMissions(s))if(m.officerIds.includes(id))add('frontline',m,m.cityId,m.target);
 }
 for(const p of ai?.plans||[])if(!['complete','cancelled','consolidate'].includes(p.phase)&&p.officerIds.includes(id))add('capture',p,p.staging,p.target);
 for(const p of ai?.supports||[])if(p.officerIds.includes(id))add('support',p,null,p.target);
 for(const p of ai?.staffing||[])if(p.officerId===id&&p.phase==='travel')add('staffing',p,p.cityId,p.cityId);
 for(const p of [...(s.campaign.diplomacy?.proposals||[]),...(s.campaign.diplomacy?.contracts||[])]){
  if(p.id===excludeDiplomacyId||!(['outbound','negotiating','pending','approved'].includes(p.status)||p.status==='signed'&&p.clauses.some(c=>c.kind==='deploy'&&c.status==='waiting'&&!c.armyId)))continue;
  const clause=p.clauses.find(c=>c.kind==='deploy'&&c.officerIds.includes(id));
  if(clause)rows.push({kind:'diplomacy',owner:p,faction:clause.from,cityId:clause.cityId,target:clause.targetId});
 }
 return rows;
}
export const frontlineCompatible=(s,id,cityId,target)=>frontlineMissions(s).filter(m=>m.officerIds.includes(id)).every(m=>m.cityId===cityId&&(m.purpose==='garrison'||m.target===target));

function event(s,m,reason){
 const v=s.campaign.ai.coordination;m.reason=reason;m.updatedDay=s.campaign.day;m.revision++;
 v.events.push({day:s.campaign.day,missionId:m.id,reason});v.events=v.events.slice(-80);
}
export function closeFrontlineMission(s,m,status,reason){if(!liveChronicle(m))return;m.status=status;event(s,m,reason);}

// A resident garrison is an actual duty with ordinary daily costs. It is not
// another incomplete move or an invented forecast of eventual conquest.
export function assignFrontlineDuty(s,m,requirements){
 if(!liveChronicle(m))return;
 m.requirements={...requirements};
 if(m.purpose==='garrison')return;
 m.purpose='garrison';m.status='executing';
 event(s,m,'移动与进攻准备步骤结束，实际在城部队交接为前线驻守；新出征须重新通过共同校验');
}

export function inheritConcentration(s,p){
 const v=s.campaign.ai?.coordination;if(!v)return null;
 const ids=p.officerIds.filter(id=>{const o=residentOfficer(s,id);return o?.faction===p.faction&&o.location===p.staging&&!o.destination&&!o.army;});
 if(!ids.length)return null;
 const existing=frontlineMissions(s,p.faction).find(m=>m.cityId===p.staging&&m.target===p.target);
 // Keep the completed movement and its dependent preparation in one method.
 // The movement's effect is witnessed by actual location, never an ETA.
 const day=s.campaign.day,moveId='arrive:'+p.faction+':'+p.createdDay;
 const facts=Object.fromEntries(ids.map(id=>['at:'+id,p.staging]));
 const move={id:moveId,start:day-1,end:day,after:[],claims:ids.map(id=>({resource:'officer:'+id,amount:1})),conditions:ids.map(id=>({key:'at:'+id,value:p.staging,source:'initial'})),effects:ids.map(id=>({key:'at:'+id,value:p.staging}))};
 const next={id:'prepare:'+v.nextId,start:day,end:day+1,after:[moveId],claims:move.claims,conditions:ids.map(id=>({key:'at:'+id,value:p.staging,source:moveId})),effects:[]};
 const accepted=frontlineMissions(s).filter(m=>m!==existing).map(m=>({id:'owner:'+m.id,start:day,end:day+1,after:[],claims:m.officerIds.map(id=>({resource:'officer:'+id,amount:1})),conditions:[],effects:[]}));
 if(!firstChronicleMethod({accepted,methods:[{tasks:[move,next]}],facts}).tasks)return null;
 if(existing){existing.officerIds=[...new Set([...existing.officerIds,...ids])];existing.requirements={...p.requirements[0]};existing.purpose='preparation';event(s,existing,'新一批人员到达，交接至原前线准备任务');return existing;}
 const m={id:v.nextId++,kind:'frontline',purpose:'preparation',faction:p.faction,cityId:p.staging,target:p.target,status:'authorized',revision:0,createdDay:day,updatedDay:day,officerIds:ids,requirements:{...p.requirements[0]},reason:'集结实际到达，继续归属前线准备与出征任务'};
 v.missions.push(m);return m;
}

// Called at turn boundaries only. Crisis preemption is an explicit state
// transition; it never teleports a person, cancels paid work or refunds stock.
export function reviewFrontlineMissions(s,{unsafe,canPrepare}){
 if(!isAITurnStart(s))return;
 for(const m of frontlineMissions(s)){
  const c=s.cities.find(c=>c.id===m.cityId);
  if(!c||c.owner!==m.faction||unsafe(m,c)){closeFrontlineMission(s,m,'cancelled','真实危局、目标或道路失效，重新分配前线任务');continue;}
  const remaining=m.officerIds.filter(id=>{const o=residentOfficer(s,id);return o?.faction===m.faction&&!o.destination&&o.location===c.id;});
  if(!remaining.length){closeFrontlineMission(s,m,'failed','原人员已离开或不再属于本势力');continue;}
  if(remaining.length!==m.officerIds.length){m.officerIds=remaining;event(s,m,'仅保留仍实际在前线的人员');}
  if(!canPrepare(m,c))closeFrontlineMission(s,m,'cancelled','当前没有可实施的准备或出征方法，释放任务');
 }
 const v=s.campaign.ai.coordination;v.missions=v.missions.filter(m=>liveChronicle(m)||v.missions.filter(x=>!liveChronicle(x)).slice(-20).includes(m));
}

export function handoffFrontlineToPlan(s,p){
 for(const m of frontlineMissions(s,p.faction)){
  const used=m.officerIds.filter(id=>p.officerIds.includes(id));if(!used.length)continue;
  const remaining=m.officerIds.filter(id=>!used.includes(id));
  if(remaining.length){m.officerIds=remaining;event(s,m,'部分前线人员原子交接给已通过共同校验的出征计划');}
  else closeFrontlineMission(s,m,'complete','全部前线人员原子交接给已通过共同校验的出征计划');
 }
}

// A funded forward preparation can inherit an existing duty explicitly.
// Callers prove its destination advances the same operation. A failed shared
// transfer restores both claims and history; physical idleness grants nothing.
export function transferFrontlineToConcentration(s,p,id,execute){
 const owners=frontlineMissions(s,p.faction).filter(m=>m.officerIds.includes(id));
 if(owners.some(m=>m.target!==p.target))return {error:'前线任务目标不同，须重新选择可交接人员'};
 const saved=owners.map(m=>[m,structuredClone(m)]),events=structuredClone(s.campaign.ai.coordination.events),ids=[...p.officerIds];
 const restore=()=>{for(const [m,before]of saved)Object.assign(m,before);s.campaign.ai.coordination.events=events;p.officerIds=ids;};
 for(const m of owners){const remaining=m.officerIds.filter(x=>x!==id);if(!remaining.length)closeFrontlineMission(s,m,'complete','原前线人员交接给同目标的更近作战基地准备');else{m.officerIds=remaining;event(s,m,'部分前线人员交接给同目标的更近作战基地准备');}}
 if(!p.officerIds.includes(id))p.officerIds.push(id);
 try{const result=withFactionTask(s,p,execute);if(result.error)restore();return result;}catch(error){restore();throw error;}
}

export function coordinatedOrderError(s,faction,q){
 if(!s.campaign.ai?.factions[faction])return null;
 // An executing parent must explicitly hand its claims to a new plan first.
 // Direct lower-level requests cannot infer ownership from physical idleness.
 const ids=q.officerIds||s.armies.find(a=>a.id===q.armyId)?.units.map(u=>u.id)||[];
 for(const id of ids)for(const row of officerCommitments(s,id)){
  if(row.faction!==faction)continue;
  // Existing shared queued-order replacement remains supported before an
  // operation starts. Ordinary AI selectors still see the reservation via
  // plannedOfficer. Executing tasks require explicit parent authority.
  if(row.kind==='capture'&&['prepare','assemble'].includes(row.owner.phase))continue;
  if(authorizations.get(s)===row.owner&&permits(row,{...q,officerIds:ids}))continue;
  return row.kind==='frontline'?'执行人已归属前线任务，须由势力规划交接或取消后改派':'执行人已有势力任务承诺，须由原任务授权、交接或取消后改派';
 }
 return null;
}

// Compile an entire proposed operation, not one independently authorized move.
// Current stock is a cumulative resource; expected receipts only justify a
// waiting task and cannot grant a funded departure. Supply route admission is
// still performed by the shared route forecast before this method is called.
export function captureMethod(s,faction,proposal){
 const {staging,target,units,origins,columns,grain,executionDays,ready}=proposal;
 const day=s.campaign.day,end=day+Math.max(1,executionDays),claims=[],capacities={},facts={};
 for(const u of units){
  // Taking a held force into a fully admitted operation is a parent-to-parent
  // handoff, unlike another partial relocation. Shared departure guards remain.

  const owners=officerCommitments(s,u.id).filter(r=>!['concentration','frontline'].includes(r.kind));if(owners.length)return null;
  facts['officer:'+u.id]=true;claims.push({resource:'officer:'+u.id,amount:1});
 }
 // Reserve initial loads exactly once per real depot, including transfer legs.
 const loads=columns?{}:{[staging.id]:grain};
 for(const g of origins)if(columns||g.cityId!==staging.id)loads[g.cityId]=(loads[g.cityId]||0)+g.grain;
 for(const [id,amount]of Object.entries(loads)){
  const c=s.cities.find(c=>c.id===id),reserved=resourceCommitments(s,id,'grain').reduce((n,r)=>n+r.amount,0);
  capacities['grain:'+id]=Math.max(0,c.grain-reserved);
  if(ready&&amount)claims.push({resource:'grain:'+id,amount});
 }
 const task={id:'capture:'+faction+':'+s.campaign.ai.nextPlanId,start:day,end,after:[],claims,conditions:units.map(u=>({key:'officer:'+u.id,value:true,source:'initial'})),effects:[{key:'owner:'+target.id,value:faction}]};
 const result=firstChronicleMethod({methods:[{tasks:[task]}],capacities,facts,budget:1});
 return result.tasks?{version:1,status:ready?'authorized':'reserved',revision:0,updatedDay:day,tasks:result.tasks,capacities}:null;
}

// Rotating bounded geography batches: failed prefixes cannot permanently hide
// later lawful directions. A retained mission is always checked first.
export function coordinationPairs(s,faction,pairs,limit){
 const v=s.campaign.ai.coordination,key=p=>p.staging.id+'>'+p.target.id,byKey=new Map(pairs.map(p=>[key(p),p]));
 const signature=[...byKey.keys()].sort().join('|'),previous=v.search[faction];
 const order=previous?.signature===signature&&previous.order?previous.order:pairs.map(key);
 const offset=previous?.signature===signature?previous.offset%Math.max(1,pairs.length):0;
 const held=frontlineMissions(s,faction),priority=pairs.filter(p=>held.some(m=>m.cityId===p.staging.id&&m.target===p.target.id));
 const chosen=[...priority];let scanned=0;
 while(scanned<pairs.length&&chosen.length<limit){const p=byKey.get(order[(offset+scanned++)%pairs.length]);if(!chosen.includes(p))chosen.push(p);}
 v.search[faction]={signature,order,offset:pairs.length?(offset+scanned)%pairs.length:0};return chosen;
}
