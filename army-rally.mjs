import {mapNode,isJunction} from './road-network.mjs';
import {factionsHostile} from './diplomacy-relations.mjs';

// A safe stopping point permits reorganization, but never grants city services.
export function canRallyAt(s,id,faction){
 const n=mapNode(s,id);
 return !!n&&(isJunction(s,id)||n.owner===faction)&&
  !s.armies.some(a=>!a.disbanded&&factionsHostile(s,a.faction,faction)&&!a.travel&&a.location===id&&a.units.some(u=>u.troops>0))&&
  !s.campaign.battles.some(r=>!r.settled&&r.cityId===id&&(r.kind==='siege'||r.armies.some(a=>!a.travel&&a.location===id)));
}

export function rallyWithdrawn(s,o){
 const group=o.retreatFormation;
 let a=s.armies.find(a=>a.retreatGroup===group.id&&a.faction===o.faction&&a.location===o.location&&!a.travel&&!a.route.length&&a.units.filter(u=>u.troops>0).length+(o.unit.troops>0?1:0)<=10&&!s.campaign.battles.some(r=>!r.settled&&r.armyIds.includes(a.id)));
 if(!a){
  if(s.armies.length>=200){o.journey.blocked='军团数量已达上限，等待整编';return false;}
  a={id:`a${s.nextId++}`,name:group.name,faction:o.faction,location:o.location,homeCity:group.homeCity,
   units:[],leader:o.unit.id,advisor:o.unit.id,morale:group.morale,tactic:group.tactic,
   supply:0,supplyCapacity:0,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,
   route:[],target:null,travel:null,task:'撤退整队',detached:true,stationary:false,retreatGroup:group.id};
  s.armies.push(a);
 }
 o.unit.first=a.units.filter(u=>u.first).length<6;
 a.units.push(o.unit);a.supply+=o.cargo.grain;a.supplyCapacity+=group.capacity;
 for(const key of ['leader','advisor'])if(group[key]===o.unit.id)a[key]=o.unit.id;
 s.campaign.idle=s.campaign.idle.filter(x=>x!==o);
 return true;
}
