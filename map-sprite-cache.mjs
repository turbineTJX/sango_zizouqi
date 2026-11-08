// Retained entity sprites: static roofs/ground/buildings are raster resources,
// while hit shapes, worksite animations, labels and portraits stay live.
// Keys contain only the already projected, legally visible model and season.
import {TOWN_FRAME} from './town-art.mjs';
const ns='http://www.w3.org/2000/svg',cache=new Map(),resources=new Map(),inflight=new Map();
export const MAP_SPRITE_BUDGET=64*1024*1024;
let bytes=0;
const dynamic='.city-officers,.city-site-labels,.city-scaffold,.town-activity';
const retain=dynamic+',.map-building-hit,.city-district-hit,title';
const idle=callback=>globalThis.requestIdleCallback?requestIdleCallback(callback):setTimeout(callback,0);
const cancelIdle=id=>globalThis.cancelIdleCallback?cancelIdleCallback(id):clearTimeout(id);
const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
const resource=href=>{
 if(!resources.has(href))resources.set(href,fetch(href).then(r=>{if(!r.ok)throw Error('Map sprite resource failed');return r.blob();}).then(dataURL).catch(e=>{resources.delete(href);throw e;}));
 return resources.get(href);
};
function trim(){
 for(const [key,entry]of cache){
  if(bytes<=MAP_SPRITE_BUDGET)break;if(entry.users.size)continue;
  cache.delete(key);bytes-=entry.bytes;URL.revokeObjectURL(entry.url);
 }
}
export function mapSpriteResolution(screenPixels){
 return Math.max(128,Math.min(1024,2**Math.ceil(Math.log2(Math.max(1,screenPixels)))));
}
export function mapSpriteCacheStats(){return {bytes,entries:cache.size,budget:MAP_SPRITE_BUDGET};}
export function prepareMapSprites(svg){
 const states=new Map(),queue=new Map(),waiters=new Set();let scheduled=0,running=false,moving=false,disposed=false,builds=0;
 const quiet=()=>new Promise(resolve=>{if(disposed)resolve(false);else if(moving)waiters.add(resolve);else idle(()=>{if(disposed)resolve(false);else if(moving)waiters.add(resolve);else resolve(true);});});
 const css=[...document.styleSheets].filter(s=>s.href?.endsWith('/city-scene.css')).flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText);}catch{return [];}}).join('\n');
 const bounds={x:-TOWN_FRAME.width*.7,y:-TOWN_FRAME.height*1.4*.53,width:TOWN_FRAME.width*1.4,height:TOWN_FRAME.height*1.4};
 const thin=node=>{
  const shell=node.cloneNode(false);
  for(const child of [...node.children]){
   if(child.matches(retain))shell.append(child);
   else if(child.querySelector(retain))shell.append(thin(child));
  }
  return shell;
 };
 const attach=(state,entry)=>{
  if(disposed||!state.node.isConnected||state.entry===entry)return;
  state.entry?.users.delete(state);entry.users.add(state);state.entry=entry;
  if(!state.sprite){
   const overlay=thin(state.node);state.original=[...state.node.childNodes];
   const sprite=state.sprite=document.createElementNS(ns,'image');
   for(const [key,value]of Object.entries({...bounds,'pointer-events':'none','data-map-sprite':''}))sprite.setAttribute(key,value);
   state.node.replaceChildren(sprite,...overlay.childNodes);state.onChange?.();
  }
  state.sprite.setAttribute('href',entry.url);state.sprite.dataset.resolution=entry.size;
  cache.delete(entry.key);cache.set(entry.key,entry);trim();
 };
 const release=state=>{
  state.entry?.users.delete(state);state.entry=null;
  if(state.sprite){state.node.replaceChildren(...state.copy.cloneNode(true).childNodes);state.sprite=null;state.original=null;state.onChange?.();}
 };
 const build=async(state,size,key)=>{
  const copy=state.art.cloneNode(true);
  const hrefs=[...new Set([...copy.querySelectorAll('image[href]')].map(n=>n.getAttribute('href')).filter(h=>!h.startsWith('data:')))];
  const resolved=new Map(await Promise.all(hrefs.map(async h=>[h,await resource(h)])));
  const defs=document.createElementNS(ns,'defs');copy.prepend(defs);const definitions=new Map();
  for(const image of [...copy.querySelectorAll('image[href]')]){
   const href=image.getAttribute('href');if(!resolved.has(href))continue;
   // <use x/y> introduces a local translation for a user-space mask. Keep
   // masked geometry as an image so town-ground fades stay at their real site.
   if(['mask','clip-path','filter'].some(name=>image.hasAttribute(name))){image.setAttribute('href',resolved.get(href));continue;}
   const geometry=['width','height','preserveAspectRatio'].map(k=>image.getAttribute(k)),idKey=JSON.stringify([href,...geometry]);
   let id=definitions.get(idKey);
   if(!id){id='sprite-resource-'+definitions.size;definitions.set(idKey,id);const d=document.createElementNS(ns,'image');d.id=id;d.setAttribute('href',resolved.get(href));['width','height','preserveAspectRatio'].forEach((k,i)=>{if(geometry[i]!==null)d.setAttribute(k,geometry[i]);});defs.append(d);}
   const use=document.createElementNS(ns,'use');for(const a of image.attributes)if(a.name!=='href')use.setAttribute(a.name,a.value);use.setAttribute('href','#'+id);image.replaceWith(use);
  }
  const height=Math.ceil(size*bounds.height/bounds.width),source=new Image();
  source.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="${ns}" class="strategy-world national-world" width="${size}" height="${height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"><style>${css}</style>${new XMLSerializer().serializeToString(copy)}</svg>`);
  await source.decode();if(!await quiet())return;
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=height;canvas.getContext('2d').drawImage(source,0,0,size,height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));canvas.width=canvas.height=0;if(disposed||!blob)return;
  const url=URL.createObjectURL(blob),image=new Image();image.src=url;
  try{await image.decode();}catch(e){URL.revokeObjectURL(url);throw e;}
  if(disposed){URL.revokeObjectURL(url);return;}
  const entry={key,url,size,bytes:size*height*4,users:new Set()};cache.set(key,entry);bytes+=entry.bytes;builds++;
  trim();return cache.get(key);
 };
 const schedule=()=>{
  svg.dataset.mapSpritePending=String(queue.size+(running?1:0));
  if(disposed||moving||scheduled||running||!queue.size)return;
  scheduled=idle(async()=>{
   scheduled=0;if(disposed||moving||!queue.size)return;const [state,job]=queue.entries().next().value;queue.delete(state);
   if(!state.node.isConnected){schedule();return;}
   running=true;
   try{
    while(inflight.has(job.key)){await inflight.get(job.key);if(disposed)return;}
    let entry=cache.get(job.key);
    if(!entry){const task=build(state,job.size,job.key);inflight.set(job.key,task);try{entry=await task;}finally{if(inflight.get(job.key)===task)inflight.delete(job.key);}}
    if(entry&&!moving&&state.wanted===job.key)attach(state,entry);
   }
   catch(e){if(!disposed)svg.dataset.mapSpriteError=e?.message||String(e);}
   finally{running=false;svg.dataset.mapSpriteBuilds=String(builds);svg.dataset.mapSpritePending=String(queue.size);trim();schedule();}
  });
 };
 return {
  pause(){moving=true;if(scheduled){cancelIdle(scheduled);scheduled=0;}},
  register(node,key,onChange){
   if(!node||states.has(node))return;
   const copy=node.cloneNode(true);copy.removeAttribute('transform');copy.removeAttribute('style');copy.style.cssText='opacity:1!important;filter:none!important;display:inline!important';
   const art=copy.cloneNode(true);art.querySelectorAll(dynamic+',title,.map-building-hit,.city-district-hit').forEach(n=>n.remove());
   for(const element of [art,...art.querySelectorAll('*')])for(const attribute of [...element.attributes])if(attribute.name.startsWith('data-')||['aria-label','role','tabindex'].includes(attribute.name))element.removeAttribute(attribute.name);
   states.set(node,{node,key:key+'|'+art.innerHTML,copy,art,onChange,entry:null,original:null,sprite:null,wanted:null,priority:0,distance:0});
  },
  update(view,scale,active){
   moving=active;if(moving&&scheduled){cancelIdle(scheduled);scheduled=0;}
   if(!moving){for(const resolve of waiters)resolve(!disposed);waiters.clear();}
   for(const state of states.values()){
    const parent=state.node.closest('[data-x][data-y]'),x=+parent?.dataset.x,y=+parent?.dataset.y;
    const scene=state.node.closest('.map-city-scene');
    const visible=state.node.isConnected&&x>=view.x-40&&x<=view.x+view.width+40&&y>=view.y-40&&y<=view.y+view.height+40&&parent.style.display!=='none'&&state.node.style.display!=='none'&&state.node.style.opacity!=='0'&&scene?.style.display!=='none';
    if(!visible){queue.delete(state);release(state);continue;}
    const modelScale=state.node.classList.contains('map-city-model')?+(state.node.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1]||1):+(parent.querySelector('.map-city-model')?.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1]||1);
    state.priority=Number(parent.classList.contains('selected'));state.distance=Math.hypot(x-view.x-view.width/2,y-view.y-view.height/2);
    const size=Math.max(state.priority?512:128,mapSpriteResolution(bounds.width*modelScale*scale)),key=state.key+'|'+size;state.wanted=key;
    const entry=cache.get(key);if(entry){if(!moving)attach(state,entry);queue.delete(state);}else if(!moving)queue.set(state,{size,key});
   }
   const jobs=[...queue].sort(([a],[b])=>b.priority-a.priority||a.distance-b.distance);queue.clear();for(const [state,job]of jobs)queue.set(state,job);
   svg.dataset.mapSpriteBuilds=String(builds);schedule();
  },
  destroy(){
   disposed=true;if(scheduled)cancelIdle(scheduled);queue.clear();for(const resolve of waiters)resolve(false);waiters.clear();
   for(const state of states.values())release(state);
   states.clear();trim();
  }
 };
}
