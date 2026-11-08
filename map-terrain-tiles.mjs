// Static geography is a texture pyramid. The whole-world bitmap is a permanent
// parent level; only visible higher-resolution tiles are requested and retained.
const ns='http://www.w3.org/2000/svg',TILE_PIXELS=512,GUTTER=2;
export const MAP_TERRAIN_TILE_BUDGET=64*1024*1024;
export function terrainTilePlan(view,scale,layerCount=4){
 if(scale<=2)return [];
 let level=Math.min(6,Math.max(1,Math.ceil(Math.log2(1024*scale/TILE_PIXELS))));
 const plan=level=>{
  const span=1024/2**level,tiles=[];
  for(let y=Math.max(0,Math.floor(view.y/span));y<Math.min(2**level,Math.ceil((view.y+view.height)/span));y++)
   for(let x=Math.max(0,Math.floor(view.x/span));x<Math.min(2**level,Math.ceil((view.x+view.width)/span));x++)tiles.push({level,x,y,span});
  return tiles;
 };
 while(level>0&&plan(level).length*layerCount*(TILE_PIXELS+GUTTER*2)**2*4>MAP_TERRAIN_TILE_BUDGET)level--;
 const cx=view.x+view.width/2,cy=view.y+view.height/2;
 return plan(level).sort((a,b)=>Math.hypot((a.x+.5)*a.span-cx,(a.y+.5)*a.span-cy)-Math.hypot((b.x+.5)*b.span-cx,(b.y+.5)*b.span-cy));
}
const cache={entries:new Map(),pending:new Map(),bytes:0,builds:0},groups=new WeakMap();let nextGroup=0,nextController=0;
const idle=cb=>globalThis.requestIdleCallback?requestIdleCallback(cb):setTimeout(cb,0);
const cancelIdle=id=>globalThis.cancelIdleCallback?cancelIdleCallback(id):clearTimeout(id);
export function prepareTerrainTiles(terrain,layers){
 if(!groups.has(layers))groups.set(layers,++nextGroup);const group=groups.get(layers);
 const parents=layers.map(layer=>terrain.querySelector('.'+layer.cls)),attached=new Map();
 const controller=++nextController,clips=parents.map((parent,i)=>{
  const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),path=document.createElementNS(ns,'path'),id='terrain-parent-'+controller+'-'+i;
  clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');path.setAttribute('clip-rule','evenodd');path.setAttribute('d','M0 0H1024V1024H0Z');clip.append(path);defs.append(clip);parent.prepend(defs);
  const image=parent.querySelector('[data-map-terrain-base]');image.setAttribute('clip-path','url(#'+id+')');return {defs,path,image};
 });
 const updateParent=layer=>{
  const holes=[...attached.values()].filter(v=>v.entry.layer===layer).map(({entry:e})=>`M${e.coreX} ${e.coreY}h${e.coreSpan}v${e.coreSpan}h${-e.coreSpan}Z`).join('');
  clips[layer].path.setAttribute('d','M0 0H1024V1024H0Z'+holes);
 };
 let desired=new Set(),queue=[],scheduled=0,running=false,moving=false,disposed=false;const waiters=new Set();
 const quiet=()=>new Promise(resolve=>{if(disposed)resolve(false);else if(moving)waiters.add(resolve);else idle(()=>{if(disposed)resolve(false);else if(moving)waiters.add(resolve);else resolve(true);});});
 const stats=()=>{terrain.dataset.tileBytes=String(cache.bytes);terrain.dataset.tileBuilds=String(cache.builds);terrain.dataset.tilePending=String(queue.length+(running?1:0));};
 const trim=()=>{
  for(const [key,entry]of cache.entries){if(cache.bytes<=MAP_TERRAIN_TILE_BUDGET)break;if(entry.users)continue;cache.entries.delete(key);cache.bytes-=entry.bytes;URL.revokeObjectURL(entry.url);}
 };
 const attach=(key,entry)=>{
  if(disposed||!desired.has(key)||attached.has(key))return;
  const holder=document.createElementNS(ns,'g'),defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect'),image=document.createElementNS(ns,'image'),id='terrain-core-'+controller+'-'+key.replaceAll(':','-');
  holder.dataset.terrainTile=key;clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');for(const [k,v]of Object.entries({x:entry.coreX,y:entry.coreY,width:entry.coreSpan,height:entry.coreSpan}))rect.setAttribute(k,v);clip.append(rect);defs.append(clip);holder.append(defs,image);image.setAttribute('clip-path','url(#'+id+')');
  for(const [k,v]of Object.entries({x:entry.x,y:entry.y,width:entry.span,height:entry.span,href:entry.url,'pointer-events':'none'}))image.setAttribute(k,v);
  parents[entry.layer].append(holder);attached.set(key,{image:holder,entry});entry.users++;updateParent(entry.layer);
  cache.entries.delete(key);cache.entries.set(key,entry);
 };
 const schedule=()=>{
  if(disposed||moving||scheduled||running||!queue.length){stats();return;}
  scheduled=idle(async()=>{
   scheduled=0;if(disposed||moving)return;
   const job=queue.shift();if(!job||!desired.has(job.key)){schedule();return;}
   if(cache.pending.has(job.key)){
    running=true;stats();await cache.pending.get(job.key);running=false;
    const entry=cache.entries.get(job.key);if(entry&&!moving)attach(job.key,entry);else if(!entry&&!disposed)queue.push(job);schedule();return;
   }
   if(cache.entries.has(job.key)){attach(job.key,cache.entries.get(job.key));schedule();return;}
   running=true;stats();let complete;const task=new Promise(resolve=>{complete=resolve;});cache.pending.set(job.key,task);
   try{
    const pad=GUTTER*job.span/TILE_PIXELS,x=job.x*job.span-pad,y=job.y*job.span-pad,span=job.span+pad*2,size=TILE_PIXELS+GUTTER*2;
    const source=decodeURIComponent(layers[job.layer].url.split(',').slice(1).join(','))
     .replace('width="1024" height="1024" viewBox="0 0 1024 1024"',`width="${size}" height="${size}" viewBox="${x} ${y} ${span} ${span}"`);
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);await image.decode();
    if(!await quiet())return;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(image,0,0,size,size);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve));canvas.width=canvas.height=0;if(disposed||!blob)return;
    const url=URL.createObjectURL(blob),decoded=new Image();decoded.src=url;try{await decoded.decode();}catch(error){URL.revokeObjectURL(url);throw error;}if(disposed){URL.revokeObjectURL(url);return;}
    const entry={url,x,y,span,coreX:job.x*job.span,coreY:job.y*job.span,coreSpan:job.span,layer:job.layer,bytes:size*size*4,users:0};cache.entries.set(job.key,entry);cache.bytes+=entry.bytes;cache.builds++;
    trim();if(!moving&&cache.entries.has(job.key))attach(job.key,entry);
   }catch(error){if(!disposed)terrain.dataset.tileError=error?.message||String(error);}
   finally{cache.pending.delete(job.key);complete();running=false;stats();schedule();}
  });
 };
 return {
  update(view,scale,active){
   moving=active;if(moving){if(scheduled){cancelIdle(scheduled);scheduled=0;}return;}
   for(const resolve of waiters)resolve(!disposed);waiters.clear();
   const tiles=terrainTilePlan(view,scale,layers.length),jobs=tiles.flatMap(tile=>layers.map((_,layer)=>({...tile,layer,key:group+':'+layer+':'+tile.level+':'+tile.x+':'+tile.y})));
   desired=new Set(jobs.map(job=>job.key));
   for(const [key,{image,entry}]of attached)if(!desired.has(key)){image.remove();entry.users--;attached.delete(key);updateParent(entry.layer);}
   queue=[];for(const job of jobs){const entry=cache.entries.get(job.key);if(entry)attach(job.key,entry);else queue.push(job);}
   trim();stats();schedule();
  },
  destroy(){disposed=true;if(scheduled)cancelIdle(scheduled);queue=[];for(const resolve of waiters)resolve(false);waiters.clear();for(const {image,entry}of attached.values()){image.remove();entry.users--;}attached.clear();for(const c of clips){c.image.removeAttribute('clip-path');c.defs.remove();}trim();}
 };
}
