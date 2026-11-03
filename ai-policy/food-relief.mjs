import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {localFoodUse} from '../city-logistics.mjs';
import {personnelRouteDays} from '../personnel-movement.mjs';
import {safeStrategicTransportRoute} from '../strategic-ai.mjs';

// A forecast for future full-capacity troops is not an actual food emergency.
// Count only real local mouths and cargo which can arrive before stocks run out.
export function cityFoodRelief(s,c){
 const use=localFoodUse(c),toHarvest=10-(s.campaign.day-1)%10;
 if(!use||c.grain>=use*ECONOMY_RULES.budget.criticalFoodDays||c.grain>=use*toHarvest)return {urgent:false,use,toHarvest,inbound:0};
 const inbound=s.campaign.idle.filter(o=>o.faction===c.owner&&o.destination===c.id&&o.cargo?.grain&&o.journey&&!o.journey.blocked)
  .filter(o=>personnelRouteDays(s,o,o.journey.route,{progress:o.journey.progress})<=Math.max(0,c.grain/use)&&safeStrategicTransportRoute(s,o.location,c.id,c.owner))
  .reduce((n,o)=>n+o.cargo.grain,0);
 return {urgent:c.grain+inbound<use*toHarvest,use,toHarvest,inbound};
}

// Historical origins do not reserve a city's stock after a force has left.
// Release only current local people, carry claims and saved future departures.
export function planCommitsCityResources(s,p,c){
 if((p.reserves[c.id]||0)>0)return true;
 if(p.phase!=='attack'&&p.requirements.some(r=>r.cityId===c.id&&r.grain>0))return true;
 const ids=new Set(p.officerIds);
 if(c.units.some(u=>ids.has(u.id)))return true;
 return s.campaign.domestic.orders.some(q=>q.faction===p.faction&&q.kind==='expedition'&&q.cityId===c.id&&q.officerIds.some(id=>ids.has(id)));
}
