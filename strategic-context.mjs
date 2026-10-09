import {intelligenceWorld,cityIntelligence,observedArmies} from './strategic-vision.mjs';
import {cityRoads} from './road-network.mjs';
import {gateDurability} from './building-durability.mjs';
import {cityBudget} from './city-budget.mjs';
import {citySupplyBudgets,forecastArmySupply} from './city-logistics.mjs';
import {cityRecurringIncome,cityWorkLimit,cityWorkRemaining,economicWorkScale} from './economy.mjs';
import {ACTIONS} from './domestic-designs.mjs';
import {domesticAbility} from './domestic-cooperation.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {technologyIncomeBonus} from './city-technology.mjs';
import {roadCost,threatenedTransportRoute} from './strategic-movement.mjs';
import {personnelSpeed} from './personnel-movement.mjs';
import {factionsHostile} from './diplomacy-relations.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

const power=units=>units.reduce((n,u)=>n+(u.hp??u.troops)*(.7+u.leadership/200+u.force/500+u.intellect/800),0);
export function observedHostileArmies(s,faction){
 // Army-only assessments need the same visibility and sanitized observation,
 // without reconstructing every city, officer and historical record.
 return observedArmies(s,faction).filter(a=>!a.disbanded&&factionsHostile(s,faction,a.faction));
}
// A value-only DTO. Do not expose state, RNG, pre-drawn outcomes or private orders
// to a goal evaluator. Foreign locations and resources come solely from reports.
export function strategicContext(s,faction){
 const view=intelligenceWorld(s,faction),supplies=citySupplyBudgets(s).filter(x=>x.army.faction===faction),supplyForecast=forecastArmySupply(s,{supplies});
 const own=view.cities.filter(c=>c.owner===faction),ids=new Set(own.map(c=>c.id)),edges=cityRoads(s);
 const frontier=new Set(edges.flatMap(([a,b])=>ids.has(a)&&!ids.has(b)?[b]:ids.has(b)&&!ids.has(a)?[a]:[]));
 const cities=view.cities.map(c=>{const i=cityIntelligence(s,c.id,faction),known=!!i.data;
  return {id:c.id,owner:c.owner,kind:c.kind,visible:i.visible,observedDay:i.day,known,
   power:known||c.owner===faction?power(c.units)+(c.garrison||0):null,
   gateHp:known||c.owner===faction?gateDurability(c).hp:null,
   commerce:known||c.owner===faction?c.commerce:null,farm:known||c.owner===faction?c.farm:null,
   grain:known||c.owner===faction?c.grain:null};});
 const incoming=s.campaign.idle.filter(o=>o.faction===faction&&o.destination&&o.cargo&&o.journey&&!o.retreating&&!o.journey.blocked&&!threatenedTransportRoute(view,o.location,o.journey.route,faction)).map(o=>{
  let from=o.location,cost=-o.journey.progress;for(const to of o.journey.route){cost+=roadCost(view,from,to);from=to;}
  return {cityId:o.destination,afterDays:Math.max(1,Math.ceil(cost/personnelSpeed(o))),resources:{gold:o.cargo.gold||0,grain:o.cargo.grain||0,manpower:o.cargo.manpower||0}};
 });
 const ownCities=own.map(c=>{const b=cityBudget(s,c,{supplies,supplyForecast,workPolicy:'essential'});
  // Use public success chances, never saved random outcomes. Only work that
  // has actually started can contribute; per-turn throughput is shared.
  const operations=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.action&&!a.action.paused).flatMap(a=>{
   const x=a.action,d=ACTIONS[x.key],o=residentOfficer(s,a.officerId),key=d.kind==='cash'?'gold':d.kind==='grain'?'grain':d.kind==='recruit'&&x.recruitMode==='reserve'?'manpower':null;
   if(!key||!o||o.location!==c.id||o.faction!==faction||o.unit.mission)return [];
   const quantity=key==='manpower'?x.amount:d.value*economicWorkScale(domesticAbility(o.unit,d))*(1+technologyIncomeBonus(c,key));
   return [{afterDays:Math.max(1,Math.ceil(x.remaining)),key,amount:Math.floor(quantity*x.chance)}];
  });
  return {id:c.id,gold:c.gold,grain:c.grain,manpower:c.manpower,
  troops:c.units.reduce((n,u)=>n+u.troops,0),wounded:c.units.reduce((n,u)=>n+u.wounded,0),
  income:cityRecurringIncome(s,c),costs:b.costs,reserve:b.reserve,shortages:b.shortages,daysSupply:b.daysSupply,
  oneTimeGold:b.work+b.training+b.cargo+b.debt,operations,incoming:incoming.filter(o=>o.cityId===c.id),
  workLimit:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,cityWorkLimit(s,c,k)])),workRemaining:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,cityWorkRemaining(s,c,k)])),
  grainCapacity:ECONOMY_RULES.capacity.grainBase+c.granary*ECONOMY_RULES.capacity.grainPerGranary,
  besieged:view.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id)};});
 const enemies=observedHostileArmies(s,faction).map(a=>({id:a.id,faction:a.faction,location:a.location,
  next:a.travel?.to||null,power:power(a.units),troops:a.units.reduce((n,u)=>n+u.troops,0)}));
 const neighbors=[...new Set(cities.filter(c=>frontier.has(c.id)&&c.owner!==faction&&c.owner!=='neutral').map(c=>c.owner))].sort();
 const reports=cities.filter(c=>frontier.has(c.id));
 return {day:s.campaign.day,turn:s.turn,faction,ownCities,reports,enemies,neighbors,
  hostile:Object.fromEntries(neighbors.map(f=>[f,factionsHostile(s,faction,f)])),
  militarySignature:JSON.stringify([reports.map(c=>[c.id,c.owner,c.known,c.visible,c.power,c.gateHp]),enemies]),
  critical:ownCities.some(c=>c.besieged||c.daysSupply!==null&&c.daysSupply<ECONOMY_RULES.budget.criticalFoodDays)};
}
