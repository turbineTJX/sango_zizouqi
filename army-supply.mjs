import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
// The existing strategic hunger thresholds, shared by campaign supply and
// standalone abstractions. This does not advance food or invent a supply route.
export const hungerPenalty=army=>army.hunger>=3?.35:army.hunger>=1?.2:army.hunger>0?.1:0;
// Actual settlement and read-only forecasts share dispatch and road limits.
export const citySupplyCapacity=c=>240+c.granary*120;
// Grain is a whole-unit resource; round the combined daily ration up once.
export const foodConsumption=(troops,wounded=0)=>Math.ceil(troops/100+wounded/200);
// Baggage for a newly formed force scales with its actual ration consumers.
// This is empty capacity; loading always withdraws real grain from its city.
export const armySupplyCapacity=units=>units.reduce((n,u)=>n+Math.max(ECONOMY_RULES.capacity.minimumUnitGrain,foodConsumption(u.troops,u.wounded)*ECONOMY_RULES.capacity.armyFoodDays),0);
export function supplyRoadKeys(a,link){
 const legs=link.path.slice(1).map((id,i)=>[link.path[i],id].sort().join(':')+':'+link.roads[i]);
 if(a.travel)legs.push([a.travel.from,a.travel.to].sort().join(':')+':'+(a.travel.road||'main'));
 return [...new Set(legs)];
}
export function allocateSupply(a,link,grain,budgets,edges){
 if(!link)return 0;
 const legs=supplyRoadKeys(a,link),amount=Math.max(0,Math.floor(Math.min(a.supplyCapacity-a.supply,grain,budgets.get(link.source)||0,link.rate,...legs.map(k=>360-(edges.get(k)||0)))));
 budgets.set(link.source,(budgets.get(link.source)||0)-amount);for(const key of legs)edges.set(key,(edges.get(key)||0)+amount);
 return amount;
}
