import {hexDistance,hexNeighbors,insideHexGrid} from './hex-grid.mjs';
import {hidden,statusOn,detected} from './battle-status-rules.mjs';

export const isTargetable = (b,u) => !statusOn(b,u,'stasis')&&!hidden(b,u)&&(!u.isDecoy||!detected(b,u));
export const isMelee = u => ['spear','halberd','cavalry','ram'].includes(u.type);
// Physical presence controls adjacent hexes. Disabled or withdrawing troops
// still occupy their hex, but cannot pin another unit in melee.
export function holdsLine(b,u) {
  return isTargetable(b,u)&&isMelee(u)&&u.status==='active'&&u.hp>0&&!b.sides[u.side]?.retreat
    &&!u.isDecoy&&!['stealth','confuse','disrupted'].some(k=>(u.statuses?.[k]?.until||0)>b.tick);
}
export function interceptorsAt(b,u,cell=u,charging=false) {
  if(statusOn(b,u,'phase')&&!statusOn(b,u,'stealth'))return [];
  if(!charging&&!isMelee(u)&&!statusOn(b,u,'stealth'))return [];
  return (b.sides[1-u.side]?.units||[]).filter(e=>holdsLine(b,e)&&hexDistance(cell,e)===1);
}
export function canStrikeFrom(b,u,target,cell=u,charging=false) {
  const guards=interceptorsAt(b,u,cell,charging);
  return !guards.length||guards.some(e=>e.id===target.id);
}
// The display derives coverage from exactly the same ZOC owners as pathfinding.
// Keep counts so overlapping zones remain visible when one owner is disabled.
export function zocCells(b) {
  const cells=new Map();
  for(const side of b.sides)for(const u of side.units)if(holdsLine(b,u)){
    for(const [x,y] of hexNeighbors(u))if(insideHexGrid(x,y)){
      const key=`${x},${y}`,cell=cells.get(key)||{x,y,counts:[0,0]};
      cell.counts[u.side]++;cells.set(key,cell);
    }
  }
  return [...cells.values()];
}
// Ordered eligibility tiers, before distance/counter/focus scoring. Adjacent
// frontliners pin the attacker; an exposed adjacent target remains attackable.
export function meleeTargetPool(b,u,enemies) {
  if(!isMelee(u)||statusOn(b,u,'phase')||statusOn(b,u,'stealth'))return enemies;
  const engaged=interceptorsAt(b,u);
  if(engaged.length)return enemies.filter(e=>engaged.some(g=>g.id===e.id));
  const adjacent=enemies.filter(e=>hexDistance(u,e)===1);
  if(adjacent.length)return adjacent;
  const front=enemies.filter(e=>holdsLine(b,e)&&hexDistance(u,e)<=2);
  return front.length?front:enemies;
}
