// Shared presentation contract. Art revisions never enter simulation or saves.
import {publicAssetURL} from './asset-catalog.mjs';
export const MAP_GPU_PROFILE=Object.freeze({tileSize:512,gutter:2,maxLevel:4,atlasSize:1024,artBudget:64*1024*1024,terrainBudget:64*1024*1024});
export function validateMapGPUManifest(raw){
 if(raw?.version!==1||raw.profile?.tileSize!==512||raw.profile?.gutter!==2||!Number.isInteger(raw.profile.maxLevel)||raw.profile.maxLevel<0||raw.profile.maxLevel>6||!/^[a-f0-9]{64}$/.test(raw.revision||''))throw Error('Invalid map texture manifest');
 const files=raw.files;
 if(!files||typeof files!=='object'||Object.keys(files).length>100000)throw Error('Invalid map texture files');
 for(const [url,e]of Object.entries(files))if(!publicAssetURL(url)||!/^[a-f0-9]{64}$/.test(e.sha256||'')||!Number.isInteger(e.width)||e.width<=0||e.width>4096||!Number.isInteger(e.height)||e.height<=0||e.height>4096)throw Error('Invalid map texture: '+url);
 for(const levels of Object.values(raw.terrain||{})){
  if(!Array.isArray(levels)||levels.length!==raw.profile.maxLevel+1)throw Error('Invalid map pyramid');
  levels.forEach((tiles,l)=>{if(tiles.length!==4**l||tiles.some(url=>!files[url]))throw Error('Incomplete map pyramid');});
 }
 for(const frames of Object.values(raw.frames||{}))for(const f of Object.values(frames)){
  const e=files[f.url];if(!e||![f.x,f.y,f.width,f.height].every(Number.isFinite)||f.width<=0||f.height<=0||f.x<0||f.y<0||f.x+f.width>e.width||f.y+f.height>e.height)throw Error('Invalid map atlas frame');
 }
 for(const season of ['spring','summer','autumn','winter'])for(const layer of raw.terrain[season+'/wide']?['wide','close']:['base','landscape','relief','foreground'])if(!raw.terrain[season+'/'+layer])throw Error('Missing map season');
 if(!raw.terrain.roads||!raw.frames.low||!raw.frames.high)throw Error('Missing map atlas');
 return raw;
}
export function mapTileLevel(scale,maxLevel=MAP_GPU_PROFILE.maxLevel){return Math.max(0,Math.min(maxLevel,Math.ceil(Math.log2(Math.max(1,1024*scale/512)))));}
export function mapBudgetedTileLevel(view,scale,layerCount=5,maxLevel=MAP_GPU_PROFILE.maxLevel,budget=MAP_GPU_PROFILE.terrainBudget){
 let level=mapTileLevel(scale,maxLevel);const tileBytes=(512+4)**2*4;
 while(level>0&&(mapVisibleTiles(view,level,12/Math.max(.01,scale)).length+1)*layerCount*tileBytes>budget*.8)level--;
 return level;
}
export function mapVisibleTiles(view,level,margin=0){
 const n=2**level,span=1024/n,out=[];
 for(let y=Math.max(0,Math.floor((view.y-margin)/span));y<=Math.min(n-1,Math.floor((view.y+view.height+margin)/span));y++)for(let x=Math.max(0,Math.floor((view.x-margin)/span));x<=Math.min(n-1,Math.floor((view.x+view.width+margin)/span));x++)out.push({x,y,level,index:y*n+x,span});
 const cx=view.x+view.width/2,cy=view.y+view.height/2;
 return out.sort((a,b)=>Math.hypot((a.x+.5)*span-cx,(a.y+.5)*span-cy)-Math.hypot((b.x+.5)*span-cx,(b.y+.5)*span-cy));
}
