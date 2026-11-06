import {servingPeople} from '../talent-core.mjs';
import {dismissDiplomat} from '../diplomacy.mjs';
import {isAIControlled} from '../player-faction.mjs';

// A defender may return to another surviving city after losing its old home.
// An idle embassy is then a stale appointment, not permission to depart from
// the lost location. Close it through the shared command; ordinary diplomacy
// may choose a new real resident during this same planning boundary.
export function reconcileDiplomaticOrigins(s){
 const people=servingPeople(s);
 for(const a of [...s.campaign.diplomacy.assignments]){
  if(!isAIControlled(s,a.faction))continue;
  const o=people.get(a.officerId);
  const project=a.projectId&&[...s.campaign.diplomacy.proposals,...s.campaign.diplomacy.contracts].find(p=>p.id===a.projectId);
  const endedProject=a.projectId&&(!project||!['outbound','negotiating','pending','approved','signed'].includes(project.status));
  if(o&&!o.unit.mission&&(endedProject||!a.projectId&&(o.destination||o.location!==a.homeCity)))dismissDiplomat(s,a.officerId,{faction:a.faction,scheduled:true});
 }
}
