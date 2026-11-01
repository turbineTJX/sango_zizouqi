// Public, deterministic geography shared by roads, travel and map previews.
import {RIVERS,MOUNTAINS,isLandPoint} from './national-geography.mjs';
import {CITY_DESIGNS} from './data/design/cities.mjs';
import {ROAD_NETWORK_DESIGN} from './data/design/road-network.mjs';
import {crossingNodes,crossingRoadSection} from './road-crossings.mjs';
const places=[...CITY_DESIGNS,...Object.entries(ROAD_NETWORK_DESIGN.nodePositions).map(([key,[x,y]])=>({id:'junction:'+key,x,y,kind:'junction'}))];
const atlas=new Map([...places,...crossingNodes].map(p=>[p.id,p])),cache=new Map(),baseCurves=new Map();
function baseCurve(a,b){
 const key=a.id+':'+b.id;
 if(!baseCurves.has(key))baseCurves.set(key,makeCurve(a,b));
 return baseCurves.get(key);
}
export const authoredRoadPoints=(from,to)=>from.id<to.id?baseCurve(from,to):baseCurve(to,from);
const hash=text=>[...text].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
const nearest=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);};
const riverSegments=RIVERS.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width})));
const mountainSegments=MOUNTAINS.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width})));
const side=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
const crossing=(a,b,c,d)=>side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
function makeCurve(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),seed=hash(a.id+':'+b.id);
 const nearRivers=riverSegments.filter(r=>nearest(a,r.a,r.b)+nearest(b,r.a,r.b)<length+45);
 const nearMountains=mountainSegments.filter(r=>nearest(a,r.a,r.b)+nearest(b,r.a,r.b)<length+50);
 const neighbours=places.filter(p=>p.id!==a.id&&p.id!==b.id&&Math.hypot(p.x-(a.x+b.x)/2,p.y-(a.y+b.y)/2)<length/2+14);
 const baseline=Array.from({length:65},(_,i)=>({x:a.x+dx*i/64,y:a.y+dy*i/64}));
 const riverBaseline=new Set(nearRivers.filter(r=>crossing(a,b,{x:r.a[0],y:r.a[1]},{x:r.b[0],y:r.b[1]})));
 let best=null,bestScore=Infinity;
 for(let variant=0;variant<8;variant++){
  const amplitude=Math.min(13,length*(.09+(seed%5)*.012))*(variant<4?1:.5),bias=[.65,-.65,0,1][variant%4],phase=(seed%19)/19*Math.PI;
  const curve=baseline.map((p,i)=>{
   const t=i/64,envelope=Math.sin(Math.PI*t)**1.4;
   const bend=amplitude*envelope*(bias+.62*Math.sin(t*Math.PI*2+phase)+.24*Math.sin(t*Math.PI*4-phase));
   return {x:p.x-dy/length*bend,y:p.y+dx/length*bend};
  });
  let score=0,blocked=false;
  for(let i=1;i<curve.length;i++){
   const p=curve[i],t=i/64,edge=Math.min(1,t*7,(1-t)*7);
   if(!isLandPoint(p.x,p.y)&&isLandPoint(baseline[i].x,baseline[i].y)){blocked=true;break;}
   for(const r of nearRivers){
    if(!riverBaseline.has(r)&&crossing(curve[i-1],p,{x:r.a[0],y:r.a[1]},{x:r.b[0],y:r.b[1]})){blocked=true;break;}
    const d=nearest(p,r.a,r.b),clearance=r.width/2+.8;
    score+=Math.max(0,clearance-d)**2*edge*18;
   }
   if(blocked)break;
   for(const m of nearMountains)score+=Math.max(0,m.width*.65-nearest(p,m.a,m.b))*edge*.6;
   for(const n of neighbours){const radius=n.kind==='city'?7:n.kind==='junction'?2.5:4;score+=Math.max(0,radius-Math.hypot(p.x-n.x,p.y-n.y))**2*12;}
   score+=Math.hypot(p.x-curve[i-1].x,p.y-curve[i-1].y)*.12;
  }
  if(!blocked&&score<bestScore){best=curve;bestScore=score;}
 }
 return best||baseline;
}
export function roadCurve(from,to){
 const a=from.id<to.id?from:to,b=from.id<to.id?to:from,originalA=atlas.get(a.id),originalB=atlas.get(b.id);
 // A separately projected theater and synthetic battle fixtures retain their own coordinates.
 if(!originalA||!originalB||Math.hypot(a.x-originalA.x,a.y-originalA.y)>.01||Math.hypot(b.x-originalB.x,b.y-originalB.y)>.01||originalA.kind==='port'&&originalB.kind==='port')return null;
 const key=a.id+':'+b.id;
 if(!cache.has(key)){
  const section=crossingRoadSection(a.id,b.id);
  let points;
  if(section){
   const source=baseCurve(...section.source.map(id=>atlas.get(id))),last=source.length-1;
   points=[atlas.get(section.from),...source.filter((_,i)=>i>section.start*last&&i<section.end*last),atlas.get(section.to)];
   if(section.from!==a.id)points.reverse();
  }else points=baseCurve(a,b);
  // Approaches converge inside the village instead of crossing each other
  // again just outside it. Countryside bends retain their authored terrain path.
  points=[points[0],...points.slice(1,-1).filter(p=>(a.kind!=='junction'||Math.hypot(p.x-a.x,p.y-a.y)>10)&&(b.kind!=='junction'||Math.hypot(p.x-b.x,p.y-b.y)>10)),points.at(-1)];
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  cache.set(key,{points,lengths,length:lengths.at(-1)});
 }
 return cache.get(key);
}
export function curvedRoadPoint(from,to,progress){
 const curve=roadCurve(from,to);if(!curve)return null;
 const t=Math.max(0,Math.min(1,from.id<to.id?progress:1-progress)),distance=t*curve.length;
 let i=1;while(i<curve.lengths.length-1&&curve.lengths[i]<distance)i++;
 const a=curve.points[i-1],b=curve.points[i],p=(distance-curve.lengths[i-1])/(curve.lengths[i]-curve.lengths[i-1]||1);
 return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
}
