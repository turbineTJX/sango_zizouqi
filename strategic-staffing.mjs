import {residentOfficer} from './city-personnel.mjs';
import {assignDomestic,assignmentFor,ACTIONS,DIRECTIONS} from './domestic.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';

// A staffing promise owns no resources and is fulfilled only by real arrival,
// the shared appointment operation and an actual completed work attempt.
export const staffingOfficer=(s,id)=>(s.campaign.ai?.staffing||[]).some(p=>p.officerId===id);
export function progressStrategicStaffing(s){
 const ai=s.campaign.ai,keep=[];
 for(const p of ai.staffing){
  const moving=s.campaign.idle.find(t=>t.unit.id===p.officerId&&t.destination),queued=s.campaign.domestic.orders.find(q=>q.officerIds.includes(p.officerId));
  const c=s.cities.find(c=>c.id===p.cityId),o=residentOfficer(s,p.officerId);
  if(!c||c.owner!==p.faction)continue;
  if(moving||queued){if((moving?.faction||queued?.faction)===p.faction&&(moving?.relayDestination||moving?.destination||queued?.target)===p.cityId)keep.push(p);continue;}
  if(!o||o.faction!==p.faction||o.army||o.unit.mission)continue;
  if(o.location!==p.cityId)continue;
  if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===p.cityId)){keep.push(p);continue;}
  if(o.unit.scouting)continue;
  let a=assignmentFor(s,p.officerId);
  if(!a){
   const directions=Object.keys(DIRECTIONS).filter(d=>!s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===d));
   const ranked=directions.flatMap(direction=>rankOfficerCandidates(s,[o.unit],{task:'domestic',city:c.id,direction}).filter(x=>x.recommendation.available).map(x=>({...x,direction})))
    .sort((a,b)=>Number(b.direction===p.direction)-Number(a.direction===p.direction)||b.recommendation.score-a.recommendation.score||a.direction.localeCompare(b.direction));
   if(!ranked.length)continue;
   p.direction=ranked[0].direction;
   if(assignDomestic(s,c.id,p.direction,p.officerId,{scheduled:true,faction:p.faction}))continue;
   a=assignmentFor(s,p.officerId);
  }
  // Existing legitimate appointments are preserved rather than overwritten.
  if(a.cityId!==c.id)continue;
  p.direction=a.direction;p.phase='work';p.arrivedDay??=s.campaign.day;
  const completed=(s.campaign.domestic.workHistory[p.officerId]||[]).some(h=>h.cityId===c.id&&h.startedDay>=p.arrivedDay&&ACTIONS[h.key]?.direction===p.direction&&h.status!=='interrupted');
  if(completed)continue;
  if(!a.action&&!rankOfficerCandidates(s,[o.unit],{task:'domestic',city:c.id,direction:p.direction})[0].recommendation.available)continue;
  keep.push(p);
 }
 ai.staffing=keep;
}
export function validateStrategicStaffing(s,fail){
 const seen=new Set();fail(Array.isArray(s.campaign.ai.staffing));
 for(const p of s.campaign.ai.staffing){
  fail(p&&Object.keys(p).length===7&&!seen.has(p.officerId)&&s.campaign.ai.factions[p.faction]&&DIRECTIONS[p.direction]
   &&s.cities.some(c=>c.id===p.cityId)&&['travel','work'].includes(p.phase)&&Number.isSafeInteger(p.createdDay)&&p.createdDay>0&&p.createdDay<=s.campaign.day
   &&(p.arrivedDay===null||Number.isSafeInteger(p.arrivedDay)&&p.arrivedDay>=p.createdDay&&p.arrivedDay<=s.campaign.day));
  fail(p.phase==='travel'?p.arrivedDay===null:p.arrivedDay!==null);seen.add(p.officerId);
  fail(!!residentOfficer(s,p.officerId)||s.campaign.idle.some(o=>o.unit.id===p.officerId));
 }
}
