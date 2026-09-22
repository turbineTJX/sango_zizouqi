import {hexDistance} from './hex-grid.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {isTargetable,canStrikeFrom} from './engagement.mjs';

// Guard the rear by default, but do not let an exposed shooter attack it
// indefinitely from just outside the line. Both movement searches share this.
export function defenseLine(b,u,target) {
 const unrestricted=()=>true;
 if(b.siege?.gate.side!==u.side)return unrestricted;
 const guard=p=>u.side===0?p.x<=4:p.x>=9;
 if(target?.side===1-u.side&&target.status==='active'&&target.hp>0&&isTargetable(b,target)&&!b.sides[target.side].retreat){
  const stats=unitAttributes(target,b);
  const protectedTargets=[...b.sides[u.side].units.filter(a=>a.status==='active'&&a.hp>0&&isTargetable(b,a)),b.siege.gate];
  if(stats.range>1&&protectedTargets.some(a=>hexDistance(a,target)<=stats.range&&hexDistance(a,target)>=stats.minRange&&canStrikeFrom(b,target,a)))return unrestricted;
 }
 return guard;
}
