import fs from 'node:fs';
let p='strategic-ai.mjs',s=fs.readFileSync(p,'utf8');s=s.replace("import {NATIONAL_ROAD_DESIGNS} from './data/design/roads.mjs';\n",'').replace('mapNode,mapNodes,isJunction,junctionBlocked','mapNode,cityRoads').replace('(s.junctions?NATIONAL_ROAD_DESIGNS:s.roads).flatMap','cityRoads(s).flatMap');fs.writeFileSync(p,s);
p='design-catalog.mjs';s=fs.readFileSync(p,'utf8');s="import {ROAD_NETWORK_DESIGN} from './data/design/road-network.mjs';\n"+s.replace('DESIGN_TABLES={','DESIGN_TABLES={roadNetwork:ROAD_NETWORK_DESIGN,');fs.writeFileSync(p,s);
p='design-strategy-validation.mjs';s=fs.readFileSync(p,'utf8');s=s.replace(' const m=t.movement;',` const network=t.roadNetwork;
 if(fields(network,['trailCost','bypasses'],'roadNetwork')){
  check(num(network.trailCost,1),'roadNetwork.trailCost','小路代价须不低于官道');
  check(Array.isArray(network.bypasses),'roadNetwork.bypasses','须为三据点数组');
  const seen=new Set();
  for(const [i,row] of (network.bypasses||[]).entries()){
   const path='roadNetwork.bypasses.'+i;
   check(Array.isArray(row)&&row.length===3&&new Set(row).size===3,path,'须指定中心据点及两个不同方向');
   if(!Array.isArray(row)||row.length!==3)continue;
   check(row.every(id=>t.cities.some(c=>c.id===id&&c.kind==='city')),path,'仅允许陆上城市，不得横跨关隘港口');
   const [center,...ends]=row;
   check(ends.every(id=>t.roads.some(([a,b])=>a===center&&b===id||b===center&&a===id)),path,'引用的官道不存在');
   const key=center+':'+ends.sort().join(':');check(!seen.has(key),path,'重复小路');seen.add(key);
  }
 }
 const m=t.movement;`);fs.writeFileSync(p,s);
p='scripts/design-tables.mjs';s=fs.readFileSync(p,'utf8');s="import {buildRoadNetwork,mapNode} from '../road-network.mjs';\n"+s;
const start=s.indexOf('const roadRows='),end=s.indexOf('\n',start);
s=s.slice(0,start)+`const roadWorlds=[['全国',{cities:d.cities,...buildRoadNetwork(d.cities,d.roads)}],['入门地图',{cities:d.demoCities,roads:d.demoRoads}]];
const roadRows=roadWorlds.flatMap(([scope,state])=>state.roads.map(([a,b])=>[scope,a,mapNode(state,a).name,b,mapNode(state,b).name,roadDistance(state,a,b),campaignRoads(state,a,b).map(r=>r.name+'：'+r.cost).join('；')]));`+s.slice(end);
s=s.replace('每行是一条双向据点连接，主路和支路按移动规则计算。距离由两端坐标计算；','每行是一条双向实际路段，含城外路口与横向小路；分段官道保留原总距离，横向小路按道路网络表计价。');
s=s.replace('全国道路:d.roads.length','全国道路:roadWorlds[0][1].roads.length,野外路口:roadWorlds[0][1].junctions.length,横向小路:d.roadNetwork.bypasses.length');fs.writeFileSync(p,s);
