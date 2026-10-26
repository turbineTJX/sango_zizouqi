import {cityRegion} from './strategic-territory.mjs';
import {metropolitanCenter} from './metropolitan-areas.mjs';

const cache=new Map();
// Public geography shared by map borders and faction sight. Ownership is read
// separately, so a capture changes sight without rebuilding or saving geometry.
export function metropolitanRegions(s){
 const sites=[...s.cities,...(s.junctions||[]).filter(n=>n.kind==='junction')];
 const key=sites.map(n=>`${n.id}:${n.x}:${n.y}:${metropolitanCenter(s,n).id}`).join('|');
 if(!cache.has(key)){
  const regions=sites.map(n=>{
   const polygon=cityRegion(n,sites),centerId=metropolitanCenter(s,n).id;
   return {id:n.id,name:n.name,kind:n.kind,centerId,ownerId:n.kind==='junction'?centerId:n.id,polygon,
    bounds:[Math.min(...polygon.map(p=>p[0])),Math.min(...polygon.map(p=>p[1])),Math.max(...polygon.map(p=>p[0])),Math.max(...polygon.map(p=>p[1]))],
    points:polygon.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ')};
  });
  if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(key,regions);
 }
 return cache.get(key);
}
export function regionContains(region,p){
 const [left,top,right,bottom]=region.bounds,epsilon=1e-7;
 if(p.x<left-epsilon||p.x>right+epsilon||p.y<top-epsilon||p.y>bottom+epsilon||region.polygon.length<3)return false;
 let sign=0;
 for(let i=0;i<region.polygon.length;i++){
  const a=region.polygon[i],b=region.polygon[(i+1)%region.polygon.length],cross=(b[0]-a[0])*(p.y-a[1])-(b[1]-a[1])*(p.x-a[0]);
  if(Math.abs(cross)<=epsilon)continue;
  const next=Math.sign(cross);if(sign&&next!==sign)return false;sign=next;
 }
 return true;
}
