import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {removeDomesticOrder} from './domestic.mjs';
import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

export const activeConcentration=(s,faction)=>s.campaign.ai.concentrations.find(p=>p.faction===faction&&p.status==='active');
export const concentrationResting=(s,id,destination)=>s.campaign.ai.concentrations.some(p=>p.status!=='active'&&s.campaign.day<=p.finishedDay+R.concentration.restDays&&p.officerIds.includes(id)&&p.staging!==destination);
export const concentrationRetryBlocked=(s,faction,staging,target)=>s.campaign.ai.concentrations.some(p=>p.faction===faction&&p.status==='cancelled'&&p.staging===staging&&p.target===target&&s.campaign.day<=p.finishedDay+R.concentration.restDays);

export function closeConcentration(s,p,status,reason){
 if(p.status!=='active')return;
 p.status=status;p.finishedDay=s.campaign.day;p.reason=reason;
 // Only cancel this preparation's unexecuted transfers. Already travelling
 // people retain their real journeys; neither closure nor reload teleports them.
 for(const q of [...s.campaign.domestic.orders])if(q.faction===p.faction&&q.kind==='transfer'&&q.target===p.staging&&q.officerIds.some(id=>p.officerIds.includes(id)))removeDomesticOrder(s,q.id,reason);
 const goal=s.campaign.ai.factions[p.faction].strategy.goal;
 if(goal?.candidateId==='capture-assembly:'+p.staging+':'+p.target&&status==='cancelled'){
  goal.status='cancelled';goal.requirements=[];goal.reason=reason;
 }
}

export function adoptConcentration(s,faction,candidate){
 const active=activeConcentration(s,faction);
 if(active&&candidate?.concentration&&candidate.staging===active.staging&&candidate.targetCity===active.target)return active;
 if(active)closeConcentration(s,active,'cancelled','改选可行战略，释放原前沿准备');
 if(!candidate?.concentration)return null;
 const day=s.campaign.day;
 const p={faction,staging:candidate.staging,target:candidate.targetCity,status:'active',createdDay:day,deadline:day+R.preparationTurns*10,lastProgressDay:day,finishedDay:null,
  intendedIds:[...candidate.concentration.intendedIds],officerIds:[],arrivedIds:[],requirements:structuredClone(candidate.requirements),score:candidate.score,full:candidate.concentration.full,reason:candidate.reason};
 s.campaign.ai.concentrations.push(p);return p;
}

export function progressConcentrations(s,{power,unsafe,reviewFaction=null}){
 const day=s.campaign.day;
 s.campaign.ai.concentrations=s.campaign.ai.concentrations.filter(p=>p.status==='active'||day<=p.finishedDay+R.concentration.restDays);
 for(const p of s.campaign.ai.concentrations.filter(p=>p.status==='active')){
  const c=s.cities.find(c=>c.id===p.staging);
  if(!c||c.owner!==p.faction||unsafe(p,c)){closeConcentration(s,p,'cancelled','前沿准备的归属、道路或实际防务已变化');continue;}
  let travelling=false,waiting=false,missing=false;
  for(const id of p.officerIds){
   const o=residentOfficer(s,id),journey=s.campaign.idle.find(o=>o.unit.id===id&&o.faction===p.faction&&o.destination===p.staging);
   const queued=s.campaign.domestic.orders.some(q=>q.kind==='transfer'&&q.faction===p.faction&&q.target===p.staging&&q.officerIds.includes(id));
   if(o?.faction===p.faction&&o.location===p.staging&&!o.army&&!o.destination){if(!p.arrivedIds.includes(id)){p.arrivedIds.push(id);p.lastProgressDay=day;}}
   else if(journey&&!journey.journey?.blocked)travelling=true;
   else if(queued)waiting=true;
   else missing=true;
  }
  if(missing){closeConcentration(s,p,'cancelled','集结人员改程、离队或任务失效，释放原准备');continue;}
  // A completed transfer step is evidence of actual arrival, not a promise
  // that its old roster estimate still equals today's strength. Composition,
  // appointments and other resident troops can change that estimate. Release
  // the arrived roster at the turn review; ordinary attack admission still
  // checks the current force, home defense, intelligence and full supply cost.
  const allArrived=p.intendedIds.every(id=>p.officerIds.includes(id)&&p.arrivedIds.includes(id));
  // Arrival is observed daily, but completion and military reevaluation belong
  // to the normal turn review. The deadline is never refreshed by progress.
  if(day<=p.deadline&&reviewFaction===p.faction&&p.officerIds.length&&!travelling&&!waiting&&(allArrived||Math.ceil(power(c))>=p.requirements[0].defensePower)){closeConcentration(s,p,'complete','本步现役已实际到达，交由本旬重新评估出征');continue;}
  if(day>p.deadline||!allArrived&&!travelling&&!waiting&&day-p.lastProgressDay>=R.concentration.stallDays)closeConcentration(s,p,'cancelled','前沿准备到期或没有实际进展，释放人员与预算');
 }
}

export function validateConcentrations(s,fail,claimed){
 const ai=s.campaign.ai,day=s.campaign.day,int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max,city=id=>s.cities.some(c=>c.id===id),active=new Set(),keys=new Set();
 fail(Array.isArray(ai.concentrations)&&ai.concentrations.length<=Object.keys(ai.factions).length*(R.concentration.restDays/10+3));
 for(const p of ai.concentrations){
  fail(p&&Object.hasOwn(ai.factions,p.faction)&&city(p.staging)&&city(p.target)&&p.target!==p.staging&&['active','complete','cancelled'].includes(p.status));
  const key=p.faction+':'+p.createdDay;fail(!keys.has(key));keys.add(key);
  fail(int(p.createdDay,day)&&p.createdDay>0&&p.deadline===p.createdDay+R.preparationTurns*10&&int(p.lastProgressDay,day)&&p.lastProgressDay>=p.createdDay);
  fail(p.status==='active'?p.finishedDay===null:int(p.finishedDay,day)&&p.finishedDay>=p.createdDay);
  fail(typeof p.full==='boolean'&&Number.isFinite(p.score)&&typeof p.reason==='string'&&p.reason.length<=120);
  fail(Array.isArray(p.officerIds)&&p.officerIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.officerIds).size===p.officerIds.length&&p.officerIds.every(id=>OFFICER_BY_ID[id]));
  fail(Array.isArray(p.intendedIds)&&p.intendedIds.length>0&&p.intendedIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.intendedIds).size===p.intendedIds.length&&p.intendedIds.every(id=>OFFICER_BY_ID[id])&&p.officerIds.every(id=>p.intendedIds.includes(id)));
  fail(p.full||p.intendedIds.length<=R.concentration.partialUnits);
  fail(Array.isArray(p.arrivedIds)&&new Set(p.arrivedIds).size===p.arrivedIds.length&&p.arrivedIds.every(id=>p.officerIds.includes(id)));
  fail(Array.isArray(p.requirements)&&p.requirements.length===1&&p.requirements[0].cityId===p.staging&&['gold','grain','manpower','defensePower'].every(k=>int(p.requirements[0][k]))&&p.requirements[0].defensePower>0);
  if(p.status==='active'){fail(!active.has(p.faction));active.add(p.faction);for(const id of p.officerIds){fail(!claimed.has(id));claimed.add(id);}}
 }
}
