import {redirectRetreat} from './strategic-retreat.mjs';
import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {playerFaction} from './player-faction.mjs';
import {hasTrait} from './officer-traits.mjs';
import {resolveOfficerLoss,personnelEvent,sendOfficerHome} from './officer-fates.mjs';
import {findCampaignRoute} from './strategic-campaign.mjs';
import {roadCost,roadDistance} from './strategic-movement.mjs';
const town=mapNode;
export const PERSONNEL_SPEED=MOVEMENT_RULES.personnel.light;
export const TRANSPORT_SPEED=MOVEMENT_RULES.personnel.transport;
export const isTransport=o=>(!!o.destination||o.retreating)&&(o.unit.troops>0||o.unit.wounded>0||o.cargo?.grain>0||o.cargo?.manpower>0);
export const lightPersonnelSpeed=u=>PERSONNEL_SPEED*(hasTrait(u,'traveler')?MOVEMENT_RULES.personnel.travelerMultiplier:1);
export const personnelSpeed=o=>isTransport(o)?TRANSPORT_SPEED*(hasTrait(o.unit,'transporter')?MOVEMENT_RULES.personnel.transporterMultiplier:1):lightPersonnelSpeed(o.unit);
export function startPersonnelJourney(s,o){
 const route=findCampaignRoute(s,o.location,o.destination,isTransport(o)?o.faction:null);
 o.journey={route:route||[],progress:0,blocked:route?'':'道路不通'};
 updatePersonnelETA(s,o);
}
function updatePersonnelETA(s,o){
 let from=o.location,cost=-o.journey.progress;
 for(const to of o.journey.route){cost+=roadCost(s,from,to);from=to;}
 o.remainingDays=Math.max(1,Math.ceil(cost/personnelSpeed(o)));
}
// Position uses the same normalized road distance as army map projections.
export function transportProxy(s,o){
 const to=o.journey?.route[0],cost=to?roadCost(s,o.location,to):0;
 return {id:'transport:'+o.unit.id,name:o.unit.name+(o.retreating?'撤离队':'运输队'),faction:o.faction,units:[o.unit],location:o.location,
  travel:to?{from:o.location,to,road:'main',progress:roadDistance(s,o.location,to)*o.journey.progress/cost}:null,
  transport:o,task:o.journey?.blocked||(o.retreating?'撤离':'运输')};
}
export function advancePersonnel(s,o,traffic=[],dayFraction=1){
 if(!o.destination&&!o.retreating)return false;
 if(o.retreating&&!redirectRetreat(s,o)){
  const next=o.journey.route[0]||o.location,p=next===o.location?0:o.journey.progress/roadCost(s,o.location,next);
  const hit=transportEnemy(s,o,next,p,p,0,dayFraction,traffic);
  if(hit)loseTransport(s,o,hit,next,p);else delete o.retreatOrigin;
  return false;
 }
 if(isTransport(o)&&!o.journey.route.length){const enemy=s.armies.find(a=>!a.disbanded&&a.faction!==o.faction&&!a.travel&&a.location===o.location&&a.units.some(u=>u.troops>0)),owner=town(s,o.location).owner;
  if(enemy||owner!==o.faction){personnelEvent(s,`transport-loss:${o.unit.id}:${s.campaign.day}`,'TRANSPORT_LOST',o.unit,`${o.unit.name}运输队在卸载处遇敌，剩余部队及物资全部损失。`);resolveOfficerLoss(s,{unit:o.unit,faction:o.faction,location:o.location,enemy:enemy?.faction||owner,eventId:`transport-fate:${o.unit.id}:${s.campaign.day}`,reason:'运输队遇敌'});return false;}}
 const j=o.journey; j.blocked='';
 if(town(s,o.destination).owner!==o.faction&&!isTransport(o)){const edge=j.route.length?{from:o.location,to:j.route[0],fraction:j.progress/roadCost(s,o.location,j.route[0])}:null;s.campaign.idle=s.campaign.idle.filter(x=>x!==o);sendOfficerHome(s,o.unit,o.faction,o.location,{edge,reason:o.movementReason||'改道返城'});return false;}
 if(!j.route.length&&o.location!==o.destination)startPersonnelJourney(s,o);
 const move=o.journey;
 const speed=personnelSpeed(o);let budget=speed*dayFraction;
 while(move.route.length&&budget>0){
  const next=move.route[0];
  const cost=roadCost(s,o.location,next),used=Math.min(budget,cost-move.progress),from=move.progress/cost,to=(move.progress+used)/cost,t0=dayFraction-budget/speed,t1=t0+used/speed;
  if(isTransport(o)){
   const hit=transportEnemy(s,o,next,from,to,t0,t1,traffic);
   if(hit){loseTransport(s,o,hit,next,from);return false;}
  }
  move.progress+=used;budget-=used;if(used>0)delete o.retreatOrigin;
  if(move.progress>=cost){o.location=next;move.route.shift();move.progress=0;}else break;
 }
 if(o.location===o.destination&&!move.route.length){
  const c=town(s,o.destination),grain=Math.min(o.cargo?.grain||0,Math.max(0,Math.floor(10000+c.granary*10000-c.grain)));
  c.grain+=grain;c.manpower+=o.cargo?.manpower||0;
  if(o.cargo){o.cargo.grain-=grain;o.cargo.manpower=0;}
  s.grain=Math.floor(s.cities.filter(c=>c.owner===playerFaction(s)).reduce((n,c)=>n+c.grain,0));
  if(o.cargo?.grain>0){move.blocked='目的地粮仓不足，等待卸载';o.remainingDays=1;return false;}
  o.destination=null;o.remainingDays=0;o.unit.homeCity=c.id;delete o.journey;delete o.cargo;delete o.retreating;delete o.retreatOrigin;
  if(o.unit.troops>0||o.unit.wounded>0){c.units.push(o.unit);s.campaign.idle=s.campaign.idle.filter(x=>x!==o);}
  return true;
 }
 updatePersonnelETA(s,o);return false;
}
function loseTransport(s,o,hit,next,from){
 const fraction=hit.fraction??from;
 personnelEvent(s,`transport-loss:${o.unit.id}:${s.campaign.day}`,'TRANSPORT_LOST',o.unit,`${o.unit.name}${o.retreating?'撤离队':'运输队'}遭遇敌军，部队、伤兵及物资全部损失。`);
 resolveOfficerLoss(s,{unit:o.unit,faction:o.faction,location:o.location,enemy:hit.faction,eventId:`transport-fate:${o.unit.id}:${s.campaign.day}`,edge:next!==o.location?{from:o.location,to:next,fraction}:null,reason:o.retreating?'撤离队遇敌':'运输队遇敌'});
}
export function validatePersonnelJourney(s,o){
 const fail=ok=>{if(!ok)throw new Error('人才移动或运输存档无效');};
 if(o.retreating!==undefined)fail(o.retreating===true&&(o.unit.troops>0||o.unit.wounded>0));
 if(o.retreatOrigin!==undefined)fail(o.retreating===true&&o.retreatOrigin&&Array.isArray(o.retreatOrigin.armyIds)&&o.retreatOrigin.armyIds.every(id=>typeof id==='string'));
 if(o.cargo){fail((!!o.destination||o.retreating)&&!!o.journey&&['grain','manpower'].every(k=>Number.isSafeInteger(o.cargo[k])&&o.cargo[k]>=0));}
 fail((!!o.destination||!!o.retreating)===!!o.journey);
 if(!o.journey)return;
 const j=o.journey;fail((!!o.destination||o.retreating)&&Array.isArray(j.route)&&j.route.length<=mapNodes(s).length&&typeof j.blocked==='string'&&Number.isFinite(j.progress)&&j.progress>=0);
 let from=o.location;for(const to of j.route){fail(Number.isFinite(roadCost(s,from,to)));from=to;}
 fail(!j.route.length?j.progress===0&&(o.location===o.destination||!!j.blocked):(from===o.destination||o.retreating&&j.blocked==='无合法撤离据点')&&j.progress<roadCost(s,o.location,j.route[0]));
}
// Enemy sweeps and convoy segments use the same day-time interval, including multi-edge express travel.
export function transportEnemy(s,o,next,p0,p1,t0,t1,traffic=[]){
 const hits=[],from=o.location;
 const crossings=traffic.length?traffic:s.armies.filter(a=>!a.disbanded&&a.units.some(u=>u.troops>0)).map(a=>({id:a.id,faction:a.faction,location:a.location,edge:a.travel?{from:a.travel.from,to:a.travel.to,road:a.travel.road||'main',p0:a.travel.progress/roadDistance(s,a.travel.from,a.travel.to),p1:a.travel.progress/roadDistance(s,a.travel.from,a.travel.to),until:1}:null}));
 for(const e of crossings){if(e.faction===o.faction)continue;
  // Leaving the tactical exit has already escaped this encounter's exact origin.
  // Only that point is excluded; the same enemy farther along the route still intercepts.
  if(o.retreatOrigin?.armyIds.includes(e.id)){
   if(!e.edge&&e.location===from&&p0===0)continue;
   if(e.edge&&e.edge.p0===e.edge.p1&&[from,next].includes(e.edge.from)&&[from,next].includes(e.edge.to)&&Math.abs((e.edge.from===from?e.edge.p0:1-e.edge.p0)-p0)<1e-9)continue;
  }
  if(!e.edge){if(e.location===from&&p0===0)hits.push({faction:e.faction,time:t0,fraction:0});if(e.location===next&&p1>=1)hits.push({faction:e.faction,time:t1,fraction:1});continue;}
  const x=e.edge;
  // A convoy can meet a force arriving from a different branch at their shared junction.
  if(x.p1>=1){
   if(x.to===next&&p1>=1&&t1>=x.until)hits.push({faction:e.faction,time:t1,fraction:1});
   if(x.to===from&&p0===0&&t0>=x.until)hits.push({faction:e.faction,time:t0,fraction:0});
  }
  if(!([from,next].includes(x.from)&&[from,next].includes(x.to)))continue;
  if(x.road&&x.road!=='main'){if(p1>=1&&x.to===next&&x.p1>=1&&t1>=x.until)hits.push({faction:e.faction,time:t1,fraction:1});continue;}
  const same=x.from===from,q0=same?x.p0:1-x.p0,q1=same?x.p1:1-x.p1,until=x.until||1;
  for(const [lo,hi]of [[t0,Math.min(t1,until)],[Math.max(t0,until),t1]]){if(hi<lo)continue;
   const cp=t=>p0+(p1-p0)*(t-t0)/(t1-t0||1),ep=t=>q0+(q1-q0)*Math.min(1,t/until),d0=cp(lo)-ep(lo),d1=cp(hi)-ep(hi);
   if(d0*d1<=0){const time=d0===d1?lo:lo+(hi-lo)*d0/(d0-d1);hits.push({faction:e.faction,time,fraction:cp(time)});}
  }
 }
 if(p0===0&&!o.retreatOrigin&&!isJunction(s,from)&&town(s,from).owner!==o.faction)hits.push({faction:town(s,from).owner,time:t0,fraction:0});
 if(p1>=1&&!isJunction(s,next)&&town(s,next).owner!==o.faction)hits.push({faction:town(s,next).owner,time:t1,fraction:1});
 hits.sort((a,b)=>a.time-b.time||a.faction.localeCompare(b.faction));return hits[0];
}
