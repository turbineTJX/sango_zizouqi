import {supplyRoutingWorld,withIntelligenceQueries} from './strategic-vision.mjs';
import {withRoadQueries} from './road-network.mjs';
import {cityRecurringIncome} from './economy.mjs';
import {dailyConsumption,supplyConnection} from './strategic-campaign.mjs';
import {citySupplyCapacity,allocateSupply,foodConsumption} from './army-supply.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {withDiplomaticQueries} from './diplomacy-relations.mjs';

export const localFoodUse=c=>foodConsumption(c.units.reduce((n,u)=>n+u.troops,0),c.units.reduce((n,u)=>n+u.wounded,0));
const supplyQueryScopes=new WeakMap();
let queryFamily=null;
function supplyScope(s){
 let scope=supplyQueryScopes.get(s)||queryFamily?.get(s);
 if(!scope&&queryFamily){scope={supplies:null,forecasts:new WeakMap()};queryFamily.set(s,scope);}
 return scope;
}
// Only synchronous read-only candidate evaluation may share a supply query.
// Closing the scope always drops it, before appointments, payments or movement.
export function withCitySupplyQueries(s,evaluate){
 if(supplyQueryScopes.has(s))return evaluate();
 const owner=!queryFamily;if(owner)queryFamily=new WeakMap();
 try{const scope=supplyScope(s);supplyQueryScopes.set(s,scope);return withDiplomaticQueries(()=>withIntelligenceQueries(s,()=>withRoadQueries(s,evaluate)));}finally{supplyQueryScopes.delete(s);if(owner)queryFamily=null;}
}
export function citySupplyBudgets(s){
 const scope=supplyScope(s);if(scope?.supplies)return scope.supplies;
 if(!s.armies.some(a=>!a.disbanded)){const empty=[];if(scope)scope.supplies=empty;return empty;}
 const views=new Map();
 const result=s.armies.filter(a=>!a.disbanded).map(a=>{
  if(!views.has(a.faction))views.set(a.faction,{view:supplyRoutingWorld(s,a.faction),empty:null});
  const entry=views.get(a.faction),link=supplyConnection(entry.view,a);
  if(!link)entry.empty??={...entry.view,cities:entry.view.cities.map(c=>c.grain>0?c:{...c,grain:1})};
  return {army:a,link:link||supplyConnection(entry.empty,a),need:dailyConsumption(s,a)};
 });
 if(scope)scope.supplies=result;return result;
}
// Current positions and troop counts stay fixed. Warehouses are unconstrained
// here: this measures required withdrawals, while city budgets check real stock.
// Dispatch competition, fill-before-eating and carried food follow settlement.
export function forecastArmySupply(s,{days=ECONOMY_RULES.budget.days,supplies=citySupplyBudgets(s),funded=false}={}){
 const scope=supplyScope(s),key=days+':'+funded,cached=scope?.forecasts.get(supplies);if(cached?.has(key))return cached.get(key);
 const cities=Object.fromEntries(s.cities.map(c=>[c.id,{grain:0,daily:Array(days).fill(0),stock:c.grain,income:0} ]));
 const rows=supplies.map(x=>({...x,stock:x.army.supply,delivered:0,unfed:0,firstShortDay:null,daily:[],stocks:[]}));
 const sources=s.cities.filter(c=>rows.some(x=>x.link?.source===c.id));
 if(funded)for(const c of sources)cities[c.id].income=s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===c.id)?0:cityRecurringIncome(s,c).grain;
 for(let day=1;day<=days&&rows.length;day++){
  if(funded)for(const c of sources)cities[c.id].stock=Math.max(0,cities[c.id].stock-localFoodUse(c));
  const budgets=new Map(sources.map(c=>[c.id,citySupplyCapacity(c)])),edges=new Map(),withdrawals=new Map();
  for(const x of [...rows].sort((a,b)=>a.stock/Math.max(1,a.need)-b.stock/Math.max(1,b.need)||a.army.id.localeCompare(b.army.id))){
   const amount=allocateSupply({...x.army,supply:x.stock},x.link,funded&&x.link?cities[x.link.source].stock:Infinity,budgets,edges);
   x.stock+=amount;const paid=Math.min(x.need,x.stock);x.stock-=paid;x.delivered+=amount;x.unfed+=x.need-paid;
   if(paid<x.need-.001)x.firstShortDay??=day;
   x.daily.push(amount);x.stocks.push(x.stock);if(funded&&x.link)cities[x.link.source].stock-=amount;if(x.link)withdrawals.set(x.link.source,(withdrawals.get(x.link.source)||0)+amount);
  }
  for(const source of sources){const id=source.id,c=cities[id],n=withdrawals.get(id)||0;c.daily[day-1]=n;c.grain+=n;if(funded&&(s.campaign.day+day-1)%10===0)c.stock=Math.min(ECONOMY_RULES.capacity.grainBase+source.granary*ECONOMY_RULES.capacity.grainPerGranary,c.stock+c.income);}
 }
 const result={cities,armies:rows};if(scope){if(!scope.forecasts.has(supplies))scope.forecasts.set(supplies,new Map());scope.forecasts.get(supplies).set(key,result);}return result;
}
export function cityFoodRequirement(s,c,days=ECONOMY_RULES.budget.days,{supplies=citySupplyBudgets(s)}={}){
 if(!supplies.some(x=>x.link?.source===c.id))return Math.ceil(localFoodUse(c)*days);
 return Math.ceil(localFoodUse(c)*days+forecastArmySupply(s,{days,supplies}).cities[c.id].grain);
}
// Long-term demand is consumption, even if a narrow grain road cannot carry it.
export function cityDailyFood(s,c,{supplies=citySupplyBudgets(s)}={}){
 return localFoodUse(c)+supplies.filter(x=>x.army.faction===c.owner&&x.link?.source===c.id).reduce((n,x)=>n+x.need,0);
}
