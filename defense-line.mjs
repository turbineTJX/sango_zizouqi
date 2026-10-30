import {hexDistance} from './hex-grid.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {isTargetable,canStrikeFrom} from './engagement.mjs';

export const insideDefenseLine=(u,p=u)=>u.side===0?p.x<=4:p.x>=9;

// Only threats to the original defended area justify a sortie. A friendly
// already outside it must not pull the entire line farther across the map.
export function defenseLine(b,u,target) {
 const unrestricted=()=>true;
 if(b.siege?.gate.side!==u.side)return unrestricted;
 const guard=p=>insideDefenseLine(u,p);
 if(target?.side===1-u.side&&target.status==='active'&&target.hp>0&&isTargetable(b,target)&&!b.sides[target.side].retreat){
  const stats=unitAttributes(target,b);
  const protectedTargets=[...b.sides[u.side].units.filter(a=>a.status==='active'&&a.hp>0&&guard(a)&&isTargetable(b,a)),b.siege.gate];
  // An ongoing sortie still protects its fixed home line after the last guard
  // has stepped out. This avoids oscillating out and back before contact.
  if(!guard(u))protectedTargets.push({...u,x:u.side===0?4:9});
  if(stats.range>1&&protectedTargets.some(a=>hexDistance(a,target)<=stats.range&&hexDistance(a,target)>=stats.minRange&&canStrikeFrom(b,target,a))){
   // Reach contact on our side of the shooter, never chase past it. The
   // shooter's actual range bounds how far it can threaten the original line.
   const edge=u.side===0?Math.max(4,Math.min(target.x-1,4+Math.ceil(stats.range)-1)):Math.min(9,Math.max(target.x+1,9-Math.ceil(stats.range)+1));
   return p=>u.side===0?p.x<=edge:p.x>=edge;
  }
 }
 return guard;
}

export function shouldReturnToDefense(b,u){
 return b.siege?.gate.side===u.side&&!insideDefenseLine(u)&&
  !b.sides[1-u.side].units.some(target=>defenseLine(b,u,target)(u));
}
