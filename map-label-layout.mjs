import {isLandPoint} from './national-geography.mjs';

const overlaps=(a,b,pad)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
// Fixed screen-size labels stay near their real city. Check the entire label,
// including its edges, rather than just an anchor that may sit on a coastline.
export function metropolisLabelPosition(point,scale,view,{footprints=[],labels=[],width=64}={}){
 if(point.x<view.x||point.y<view.y||point.x>view.x+view.width||point.y>view.y+view.height)return null;
 const w=width*scale,h=24*scale,pad=2*scale;
 const onMap=r=>r.x>=Math.max(0,view.x)+pad&&r.y>=Math.max(0,view.y)+pad&&r.x+r.w<=Math.min(1024,view.x+view.width)-pad&&r.y+r.h<=Math.min(1024,view.y+view.height)-pad;
 const onLand=r=>[0,.25,.5,.75,1].every(t=>isLandPoint(r.x+r.w*t,r.y)&&isLandPoint(r.x+r.w*t,r.y+r.h))&&[.25,.5,.75].every(t=>isLandPoint(r.x,r.y+r.h*t)&&isLandPoint(r.x+r.w,r.y+r.h*t));
 const positions=[];
 // Search nearby rows first; an inland side is preferred automatically by
 // the coast test. Never move the physical city to make room for its name.
 for(const dy of [-40,18,-68,46,-96,74])for(const dx of [0,-32,32,-64,64,-96,96]){
  const r={x:point.x-w/2+dx*scale,y:point.y+dy*scale,w,h};
  positions.push({...r,dx,dy});
 }
 return positions.sort((a,b)=>Math.hypot(a.dx,a.dy+12)-Math.hypot(b.dx,b.dy+12)).find(r=>onMap(r)&&onLand(r)&&!footprints.some(p=>overlaps(r,p,pad))&&!labels.some(p=>overlaps(r,p,pad)))||null;
}
