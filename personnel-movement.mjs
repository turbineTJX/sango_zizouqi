import {plannedGrain} from './strategic-intent.mjs';
import {armyStrategicTrait,hasStrategicTrait} from './strategic-traits.mjs';
import {redirectRetreat} from './strategic-retreat.mjs';
import {rallyWithdrawn} from './army-rally.mjs';
import {TACTICS} from './engine.mjs';
import {addCityGold} from './city-resources.mjs';
import {mapNode,mapNodes,isJunction} from './road-network.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {playerFaction} from './player-faction.mjs';
import {factionsHostile,diplomaticPassage,protectedDiplomaticTraffic} from './diplomacy-relations.mjs';

import {resolveOfficerLoss,personnelEvent,sendOfficerHome} from './officer-fates.mjs';
import {loseTreasureTransport} from './treasures.mjs';
import {transportMerit,settleMeritCapacity,transportRelievesShortage} from './campaign-merit.mjs';
import {findCampaignRoute} from './strategic-campaign.mjs';
import {roadCost,roadDistance,validMapRoute,threatenedTransportRoute} from './strategic-movement.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {cityFoodRequirement} from './city-logistics.mjs';
const town=mapNode;
export const PERSONNEL_SPEED=MOVEMENT_RULES.personnel.light;
export const TRANSPORT_SPEED=MOVEMENT_RULES.personnel.transport;
export const isTransport=o=>(!!o.destination||o.retreating)&&(o.unit.troops>0||o.unit.wounded>0||o.cargo?.gold>0||o.cargo?.grain>0||o.cargo?.manpower>0||!!o.convoyCycle);
export const lightPersonnelSpeed=u=>PERSONNEL_SPEED;
export const personnelSpeed=o=>isTransport(o)?TRANSPORT_SPEED:lightPersonnelSpeed(o.unit);
export function startPersonnelJourney(s,o,path=null){
 if(isTransport(o)&&!o.retreating&&o.convoyCycle?.leg!=='return'&&!o.meritTransport)o.meritTransport={id:`transport:${o.unit.id}:${s.campaign.day}:${s.campaign.activity?.nextSequence||0}`,source:o.location,target:o.relayDestination||o.destination,troopsCredited:false};
 const route=path||findCampaignRoute(s,o.location,o.destination,isTransport(o)?o.faction:null);
 o.journey={route:route||[],progress:0,blocked:route?'':'道路不通'};
 updatePersonnelETA(s,o);
}
function updatePersonnelETA(s,o){
 let from=o.location,cost=-o.journey.progress;
 for(const to of o.journey.route){cost+=roadCost(s,from,to);from=to;}
 o.remainingDays=Math.max(1,Math.ceil(cost/personnelSpeed(o)));
}
function handoffGrain(s,o,traffic,t0=0,t1=1){
 if(!o.cargo?.grain||o.journey.progress!==0||transportEnemy(s,o,o.location,0,0,t0,t1,traffic))return;
 for(const a of s.armies.filter(a=>a.faction===o.faction&&!a.disbanded&&!a.travel&&a.location===o.location&&armyStrategicTrait(a,'receiveGrain')&&!s.campaign.battles.some(r=>!r.settled&&r.armyIds.includes(a.id))).sort((a,b)=>a.id.localeCompare(b.id))){const n=Math.max(0,Math.min(o.cargo.grain,a.supplyCapacity-a.supply));a.supply+=n;o.cargo.grain-=n;}
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
  if(enemy||owner!==o.faction&&!(o.retreating&&isJunction(s,o.location))){loseTransport(s,o,{faction:enemy?.faction||owner},o.location,0);return false;}}
 const j=o.journey; j.blocked='';
 handoffGrain(s,o,traffic,0,dayFraction);

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
  if(move.progress>=cost){o.location=next;move.route.shift();move.progress=0;handoffGrain(s,o,traffic,t1,t1);}else break;
 }
 if(o.location===o.destination&&!move.route.length&&o.relayDestination){
  const final=o.relayDestination;if(town(s,final)?.owner!==o.faction||town(s,o.location)?.owner!==o.faction){move.blocked='接力据点失守，等待改令';o.remainingDays=1;return false;}
  const route=o.relayRoute||findCampaignRoute(s,o.location,final,o.faction);if(!route||!validMapRoute(s,o.location,final,route,o.faction,'trade')){move.blocked='接力道路不通';o.remainingDays=1;return false;}
  o.destination=final;delete o.relayDestination;delete o.relayRoute;startPersonnelJourney(s,o,route);return false;
 }
 if(o.location===o.destination&&!move.route.length){
  if(o.retreating&&isJunction(s,o.location))return rallyWithdrawn(s,o);
  if(o.convoyCycle?.leg==='return'){
   const plan=o.convoyCycle,c=town(s,o.location),keep=cityFoodRequirement(s,c,20)+c.budget.grainReserve+plannedGrain(s,c.id),route=plan.route?.slice(1)||findCampaignRoute(s,c.id,plan.target,o.faction);
   if(c.owner===o.faction&&town(s,plan.target)?.owner===o.faction&&route&&validMapRoute(s,c.id,plan.target,route,o.faction,'trade')&&!threatenedTransportRoute(intelligenceWorld(s,o.faction),c.id,route,o.faction)&&c.grain-keep>=plan.batch){c.grain-=plan.batch;o.cargo.grain=plan.batch;o.destination=plan.target;plan.leg='out';startPersonnelJourney(s,o,route);return false;}
   delete o.convoyCycle;
  }
  const c=town(s,o.destination),grain=Math.min(o.cargo?.grain||0,Math.max(0,Math.floor(10000+c.granary*10000-c.grain)));
  if(o.meritTransport){const m=o.meritTransport,men=m.troopsCredited?0:o.unit.troops+o.unit.wounded,amounts={gold:o.cargo?.gold||0,grain,manpower:(o.cargo?.manpower||0)+men};transportMerit(s,o.unit,o.faction,m.source,c.id,amounts,{sourceId:`${m.id}:${s.campaign.day}:${o.cargo?.grain||0}`,relief:transportRelievesShortage(s,c,amounts),reason:'实际交付运输物资与部队'});m.troopsCredited=true;}
  addCityGold(s,c,o.cargo?.gold||0);c.grain+=grain;c.manpower+=o.cargo?.manpower||0;
  if(o.cargo){o.cargo.gold=0;o.cargo.grain-=grain;o.cargo.manpower=0;}
  s.grain=Math.floor(s.cities.filter(c=>c.owner===playerFaction(s)).reduce((n,c)=>n+c.grain,0));
  if(o.cargo?.grain>0){move.blocked='目的地粮仓不足，等待卸载';o.remainingDays=1;return false;}
  if(o.convoyCycle&&--o.convoyCycle.remaining>0){const plan=o.convoyCycle,route=plan.route?[...plan.route].reverse().slice(1):findCampaignRoute(s,o.location,plan.source,o.faction);if(town(s,plan.source)?.owner===o.faction&&route&&validMapRoute(s,o.location,plan.source,route,o.faction,'trade')&&!threatenedTransportRoute(intelligenceWorld(s,o.faction),o.location,route,o.faction)){delete o.meritTransport;o.destination=plan.source;plan.leg='return';startPersonnelJourney(s,o,route);return false;}}
  delete o.convoyCycle;
  o.destination=null;o.remainingDays=0;o.unit.homeCity=c.id;delete o.journey;delete o.cargo;delete o.retreating;delete o.retreatOrigin;delete o.retreatFormation;
  delete o.meritTransport;
  if(o.unit.troops>0||o.unit.wounded>0){c.units.push(o.unit);s.campaign.idle=s.campaign.idle.filter(x=>x!==o);}
  settleMeritCapacity(s);
  return true;
 }
 updatePersonnelETA(s,o);return false;
}
function loseTransport(s,o,hit,next,from){
 loseTreasureTransport(s,o,o.location);
 const fraction=hit.fraction??from;
 if(o.meritTransport){const m=o.meritTransport;transportMerit(s,o.unit,o.faction,m.source,m.target,{...o.cargo,manpower:(o.cargo?.manpower||0)+o.unit.troops+o.unit.wounded},{sourceId:m.id+':loss',failed:true,reason:'运输遇敌损失'});}
 personnelEvent(s,`transport-loss:${o.unit.id}:${s.campaign.day}`,'TRANSPORT_LOST',o.unit,`${o.unit.name}${o.retreating?'撤离队':'运输队'}遭遇敌军，部队、伤兵及物资全部损失。`);
 resolveOfficerLoss(s,{unit:o.unit,faction:o.faction,location:o.location,enemy:hit.faction,eventId:`transport-fate:${o.unit.id}:${s.campaign.day}`,edge:next!==o.location?{from:o.location,to:next,fraction}:null,reason:o.retreating?'撤离队遇敌':'运输队遇敌'});
}
export function validatePersonnelJourney(s,o){
 const fail=ok=>{if(!ok)throw new Error('人才移动或运输存档无效');};
 if(o.meritTransport){const m=o.meritTransport;fail(!!o.destination&&!o.retreating&&typeof m.id==='string'&&m.id.startsWith('transport:')&&town(s,m.source)&&town(s,m.target)&&m.source!==m.target&&typeof m.troopsCredited==='boolean');}
 if(o.convoyCycle){const p=o.convoyCycle;fail(hasStrategicTrait(o.unit,'cycleCargo')&&!o.unit.troops&&!o.unit.wounded&&!!o.cargo&&!!o.destination&&['out','return'].includes(p.leg)&&town(s,p.source)&&town(s,p.target)&&p.source!==p.target&&Number.isSafeInteger(p.batch)&&p.batch>0&&Number.isInteger(p.remaining)&&p.remaining>0&&p.remaining<=5&&o.destination===(p.leg==='out'?p.target:p.source)&&o.cargo.manpower===0&&o.cargo.grain<=p.batch);}
 if(o.relayDestination!==undefined)fail(hasStrategicTrait(o.unit,'relayCargo')&&!!o.destination&&!!o.cargo&&town(s,o.relayDestination)&&o.relayDestination!==o.destination);
 if(o.relayRoute!==undefined)fail(!!o.relayDestination&&validMapRoute(s,o.destination,o.relayDestination,o.relayRoute));
 if(o.convoyCycle?.route)fail(o.convoyCycle.route[0]===o.convoyCycle.source&&validMapRoute(s,o.convoyCycle.source,o.convoyCycle.target,o.convoyCycle.route.slice(1)));
 if(o.retreating!==undefined)fail(o.retreating===true&&(o.unit.troops>0||o.unit.wounded>0));
 if(o.retreating){const f=o.retreatFormation;fail(f&&Number.isSafeInteger(f.capacity)&&f.capacity>=o.cargo.grain&&typeof f.id==='string'&&f.id.length<=100&&typeof f.name==='string'&&f.name.length>0&&f.name.length<=30&&town(s,f.homeCity)&&Number.isFinite(f.morale)&&f.morale>=0&&f.morale<=100&&Object.hasOwn(TACTICS,f.tactic)&&['leader','advisor','deputy'].every(k=>typeof f[k]==='string'||k==='deputy'&&f[k]===null));}
 if(o.retreatOrigin!==undefined)fail(o.retreating===true&&o.retreatOrigin&&Array.isArray(o.retreatOrigin.armyIds)&&o.retreatOrigin.armyIds.every(id=>typeof id==='string'));
 if(o.cargo){fail((!!o.destination||o.retreating)&&!!o.journey&&['gold','grain','manpower'].every(k=>Number.isSafeInteger(o.cargo[k]??0)&&(o.cargo[k]??0)>=0));}
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
 for(const e of crossings){if(protectedDiplomaticTraffic(s,o.faction,e.faction,o.diplomaticContract,o.diplomaticEnvoy))continue;
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
 if(p0===0&&!o.retreatOrigin&&!isJunction(s,from)&&factionsHostile(s,town(s,from).owner,o.faction)&&!protectedDiplomaticTraffic(s,o.faction,town(s,from).owner,o.diplomaticContract,o.diplomaticEnvoy)&&!diplomaticPassage(s,o.faction,from,o.diplomaticEnvoy?'envoy':'trade',o.diplomaticContract))hits.push({faction:town(s,from).owner,time:t0,fraction:0});
 if(p1>=1&&!isJunction(s,next)&&factionsHostile(s,town(s,next).owner,o.faction)&&!protectedDiplomaticTraffic(s,o.faction,town(s,next).owner,o.diplomaticContract,o.diplomaticEnvoy)&&!diplomaticPassage(s,o.faction,next,o.diplomaticEnvoy?'envoy':'trade',o.diplomaticContract))hits.push({faction:town(s,next).owner,time:t1,fraction:1});
 hits.sort((a,b)=>a.time-b.time||a.faction.localeCompare(b.faction));return hits[0];
}
