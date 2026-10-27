import {hexNeighbors,insideHexGrid} from './hex-grid.mjs';
import {MAP_CATEGORIES} from './data/design/battle-map-categories.mjs';
export {MAP_CATEGORIES} from './data/design/battle-map-categories.mjs';

export const MAP_DOCUMENT_VERSION=1;
export const MAP_TERRAINS=Object.freeze({land:'平原',forest:'林地',hill:'高地',marsh:'湿地',river:'河流'});
export const mapSceneTerrain=scene=>scene==='gate'?'hill':['port','naval'].includes(scene)?'river':'land';
export const MAP_GROUNDS=Object.freeze({land:'平地',forest:'树林',hill:'高地',marsh:'湿地',water:'水面',bridge:'桥梁',rock:'山壁'});
const safeText=(s,max,multiline=false)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!(multiline?/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/:/[<>\u0000-\u001f]/).test(s);
const customId=(id,kind)=>typeof id==='string'&&new RegExp('^'+kind+':[a-zA-Z0-9-]{1,80}$').test(id);
const fields=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k));
export function validateMapCategory(value){
 if(!fields(value,['id','name','scene'])||!safeText(value.name,20)||!['field','siege','gate','port','naval'].includes(value.scene))throw Error('地图分类名称或用途无效');
 const builtin=Object.hasOwn(MAP_CATEGORIES,value.id)?MAP_CATEGORIES[value.id]:null;
 if(builtin&&(builtin.name!==value.name||builtin.scene!==value.scene)||!builtin&&!customId(value.id,'map-category'))throw Error('地图分类编号无效');
 return {id:value.id,name:value.name.trim(),scene:value.scene};
}
export function mapLayoutErrors(m){
 const errors=[];
 if(!Array.isArray(m?.tiles)||m.tiles.length!==8||!m.tiles.every(r=>Array.isArray(r)&&r.length===14&&r.every(t=>Object.hasOwn(MAP_GROUNDS,t))))return ['地形须为完整的14×8六角网格'];
 const naval=m.deployment==='naval';
 if(m.category?.scene==='siege'&&[1,12].some(x=>['water','rock'].includes(m.tiles[4][x])))errors.push('攻城地图两侧城门格须为可通行岸地');
 if(naval&&m.category?.scene==='siege')errors.push('攻城地图不能仅舰船部署');
 if(naval&&m.terrain!=='river')errors.push('仅舰船部署须使用水域地形');
 if(!Array.isArray(m.roads)||m.roads.length>32||!m.roads.every(p=>Array.isArray(p)&&p.length>=2&&p.length<=112&&p.every(c=>Array.isArray(c)&&c.length===2&&insideHexGrid(...c))))errors.push('道路须由地图内的2～112个格子连接，每图最多32条');
 const pass=(x,y)=>insideHexGrid(x,y)&&m.tiles[y][x]!=='rock'&&(naval||m.tiles[y][x]!=='water');
 const regions=new Map();
 for(let y=0;y<8;y++)for(let x=0;x<14;x++){
  if(!pass(x,y)||regions.has(x+','+y))continue;
  const queue=[{x,y}],region={left:false,right:false,leftExit:false,rightExit:false};regions.set(x+','+y,region);
  for(let i=0;i<queue.length;i++){
   const p=queue[i];region.left||=p.x<=4;region.right||=p.x>=9;region.leftExit||=p.x===0;region.rightExit||=p.x===13;
   for(const[a,b]of hexNeighbors(p))if(pass(a,b)&&!regions.has(a+','+b)){regions.set(a+','+b,region);queue.push({x:a,y:b});}
  }
 }
 for(const side of [0,1]){
  const starts=m.tiles.flatMap((r,y)=>r.flatMap((t,x)=>pass(x,y)&&(side===0?x<5:x>8)?[{x,y}]:[]));
  if(starts.length<14){errors.push((side?'右':'左')+'侧部署区至少需要14个可通行格');continue;}
  const blocked=starts.filter(p=>{const r=regions.get(p.x+','+p.y);return side?!r.left||!r.rightExit:!r.right||!r.leftExit;}).length;
  if(blocked)errors.push((side?'右':'左')+'侧有'+blocked+'个部署格无法接敌或撤离');
 }
 return errors;
}
export function validateMapDocument(value,{layout=true}={}){
 if(!fields(value,['format','version','id','name','description','category','terrain','deployment','tiles','roads'])||value.format!=='sango-battle-map'||value.version!==MAP_DOCUMENT_VERSION||!customId(value.id,'custom-map'))throw Error('不是当前版本的战场地图');
 if(!safeText(value.name,50)||!safeText(value.description,300,true))throw Error('地图名称须为1～50字，说明须为1～300字');
 const category=validateMapCategory(value.category);
 if(!Object.hasOwn(MAP_TERRAINS,value.terrain)||!['mixed','naval'].includes(value.deployment))throw Error('地图地形或部署方式无效');
 const structural=mapLayoutErrors(value),gridError=structural.find(e=>e.includes('14×8')||e.includes('道路须'));
 if(gridError||layout&&structural.length)throw Error(gridError||structural.join('；'));
 return {format:'sango-battle-map',version:MAP_DOCUMENT_VERSION,id:value.id,name:value.name.trim(),description:value.description.trim(),category,terrain:value.terrain,deployment:value.deployment,tiles:value.tiles.map(r=>[...r]),roads:value.roads.map(p=>p.map(c=>[...c]))};
}
export const newMapId=()=> 'custom-map:'+crypto.randomUUID();
export function createMapDocument(template=null,category=MAP_CATEGORIES.field){
 return {format:'sango-battle-map',version:MAP_DOCUMENT_VERSION,id:newMapId(),name:template?template.name.slice(0,47)+' 副本':'新建战场',description:template?.description||'自定义战场',category:structuredClone(category),terrain:template?.terrain||mapSceneTerrain(category.scene),deployment:template?.deployment||'mixed',tiles:template?.tiles.map(r=>[...r])||Array.from({length:8},()=>Array(14).fill('land')),roads:structuredClone(template?.roads||[])};
}
export function mapDocumentKey(m){return JSON.stringify(m);}
