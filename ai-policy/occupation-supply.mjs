import {forecastRouteSupply,forecastCoordinatedSupply} from '../strategic-route-supply.mjs';
import {cityCaptureResources} from '../city-resources.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {foodConsumption} from '../army-supply.mjs';
import {cityBaseIncome} from '../economy.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';
import {forecastRouteSupply as forecastOutbound,forecastCoordinatedSupply as forecastOutboundColumns} from './occupation-route-supply.mjs';

// First check the independent home-funded round trip. If that is impossible,
// a known provisioned objective may support an occupation operation instead.
// Real current depots must cover approach, estimated siege AND a full extra
// execution window. Conditional stores only justify the subsequent stay; they
// never appear in the route allocator, action budget or opening baggage.
export function occupationSupply(s,{force,path,target,columns,approachDays,siegeDays,intelligence,day}){
 const roundDays=approachDays*2+siegeDays+2;
 const forecast=(days,round)=>columns
  ?(round?forecastCoordinatedSupply:forecastOutboundColumns)(s,columns.map(c=>({army:c.force,path:c.route,days:round?c.days*2+siegeDays+2:days-(approachDays-c.days),delay:approachDays-c.days})))
  :(round?forecastRouteSupply:forecastOutbound)(s,force,path,days,{attack:true});
 const full=forecast(roundDays,true);
 if(full.feasible)return {supply:full,days:roundDays,conditional:false};
 const fresh=intelligence.known&&intelligence.observedDay!==null&&day-intelligence.observedDay<=R.recovery.freshIntelligenceDays;
 const use=foodConsumption(force.units.reduce((n,u)=>n+u.troops,0),force.units.reduce((n,u)=>n+u.wounded,0));
 // This branch is explicitly conditional on capturing the city: use the
 // common occupation loss once. Utility discounts are not a second physical
 // destruction of the same food. Departure still cannot draw any of it.
 const retained=fresh?cityCaptureResources(target).retained.grain:0;
 const days=approachDays+siegeDays+R.tempo.executionBufferDays;
 const production=fresh?Math.floor(cityBaseIncome(intelligenceWorld(s,force.faction),target).grain*R.recovery.horizonDays/10*.25):0;
 if(days>=roundDays||retained+production<use*R.recovery.horizonDays)return {supply:full,days:roundDays,conditional:false};
 const outbound=forecast(days,false);
 return outbound.feasible?{supply:outbound,days,conditional:true}:{supply:full,days:roundDays,conditional:false};
}
