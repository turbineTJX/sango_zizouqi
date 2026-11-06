import {cityForce} from '../city-units.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';
import {findCampaignRoute} from '../strategic-campaign.mjs';
import {strategicTravelDays,strategicCapabilities} from '../strategic-ai.mjs';
import {gateDurability} from '../building-durability.mjs';
import {forecastCoordinatedSupply} from '../strategic-route-supply.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';

// Scheduled departures share the same road/depot ledger as the new command.
// Otherwise two still-stationary armies could each spend tomorrow's throughput.
export function queuedSupplyCompatible(s,column,{coordinatedOfficerIds=[]}={}){
 const faction=column.army.faction,own=new Set(column.army.units.map(u=>u.id));
 // The caller has just assessed every column of this same coordinated plan
 // together. Do not re-price its saved later departures as a different,
 // compulsory round-trip campaign. Other plans still compete for throughput.
 const coordinated=new Set(coordinatedOfficerIds);
 const waiting=s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='expedition'&&!q.officerIds.some(id=>own.has(id))&&!q.officerIds.every(id=>coordinated.has(id)));
 if(!waiting.length)return true;
 const view=intelligenceWorld(s,faction),columns=[];
 for(const q of waiting){
  const city=view.cities.find(c=>c.id===q.cityId),target=view.cities.find(c=>c.id===q.target);
  if(!city||!target||target.owner===faction)continue;
  const units=q.officerIds.map(id=>city.units.find(u=>u.id===id));if(units.some(u=>!u))continue;
  const army={...cityForce(city),units,leader:q.leader,advisor:q.advisor},path=q.route||findCampaignRoute(view,city.id,target.id,faction);
  if(!path)continue;
  const travel=strategicTravelDays(view,army,path),siege=Math.max(R.opposition.minimumBattleDays,Math.ceil(gateDurability(target).hp/Math.max(1,strategicCapabilities(view,army).siege)));
  columns.push({army,path,days:travel*2+siege+2,delay:Math.max(0,(q.notBeforeDay||s.campaign.day)-s.campaign.day)});
 }
 return !columns.length||forecastCoordinatedSupply(s,[...columns,column]).feasible;
}
