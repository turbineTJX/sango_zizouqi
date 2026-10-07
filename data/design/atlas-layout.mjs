import {ATLAS_CITY_POINTS,atlasPosition} from './ancient-atlas.mjs';
import {ATLAS_ADDITIONS,ATLAS_REPLACED_ROADS,atlasCitySize} from './atlas-cities.mjs';
const edgeKey=(a,b)=>[a,b].sort().join(':');
export function applyAtlasLayout(sourceCities,sourceRoads){
 const additions=new Map(ATLAS_ADDITIONS.map((c,index)=>[c.id,{id:c.id,sourceId:c.sourceId??1000+index,name:c.name,...atlasPosition(c.point),kind:c.kind,province:c.province,subtitle:c.province+' · '+(c.kind==='city'?'州郡城池':'险要关隘'),owner:'neutral'}]));
 const cities=sourceCities.map(c=>{const point=ATLAS_CITY_POINTS[c.id];if(!point)throw Error('古地图缺少据点坐标：'+c.id);return {...c,...(additions.get(c.id)||{}),...atlasPosition(point)};});
 for(const c of additions.values())if(!cities.some(n=>n.id===c.id))cities.push(c);
 for(const c of cities)if(c.kind==='city'){
  c.citySize=atlasCitySize(c.id);
  c.subtitle=c.province+' · '+(c.citySize==='large'?'大城':'小城');
 }
 const ids=new Set(cities.map(c=>c.id)),edges=new Map(),removed=new Set(ATLAS_REPLACED_ROADS.map(e=>edgeKey(...e)));
 const add=(a,b)=>{if(!ids.has(a)||!ids.has(b))throw Error(`古地图道路引用不存在的城池：${a}—${b}`);if(a!==b&&!edges.has(edgeKey(a,b)))edges.set(edgeKey(a,b),[a,b]);};
 for(const [a,b] of sourceRoads)if(!removed.has(edgeKey(a,b)))add(a,b);
 for(const c of ATLAS_ADDITIONS)for(const neighbor of c.neighbors)add(c.id,neighbor);
 return {cities,roads:[...edges.values()]};
}
