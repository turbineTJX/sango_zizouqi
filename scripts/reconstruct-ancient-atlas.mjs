import {readFile,writeFile} from 'node:fs/promises';
import {ATLAS_CITY_POINTS,ATLAS_JUNCTION_POINTS,atlasPoint} from '../data/design/ancient-atlas.mjs';
import {applyAtlasLayout} from '../data/design/atlas-layout.mjs';
import {NATIONAL_MAP} from '../data/national-map.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from '../data/design/roads.mjs';
import {ROAD_DISTANCE_DESIGNS} from '../data/design/road-distances.mjs';
import {buildRoadNetwork,edgeKey,mapNode} from '../road-network.mjs';
import {historicalGeographyIssues} from '../historical-geography-validation.mjs';
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
// Author parent road budgets here; the runtime derives crossing sections.
const network=buildRoadNetwork(layout.cities,layout.roads,{requireLengths:false,includeCrossings:false});
const placementIssues=historicalGeographyIssues([...layout.cities,...network.junctions],network.roads);
if(placementIssues.length)throw Error('历史地理校核失败，未写入地图：'+JSON.stringify(placementIssues));
const world={cities:layout.cities,...network},distances={};
for(const [a,b] of network.roads){const key=edgeKey(a,b),x=mapNode(world,a),y=mapNode(world,b);distances[key]=ROAD_DISTANCE_DESIGNS[key]??network.roadSegments[key]?.distance??Math.max(30,Math.round(Math.hypot(x.x-y.x,x.y-y.y)*.5));}
NATIONAL_MAP.cities=structuredClone(layout.cities);NATIONAL_MAP.roads=structuredClone(layout.roads);
NATIONAL_MAP.source.note='构图与投影参考用户提供西晋底图；汉末三国地名、城湖关系、古关与接港道路按CHGIS、地方志及研究资料校核，依据见historical-geography设计表。水路仅连港口，山脊禁连和湖岸绕行由路网约束。坐标及岸线为游戏适配，非历史GIS；行程长度独立维护。';
await writeFile(citiesPath,'// Authoritative city design; atlas inventory synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const CITY_DESIGNS = '+JSON.stringify(layout.cities,null,2)+';\n\n'+demoCity);
await writeFile(roadsPath,'// Authoritative road design; atlas links synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const NATIONAL_ROAD_DESIGNS = '+JSON.stringify(layout.roads,null,2)+';\n\n'+demoRoad);
await writeFile(junctionPath,junctionSource);
await writeFile(new URL('../data/national-map.mjs',import.meta.url),'// Generated scenario source; atlas cities and links synchronized by scripts/reconstruct-ancient-atlas.mjs\nexport const NATIONAL_MAP = '+JSON.stringify(NATIONAL_MAP,null,2)+';\n');
await writeFile(new URL('../data/design/road-distances.mjs',import.meta.url),'// Authored route lengths, independent of the atlas display projection.\nexport const ROAD_DISTANCE_DESIGNS = '+JSON.stringify(distances,null,2)+';\n');
console.log({cities:layout.cities.filter(c=>c.kind==='city').length,gates:layout.cities.filter(c=>c.kind==='gate').length,ports:layout.cities.filter(c=>c.kind==='port').length,roads:network.roads.length});
