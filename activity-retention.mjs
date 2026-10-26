import {importantActivityNode} from './activity-nodes.mjs';
import {isPlayerControlled} from './player-faction.mjs';
import {PROGRESSION} from './progression.mjs';

// Keep operational receipts, pending reports and battle facts. Civil history is
// not a replay: completed turns are reduced to cumulative merit totals.
export function compactActivityState(s){
 const ledger=s.campaign.activity,day=s.campaign.day;
 if(ledger.compactedDay===day)return;
 const from=Math.min(Math.floor((day-1)/10)*10+1,Math.max(1,day-PROGRESSION.scouting.freshDays+1));
 const latestHarvest=ledger.nodes.findLast(n=>n.phase==='harvest');
 const keepIds=new Set(latestHarvest?[latestHarvest.id,...latestHarvest.result.nodeIds]:[]);
 const domestic=s.campaign.domestic;
 const activeIncidents=new Set([...domestic.assignments.map(a=>a.action?.incidentId),...s.cities.map(c=>c.domestic.suspended?.incidentId)].filter(id=>id!=null));
 const keep=n=>n.day>=from||['battle','occupation'].includes(n.category)||keepIds.has(n.id)||n.phase==='incident'&&activeIncidents.has(n.result.incident.id)||isPlayerControlled(s,n.faction)&&importantActivityNode(n)&&!n.read;
 const removed=ledger.nodes.filter(n=>!keep(n));
 for(const n of removed)if(n.phase==='merit'&&n.officerId){
  const faction=ledger.meritTotals[n.faction]??={},row=faction[n.officerId]??={battle:0,domestic:0,other:0};
  row[n.category==='battle'?'battle':n.category==='domestic'?'domestic':'other']+=n.result.growth.gained;
 }
 if(removed.length)ledger.nodes=ledger.nodes.filter(keep);
 const incidentIds=new Set(ledger.nodes.filter(n=>n.phase==='incident').map(n=>n.result.incident.id));
 domestic.incidents.events=domestic.incidents.events.filter(r=>activeIncidents.has(r.id)||r.day>=from||incidentIds.has(r.id));
 const sources=new Set(ledger.nodes.map(n=>n.sourceId));
 domestic.events=domestic.events.filter(e=>e.day>=from||sources.has('domestic:'+e.id));
 const waits=new Set(domestic.orders.flatMap(q=>(q.waits||[]).map(w=>w.actionId)));
 for(const r of domestic.incidents.events)if(activeIncidents.has(r.id))for(const id of r.actionIds)waits.add(id);
 for(const [id,history]of Object.entries(domestic.workHistory)){
  const staffing=s.campaign.ai?.staffing?.find(p=>p.officerId===id&&p.phase==='work');
  const retained=history.filter(h=>h.endedDay>=from||waits.has(h.actionId)||staffing&&h.startedDay>=staffing.arrivedDay);
  if(retained.length)domestic.workHistory[id]=retained;else delete domestic.workHistory[id];
 }
 ledger.compactedDay=day;
}
