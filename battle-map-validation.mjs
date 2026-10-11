import {BATTLE_MAPS,DEFAULT_BATTLE_MAPS,FIELD_MAP_IDS} from './data/design/battle-maps.mjs';
import {hexNeighbors,insideHexGrid} from './hex-grid.mjs';

export function validateBattleMaps(maps=BATTLE_MAPS){
 const errors=[],grounds=new Set(['land','forest','hill','marsh','water','bridge','rock']);
 const check=(ok,id,msg)=>{if(!ok)errors.push(id+'：'+msg);};
 const signatures=new Set();
 for(const [id,m] of Object.entries(maps)){
  check(typeof m.name==='string'&&m.name.length>0&&typeof m.description==='string'&&m.description.length>0,id,'缺少名称或地形说明');
  check(Object.hasOwn(FIELD_MAP_IDS,m.terrain),id,'未知战场类型');
  const valid=Array.isArray(m.tiles)&&m.tiles.length===8&&m.tiles.every(row=>Array.isArray(row)&&row.length===14&&row.every(t=>grounds.has(t)));
  check(valid,id,'地形必须为完整的14×8合法网格');if(!valid)continue;
  const signature=JSON.stringify(m.tiles);check(!signatures.has(signature),id,'重复地图布局');signatures.add(signature);
  check(Array.isArray(m.roads)&&m.roads.every(path=>Array.isArray(path)&&path.length>=2&&path.every(p=>Array.isArray(p)&&p.length===2&&insideHexGrid(...p))),id,'道路绘制坐标无效');
  // Every land deployment cell must be able to reach the opposite deployment
  // area AND its own exit. Do not mask isolated spawn pockets with one good path.
  const pass=(x,y)=>insideHexGrid(x,y)&&!['water','rock'].includes(m.tiles[y][x]);
  for(const side of [0,1]){
   const starts=m.tiles.flatMap((row,y)=>row.flatMap((t,x)=>pass(x,y)&&(side===0?x<5:x>8)?[{x,y}]:[]));
   check(starts.length>=14,id,'部署区不足以容纳上场部队');
   for(const start of starts){
    const seen=new Set([start.x+','+start.y]),queue=[start];
    for(let i=0;i<queue.length;i++)for(const [x,y] of hexNeighbors(queue[i]))if(pass(x,y)&&!seen.has(x+','+y)){seen.add(x+','+y);queue.push({x,y});}
    check(queue.some(p=>side===0?p.x>=9:p.x<=4)&&queue.some(p=>p.x===(side===0?0:13)),id,`部署格${start.x},${start.y}无法接敌或撤离`);
   }
  }
 }
 for(const [terrain,ids] of Object.entries(FIELD_MAP_IDS)){
  check(ids.includes(DEFAULT_BATTLE_MAPS[terrain]),terrain,'默认地图不在地形名单');
  for(const id of ids)check(maps[id]?.terrain===terrain,terrain,'普通地图缺失或地形不一致：'+id);
 }
 return errors;
}
