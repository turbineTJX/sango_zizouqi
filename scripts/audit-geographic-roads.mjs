import {nationalWorld} from '../national-scenarios.mjs';
import {mapNodes} from '../road-network.mjs';
import {roadCost,roadDistance,chosenRoad} from '../road-metrics.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {RIVERS} from '../national-geography.mjs';

export function geographicRiverCrossings(s){
 const nodes=new Map(mapNodes(s).map(n=>[n.id,n])),side=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 const intersects=(a,b,c,d)=>side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
 const crossings=[];
 for(const river of RIVERS.filter(r=>['huanghe','changjiang','huaihe','hanshui'].includes(r.id)))for(const [a,b] of s.roads){
  if(chosenRoad(s,a,b).terrain==='water')continue;
  const x=nodes.get(a),y=nodes.get(b);
  if(river.points.slice(1).some((p,i)=>intersects([x.x,x.y],[y.x,y.y],river.points[i],p)))crossings.push({river:river.name,from:x.name,to:y.name});
 }
 return crossings;
}

// Public geography only: no armies, city ownership, resources or random draws.
export function geographicRoute(s,from,to,{blocked=[],landOnly=false}={}){
 const forbidden=new Set(blocked),adj=new Map(mapNodes(s).map(n=>[n.id,[]]));
 for(const [a,b] of s.roads){if(forbidden.has(a)||forbidden.has(b)||landOnly&&chosenRoad(s,a,b).terrain==='water')continue;adj.get(a).push(b);adj.get(b).push(a);}
 const queue=[{id:from,path:[],cost:0,distance:0}],seen=new Set();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const p=queue.shift();if(seen.has(p.id))continue;seen.add(p.id);
  if(p.id===to)return p;
  for(const id of adj.get(p.id)||[])if(!seen.has(id))queue.push({id,path:[...p.path,id],cost:p.cost+roadCost(s,p.id,id),distance:p.distance+roadDistance(s,p.id,id)});
 }
 return null;
}
export const GEOGRAPHIC_CORRIDORS=[
 ['壶关','atlas-changzi','ye',['town-43']],
 ['虎牢关','luoyang','chenliu',['town-44']],
 ['潼关','town-18','luoyang',['town-45']],
 ['函谷关','town-18','luoyang',['town-46']],
 ['武关','town-18','wan',['town-47']],
 ['阳平关','town-21','town-37',['town-48']],
 ['葭萌关','town-37','town-49',['town-50']],
 ['剑阁','town-50','town-38',['town-49']],
 ['涪水关','town-38','town-52',['town-51']],
 ['绵竹关','town-51','town-40',['town-52']],
 ['雁门关','jinyang','atlas-pingcheng',['atlas-yanmen']],
 ['军都关','atlas-pingcheng','town-3',['atlas-jundu']],
 ['金城渡河','atlas-jincheng','town-20',['atlas-jincheng-port']],
 ['淮水渡河','atlas-zhongli','atlas-hefei',['atlas-huai-port']],
 ['广陵渡江','atlas-guangling','atlas-jingkou',['town-60','town-71']],
 ['皖口渡江','town-26','town-27',['town-73','town-74']],
 ['江陵渡江','town-31','town-33',['town-83','town-86']],
 ['三峡通航','town-31','town-36',['town-83','town-87']],
 ['江州渡江','town-39','atlas-fuling',['atlas-jiangzhou-port','atlas-nanjin-port']],
];
export function auditGeographicRoads(s=nationalWorld('guandu-200')){
 const names=new Map(mapNodes(s).map(n=>[n.id,n.name])),label=r=>r?{...r,path:r.path.map(id=>names.get(id))}:null;
 return GEOGRAPHIC_CORRIDORS.map(([name,from,to,blocked])=>{
  const route=geographicRoute(s,from,to),detour=geographicRoute(s,from,to,{blocked}),land=geographicRoute(s,from,to,{landOnly:true});
  return {name,from:names.get(from),to:names.get(to),blocked:blocked.map(id=>names.get(id)),route:label(route),detour:label(detour),ratio:route&&detour?+(detour.cost/route.cost).toFixed(2):null,land:label(land)};
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const s=nationalWorld('guandu-200'),corridors=auditGeographicRoads(s),landRiverCrossings=geographicRiverCrossings(s);
 if(landRiverCrossings.length||corridors.some(r=>!r.route||r.detour&&r.detour.cost<r.route.cost*2))throw Error('地理通道验收失败：'+JSON.stringify({corridors,landRiverCrossings}));
 console.log(JSON.stringify({passed:true,roads:s.roads.length,places:mapNodes(s).length,landRiverCrossings,corridors},null,2));
}
