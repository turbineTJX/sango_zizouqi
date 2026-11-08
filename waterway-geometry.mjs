// Navigation follows the same broad rivers and their tributaries as the terrain.
// Bank approaches are short; all other points stay on river, lake or sea water.
import {RIVERS,LAKES,LAND_POLYGON,isLandPoint,nearestWaterPoint} from './national-geography.mjs';
import {CITY_DESIGNS} from './data/design/cities.mjs';
import {ATLAS_PORT_WATERS} from './data/design/atlas-cities.mjs';
import {HISTORICAL_GEOGRAPHY_DESIGN} from './data/design/historical-geography.mjs';
const xy=([x,y])=>({x,y}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {x:a.x+dx*t,y:a.y+dy*t,t};}
const edges=[],add=(a,b)=>{if(distance(a,b)>1e-7)edges.push({a,b,cuts:[{...a,t:0},{...b,t:1}]});};
const line=ps=>{for(let i=1;i<ps.length;i++)add(xy(ps[i-1]),xy(ps[i]));};
for(const r of RIVERS)line(r.points);
// The eastern sea lane sits offshore, keeping coastal voyages off dry land.
const coast=LAND_POLYGON.slice(2,-1).map((p,i,ps)=>{
 const a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
 for(const offset of [4,7,12]){const q={x:p[0]+dy/length*offset,y:p[1]-dx/length*offset};if(!isLandPoint(q.x,q.y))return q;}
 return {x:p[0]+12,y:p[1]};
});
for(let i=1;i<coast.length;i++)add(coast[i-1],coast[i]);
function nearestOn(p,ps){let best;for(let i=1;i<ps.length;i++){const q=project(p,ps[i-1],ps[i]),d=distance(p,q);if(!best||d<best.distance)best={...q,distance:d};}return best;}
for(const id of ['huanghe','changjiang','liaoshui']){const r=RIVERS.find(r=>r.id===id),end=xy(r.points.at(-1));add(end,nearestOn(end,coast));}
const lakeHubs=new Map();
for(const [id,rivers] of Object.entries(HISTORICAL_GEOGRAPHY_DESIGN.lakeRivers)){
 const l=LAKES.find(l=>l.name===id),hub={x:l.points.reduce((n,p)=>n+p[0],0)/l.points.length,y:l.points.reduce((n,p)=>n+p[1],0)/l.points.length};
 lakeHubs.set(id,hub);for(const river of rivers)add(hub,nearestOn(hub,RIVERS.find(r=>r.id===river).points.map(xy)));
}
for(const p of CITY_DESIGNS.filter(n=>n.kind==='port')){
 const water=ATLAS_PORT_WATERS[p.id];
 if(water==='coast')add(p,nearestOn(p,coast));
 else {const bank=nearestWaterPoint(p,water);add(p,bank);if(lakeHubs.has(water))add(bank,lakeHubs.get(water));}
}
// Split at confluences. Nearby rounded endpoints share a tiny water connection.
const base=[...edges];
for(let i=0;i<base.length;i++)for(const b of base.slice(i+1)){
 const a=base[i],dx=a.b.x-a.a.x,dy=a.b.y-a.a.y,ex=b.b.x-b.a.x,ey=b.b.y-b.a.y,det=dx*ey-dy*ex;
 if(Math.abs(det)>1e-9){const x=b.a.x-a.a.x,y=b.a.y-a.a.y,t=(x*ey-y*ex)/det,u=(x*dy-y*dx)/det;if(t>=0&&t<=1&&u>=0&&u<=1){const p={x:a.a.x+dx*t,y:a.a.y+dy*t};a.cuts.push({...p,t});b.cuts.push({...p,t:u});}}
 for(const [source,target] of [[a,b],[b,a]])for(const p of [source.a,source.b]){const q=project(p,target.a,target.b);if(distance(p,q)<.75){target.cuts.push(q);add(p,q);}}
}
const graph=new Map(),key=p=>p.x.toFixed(6)+','+p.y.toFixed(6),points=new Map();
const connect=(a,b)=>{const x=key(a),y=key(b);if(x===y)return;for(const [id,p] of [[x,a],[y,b]]){points.set(id,{x:p.x,y:p.y});if(!graph.has(id))graph.set(id,[]);}const cost=distance(a,b);graph.get(x).push({id:y,cost});graph.get(y).push({id:x,cost});};
for(const e of edges){e.cuts.sort((a,b)=>a.t-b.t);for(let i=1;i<e.cuts.length;i++)connect(e.cuts[i-1],e.cuts[i]);}
const routeCache=new Map();
export function waterwayPoints(from,to){
 const cacheKey=from.id+':'+to.id;if(routeCache.has(cacheKey))return routeCache.get(cacheKey);
 const start=key(from),end=key(to),queue=[{id:start,cost:0}],costs=new Map([[start,0]]),previous=new Map(),visited=new Set();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const at=queue.shift();if(visited.has(at.id))continue;visited.add(at.id);if(at.id===end)break;
  for(const next of graph.get(at.id)||[]){const cost=at.cost+next.cost;if(cost<(costs.get(next.id)??Infinity)){costs.set(next.id,cost);previous.set(next.id,at.id);queue.push({id:next.id,cost});}}
 }
 if(!visited.has(end))throw Error('水路未连接实际水系：'+from.name+'—'+to.name);
 const path=[];for(let at=end;at;at=previous.get(at)){path.unshift(points.get(at)||{x:from.x,y:from.y});if(at===start)break;}
 routeCache.set(cacheKey,path);return path;
}
