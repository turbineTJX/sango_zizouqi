import {canFormArmyAt} from './city-units.mjs';
import {findCampaignRoute} from './strategic-campaign.mjs';
import {roadCost} from './strategic-movement.mjs';
import {roadEdgeForArmy,removeOfficer} from './officer-fates.mjs';
import {battleWounded,isDeploying} from './engine.mjs';

function routeFrom(s,faction,location,edge,destination){
 const options=[];
 for(const end of edge?[edge.from,edge.to]:[location]){
  const route=findCampaignRoute(s,end,destination,faction);if(!route)continue;
  let cost=0,from=end;for(const to of route){cost+=roadCost(s,from,to);from=to;}
  if(edge){const forward=end===edge.to,origin=forward?edge.from:edge.to,progress=roadCost(s,origin,end)*(forward?edge.fraction:1-edge.fraction);cost+=roadCost(s,origin,end)-progress;options.push({location:origin,route:[end,...route],progress,cost});}
  else options.push({location,route,progress:0,cost});
 }
 return options.sort((a,b)=>a.cost-b.cost)[0]||null;
}
export function retreatDestinations(s,b,side=0){
 const r=s.campaign?.battles.find(r=>r.battle.id===b.id);if(!r)return [];
 const faction=b.sides[side].faction;
 const origins=r.armies.filter(a=>a.faction===faction);
 if(!origins.length)origins.push({location:r.cityId});
 return s.cities.filter(c=>canFormArmyAt(s,c.id,faction)&&!(r.kind==='siege'&&r.cityId===c.id)).map(c=>{
  const paths=origins.map(a=>routeFrom(s,faction,a.location,roadEdgeForArmy(s,a),c.id));
  return paths.every(Boolean)?{id:c.id,name:c.name,cost:Math.max(...paths.map(p=>p.cost))}:null;
 }).filter(Boolean).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));
}
export function configureRetreatDestination(s,b,id,side=0){
 if(!isDeploying(b))return '只能在战前会议设置撤离据点';
 if(!retreatDestinations(s,b,side).some(c=>c.id===id))return '请选择可达且允许编制军团的己方据点';
 b.sides[side].retreatDestination=id;return null;
}
export function initializeRetreatDestinations(s,r){
 r.battle.strategicRetreat=true;
 for(let side=0;side<2;side++)r.battle.sides[side].retreatDestination=retreatDestinations(s,r.battle,side)[0]?.id??null;
}
export function redirectRetreat(s,o){
 const next=o.journey?.route[0],edge=next?{from:o.location,to:next,fraction:o.journey.progress/roadCost(s,o.location,next)}:null;
 const candidates=s.cities.filter(c=>canFormArmyAt(s,c.id,o.faction)).map(c=>({id:c.id,path:routeFrom(s,o.faction,o.location,edge,c.id)})).filter(c=>c.path);
 candidates.sort((a,b)=>Number(b.id===o.destination)-Number(a.id===o.destination)||a.path.cost-b.path.cost||a.id.localeCompare(b.id));
 const best=candidates[0];
 if(!best){o.journey.blocked='无合法撤离据点';return false;}
 const changed=o.destination!==best.id;
 o.destination=best.id;o.location=best.path.location;o.journey={route:best.path.route,progress:best.path.progress,blocked:''};o.remainingDays=1;
 if(changed)s.campaign.lastNotice=`${o.unit.name}撤离改道至${s.cities.find(c=>c.id===best.id).name}。`;
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
  source.troops=u.hp;source.wounded+=battleWounded(u);
  removeOfficer(s,u.id);
  const destination=side.retreatDestination;
  const path=destination&&routeFrom(s,side.faction,location,edge,destination);
  const o={unit:source,faction:side.faction,location:path?.location??location,destination:destination??null,remainingDays:1,
   movementReason:'撤离',retreating:true,retreatOrigin:{armyIds:[...r.armyIds]},cargo:{grain,manpower:0},
   journey:{route:path?.route??(edge?[edge.to]:[]),progress:path?.progress??(edge?roadCost(s,edge.from,edge.to)*edge.fraction:0),blocked:''}};
  if(!path&&edge)o.location=edge.from;
  s.campaign.idle.push(o);u.retreatDispatched=true;
  redirectRetreat(s,o);
 }
 // Empty shells are not persistent armies; battle snapshots retain their provenance.
 s.armies=s.armies.filter(a=>a.units.length);
}
