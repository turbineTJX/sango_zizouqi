import {readFile,writeFile} from 'node:fs/promises';
import {ATLAS_CITY_POINTS,ATLAS_JUNCTION_POINTS,atlasPoint} from '../data/design/ancient-atlas.mjs';
import {applyAtlasLayout} from '../data/design/atlas-layout.mjs';
import {NATIONAL_MAP} from '../data/national-map.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {ROAD_DISTANCE_DESIGNS} from '../data/design/road-distances.mjs';
import {buildRoadNetwork,edgeKey,mapNode} from '../road-network.mjs';
const layout=applyAtlasLayout(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS);
for(const c of layout.cities)if(!ATLAS_CITY_POINTS[c.id])throw Error('Missing atlas point '+c.id);
const citiesPath=new URL('../data/design/cities.mjs',import.meta.url),citySource=await readFile(citiesPath,'utf8');
const demoCity=citySource.slice(citySource.indexOf('export const DEMO_CITY_DESIGNS'));
const roadsPath=new URL('../data/design/roads.mjs',import.meta.url),roadSource=await readFile(roadsPath,'utf8');
const demoRoad=roadSource.slice(roadSource.indexOf('export const DEMO_ROAD_DESIGNS'));
const junctionPath=new URL('../data/design/road-network.mjs',import.meta.url);
let junctionSource=await readFile(junctionPath,'utf8');
for(const [key,point] of Object.entries(ATLAS_JUNCTION_POINTS)){
 const [x,y]=atlasPoint(point),pattern=new RegExp("('"+key+"':)\\[[^\\]]+\\]");
 if(!pattern.test(junctionSource))throw Error('Missing junction '+key);
 junctionSource=junctionSource.replace(pattern,(_,prefix)=>`${prefix}[${x},${y}]`);
}
// For new routes only, calculate the authored starting length from the new
// projection. Existing route budgets stay explicit and are not recomputed.
const network=buildRoadNetwork(layout.cities,layout.roads,{requireLengths:false});
const world={cities:layout.cities,...network},distances={};
for(const [a,b] of network.roads){const key=edgeKey(a,b),x=mapNode(world,a),y=mapNode(world,b);distances[key]=ROAD_DISTANCE_DESIGNS[key]??network.roadSegments[key]?.distance??Math.max(30,Math.round(Math.hypot(x.x-y.x,x.y-y.y)*.5));}
NATIONAL_MAP.cities=structuredClone(layout.cities);NATIONAL_MAP.roads=structuredClone(layout.roads);
NATIONAL_MAP.source.note='城池名单、规模、坐标与新增道路参考用户提供古地图；方框为大城、圆圈为小城，未高亮的保留城池按小城适配；同城保留三国古名，晚期新城按三国区域旧治适配。原有连接继承参考项目，关隘、港口和新增区域路网为游戏设计；行程长度独立维护。';
await writeFile(citiesPath,'// Authoritative city design; atlas inventory synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const CITY_DESIGNS = '+JSON.stringify(layout.cities,null,2)+';\n\n'+demoCity);
await writeFile(roadsPath,'// Authoritative road design; atlas links synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const NATIONAL_ROAD_DESIGNS = '+JSON.stringify(layout.roads,null,2)+';\n\n'+demoRoad);
await writeFile(junctionPath,junctionSource);
await writeFile(new URL('../data/national-map.mjs',import.meta.url),'// Generated scenario source; atlas cities and links synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const NATIONAL_MAP = '+JSON.stringify(NATIONAL_MAP,null,2)+';\n');
await writeFile(new URL('../data/design/road-distances.mjs',import.meta.url),'// Authored route lengths, independent of the atlas display projection.\nexport const ROAD_DISTANCE_DESIGNS = '+JSON.stringify(distances,null,2)+';\n');
console.log({cities:layout.cities.filter(c=>c.kind==='city').length,gates:layout.cities.filter(c=>c.kind==='gate').length,ports:layout.cities.filter(c=>c.kind==='port').length,roads:network.roads.length});
