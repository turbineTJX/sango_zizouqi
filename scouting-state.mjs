import {mapNode,mapNodes} from './map-node-data.mjs';
import {roadCost,roadDistance} from './road-metrics.mjs';
export const scoutAssignments=s=>s.campaign?.scouting?.tasks||[];
export const scoutAssignment=(s,id)=>scoutAssignments(s).find(t=>t.officerId===id);
export function scoutOperator(s,t){
 const c=mapNode(s,t.homeCity),unit=c?.units.find(u=>u.id===t.officerId);
 if(unit)return {unit,faction:c.owner,location:c.id};
 const o=s.campaign.idle.find(o=>o.unit.id===t.officerId);if(o)return o;
 const a=s.armies.find(a=>a.units.some(u=>u.id===t.officerId));return a?{unit:a.units.find(u=>u.id===t.officerId),faction:a.faction,location:a.location,army:a}:null;
}
export function scoutVisionProxy(s,t){
 const to=t.route[0],fraction=to?Math.max(0,Math.min(1,t.progress/roadCost(s,t.location,to))):0;
 return {location:t.location,travel:to?{from:t.location,to,road:'main',progress:roadDistance(s,t.location,to)*fraction}:null};
}
export function scoutingPosition(s,t){
 const p=scoutVisionProxy(s,t);if(!p.travel){const n=mapNode(s,p.location);return {x:n.x,y:n.y};}
 const a=mapNode(s,p.travel.from),b=mapNode(s,p.travel.to),f=p.travel.progress/roadDistance(s,a.id,b.id);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
}
export const scoutStatus=t=>t.paused?'侦察暂停':t.phase==='watch'?'斥候驻察':'斥候沿路侦察';

// Road-distance districts keep connected water/trail networks local as well.
// Only this city and districts sharing a road boundary are in scouting range.
const routeCache=new WeakMap();
function scoutingTopology(s){
 let cached=routeCache.get(s);
 if(cached?.roads===s.roads&&cached.roadCount===s.roads.length&&cached.segments===s.roadSegments&&cached.sourceCities===s.cities&&cached.sourceNodes===s.junctions)return cached;
 const nodes=mapNodes(s),cities=new Set(s.cities.map(c=>c.id)),adj=new Map(nodes.map(n=>[n.id,[]]));
 for(const [a,b] of s.roads){if(!adj.has(a)||!adj.has(b))continue;const cost=roadCost(s,a,b);adj.get(a).push({id:b,cost});adj.get(b).push({id:a,cost});}
 const district=new Map(),pending=s.cities.map(c=>({id:c.id,home:c.id,cost:0}));
 while(pending.length){pending.sort((a,b)=>a.cost-b.cost||a.home.localeCompare(b.home)||a.id.localeCompare(b.id));const x=pending.shift();if(district.has(x.id))continue;district.set(x.id,x.home);
  for(const n of adj.get(x.id))if(!district.has(n.id))pending.push({id:n.id,home:x.home,cost:x.cost+n.cost});
 }
 cached={nodes,cities,adj,district,neighborhoods:new Map(),paths:new Map(),roads:s.roads,roadCount:s.roads.length,segments:s.roadSegments,sourceCities:s.cities,sourceNodes:s.junctions};routeCache.set(s,cached);return cached;
}
export function scoutingNeighborhood(s,home){
 const t=scoutingTopology(s);if(!t.cities.has(home))return new Set();if(t.neighborhoods.has(home))return t.neighborhoods.get(home);
 const nearby=new Set([home]);for(const [a,b]of s.roads){if(t.district.get(a)===home)nearby.add(t.district.get(b));if(t.district.get(b)===home)nearby.add(t.district.get(a));}
 const result=new Set(t.nodes.filter(n=>nearby.has(t.district.get(n.id))).map(n=>n.id));t.neighborhoods.set(home,result);return result;
}
function localScoutPaths(s,from){
 const t=scoutingTopology(s);if(t.paths.has(from))return t.paths.get(from);
 const allowed=scoutingNeighborhood(s,from),cities=t.cities,paths=new Map();
 if(!allowed.has(from))return paths;
 const pending=[{id:from,cost:0,path:[]}],seen=new Set();
 while(pending.length){pending.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const x=pending.shift();if(seen.has(x.id))continue;seen.add(x.id);if(x.id!==from){paths.set(x.id,x.path);if(cities.has(x.id))continue;}
  for(const next of t.adj.get(x.id)){if(allowed.has(next.id)&&!seen.has(next.id))pending.push({id:next.id,cost:x.cost+next.cost,path:[...x.path,next.id]});}
 }t.paths.set(from,paths);return paths;
}
export function scoutRoute(s,from,to){const path=localScoutPaths(s,from).get(to);return path?[...path]:null;}
export function scoutTargets(s,cityId){const paths=localScoutPaths(s,cityId);return mapNodes(s).filter(n=>paths.has(n.id));}
