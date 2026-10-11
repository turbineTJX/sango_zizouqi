import {supplyConnection} from './strategic-campaign.mjs';
import {citySupplyBudgets,forecastArmySupply,localFoodUse} from './city-logistics.mjs';
import {foodConsumption,citySupplyCapacity,supplyRoadKeys,armySupplyCapacity} from './army-supply.mjs';
import {chosenRoad,roadDistance,movementPoints} from './strategic-movement.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
const scopes=new WeakMap();
export function withRouteSupplyQueries(s,evaluate){
 if(scopes.has(s))return evaluate();scopes.set(s,{views:new Map(),forecasts:new Map(),existing:new Map()});
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
function forecast(view,army,path,days,attack,scope){
 const need=foodConsumption(army.units.reduce((n,u)=>n+u.troops,0),army.units.reduce((n,u)=>n+u.wounded,0)),capacity=army.cityForce?armySupplyCapacity(army.units):army.supplyCapacity??armySupplyCapacity(army.units);
 days=Math.ceil(days);const base={feasible:need*days<=capacity,delivered:0,sourceRequirements:[]};
 if(base.feasible||!Number.isFinite(days)||days>180||!path)return base;
 const from=army.location,to=path.at(-1)||from,options={siegeEndpoint:attack?to:null},samples=[],positions=new Map();
 // A camp's connection is constant within this read-only query. Daily draw,
 // depot stock and competing traffic are still settled separately below.
 const at=(location,travel=null)=>{const key=JSON.stringify([location,travel]);let sample=positions.get(key);if(!sample){const a={...army,id:'forecast:'+army.id,location,travel,supplyCapacity:capacity,supply:capacity};sample={a,link:supplyConnection(view,a,options)};positions.set(key,sample);}samples.push(sample);};
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
 let existing=scope?.existing.get(existingKey);if(!existing){existing=forecastArmySupply(view,{days,supplies:citySupplyBudgets(view)});scope?.existing.set(existingKey,existing);}
 const sourceIds=[...new Set(samples.filter(x=>x.link).map(x=>x.link.source))],remaining=new Map(),required=new Map(sourceIds.map(id=>[id,0])),leaving=new Set(army.units.map(u=>u.id));
 for(const id of sourceIds){const c=view.cities.find(c=>c.id===id),staying={...c,units:c.units.filter(u=>!leaving.has(u.id))};remaining.set(id,Math.max(0,c.grain-localFoodUse(staying)*(days+2)-(c.budget?.grainReserve||0)-existing.cities[id].grain-(id===from?capacity:0)));}
 const roadUse=existing.armies.map(x=>({...x,keys:new Set(x.link?supplyRoadKeys(x.army,x.link):[])}));
 const links=samples.map(x=>({...x,keys:x.link?supplyRoadKeys(x.a,x.link):[]}));
 let stock=capacity,delivered=0;
 for(let day=0;day<days;day++){
  let rate=0;const {a,link,keys}=links[day];
  if(link){
   const c=view.cities.find(c=>c.id===link.source),sourceRate=citySupplyCapacity(c)-existing.cities[c.id].daily[day];
   const edgeRate=Math.min(360,...keys.map(key=>360-roadUse.reduce((n,x)=>n+(x.keys.has(key)?x.daily[day]:0),0)));
   rate=Math.min(link.rate,sourceRate,edgeRate,remaining.get(link.source));
  }
  const amount=Math.max(0,Math.floor(Math.min(capacity-stock,rate)));stock+=amount;delivered+=amount;
  if(link){remaining.set(link.source,remaining.get(link.source)-amount);required.set(link.source,required.get(link.source)+amount);}
  if(stock<need)return {...base,delivered};stock-=need;
 }
 return {feasible:true,delivered,sourceRequirements:[...required].filter(([,grain])=>grain>0).map(([cityId,grain])=>({cityId,grain}))};
}
