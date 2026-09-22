import {ROAD_NETWORK_DESIGN as DESIGN} from './data/design/road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {NATIONAL_ROAD_DESIGNS} from './data/design/roads.mjs';

export const mapNode=(s,id)=>s.cities.find(c=>c.id===id)||s.junctions?.find(c=>c.id===id);
export const mapNodes=s=>[...s.cities,...(s.junctions||[])];
export const edgeKey=(a,b)=>[a,b].sort().join(':');
export const roadSegment=(s,a,b)=>s.roadSegments?.[edgeKey(a,b)];
export const isJunction=(s,id)=>mapNode(s,id)?.kind==='junction';
const cityRoadCache=new WeakMap();
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
  if(!cityRoads(s).some(([x,y])=>edgeKey(x,y)===edgeKey(a,b)))return null;
  const mid='junction:'+edgeKey(a,b);
  return s.roads.some(([x,y])=>edgeKey(x,y)===edgeKey(a,b))?[b]:isJunction(s,mid)?[mid,b]:null;
}
export const junctionBlocked=(s,id,faction)=>isJunction(s,id)&&s.armies.some(a=>!a.disbanded&&a.faction!==faction&&!a.travel&&a.location===id&&a.units.some(u=>u.troops>0));

// Junctions have no owner, resources, garrison, domestic work or occupation state.
// The neutral label is solely for shared map labels; they never enter cities[].
export function buildRoadNetwork(cities,cityRoads){
  const roads=structuredClone(cityRoads),junctions=[],roadSegments={};
  const byId=id=>cities.find(c=>c.id===id),created=new Map();
  const junction=(a,b)=>{
    const key=edgeKey(a,b);if(created.has(key))return created.get(key);
    const x=byId(a),y=byId(b),index=roads.findIndex(([u,v])=>edgeKey(u,v)===key);
    if(index<0||x.kind!=='city'||y.kind!=='city')throw new Error(`岔路只能连接既有陆路：${key}`);
    const id='junction:'+key,n={id,name:`${x.name}—${y.name}路口`,kind:'junction',owner:'neutral',x:(x.x+y.x)/2,y:(x.y+y.y)/2,province:x.province};
    const distance=Math.max(MOVEMENT_RULES.distance.minimum,Math.round(Math.hypot(x.x-y.x,x.y-y.y)*MOVEMENT_RULES.distance.coordinateScale))/2;
    roads.splice(index,1,[a,id],[id,b]);junctions.push(n);created.set(key,id);
    roadSegments[edgeKey(a,id)]={distance};roadSegments[edgeKey(id,b)]={distance};
    return id;
  };
  for(const [center,left,right] of DESIGN.bypasses){
    const a=junction(center,left),b=junction(center,right),x=junctions.find(n=>n.id===a),y=junctions.find(n=>n.id===b);
    roads.push([a,b]);roadSegments[edgeKey(a,b)]={trail:true,distance:Math.max(15,Math.hypot(x.x-y.x,x.y-y.y)*MOVEMENT_RULES.distance.coordinateScale),costFactor:DESIGN.trailCost};
  }
  return {roads,junctions,roadSegments};
}

export function renderJunctions(s,selected){
  return (s.junctions||[]).map(n=>`<g class="strategy-junction ${selected===n.id?'selected':''}" data-junction="${n.id}" data-x="${n.x}" data-y="${n.y}" tabindex="0" role="button" aria-label="${n.name}，野外路口" aria-pressed="${selected===n.id}" transform="translate(${n.x} ${n.y})"><circle r="6"/><title>${n.name} · 可停驻、转向和截断补给</title></g>`).join('');
}
