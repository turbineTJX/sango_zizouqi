// Intent is a reservation, never a second copy of troops or resources.
import {officerCommitments} from './ai-policy/faction-coordination.mjs';
import {resourceCommitments} from './ai-policy/resource-commitments.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
export const activePlans=s=>(s.campaign.ai?.plans||[]).filter(p=>!['complete','cancelled'].includes(p.phase));
export const offensivePlans=s=>activePlans(s).filter(p=>p.phase!=='consolidate');
export const plannedOfficer=(s,id,options={})=>officerCommitments(s,id,options).length>0;
export const plannedCargo=(s,cityId,key,options={})=>resourceCommitments(s,cityId,key,{...options,cargoOnly:true}).reduce((n,r)=>n+r.amount,0);
export const plannedGrain=(s,cityId,options={})=>resourceCommitments(s,cityId,'grain',options).reduce((n,r)=>n+r.amount,0);
export const cityIntent=(s,id)=>s.campaign.ai?.cities[id]||null;
export function domesticIntentWeight(s,cityId,direction){
 const role=cityIntent(s,cityId)?.role;
 const faction=s.cities.find(c=>c.id===cityId)?.owner,profile=ECONOMY_RULES.ai.offensive.styles[s.campaign.ai?.factions[faction]?.style];
 const preference=profile?(['military','martial'].includes(direction)?profile.militaryWeight:profile.economicWeight):1;
 return (({front:{military:1.35,martial:1.3,agriculture:1.15},staging:{military:1.25,agriculture:1.3},rear:{commerce:1.2,agriculture:1.15},recovery:{military:1.4,martial:1.2},talent:{talent:1.4}}[role]?.[direction])||1)*preference;
}
