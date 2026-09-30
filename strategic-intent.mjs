// Intent is a reservation, never a second copy of troops or resources.
import {playerFaction} from './player-faction.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
export const activePlans=s=>(s.campaign.ai?.plans||[]).filter(p=>!['complete','cancelled'].includes(p.phase));
export const plannedOfficer=(s,id)=>activePlans(s).some(p=>p.officerIds.includes(id));
export const plannedCargo=(s,cityId,key)=>(s.campaign.domestic?.orders||[]).filter(q=>q.kind==='transfer'&&q.cityId===cityId&&q.faction!==playerFaction(s)).reduce((n,q)=>n+(q.cargo?.[key]||0),0);
export const plannedGrain=(s,cityId)=>activePlans(s).reduce((n,p)=>n+(p.reserves[cityId]||0),0)+plannedCargo(s,cityId,'grain');
export const cityIntent=(s,id)=>s.campaign.ai?.cities[id]||null;
export function domesticIntentWeight(s,cityId,direction){
 const role=cityIntent(s,cityId)?.role;
 const faction=s.cities.find(c=>c.id===cityId)?.owner,profile=ECONOMY_RULES.ai.offensive.styles[s.campaign.ai?.factions[faction]?.style];
 const preference=profile?(['military','martial'].includes(direction)?profile.militaryWeight:profile.economicWeight):1;
 return (({front:{military:1.35,martial:1.3,agriculture:1.15},staging:{military:1.25,agriculture:1.3},rear:{commerce:1.2,agriculture:1.15},recovery:{military:1.4,martial:1.2},talent:{talent:1.4}}[role]?.[direction])||1)*preference;
}
