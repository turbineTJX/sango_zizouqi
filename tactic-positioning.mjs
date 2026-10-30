import {toAxial,fromAxial,hexDistance,insideHexGrid} from './hex-grid.mjs';
import {blockedTerrain,terrainAt} from './battlefield.mjs';

const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=p=>`${p.x},${p.y}`;
const order=(a,b)=>a.id.localeCompare(b.id);
const blocked=(b,x,y)=>terrainAt(b,x,y)==='rock'||blockedTerrain(b,x,y);
function roundAxial(q,r){
 let x=Math.round(q),z=Math.round(r),y=Math.round(-q-r);
 const dx=Math.abs(x-q),dz=Math.abs(z-r),dy=Math.abs(y+q+r);
 if(dx>dy&&dx>dz)x=-y-z;else if(dz>dy)z=-x-y;
 return fromAxial({q:x,r:z});
}
// A one-cell-wide hex ray. Terrain terminates the ray; units do not manufacture
// extra range or let a projectile cross a mountain wall.
export function tacticRay(b,origin,target,reach){
 const d=hexDistance(origin,target);if(!d)return [];
 const a=toAxial(origin),t=toAxial(target),cells=[];
 for(let n=1;n<=reach;n++){
  const p=roundAxial(a.q+(t.q-a.q)*n/d,a.r+(t.r-a.r)*n/d);
  if(!insideHexGrid(p.x,p.y)||blocked(b,p.x,p.y))break;
  if(!cells.some(c=>key(c)===key(p)))cells.push(p);
 }
 return cells;
}
export function tacticShapeCells(b,u,s,target,range){
 const g=s.geometry;if(!g||!target)return [];
 const reach=g.reach??range??s.range??1;
 if(g.kind==='line')return tacticRay(b,u,target,reach);
 if(g.kind==='burst'){
  const cells=[];for(let y=0;y<8;y++)for(let x=0;x<14;x++){
   const p={x,y};if(hexDistance(target,p)<=g.radius&&hexDistance(u,p)<=reach&&!blocked(b,x,y))cells.push(p);
  }return cells;
 }
 const a=toAxial(u),t=toAxial(target),vx=t.q-a.q+(t.r-a.r)/2,vy=(t.r-a.r)*Math.sqrt(3)/2;
 const axis=directions.map(([q,r],i)=>({i,dot:(q+r/2)*vx+r*Math.sqrt(3)/2*vy})).sort((a,b)=>b.dot-a.dot||a.i-b.i)[0].i;
 const cells=[];
 for(const i of [(axis+5)%6,axis,(axis+1)%6]){
  const [q,r]=directions[i],p=fromAxial({q:a.q+q,r:a.r+r});
  if(insideHexGrid(p.x,p.y)&&!blocked(b,p.x,p.y))cells.push(p);
 }return cells;
}
// The caller supplies its real eligible pool (visibility, immunity/avoidance,
// range, withdrawal and targeting rules stay in the ordinary combat pipeline).
export function tacticShapeTargets(b,u,s,target,pool,range){
 const cells=tacticShapeCells(b,u,s,target,range),keys=new Set(cells.map(key));
 if(!keys.has(key(target)))return [];
 return pool.filter(t=>keys.has(key(t)))
  .sort((a,c)=>Number(c===target)-Number(a===target)||hexDistance(u,a)-hexDistance(u,c)||order(a,c))
  .slice(0,s.geometry.maxTargets);
}
export function positionedSupportTargets(u,s,pool){
 if(!s.supportPosition)return pool;
 const score=a=>{
  if(a===u)return 1000;
  if(s.supportPosition==='column')return Math.abs(a.x-u.x)*20+hexDistance(u,a);
  if(s.supportPosition==='flanks')return Math.abs(a.x-u.x)*20+(a.y===u.y?10:0)+hexDistance(u,a);
  const forward=(a.x-u.x)*(u.side===1?-1:1);
  return (forward<=0?100:0)+Math.abs(a.y-u.y)*10+hexDistance(u,a);
 };
 // Stable ties preserve the existing need-based ranking within a position.
 return [...pool].sort((a,c)=>score(a)-score(c));
}
