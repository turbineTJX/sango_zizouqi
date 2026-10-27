import {mapNode,mapNodes} from './map-node-data.mjs';
export {mapNode,mapNodes} from './map-node-data.mjs';
import {ROAD_NETWORK_DESIGN as DESIGN} from './data/design/road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {NATIONAL_ROAD_DESIGNS} from './data/design/roads.mjs';
import {ROAD_DISTANCE_DESIGNS} from './data/design/road-distances.mjs';
import {factionsHostile} from './diplomacy-relations.mjs';
import {withRoadMetricQueries,inheritRoadMetricQueries} from './road-metrics.mjs';

export const edgeKey=(a,b)=>typeof a==='string'&&typeof b==='string'?(a<b?a+':'+b:b+':'+a):[a,b].sort().join(':');
export const roadSegment=(s,a,b)=>s.roadSegments?.[edgeKey(a,b)];
// All non-city locations share node rules; their kind selects the battlefield.
export const isJunction=(s,id)=>!!s.junctions?.some(n=>n.id===id);
export const nodeKindName=n=>({port:'港口',gate:'关卡',junction:'府'}[n?.kind]||'城市');
const cityRoadCache=new WeakMap();
const pathQueryScopes=new WeakMap();
const queryOrigins=new WeakMap();
export function inheritRoadQueries(origin,view){queryOrigins.set(view,origin);inheritRoadMetricQueries(origin,view);return view;}
const pathScope=s=>pathQueryScopes.get(s)||pathQueryScopes.get(queryOrigins.get(s));
export function withRoadQueries(s,evaluate){
 if(pathScope(s))return withRoadMetricQueries(s,evaluate);pathQueryScopes.set(s,{paths:new Map(),adj:null,junctions:new Set((s.junctions||[]).map(n=>n.id))});
 try{return withRoadMetricQueries(s,evaluate);}finally{pathQueryScopes.delete(s);}
}
export function cityRoads(s){
  if(!s.junctions)return s.roads;
  if(cityRoadCache.has(s.roads))return cityRoadCache.get(s.roads);
  const result=[],seen=new Set(),adj=new Map(mapNodes(s).map(n=>[n.id,[]]));
  for(const [a,b] of s.roads)if(!roadSegment(s,a,b)?.trail){adj.get(a).push(b);adj.get(b).push(a);}
  for(const c of s.cities){
    const queue=[c.id],visited=new Set(queue);
    while(queue.length)for(const id of adj.get(queue.shift())||[]){
      if(visited.has(id))continue;visited.add(id);
      if(isJunction(s,id))queue.push(id);
      else {const key=edgeKey(c.id,id);if(!seen.has(key)){seen.add(key);result.push([c.id,id]);}}
    }
  }
  // Preserve the design order used by city-level AI tie breaks.
  const order=new Map(NATIONAL_ROAD_DESIGNS.map((e,i)=>[edgeKey(...e),i]));
  result.sort((a,b)=>(order.get(edgeKey(...a))??Infinity)-(order.get(edgeKey(...b))??Infinity));
  cityRoadCache.set(s.roads,result);return result;
}
export function adjacentCityPath(s,a,b){
 const scope=pathScope(s),key=a+':'+b;
 if(scope?.paths.has(key)){const path=scope.paths.get(key);return path?[...path]:null;}
  if(!cityRoads(s).some(([x,y])=>x===a&&y===b||x===b&&y===a))return null;
 let adj=scope?.adj;
 if(!adj){adj=new Map();for(const [x,y]of s.roads)if(!roadSegment(s,x,y)?.trail){if(!adj.has(x))adj.set(x,[]);if(!adj.has(y))adj.set(y,[]);adj.get(x).push(y);adj.get(y).push(x);}if(scope)scope.adj=adj;}
  const queue=[{id:a,path:[]}],seen=new Set([a]);
  while(queue.length){const current=queue.shift();
    for(const next of adj.get(current.id)||[]){
      if(seen.has(next))continue;
      const path=[...current.path,next];if(next===b){scope?.paths.set(key,path);return [...path];}
      if(scope?scope.junctions.has(next):isJunction(s,next)){seen.add(next);queue.push({id:next,path});}
    }
  }
  scope?.paths.set(key,null);
  return null;
}
export const junctionBlocked=(s,id,faction)=>isJunction(s,id)&&s.armies.some(a=>!a.disbanded&&factionsHostile(s,a.faction,faction)&&!a.travel&&a.location===id&&a.units.some(u=>u.troops>0));

// Nodes have no independent economy; metropolitan construction is saved by cities.
// The neutral label is solely for shared map labels; they never enter cities[].
export function buildRoadNetwork(cities,cityRoads,{requireLengths=true}={}){
  const roads=structuredClone(cityRoads),junctions=[],roadSegments={};
  const byId=id=>cities.find(c=>c.id===id),created=new Map();
  const junction=(a,b)=>{
    const key=edgeKey(a,b);if(created.has(key))return created.get(key);
    const x=byId(a),y=byId(b),index=roads.findIndex(([u,v])=>edgeKey(u,v)===key);
    if(index<0||x.kind!=='city'||y.kind!=='city')throw new Error(`岔路只能连接既有陆路：${key}`);
    if(!DESIGN.nodeNames[key])throw new Error(`节点缺少地名：${key}`);
    const [nx,ny]=DESIGN.nodePositions[key];
    const id='junction:'+key,n={id,name:DESIGN.nodeNames[key],kind:'junction',owner:'neutral',x:nx,y:ny,province:x.province};
    const distance=(a,b)=>Math.max(1,Math.round(Math.hypot(a.x-b.x,a.y-b.y)*MOVEMENT_RULES.distance.coordinateScale*10)/10);
    roads.splice(index,1,[a,id],[id,b]);junctions.push(n);created.set(key,id);
    roadSegments[edgeKey(a,id)]={distance:distance(x,n)};roadSegments[edgeKey(id,b)]={distance:distance(n,y)};
    return id;
  };
  for(const key of Object.keys(DESIGN.nodeNames))junction(...key.split(':'));
  for(const [center,left,right] of DESIGN.bypasses){
    const a=junction(center,left),b=junction(center,right),x=junctions.find(n=>n.id===a),y=junctions.find(n=>n.id===b);
    roads.push([a,b]);roadSegments[edgeKey(a,b)]={trail:true,distance:Math.max(1,Math.round(Math.hypot(x.x-y.x,x.y-y.y)*MOVEMENT_RULES.distance.coordinateScale*10)/10),costFactor:DESIGN.trailCost};
  }
  // Atlas positions change while authored marching/supply budgets stay fixed.
  for(const [a,b] of roads){
    const key=edgeKey(a,b),distance=ROAD_DISTANCE_DESIGNS[key];
    if(!Number.isFinite(distance)||distance<=0){if(requireLengths)throw new Error(`道路缺少行程长度：${key}`);continue;}
    roadSegments[key]={...roadSegments[key],distance,...(DESIGN.geography.terrain[key]?{terrain:DESIGN.geography.terrain[key]}:{})};
  }
  return {roads,junctions,roadSegments};
}
