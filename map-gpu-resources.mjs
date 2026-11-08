import {ImageSource,Texture} from './vendor/pixi/pixi.mjs';
import {MAP_GPU_PROFILE} from './map-gpu-assets.mjs';
export class MapGPUResources{
 constructor(renderer,manifest,onChange){
  Object.assign(this,{renderer,manifest,onChange,entries:new Map(),pending:new Map(),ready:[],sequence:0,active:0,disposed:false,pins:new Set(),wanted:new Set(),bytes:{art:0,terrain:0},uploads:0,uploadMaxMs:0,errors:0});
  this.worker=new Worker(new URL('./map-texture-worker.mjs',import.meta.url),{type:'module'});
  this.artURLs=new Set(Object.values(manifest.frames).flatMap(frames=>Object.values(frames).map(frame=>frame.url)));
  this.worker.onmessage=({data:m})=>{const job=this.pending.get(m.id);if(!job){m.bitmap?.close();return;}this.pending.delete(m.id);this.active--;if(this.disposed){m.bitmap?.close();return;}if(m.error){job.state='error';this.errors++;}else if(m.bitmap.width!==job.meta.width||m.bitmap.height!==job.meta.height){m.bitmap.close();job.state='error';this.errors++;}else{job.bitmap=m.bitmap;job.state='ready';this.ready.push(job);}if(job.state==='error'&&job.priority<0)this.onError?.(Error(m.error||'Invalid map texture dimensions'));this.onChange();this.pump();};
  this.worker.onerror=()=>{this.errors++;this.onError?.(Error('Map texture decoder failed'));};
 }
 request(url,priority=10){
  if(!url||this.disposed)return;
  this.wanted.add(url);
  let e=this.entries.get(url);if(e){e.used=performance.now();e.priority=priority;if(e.state==='deferred'&&e.retryAfter<performance.now())e.state='queued';return e.texture;}
  const meta=this.manifest.files[url];if(!meta)throw Error('Undeclared map texture');
  const kind=this.artURLs.has(url)?'art':'terrain';e={url,meta,kind,size:meta.width*meta.height*4*(kind==='art'?4/3:1),priority,used:performance.now(),state:'queued'};this.entries.set(url,e);this.pump();return null;
 }
 get(url){const e=this.entries.get(url);if(e?.texture){e.used=performance.now();return e.texture;}return null;}
 pin(url){this.pins.add(url);}
 beginFrame(){this.pins.clear();this.wanted.clear();}
 endFrame(){
  for(const e of this.entries.values())if(!this.wanted.has(e.url)&&!e.texture){
   if(e.state==='decoding'){this.worker.postMessage({cancel:true,id:e.id});this.pending.delete(e.id);this.active--;}
   if(e.bitmap){e.bitmap.close();this.ready=this.ready.filter(job=>job!==e);}
   this.entries.delete(e.url);
  }
 }
 pump(){
  if(this.disposed)return;
  while(this.active+this.ready.length<2){const e=[...this.entries.values()].filter(e=>e.state==='queued').sort((a,b)=>a.priority-b.priority||b.used-a.used)[0];if(!e)break;const id=++this.sequence;e.state='decoding';e.id=id;this.active++;this.pending.set(id,e);this.worker.postMessage({id,url:new URL(e.url,document.baseURI).href,sha256:e.meta.sha256});}
 }
 trim(kind,required=0){
  const limit=kind==='art'?MAP_GPU_PROFILE.artBudget:MAP_GPU_PROFILE.terrainBudget;
  for(const e of [...this.entries.values()].filter(e=>e.kind===kind&&e.texture&&!this.pins.has(e.url)).sort((a,b)=>a.used-b.used)){
   if(this.bytes[kind]+required<=limit)break;this.entries.delete(e.url);this.bytes[kind]-=e.size;e.texture.destroy(true);e.bitmap.close();
  }
  return this.bytes[kind]+required<=limit;
 }
 drain(){
  if(this.disposed)return false;
  const e=this.ready.sort((a,b)=>a.priority-b.priority).shift();if(!e){this.pump();return false;}
  if(!this.trim(e.kind,e.size)){e.bitmap.close();delete e.bitmap;e.state='deferred';e.retryAfter=performance.now()+1000;this.pump();return false;}
  const start=performance.now();
  const source=new ImageSource({resource:e.bitmap,alphaMode:'premultiplied-alpha',autoGenerateMipmaps:e.kind==='art',scaleMode:'linear',autoGarbageCollect:false});
  source.autoGarbageCollect=false;e.texture=new Texture({source});this.renderer.texture.bind(source); // Pay one bounded upload before drawing it.
  e.state='resident';this.bytes[e.kind]+=e.size;this.uploads++;this.uploadMaxMs=Math.max(this.uploadMaxMs,performance.now()-start);this.pump();return true;
 }
 get busy(){return this.active>0||this.ready.length>0||[...this.entries.values()].some(e=>e.state==='queued');}
 get stats(){return {artBytes:this.bytes.art,terrainBytes:this.bytes.terrain,decodedQueueBytes:this.ready.reduce((n,e)=>n+e.meta.width*e.meta.height*4,0),pending:this.pending.size+this.ready.length,queued:[...this.entries.values()].filter(e=>e.state==='queued').length,deferred:[...this.entries.values()].filter(e=>e.state==='deferred').length,uploads:this.uploads,uploadMaxMs:this.uploadMaxMs,errors:this.errors};}
 destroy(){this.disposed=true;this.worker.terminate();for(const e of this.entries.values()){e.texture?.destroy(true);e.bitmap?.close();}this.entries.clear();this.ready=[];this.pending.clear();}
}
