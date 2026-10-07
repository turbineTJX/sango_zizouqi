import {marchFactor} from './strategic-traits.mjs';
import {roadDistance,campaignRoads,chosenRoad,roadCost} from './road-metrics.mjs';
export {roadDistance,campaignRoads,chosenRoad,roadCost} from './road-metrics.mjs';

import {mapNode,roadSegment,isJunction,junctionBlocked} from './road-network.mjs';
import {MOVEMENT_RULES as RULES} from './data/design/movement-rules.mjs';
import {diplomaticPassage,factionsHostile} from './diplomacy-relations.mjs';
// Road variants are deterministic map data, shared by both factions.
const node=mapNode;
export function movementPoints(a){
  const units=a.units.filter(u=>u.troops>0);
  if(!units.length)return 0;
  const base=Math.min(...units.map(u=>(a.travel?.terrain==='water'?(u.equipment?.ship?RULES.army.speedByTroop[u.equipment.ship]:0):Math.min(RULES.army.speedByTroop[u.type]??RULES.army.speedByTroop.spear,u.equipment?.siege?RULES.army.speedByTroop[u.equipment.siege]:Infinity))));
  const leader=a.units.find(u=>u.id===a.leader)||units[0];
  const command=RULES.army.command.base+Math.max(0,Math.min(100,leader.leadership||0))*RULES.army.command.perPoint;
  const morale=RULES.army.morale.base+Math.max(0,Math.min(100,a.morale))*RULES.army.morale.perPoint;
  const hunger=1-(RULES.army.hunger.find(r=>r.inclusive?a.hunger>=r.minimum:a.hunger>r.minimum)?.penalty||0);
  return Math.round(base*command*morale*hunger*marchFactor(a)*1000)/1000;
}
// Armies settle one road leg per day; unused movement does not carry across a node.
export function marchItinerary(s,from,path,speed,policy='auto'){
 const legs=[];let at=from;
 for(const to of path){const road=chosenRoad(s,at,to,policy),cost=road?.cost??Infinity;
  legs.push({from:at,to,name:road?.name||'不可通行',distance:roadDistance(s,at,to),cost,days:speed>0?Math.ceil(cost/speed):Infinity});at=to;
 }
 return {legs,cost:legs.reduce((n,r)=>n+r.cost,0),days:legs.reduce((n,r)=>n+r.days,0)};
}
// A controller may opt into this conservative dispatch condition. Actual losses
// after departure are still resolved by the shared personnel movement engine.
export function threatenedTransportRoute(s,from,path,faction){
 let at=from;
 for(const next of path){
  if(!isJunction(s,next)&&node(s,next).owner!==faction&&!diplomaticPassage(s,faction,next,'trade')||junctionBlocked(s,next,faction)||s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===next)||s.armies.some(a=>factionsHostile(s,a.faction,faction)&&!a.disbanded&&(a.location===next||a.travel&&([at,next].includes(a.travel.from)&&[at,next].includes(a.travel.to)||a.travel.to===next)||a.target===next)))return true;
  at=next;
 }
 return false;
}
export function roadPoint(from,to,p,road='main'){
  // Canonical orientation keeps both directions on the same physical curve.
  const sign=from.id<to.id?1:-1,dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1;
  const bend=2*p*(1-p)*(RULES.roadVariants[road]||RULES.roadVariants.main).offset*sign;
  return {x:from.x+dx*p-dy/length*bend,y:from.y+dy*p+dx/length*bend};
}
export function roadPath(from,to,road='main',start=0){
  return Array.from({length:17},(_,i)=>{const p=roadPoint(from,to,start+(1-start)*i/16,road);return `${i?'L':'M'}${p.x} ${p.y}`;}).join('');
}
export function renderRoads(s,anchors=null){
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});
  return s.roads.flatMap(([a,b])=>campaignRoads(s,a,b).map(r=>`<path d="${roadPath(at(a),at(b),r.id)}" data-road-from="${a}" data-road-to="${b}" tabindex="0" role="button" aria-label="${node(s,a).name}至${node(s,b).name}" class="strategy-road road-${r.terrain} ${r.id==='side'||roadSegment(s,a,b)?.trail?'strategy-side-road':''}" ><title>${node(s,a).name}—${node(s,b).name} · ${r.name} · 消耗 ${r.cost} 行动力</title></path>`)).join('');
}
export function renderMarchRoute(s,a,anchors=null){
  if(!a?.route.length)return '';
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});let from=a.location;
  return a.route.map((to,i)=>{const road=i===0&&a.travel?(a.travel.road||'main'):chosenRoad(s,from,to,a.roadPolicy)?.id;
    const start=i===0&&a.travel?a.travel.progress/roadDistance(s,from,to):0;
    const path=`<path class="strategy-order-path" d="${roadPath(at(from),at(to),road,start)}"/>`;from=to;return path;}).join('');
}
export function renderSupplyRoute(s,a,link,anchors=null){
  if(!link)return '';
  const at=id=>({...node(s,id),...(anchors?.[id]||{})});
  let result=link.path.slice(1).map((to,i)=>`<path class="strategy-supply-path" d="${roadPath(at(link.path[i]),at(to),link.roads[i])}"/>`).join('');
  if(a.travel){const t=a.travel,p=t.progress/roadDistance(s,t.from,t.to);
    const points=Array.from({length:17},(_,i)=>{const v=roadPoint(at(t.from),at(t.to),p*i/16,t.road||'main');return `${i?'L':'M'}${v.x} ${v.y}`;}).join('');
    result+=`<path class="strategy-supply-path" d="${points}"/>`;
  }
  return result;
}

// Explicit map paths must consist of existing consecutive roads; never reroute silently.
export function validMapRoute(s,from,to,path,faction=null,kind='military'){
 if(!Array.isArray(path)||!path.length||path.length>s.roads.length||path.at(-1)!==to)return false;
 const visited=new Set([from]);let at=from;
 for(const id of path){if(visited.has(id)||!node(s,id)||!Number.isFinite(roadCost(s,at,id)))return false;if(at!==from&&faction&&!isJunction(s,at)&&node(s,at).owner!==faction&&!diplomaticPassage(s,faction,at,kind))return false;visited.add(id);at=id;}
 return true;
}
