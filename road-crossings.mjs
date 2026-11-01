import {ROAD_CROSSING_DESIGN} from './data/design/road-crossings.mjs';
import {ROAD_DISTANCE_DESIGNS} from './data/design/road-distances.mjs';
import {ROAD_NETWORK_DESIGN} from './data/design/road-network.mjs';

const key=(a,b)=>a<b?a+':'+b:b+':'+a;
const registered=new Map(Object.entries(ROAD_NETWORK_DESIGN.nodeNames).map(([id,name])=>['junction:'+id,name]));
for(const node of ROAD_CROSSING_DESIGN)if(registered.get(node.id)!==node.name)throw new Error('道路交汇不得创建未登记的府：'+node.name);
export const crossingNodes=ROAD_CROSSING_DESIGN.map(({id,name,x,y,province})=>({id,name,x,y,province,kind:'junction',owner:'neutral'}));
const sources=new Map(),sections=new Map();
for(const node of ROAD_CROSSING_DESIGN)for(const road of node.roads){
 const id=key(...road.source);
 if(!sources.has(id))sources.set(id,{source:road.source,cuts:[]});
 sources.get(id).cuts.push({id:node.id,at:road.at});
}
for(const {source,cuts} of sources.values()){
 cuts.sort((a,b)=>a.at-b.at);
 const stops=[{id:source[0],at:0},...cuts,{id:source[1],at:1}];
 for(let i=1;i<stops.length;i++){
  const a=stops[i-1],b=stops[i];
  const id=key(a.id,b.id),cost=ROAD_DISTANCE_DESIGNS[key(...source)]*(b.at-a.at)*(source.every(n=>n.startsWith('junction:'))?ROAD_NETWORK_DESIGN.trailCost:1);
  if(!sections.has(id)||cost<sections.get(id).cost)sections.set(id,{source,from:a.id,to:b.id,start:a.at,end:b.at,cost});
 }
}
export function crossingRoadSection(a,b){
 const id=key(a,b),section=sections.get(id),direct=ROAD_DISTANCE_DESIGNS[id]*(a.startsWith('junction:')&&b.startsWith('junction:')?ROAD_NETWORK_DESIGN.trailCost:1);
 return !sources.has(id)&&direct<=section?.cost?undefined:section;
}

// Split authored distances between real crossroads. Merged approaches keep one
// cheapest physical connection. Water routes retain their port endpoints.
export function splitRoadCrossings(roads,junctions,roadSegments,places){
 const nodes=new Map([...places,...junctions].map(n=>[n.id,n])),result=new Map(),originals={...roadSegments};
 const add=(edge,data={})=>{const id=key(...edge),old=result.get(id),cost=d=>(d.distance??Infinity)*(d.costFactor||1);if(!old||cost(data)<cost(old.data))result.set(id,{edge,data});};
 for(const edge of roads){
  const id=key(...edge),entry=sources.get(id);
  if(!entry){add(edge,originals[id]);continue;}
  const {source,cuts}=entry,original=originals[id];
  const a=nodes.get(source[0]),b=nodes.get(source[1]);
  const terrain=original?.terrain||(a.kind==='gate'||b.kind==='gate'?'mountain':'land');
  const stops=[{id:source[0],at:0},...cuts,{id:source[1],at:1}];
  let used=0;
  for(let i=1;i<stops.length;i++){
   const from=stops[i-1],to=stops[i];
   const section=original.distance*(to.at-from.at),distance=i===stops.length-1?original.distance-used:section;
   used+=distance;
   add([from.id,to.id],{...original,distance,terrain});
  }
 }
 const active=new Set([...result.values()].flatMap(r=>r.edge));
 junctions.push(...crossingNodes.filter(n=>active.has(n.id)&&!nodes.has(n.id)).map(n=>({...n})));
 for(const id of Object.keys(roadSegments))delete roadSegments[id];
 for(const [id,{data}] of result)roadSegments[id]=data;
 roads.splice(0,roads.length,...[...result.values()].map(r=>r.edge));
}
