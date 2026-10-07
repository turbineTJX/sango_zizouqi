import {newCampaign,findCampaignRoute} from '../../strategic-campaign.mjs';
import {cityForce} from '../../city-units.mjs';
import {roadDistance,roadCost,movementPoints} from '../../strategic-movement.mjs';
// Explicit already-mobilized forces for road/combat fixtures. The game itself
// starts with city units; these fixtures remove each deployed unit from its city.
export function fieldFromCity(s,cityId,{id,ids,target=null}={}){
 const c=s.cities.find(c=>c.id===cityId),units=ids?ids.map(id=>c.units.find(u=>u.id===id)):c.units.filter(u=>!u.cityGuard).slice(0,10);
 if(!units.length||units.some(u=>!u))throw new Error('Fixture requires actual city units');
 const a={...cityForce(c),id:id||`a${s.nextId++}`,units,name:units[0].name+'出征军',leader:units[0].id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,deputy:units[1]?.id||null,stationary:false};delete a.cityForce;
 a.supplyCapacity=units.length*900;a.supply=Math.min(c.grain,a.supplyCapacity);c.grain-=a.supply;c.units=c.units.filter(u=>!units.includes(u));units.forEach((u,i)=>u.first=i<6);
 if(target){a.route=findCampaignRoute(s,c.id,target);a.target=target;}
 s.armies.push(a);s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));return a;
}
export function fieldCampaign(seed=521200,scenarioId=null){if(scenarioId)return newCampaign(seed,scenarioId);const s=newCampaign(seed);for(const [city,id]of [['xuchang','a1'],['guandu','a2'],['chenliu','a3'],['baima','a4']])fieldFromCity(s,city,{id});return s;}
export function peacefulCities(s){for(const c of s.cities.filter(c=>c.owner!=='cao'))for(const u of c.units)u.troops=0;return s;}

// Battle-only fixture: a legally marching column already near its next node.
// Full journey tests never use this; map distances and production speeds stay real.
export function approachDestination(s,a,days=1){
 if(!a.route.length)throw new Error('Approach requires an actual route');
 const from=a.location,to=a.route[0],length=roadDistance(s,from,to);
 a.travel={from,to,road:'main',progress:Math.max(0,length-movementPoints(a)*days*length/roadCost(s,from,to))};
 return a;
}

export const expeditionFrom=a=>({kind:'expedition',cityId:a.location,officerIds:a.units.filter(u=>u.troops>0).slice(0,10).map(u=>u.id),leader:a.units.find(u=>u.troops>0).id,advisor:a.units.find(u=>u.troops>0).id,deputy:null,policy:'auto'});
export function invadeFromGuandu(s){const c=s.cities.find(c=>c.id==='guandu'),initial=newCampaign(s.seed).cities.find(c=>c.id==='guandu');for(const u of c.units){const original=initial.units.find(v=>v.id===u.id);if(original)u.troops=original.troops;}return approachDestination(s,fieldFromCity(s,'guandu',{target:'xuchang'}));}
