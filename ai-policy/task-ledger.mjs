import {frontlineMissions} from './faction-coordination.mjs';
import {resourceCommitments} from './resource-commitments.mjs';
import {chronicleError} from './chronicle.mjs';
import {validOccupationPayoff} from './campaign-payoff.mjs';
const endOfLease=1000000000;
const task=(id,start,end,ids,extra={})=>({id,start,end,after:[],claims:ids.map(id=>({resource:'officer:'+id,amount:1})),conditions:[],effects:[],...extra});

// Execution records are the only authority. This projection contains no
// synthetic soldiers, speculative receipts or separately mutable inventories.
export function projectFactionTasks(s){
 const day=s.campaign.day,ai=s.campaign.ai,tasks=[],capacities={},owners=new Map(),work=new Map(),steps=[];
 const add=(id,ids,kind,refs={})=>{
  const unique=[...new Set(ids)];if(!unique.length)return;
  const t=task(id,day,endOfLease,unique,{kind,...refs});tasks.push(t);
  for(const id of unique){const rows=owners.get(id)||[];rows.push(t);owners.set(id,rows);}return t;
 };
 for(const p of ai?.plans||[])if(!['complete','cancelled','consolidate'].includes(p.phase))add('capture:'+p.id,p.officerIds,'capture',{faction:p.faction,cityId:p.staging,target:p.target});
 for(const p of ai?.concentrations||[])if(p.status==='active')add('concentration:'+p.faction+':'+p.createdDay,p.officerIds,'concentration',{faction:p.faction,cityId:p.staging,target:p.target});
 for(const m of frontlineMissions(s))add('frontline:'+m.id,m.officerIds,'frontline',{faction:m.faction,cityId:m.cityId,target:m.target});
 for(const p of ai?.supports||[])add('support:'+p.id,p.officerIds,'support',{faction:p.faction,cityId:null,target:p.target});
 for(const p of ai?.staffing||[])add('staffing:'+p.officerId,[p.officerId],'staffing',{faction:p.faction,cityId:p.cityId,target:p.cityId});
 for(const p of [...(s.campaign.diplomacy?.proposals||[]),...(s.campaign.diplomacy?.contracts||[])]){
  if(!['outbound','negotiating','pending','approved','signed'].includes(p.status))continue;
  for(const c of p.clauses)if(c.kind==='deploy'&&(p.status!=='signed'||c.status==='waiting'&&!c.armyId))add('diplomatic-deploy:'+p.id+':'+c.id,c.officerIds,'diplomatic-deploy',{faction:c.from,cityId:c.cityId,target:c.targetId});
 }
 // Physical executors retain their parent identity until a witnessed handoff.
 // Movement consumes the parent's officer claim, never a second claim.
 const execution=(id,ids,kind,refs={},compatible=()=>false)=>{
  const inherited=ids.filter(id=>(owners.get(id)||[]).some(compatible)),independent=ids.filter(id=>!inherited.includes(id));
  // A resident army may contain both officers assigned to the next operation
  // and a real remaining garrison. Project ownership per person; the physical
  // container must not claim its already-reserved members a second time.
  if(inherited.length){const parents=[...new Set(inherited.flatMap(id=>owners.get(id)||[]))].filter(compatible);steps.push({id:independent.length?id+':assigned':id,kind,officerIds:inherited,parents:parents.map(p=>p.id),...refs});}
  if(independent.length)add(id,independent,kind,refs);
 };
 for(const t of s.campaign.scouting.tasks)execution('scout:'+t.id,[t.officerId],'scout',{faction:t.faction,cityId:t.homeCity,target:t.targetCity,route:[t.location,...t.route]});
 const suspendedDiplomats=[];
 for(const a of s.campaign.diplomacy.assignments){
  const defender=!a.projectId&&s.armies.find(b=>b.defense&&!b.disbanded&&b.location===a.homeCity&&b.units.some(u=>u.id===a.officerId)&&s.campaign.battles.some(v=>!v.settled&&v.armyIds.includes(b.id)));
  // Shared siege mobilisation temporarily suspends an unstarted embassy.
  // Preserve its appointment as a dependent continuation, not concurrent work.
  if(defender)suspendedDiplomats.push({id:'diplomat:'+a.id,kind:'suspended-diplomat',officerIds:[a.officerId],armyId:defender.id,cityId:a.homeCity,target:null});
  else execution('diplomat:'+a.id,[a.officerId],'diplomat',{faction:a.faction,cityId:a.homeCity,target:null,projectId:a.projectId});
 }
 for(const o of s.campaign.idle.filter(o=>o.destination))execution('travel:'+o.unit.id,[o.unit.id],'travel',{faction:o.faction,cityId:o.location,target:o.relayDestination||o.destination,route:[o.location,...(o.journey?.route||[])]},p=>[p.cityId,p.target].includes(o.relayDestination||o.destination));
 for(const c of s.cities)for(const u of c.units.filter(u=>u.mission))execution('envoy:'+u.id,[u.id],'envoy',{faction:c.owner,cityId:c.id,target:u.mission.targetCity||u.mission.target||u.mission.destination||null},p=>p.kind==='diplomat'&&u.mission.type==='diplomacy'&&p.projectId===u.mission.projectId||p.kind==='staffing'&&p.cityId===c.id);
 for(const a of s.armies.filter(a=>!a.disbanded))execution('army:'+a.id,a.units.map(u=>u.id),'army',{faction:a.faction,cityId:a.location,target:a.target,route:[a.travel?.from||a.location,...a.route]},p=>['capture','support','diplomatic-deploy'].includes(p.kind));
 for(const d of suspendedDiplomats)steps.push({...d,parents:[...new Set(d.officerIds.flatMap(id=>(owners.get(id)||[]).map(p=>p.id)))]});
 for(const q of s.campaign.domestic.orders){
  const parents=q.officerIds.flatMap(id=>owners.get(id)||[]);
  // A concrete saved child command realizes its parent's reservation once.
  const inherited=parents.length&&q.officerIds.every(id=>(owners.get(id)||[]).some(t=>[t.cityId,t.target].includes(q.target)));
  if(!inherited)add('order:'+q.id,q.officerIds,'order',{faction:q.faction,cityId:q.cityId,target:q.target||null});
  else steps.push({id:'order:'+q.id,kind:'order',officerIds:q.officerIds,parents:[...new Set(parents.map(p=>p.id))],cityId:q.cityId,target:q.target||null});
 }
 for(const a of s.campaign.domestic.assignments){
  if(!a.action)continue;
  const t=task('work:'+a.id,day,day+Math.max(1,Math.ceil(a.action.remaining)),[a.officerId],{kind:'paid-work',cityId:a.cityId});
  t.effects=[{key:'work-complete:'+a.officerId,value:true}];work.set(a.officerId,t);tasks.push(t);
 }
 for(const [id,rows]of owners){
  const paid=work.get(id);if(!paid)continue;
  // A staff parent's real work is its own child. Other saved departures wait
  // for that paid child to finish; estimated time alone grants no departure.
  for(const t of rows){
   t.start=Math.max(t.start,paid.end);
   if(!t.after.includes(paid.id))t.after.push(paid.id);
   t.conditions.push({key:'work-complete:'+id,value:true,source:paid.id});
  }
 }
 for(const c of s.cities){
  for(const [key,project]of [['construction',c.project],['research',c.domestic.research]])if(project){
   const resource='slot:'+c.id+':'+key;capacities[resource]=1;
   tasks.push(task('slot:'+c.id+':'+key,day,endOfLease,[],{kind:'paid-slot',claims:[{resource,amount:1}],cityId:c.id}));
  }
 }
 const reservations=[];
 for(const c of s.cities)for(const key of ['gold','grain','manpower']){
  let available=c[key];
  for(const [index,r]of resourceCommitments(s,c.id,key).entries()){
   const funded=Math.min(available,r.amount);available-=funded;
   reservations.push({id:c.id+':'+key+':'+index,cityId:c.id,key,kind:r.kind,amount:r.amount,funded,waiting:r.amount-funded});
  }
  capacities['stock:'+c.id+':'+key]=c[key];
  for(const r of reservations.filter(r=>r.cityId===c.id&&r.key===key&&r.funded))tasks.push(task('reserve:'+r.id,day,endOfLease,[],{kind:'stock-reservation',claims:[{resource:'stock:'+c.id+':'+key,amount:r.funded}]}));
 }
 return {version:1,tasks,steps,capacities,reservations};
}
export function validateTurnPlan(p,day,fail){
 const int=n=>Number.isSafeInteger(n)&&n>=0;
 fail(p&&p.version===1&&int(p.day)&&p.day>0&&p.day<=day&&int(p.revision)&&p.revision>0&&p.status==='authorized');
 fail(Array.isArray(p.modules)&&p.modules.every(x=>typeof x==='string')&&Array.isArray(p.actions)&&p.actions.length<=2048&&Array.isArray(p.rejected)&&p.rejected.length<=128);
 for(const a of p.actions)fail(int(a.sequence)&&typeof a.name==='string'&&typeof a.module==='string'&&Array.isArray(a.officerIds)&&a.officerIds.every(x=>typeof x==='string')&&Array.isArray(a.changes)&&a.changes.every(r=>typeof r.cityId==='string'&&['gold','grain','manpower'].includes(r.key)&&Number.isSafeInteger(r.delta)));
 fail(p.ledger?.version===1&&Array.isArray(p.ledger.tasks)&&p.ledger.tasks.length<10000&&p.ledger.capacities&&Array.isArray(p.ledger.reservations));
 fail(!chronicleError(p.ledger.tasks,p.ledger.capacities));
 fail(Array.isArray(p.effects)&&p.effects.every(e=>typeof e.module==='string'&&Array.isArray(e.changes)));
 if(p.methods!==undefined){
  fail(Array.isArray(p.methods)&&p.methods.length<=256);
  for(const m of p.methods){
   fail(['capture','observe-to-decide'].includes(m.kind)&&typeof m.faction==='string'&&typeof m.staging==='string'&&typeof m.target==='string'&&typeof m.reason==='string');
   if(m.kind==='capture')fail(validOccupationPayoff(m.payoff));
   else fail(typeof m.taskId==='string'&&typeof m.continued==='boolean'&&m.evidence&&['attackPower','reportedDefense','uncertainDefense','scoreIfConfirmed'].every(k=>Number.isFinite(m.evidence[k]))&&validOccupationPayoff(m.evidence.payoffIfConfirmed));
  }
 }
 const ids=new Set(p.ledger.tasks.map(t=>t.id));
 fail(Array.isArray(p.ledger.steps));
 for(const step of p.ledger.steps){
  fail(typeof step.id==='string'&&Array.isArray(step.parents)&&step.parents.length>0&&step.parents.every(id=>ids.has(id))&&Array.isArray(step.officerIds));
  for(const id of step.officerIds)fail(step.parents.some(parent=>p.ledger.tasks.find(t=>t.id===parent)?.claims.some(c=>c.resource==='officer:'+id)));
 }
 for(const r of p.ledger.reservations)fail(int(r.amount)&&int(r.funded)&&int(r.waiting)&&r.amount===r.funded+r.waiting);
}
