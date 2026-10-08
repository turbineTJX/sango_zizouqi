import fs from 'node:fs';
const edit=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')));
edit('personnel-movement.mjs',s=>s.replace('if(p0===0&&town(s,from).owner','if(p0===0&&!isJunction(s,from)&&town(s,from).owner').replace('if(p1>=1&&town(s,next).owner','if(p1>=1&&!isJunction(s,next)&&town(s,next).owner'));
edit('officer-missions.mjs',s=>s.replace('m.route.length<=s.cities.length','m.route.length<=mapNodes(s).length'));
edit('domestic.mjs',s=>"import {mapNode,cityRoads,adjacentCityPath} from './road-network.mjs';\n"+s.replace('const town=(s,id)=>s.cities.find(c=>c.id===id);','const town=mapNode;').replace('id===c.id||s.roads.some','id===c.id||cityRoads(s).some').replace('!besieged(s,c.id)&&s.roads.some','!besieged(s,c.id)&&cityRoads(s).some').replace("return n&&town(s,n).owner===c.owner&&!s.armies.some(x=>x.faction!==c.owner&&x.travel&&[x.travel.from,x.travel.to].includes(c.id)&&[x.travel.from,x.travel.to].includes(n));", "return n&&town(s,n).owner===c.owner&&(()=>{let from=c.id;return adjacentCityPath(s,c.id,n).every(to=>{const clear=!s.armies.some(x=>x.faction!==c.owner&&x.units.some(u=>u.troops>0)&&(!x.travel&&x.location===to||x.travel&&[x.travel.from,x.travel.to].includes(from)&&[x.travel.from,x.travel.to].includes(to)));from=to;return clear;});})();"));
edit('talent-core.mjs',s=>"import {cityRoads,adjacentCityPath} from './road-network.mjs';\n"+s.replace('a===b||s.roads.some','a===b||cityRoads(s).some').replace("(a===b||legalRoad(s,a,b))", "(a===b||(()=>{let from=a;const path=adjacentCityPath(s,a,b);return !!path&&path.every(to=>{const ok=legalRoad(s,from,to);from=to;return ok;});})())"));
edit('talent-lifecycle.mjs',s=>{
 s="import {mapNode,mapNodes,isJunction} from './road-network.mjs';\n"+s;
 s=s.replaceAll('s.cities.find(c=>c.id===p.cityId)','mapNode(s,p.cityId)').replaceAll('s.cities.find(c=>c.id===cityId)','mapNode(s,cityId)');
 s=s.replace('if(path.length>=2)continue','if(path.filter(id=>!isJunction(s,id)).length>=2)continue');
 s=s.replace('if(cityBesieged(s,id)&&id!==p.cityId)continue','if(isJunction(s,id)||cityBesieged(s,id)&&id!==p.cityId)continue');
 s=s.replace('city=id=>s.cities.some(c=>c.id===id)','city=id=>!!mapNode(s,id)');
 s=s.replace('p.travel.path.length<=2','p.travel.path.length<=mapNodes(s).length').replace('t.route.length<=s.cities.length','t.route.length<=mapNodes(s).length');
 return s;
});
