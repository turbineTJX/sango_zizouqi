import {cityPersonnel} from '../city-personnel.mjs';
import {assignmentFor,assignDomestic} from '../domestic.mjs';
import {loyaltyWarningThreshold} from '../talent-core.mjs';
import {cityNeedsAgriculture,cityNeedsCommerce} from '../economy.mjs';
import {orderedDomesticRules} from './rule-match.mjs';
import {officerCommitments,frontlineMissions,closeFrontlineMission} from './faction-coordination.mjs';
import {appendActivityNode} from '../activity-nodes.mjs';

export function retentionNeeded(s,c){
 return cityPersonnel(s,c.id).some(o=>(s.campaign.domestic.loyalty[o.unit.id]??85)<Math.min(85,loyaltyWarningThreshold(s,o.unit.id,c.owner)+15));
}

// A front needs a real personnel officer while loyalty is deteriorating.
// This is an explicit handoff from preparation to a paid civil duty, never an
// extra free loyalty tick or a blanket release of the whole assembled force.
export function preparePersonnelRetention(s,c){
 if(!retentionNeeded(s,c))return;
 const people=cityPersonnel(s,c.id).filter(o=>!o.army&&!o.destination&&!o.unit.mission&&!o.unit.scouting);
 const existing=people.find(o=>assignmentFor(s,o.unit.id)?.direction==='talent'&&!officerCommitments(s,o.unit.id).length);
 const retain=id=>{if(!s.campaign.ai.staffing.some(p=>p.officerId===id))s.campaign.ai.staffing.push({officerId:id,faction:c.owner,cityId:c.id,direction:'talent',phase:'work',createdDay:s.campaign.day,arrivedDay:s.campaign.day});};
 if(existing){retain(existing.unit.id);return;}
 const eligible=people.filter(o=>{
  const a=assignmentFor(s,o.unit.id);
  if(a?.action||a?.proposal||a?.direction==='agriculture'&&cityNeedsAgriculture(s,c)||a?.direction==='commerce'&&cityNeedsCommerce(s,c))return false;
  return officerCommitments(s,o.unit.id).every(r=>r.kind==='frontline'&&r.cityId===c.id);
 });
 for(const {unit} of orderedDomesticRules(eligible.map(o=>o.unit),'talent')){
  const held=frontlineMissions(s,c.owner).filter(m=>m.officerIds.includes(unit.id)),saved=held.map(m=>[m,[...m.officerIds]]);
  for(const m of held)m.officerIds=m.officerIds.filter(id=>id!==unit.id);
  const error=assignDomestic(s,c.id,'talent',unit.id,{scheduled:true,faction:c.owner});
  if(error){for(const [m,ids]of saved)m.officerIds=ids;continue;}
  for(const m of held)if(!m.officerIds.length){m.officerIds=[unit.id];closeFrontlineMission(s,m,'complete','前线人员交接给本城真实人才维护工作');}
  retain(unit.id);
  appendActivityNode(s,{sourceId:`retention:${c.id}:${s.campaign.day}`,category:'personnel',phase:'staffing',faction:c.owner,cityId:c.id,officerId:unit.id,text:`${c.name}出现忠诚维护需求，${unit.name}交接至人才事务，按共同费用与时间安抚本城人员。`});
  return;
 }
}
