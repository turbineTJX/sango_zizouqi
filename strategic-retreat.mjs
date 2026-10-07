import {canRallyAt} from './army-rally.mjs';
import {mapNode,mapNodes} from './road-network.mjs';
import {roadCost} from './strategic-movement.mjs';
import {roadEdgeForArmy,removeOfficer} from './officer-fates.mjs';
import {battleWounded,isBattleCouncil} from './engine.mjs';
import {diplomaticPassage} from './diplomacy-relations.mjs';

// One weighted search from the exact road position, considering both directions.
function retreatPaths(s,faction,location,edge,withdrawal=[]){
 const nodes=mapNodes(s),safe=new Set(nodes.filter(n=>canRallyAt(s,n.id,faction)).map(n=>n.id)),transit=new Set(nodes.filter(n=>safe.has(n.id)||withdrawal.includes(n.owner)||diplomaticPassage(s,faction,n.id)).map(n=>n.id));
 const paths=new Map(),todo=new Set(nodes.map(n=>n.id));
 for(const end of edge?[edge.from,edge.to]:[location]){
  if(edge&&!transit.has(end))continue;
  if(edge){
   const forward=end===edge.to,origin=forward?edge.from:edge.to,cost=roadCost(s,origin,end),progress=cost*(forward?edge.fraction:1-edge.fraction);
   paths.set(end,progress>=cost?{location:end,route:[],progress:0,cost:0}:{location:origin,route:[end],progress,cost:cost-progress});
  }else paths.set(end,{location,route:[],progress:0,cost:0});
 }
 while(todo.size){
  const current=[...todo].sort((a,b)=>(paths.get(a)?.cost??Infinity)-(paths.get(b)?.cost??Infinity)||a.localeCompare(b))[0];
  const path=paths.get(current);if(!path)break;todo.delete(current);
  for(const [a,b] of s.roads){const next=a===current?b:b===current?a:null;
   if(!next||!todo.has(next)||!transit.has(next))continue;
   const cost=path.cost+roadCost(s,current,next);
   if(cost<(paths.get(next)?.cost??Infinity))paths.set(next,{...path,route:[...path.route,next],cost});
  }
 }
 return new Map([...paths].filter(([id])=>safe.has(id)));
}
function routeFrom(s,faction,location,edge,destination){return retreatPaths(s,faction,location,edge).get(destination)||null;}
export function nearestRetreat(s,faction,location,edge=null){
 return [...retreatPaths(s,faction,location,edge)].map(([id,path])=>({id,path})).sort((a,b)=>a.path.cost-b.path.cost||a.id.localeCompare(b.id))[0]||null;
}
export function diplomaticRetreat(s,faction,location,edge,parties){return [...retreatPaths(s,faction,location,edge,parties)].map(([id,path])=>({id,path})).filter(x=>mapNode(s,x.id)?.owner===faction).sort((a,b)=>a.path.cost-b.path.cost||a.id.localeCompare(b.id))[0]||null;}
export function retreatDestinations(s,b,side=0){
 const r=s.campaign?.battles.find(r=>r.battle.id===b.id);if(!r)return [];
 const faction=b.sides[side].faction;
 const origins=r.armies.filter(a=>a.faction===faction);
 if(!origins.length)origins.push({location:r.cityId});
 const routes=origins.map(a=>retreatPaths(s,faction,a.location,roadEdgeForArmy(s,a)));
 return mapNodes(s).filter(c=>canRallyAt(s,c.id,faction)&&!(r.kind==='siege'&&r.cityId===c.id)).map(c=>{
  const paths=routes.map(paths=>paths.get(c.id));
  return paths.every(Boolean)?{id:c.id,name:c.name,cost:Math.max(...paths.map(p=>p.cost))}:null;
 }).filter(Boolean).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));
}
export function configureRetreatDestination(s,b,id,side=0){
 if(!isBattleCouncil(b))return '只能在战前会议或援军军议设置撤离据点';
 if(!retreatDestinations(s,b,side).some(c=>c.id===id))return '请选择可达且安全的撤离节点';
 b.sides[side].retreatDestination=id;return null;
}
export function initializeRetreatDestinations(s,r){
 r.battle.strategicRetreat=true;
 for(let side=0;side<2;side++)r.battle.sides[side].retreatDestination=retreatDestinations(s,r.battle,side)[0]?.id??null;
}
export function redirectRetreat(s,o){
 const next=o.journey?.route[0],edge=next?{from:o.location,to:next,fraction:o.journey.progress/roadCost(s,o.location,next)}:null;
 const preferred=o.destination&&canRallyAt(s,o.destination,o.faction)&&routeFrom(s,o.faction,o.location,edge,o.destination);
 const best=preferred?{id:o.destination,path:preferred}:nearestRetreat(s,o.faction,o.location,edge);
 if(!best){o.journey.blocked='无合法撤离据点';return false;}
 const changed=o.destination!==best.id;
 o.destination=best.id;o.location=best.path.location;o.journey={route:best.path.route,progress:best.path.progress,blocked:''};o.remainingDays=1;
 if(changed)s.campaign.lastNotice=`${o.unit.name}撤离改道至${mapNode(s,best.id).name}。`;
 return true;
}
export function dispatchWithdrawn(s,r){
 for(const side of r.battle.sides)for(const u of side.units){
  if(u.status!=='withdrawn'||u.retreatDispatched)continue;
  const a=s.armies.find(a=>a.id===u.armyId),source=a?.units.find(v=>v.id===u.id);
  // Anonymous city guards are not recruitable officers or strategic formations.
  if(!source){u.retreatDispatched=true;continue;}
  const edge=roadEdgeForArmy(s,a),location=a.location;
  const grain=Math.floor(a.supply/Math.max(1,a.units.length));a.supply-=grain;
  const capacity=Math.floor(a.supplyCapacity/a.units.length);a.supplyCapacity-=capacity;
  if(a.marchMode==='light')a.fullSupplyCapacity=a.supplyCapacity*2;
  source.troops=u.hp;source.wounded+=battleWounded(u);
  const original=r.armies.find(x=>x.id===a.id)||a;
  const retreatFormation={id:r.id+':'+a.id,name:original.name,capacity,homeCity:original.homeCity||source.homeCity||a.location,
   leader:original.leader,advisor:original.advisor,deputy:original.deputy??null,morale:a.morale,tactic:a.tactic};
  removeOfficer(s,u.id);
  const destination=side.retreatDestination;
  const path=destination&&routeFrom(s,a.faction,location,edge,destination);
  const o={unit:source,faction:a.faction,location:path?.location??location,destination:path?destination:null,remainingDays:1,
   movementReason:'撤离',retreating:true,retreatFormation,retreatOrigin:{armyIds:[...r.armyIds]},cargo:{gold:0,grain,manpower:0},
   journey:{route:path?.route??(edge?[edge.to]:[]),progress:path?.progress??(edge?roadCost(s,edge.from,edge.to)*edge.fraction:0),blocked:''}};
  if(!path&&edge)o.location=edge.from;
  s.campaign.idle.push(o);u.retreatDispatched=true;
  redirectRetreat(s,o);
 }
 // Empty shells are not persistent armies; battle snapshots retain their provenance.
 s.armies=s.armies.filter(a=>a.units.length);
}
