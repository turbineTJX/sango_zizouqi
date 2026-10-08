import fs from 'node:fs';
const edit=(f,fn)=>{const old=fs.readFileSync(f,'utf8'),next=fn(old);if(next===old)throw Error('unchanged '+f);fs.writeFileSync(f,next)};
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('missing '+a);return s.replace(a,b)};
edit('national-scenarios.mjs',s=>"import {buildRoadNetwork} from './road-network.mjs';\n"+replace(s,'return {cities,roads:structuredClone(NATIONAL_MAP.roads)};','return {cities,...buildRoadNetwork(cities,NATIONAL_MAP.roads)};'));
edit('strategic-movement.mjs',s=>{
 s="import {mapNode,roadSegment,isJunction,junctionBlocked} from './road-network.mjs';\n"+s;
 s=replace(s,'const node=(s,id)=>s.cities.find(c=>c.id===id);','const node=mapNode;');
 s=replace(s,'=>Math.max(RULES.distance.minimum','=>roadSegment(s,a,b)?.distance??Math.max(RULES.distance.minimum');
 s=replace(s,'const terrain=water?',"const segment=roadSegment(s,a,b);\n  const terrain=water?");
 s=replace(s,'cost:Math.ceil(distance*r.costFactors[terrain]),offset:r.offset','cost:Math.ceil(distance*r.costFactors[terrain]*(segment?.costFactor||1)),offset:r.offset');
 s=replace(s,'name:r.names[terrain]','name:segment?.trail?\'乡野小路\':r.names[terrain]');
 s=replace(s,'if(node(s,next).owner!==faction||','if(!isJunction(s,next)&&node(s,next).owner!==faction||junctionBlocked(s,next,faction)||');
 s=replace(s,"r.id==='side'?'strategy-side-road':''","r.id==='side'||roadSegment(s,a,b)?.trail?'strategy-side-road':''");
 return s;
});
// Shared lookups for locations, never add the junctions to the city economy.
for(const file of ['strategic-campaign.mjs','strategic-command.mjs','strategic-orders.mjs','personnel-movement.mjs','officer-fates.mjs','officer-missions.mjs','strategic-ai.mjs'])edit(file,s=>{
 const key=file==='strategic-campaign.mjs'?'city':'town';
 return "import {mapNode,mapNodes,isJunction,junctionBlocked} from './road-network.mjs';\n"+replace(s,`const ${key}=(s,id)=>s.cities.find(c=>c.id===id);`,`const ${key}=mapNode;`);
});
edit('strategic-campaign.mjs',s=>{
 s=replace(s,'version:17','version:18');
 s=replace(s,'todo=new Set(s.cities.map(c=>c.id))','todo=new Set(mapNodes(s).map(c=>c.id))');
 s=replace(s,'current!==from&&faction&&city(s,current).owner!==faction','current!==from&&faction&&!isJunction(s,current)&&city(s,current).owner!==faction');
 s=replace(s,"if(!next||!todo.has(next))continue;","if(!next||!todo.has(next))continue;");
 s=replace(s,"if(p.id===a.location)","if(junctionBlocked(s,p.id,a.faction))continue;\n      if(p.id===a.location)");
 s=replace(s,"city(s,next).owner!==a.faction&&next!==siegeEndpoint","!isJunction(s,next)&&city(s,next).owner!==a.faction&&next!==siegeEndpoint");
 s=replace(s,'const c=city(s,destination);\n    // Walls',`const c=city(s,destination);
    if(isJunction(s,destination)){
      if(defenders.length){makeEncounter(s,a,defenders,destination,'field',armyPosition(s,a));continue;}
      if(!a.route.length){a.target=null;a.task='路口驻守';}
      continue;
    }
    // Walls`);
 // Battle adapters get a temporary node with the fields needed by startBattle.
 s=replace(s,"const c=city(proxy,cityId),real=city(s,cityId);c.owner", "const c=city(proxy,cityId),real=city(s,cityId);if(c.kind==='junction')Object.assign(c,{garrison:0,units:[]});c.owner");
 s=replace(s,"if(c.owner===playerFaction(s)&&b.sides", "if(c.kind!=='junction'&&c.owner===playerFaction(s)&&b.sides");
 return s;
});
edit('engine.mjs',s=>{
 s="import {mapNode,mapNodes} from './road-network.mjs';\n"+s;
 s=replace(s,'s.cities.find(c => c.id === id);','mapNode(s,id);');
 s=replace(s,"const initial = strategic", "const initial = strategic");
 s=replace(s,"require(validRelationshipTypes(value.relationshipTypes)","if(strategic)require(JSON.stringify(value.junctions)===JSON.stringify(initial.junctions)&&JSON.stringify(value.roadSegments)===JSON.stringify(initial.roadSegments),'路网数据不匹配');\n  require(validRelationshipTypes(value.relationshipTypes)");
 s=replace(s,'army.route.length <= initial.cities.length','army.route.length <= mapNodes(initial).length');
 return s;
});
// AI retains its city-level planning adjacency, route costs still use the physical network.
edit('strategic-ai.mjs',s=>{
 s="import {NATIONAL_ROAD_DESIGNS} from './data/design/roads.mjs';\n"+s;
 return replace(s,'neighbors=(s,id)=>s.roads.flatMap','neighbors=(s,id)=>(s.junctions?NATIONAL_ROAD_DESIGNS:s.roads).flatMap');
});
edit('personnel-movement.mjs',s=>replace(s,'j.route.length<=s.cities.length','j.route.length<=mapNodes(s).length'));
