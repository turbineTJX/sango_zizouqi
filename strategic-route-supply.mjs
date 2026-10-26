import {supplyConnection} from './strategic-campaign.mjs';
import {citySupplyBudgets,forecastArmySupply,localFoodUse} from './city-logistics.mjs';
import {foodConsumption,citySupplyCapacity,supplyRoadKeys,armySupplyCapacity} from './army-supply.mjs';
import {chosenRoad,roadDistance,movementPoints} from './strategic-movement.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {plannedGrain,activePlans} from './strategic-intent.mjs';
const scopes=new WeakMap();
export function withRouteSupplyQueries(s,evaluate){
 if(scopes.has(s))return evaluate();scopes.set(s,{views:new Map(),forecasts:new Map(),existing:new Map(),connections:new Map()});
 try{return evaluate();}finally{scopes.delete(s);}
}

// Conservative, read-only assessment of a proposed route. Existing armies keep
// their observed positions. No income, captured depot or future convoy counts.
// Carry can bridge unsupported legs. The schedule uses real road costs and
// daily movement, with no captured depot or income credited along the route.
export function forecastRouteSupply(s,army,path,days,{attack=false}={}){
 const scope=scopes.get(s),key=JSON.stringify([army.id,army.faction,army.location,army.roadPolicy,army.leader,army.morale,army.hunger,army.marchMode,army.cityForce?null:army.supplyCapacity,army.units.map(u=>[u.id,u.troops,u.wounded,u.type,u.equipment]),path,days,attack]);
 if(scope?.forecasts.has(key))return scope.forecasts.get(key);
 let view=scope?.views.get(army.faction);if(!view){view=intelligenceWorld(s,army.faction);scope?.views.set(army.faction,view);}
 const result=forecast(view,army,path,days,attack,scope);scope?.forecasts.set(key,result);return result;
}
// Columns share one stock and road ledger. Checking them independently would
// promise the same depot grain and the same daily road throughput twice.
export function forecastCoordinatedSupply(s,columns){
 if(!columns.length)return {feasible:false,delivered:0,sourceRequirements:[]};
 const faction=columns[0].army.faction,scope=scopes.get(s);
 let view=scope?.views.get(faction);if(!view){view=intelligenceWorld(s,faction);scope?.views.set(faction,view);}
 const horizon=Math.ceil(Math.max(...columns.map(c=>(c.delay||0)+c.days)));
 if(!Number.isFinite(horizon)||horizon>180||columns.some(c=>c.army.faction!==faction||!c.path))return {feasible:false,delivered:0,sourceRequirements:[]};
 const existingKey=faction+':'+horizon;
 let existing=scope?.existing.get(existingKey);if(!existing){existing=forecastArmySupply(view,{days:horizon,supplies:citySupplyBudgets(view)});scope?.existing.set(existingKey,existing);}
 const leaving=new Set(columns.flatMap(c=>c.army.units.map(u=>u.id))),loads=new Map(),waiting=new Map();
 for(const c of columns){const id=c.army.location;loads.set(id,(loads.get(id)||0)+armySupplyCapacity(c.army.units));waiting.set(id,(waiting.get(id)||0)+foodConsumption(c.army.units.reduce((n,u)=>n+u.troops,0),c.army.units.reduce((n,u)=>n+u.wounded,0))*(c.delay||0));}
 const joint={existing,remaining:new Map(),roads:Array.from({length:horizon},()=>new Map()),cities:Array.from({length:horizon},()=>new Map())};
 for(const c of view.cities.filter(c=>c.owner===faction)){
  const ownReservation=activePlans(s).filter(p=>p.faction===faction&&p.officerIds.some(id=>leaving.has(id))).reduce((n,p)=>n+(p.reserves[c.id]||0),0),committed=Math.max(0,plannedGrain(s,c.id)-ownReservation);
  const stock=c.grain-localFoodUse({...c,units:c.units.filter(u=>!leaving.has(u.id))})*(horizon+2)-(c.budget?.grainReserve||0)-(existing.cities[c.id]?.grain||0)-(loads.get(c.id)||0)-(waiting.get(c.id)||0)-committed;
  if(stock<0&&loads.has(c.id))return {feasible:false,delivered:0,sourceRequirements:[]};
  joint.remaining.set(c.id,Math.max(0,stock));
 }
 const required=new Map();let delivered=0;
 for(const c of columns){const result=forecast(view,c.army,c.path,c.days,true,scope,joint,c.delay||0);delivered+=result.delivered;
  if(!result.feasible)return {feasible:false,delivered,sourceRequirements:[]};
  for(const r of result.sourceRequirements)required.set(r.cityId,(required.get(r.cityId)||0)+r.grain);
 }
 return {feasible:true,delivered,sourceRequirements:[...required].map(([cityId,grain])=>({cityId,grain}))};
}
function forecast(view,army,path,days,attack,scope,joint=null,offset=0){
 const need=foodConsumption(army.units.reduce((n,u)=>n+u.troops,0),army.units.reduce((n,u)=>n+u.wounded,0)),capacity=army.cityForce?armySupplyCapacity(army.units):army.supplyCapacity??armySupplyCapacity(army.units);
 days=Math.ceil(days);const base={feasible:!joint&&need*days<=capacity,delivered:0,sourceRequirements:[]};
 if(!joint&&base.feasible||!Number.isFinite(days)||days>180||!path)return base;
 const from=army.location,to=path.at(-1)||from,options={siegeEndpoint:attack?to:null},samples=[],positions=new Map();
 // A camp's connection is constant within this read-only query. Daily draw,
 // depot stock and competing traffic are still settled separately below.
 // Different duration candidates often revisit exactly the same camp. Only
 // geometric connectivity is reused; daily stock, competing draws and capacity
 // are recomputed below. Include the actual troops for treaty troop caps.
 const connectionKey=JSON.stringify([army.id,army.faction,army.units.map(u=>[u.id,u.troops]),options.siegeEndpoint]);
 const at=(location,travel=null)=>{const key=JSON.stringify([location,travel]);let sample=positions.get(key);if(!sample){const a={...army,id:'forecast:'+army.id,location,travel,supplyCapacity:capacity,supply:capacity},cacheKey=connectionKey+key;let link;if(scope?.connections.has(cacheKey))link=scope.connections.get(cacheKey);else{link=supplyConnection(view,a,options);scope?.connections.set(cacheKey,link);}sample={a,link};positions.set(key,sample);}samples.push(sample);};
 const journey=(start,route)=>{const positions=[];let current=start;for(const next of route){
  const road=chosenRoad(view,current,next,army.roadPolicy||'auto');if(!road)return null;
  const speed=movementPoints({...army,travel:{terrain:road.terrain}}),length=roadDistance(view,current,next),legDays=speed>0?Math.ceil(road.cost/speed):Infinity;
  if(!Number.isFinite(legDays)||legDays>days)return null;
  for(let d=1;d<=legDays;d++)positions.push(d===legDays?{location:next}:{location:current,travel:{from:current,to:next,road:road.id,progress:length*Math.min(1,d*speed/road.cost)}});
  current=next;
 }return positions;};
 const outward=journey(from,path),back=attack?journey(to,[...path.slice(0,-1).reverse(),from]):[];
 if(!outward||!back||outward.length+back.length>days)return base;
 const schedule=[...outward,...Array.from({length:days-outward.length-back.length},()=>({location:to})),...back];
 for(const p of schedule)at(p.location,p.travel||null);
 const existingKey=army.faction+':'+days;
 let existing=joint?.existing||scope?.existing.get(existingKey);if(!existing){existing=forecastArmySupply(view,{days,supplies:citySupplyBudgets(view)});scope?.existing.set(existingKey,existing);}
 const sourceIds=[...new Set(samples.filter(x=>x.link).map(x=>x.link.source))],remaining=joint?.remaining||new Map(),required=new Map(sourceIds.map(id=>[id,0])),leaving=new Set(army.units.map(u=>u.id));
 if(!joint)for(const id of sourceIds){const c=view.cities.find(c=>c.id===id),staying={...c,units:c.units.filter(u=>!leaving.has(u.id))};remaining.set(id,Math.max(0,c.grain-localFoodUse(staying)*(days+2)-(c.budget?.grainReserve||0)-existing.cities[id].grain-(id===from?capacity:0)));}
 const roadUse=existing.armies.map(x=>({...x,keys:new Set(x.link?supplyRoadKeys(x.army,x.link):[])}));
 const links=samples.map(x=>({...x,keys:x.link?supplyRoadKeys(x.a,x.link):[]}));
 let stock=capacity,delivered=0;
 for(let day=0;day<days;day++){
  let rate=0;const {a,link,keys}=links[day];
  if(link){
   const date=day+offset,c=view.cities.find(c=>c.id===link.source),sourceRate=citySupplyCapacity(c)-existing.cities[c.id].daily[date]-(joint?.cities[date].get(c.id)||0);
   const edgeRate=Math.min(360,...keys.map(key=>360-roadUse.reduce((n,x)=>n+(x.keys.has(key)?x.daily[date]:0),0)-(joint?.roads[date].get(key)||0)));
   rate=Math.min(link.rate,sourceRate,edgeRate,remaining.get(link.source));
  }
  const amount=Math.max(0,Math.floor(Math.min(capacity-stock,rate)));stock+=amount;delivered+=amount;
  if(link){remaining.set(link.source,remaining.get(link.source)-amount);required.set(link.source,required.get(link.source)+amount);
   if(joint){const date=day+offset;for(const key of keys)joint.roads[date].set(key,(joint.roads[date].get(key)||0)+amount);joint.cities[date].set(link.source,(joint.cities[date].get(link.source)||0)+amount);}
  }
  if(stock<need)return {...base,delivered};stock-=need;
 }
 return {feasible:true,delivered,sourceRequirements:[...required].filter(([,grain])=>grain>0).map(([cityId,grain])=>({cityId,grain}))};
}
