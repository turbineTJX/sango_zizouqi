import {buildingDurability,buildingWorkMode} from './building-durability.mjs';
import {METROPOLITAN_RULES as RULES} from './data/design/metropolitan-areas.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

const topologyCache=new WeakMap();
const nodes=s=>[...s.cities,...(s.junctions||[])];
const edgeKey=(a,b)=>[a,b].sort().join(':');
function topology(s){
 let result=topologyCache.get(s);if(result?.roads===s.roads&&result.cities===s.cities&&result.junctions===s.junctions)return result;
 const all=nodes(s),byId=new Map(all.map(n=>[n.id,n])),adj=new Map(all.map(n=>[n.id,[]]));
 for(const [a,b] of s.roads){const x=byId.get(a),y=byId.get(b);if(!x||!y)continue;
  const distance=s.roadSegments?.[edgeKey(a,b)]?.distance??Math.hypot(x.x-y.x,x.y-y.y);
  adj.get(a).push({id:b,distance});adj.get(b).push({id:a,distance});
 }
 const centers=s.cities.filter(c=>c.citySize==='large').sort((a,b)=>a.id.localeCompare(b.id));
 const nearest=new Map(),queue=centers.map(c=>({id:c.id,center:c.id,distance:0}));
 while(queue.length){queue.sort((a,b)=>a.distance-b.distance||a.center.localeCompare(b.center)||a.id.localeCompare(b.id));const current=queue.shift();
  if(nearest.has(current.id))continue;nearest.set(current.id,current);
  for(const next of adj.get(current.id)||[])if(!nearest.has(next.id))queue.push({id:next.id,center:current.center,distance:current.distance+next.distance});
 }
 const members=new Map(centers.map(c=>[c.id,[]]));
 for(const n of all){const center=nearest.get(n.id)?.center;if(members.has(center)&&(n.id===center||RULES.siteKinds.includes(n.kind)))members.get(center).push(n);}
 for(const [center,list] of members)list.sort((a,b)=>Number(b.id===center)-Number(a.id===center)||(nearest.get(a.id)?.distance||0)-(nearest.get(b.id)?.distance||0)||a.id.localeCompare(b.id));
 result={byId,adj,nearest,members,cityIds:new Set(s.cities.map(c=>c.id)),roads:s.roads,cities:s.cities,junctions:s.junctions};topologyCache.set(s,result);return result;
}
export function metropolitanCenter(s,node){
 const t=topology(s);return t.byId.get(t.nearest.get(node.id)?.center)||node;
}
export function metropolitanMembers(s,node){
 const center=metropolitanCenter(s,node),t=topology(s);
 return t.members.get(center.id)||[node];
}
export const constructionSites=(s,c)=>c.citySize==='large'?metropolitanMembers(s,c):[c];
export const buildingSiteName=(s,siteId)=>topology(s).byId.get(siteId)?.name||siteId;
export const projectSiteId=c=>c.project?.siteId||c.id;
export function localBuildingLevel(c,key,siteId){
 const external=c.domestic?.buildingSites?.[key]||[];
 return siteId===c.id?Math.max(0,(c[key]||0)-external.length):external.filter(id=>id===siteId).length;
}
export function localBuildingLimit(s,c,key,siteId=c.id){
 const p=ECONOMY_RULES.development;
 if(key==='walls')return siteId===c.id?p.localLevels.infrastructure:0;
 if(siteId===c.id)return p.economicBuildings.includes(key)?p.localLevels[p.richCities.includes(c.id)?'rich':c.citySize==='small'?'small':'large']:p.localLevels.infrastructure;
 const n=topology(s).byId.get(siteId),levels=p.externalLevels[n?.kind];
 return levels?(levels[key]??levels.other):0;
}
export const buildingLimit=(s,c,key)=>Math.min(ECONOMY_RULES.development.metropolitanMax,constructionSites(s,c).reduce((n,site)=>n+localBuildingLimit(s,c,key,site.id),0));
export const canExpandBuilding=(s,c,key,siteId)=>c[key]<buildingLimit(s,c,key)&&
 constructionSites(s,c).some(n=>n.id===siteId)&&
 s.cities.reduce((n,source)=>n+localBuildingLevel(source,key,siteId),0)<localBuildingLimit(s,c,key,siteId);
export function productiveBuildingLevel(s,c,key){
 return constructionSites(s,c).reduce((n,site)=>n+(site.id===c.id||constructionSiteAvailable(s,c,site.id)? (buildingDurability(c,key,site.id).hp>0?localBuildingLevel(c,key,site.id):0):0),0);
}
// A site is reachable only through this metropolis's friendly, unblocked roads.
export function constructionSiteAvailable(s,c,siteId,{busy=false}={}){
 if(!constructionSites(s,c).some(n=>n.id===siteId))return false;
 if(busy&&s.cities.some(n=>n.project&&projectSiteId(n)===siteId))return false;
 const t=topology(s),center=metropolitanCenter(s,c).id;
 const clear=id=>{const n=t.byId.get(id);return n&&
  (id===c.id||t.nearest.get(id)?.center===center)&&
  (!t.cityIds.has(id)||n.owner===c.owner)&&
  !(s.campaign?.battles||[]).some(b=>!b.settled&&b.cityId===id)&&
  !s.armies.some(a=>!a.disbanded&&a.faction!==c.owner&&!a.travel&&a.location===id&&a.units.some(u=>u.troops>0));};
 const clearRoad=(from,to)=>!s.armies.some(a=>!a.disbanded&&a.faction!==c.owner&&a.travel&&a.units.some(u=>u.troops>0)&&edgeKey(a.travel.from,a.travel.to)===edgeKey(from,to));
 if(!clear(c.id)||!clear(siteId))return false;
 const queue=[c.id],seen=new Set(queue);
 while(queue.length){const id=queue.shift();if(id===siteId)return true;
  for(const next of t.adj.get(id)||[])if(!seen.has(next.id)&&clear(next.id)&&clearRoad(id,next.id)){seen.add(next.id);queue.push(next.id);}
 }
 return false;
}
export function availableConstructionSites(s,c,key){
 const weights=RULES.constructionWeights[key];
 return constructionSites(s,c).map(n=>({node:n,weight:weights[n.id===c.id?'main':n.kind==='city'?'small':n.kind]}))
  .filter(x=>x.weight>0&&(buildingWorkMode(c,key,x.node.id)!=='build'||canExpandBuilding(s,c,key,x.node.id))&&constructionSiteAvailable(s,c,x.node.id,{busy:true}));
}
export function chooseConstructionSite(s,c,key,draw){
 const options=availableConstructionSites(s,c,key);if(!options.length)return null;
 let remaining=draw*options.reduce((n,x)=>n+x.weight,0);
 for(const x of options){remaining-=x.weight;if(remaining<0)return x.node.id;}
 return options.at(-1).node.id;
}
export function buildingLocations(s,c,key){
 const external=c.domestic?.buildingSites?.[key]||[],ids=[...(c[key]>external.length?[c.id]:[]),...new Set(external),...(c.project?.key===key?[projectSiteId(c)]:[])];
 return [...new Set(ids)].map(id=>({id,name:buildingSiteName(s,id),level:localBuildingLevel(c,key,id)}));
}
