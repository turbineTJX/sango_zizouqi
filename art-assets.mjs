// Presentation only. This module must never be imported by the simulation.
import {OFFICER_ART_ASSET_KEYS,OFFICER_ART_SOURCE_KEYS,OFFICER_ART_SOURCE_FALLBACKS,OFFICER_ART_VIEWS,officerArtView,validArtCrop} from './officer-art-scenes.mjs';
import {assetCatalog,applyAssetCatalog} from './asset-catalog.mjs';
const builtin={version:1,id:'builtin',label:'默认图形',portraits:{},criticals:{},troops:{},models:{},effects:{},backgrounds:{}};
const MAX_CACHED_IMAGES=64;
async function readArtJSON(url){
 for(let attempt=0;attempt<2;attempt++)try{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  return response.ok?await response.json():null;
 }catch(error){if(attempt)throw error;await new Promise(resolve=>setTimeout(resolve,250));}
}
export function assetURL(value){return typeof value==='string'&&(/^(?:\.\/|\/)?assets\/officers\/generated\/v[1-9]\d*\/[a-z0-9-]+\/(?:neutral|work|portrait|detail|domestic|inspection|training|diplomacy|command|travel|report|report-concern|battle)\.png$/.test(value)||/^\/local-art\/files\/[a-f0-9]{24}\.(png|jpe?g|webp|glb|obj)$/.test(value))?value:null;}
export function sanitizeOfficerArt(raw){
 if(raw?.version!==1||raw.id!=='original-officers')return {};
 return Object.fromEntries(Object.entries(raw.officers||{}).filter(([id])=>/^[a-z0-9-]+$/.test(id)).map(([id,scenes])=>[id,Object.fromEntries(OFFICER_ART_ASSET_KEYS.flatMap(scene=>{
  const entry=scenes?.[scene],url=assetURL(entry?.url),path=url?.split('/');
  const file=path?.at(-1)?.replace(/\.png$/,''),allowed=file===scene||OFFICER_ART_SOURCE_FALLBACKS[scene]?.includes(file);
  if(entry?.crops&&Object.entries(entry.crops).some(([key,crop])=>!['face','half','full'].includes(key)||!validArtCrop(crop)))return [];
  return url?.startsWith('./assets/officers/generated/')&&path.at(-2)===id&&allowed?[[scene,{url,width:Number.isInteger(entry.width)&&entry.width>0?entry.width:1024,height:Number.isInteger(entry.height)&&entry.height>0?entry.height:1536,format:String(entry.format||''),fit:entry.fit==='contain'?'contain':'cover',transparent:entry.transparent===true,focus:/^\d{1,3}% \d{1,3}%$/.test(entry.focus)?entry.focus:'50% 24%',framing:['full','half','wide','face'].includes(entry.framing)?entry.framing:file==='portrait'?'face':file==='detail'||file==='neutral'||file==='work'||/\/v4\//.test(url)?'full':entry.width>entry.height?'wide':'half',...(entry.crops?{crops:entry.crops}:{}),...(file!==scene?{derivedFrom:file}:{})}]]:[];
 }))]));
}
export function sanitizePack(raw){
 if(raw?.version!==1||raw.id==='builtin')return {...builtin};
 const pack={...builtin,id:'local-playtest',label:'本地试玩美术',animations:raw.animations||{}};
 for(const group of ['portraits','criticals','effects','backgrounds'])pack[group]=Object.fromEntries(Object.entries(raw[group]||{}).flatMap(([key,url])=>assetURL(url)?[[key,url]]:[]));
 pack.models=Object.fromEntries(Object.entries(raw.models||{}).filter(([,m])=>['obj','glb'].includes(m?.format)&&assetURL(m.url)).map(([key,m])=>[key,{...m,texture:assetURL(m.texture)}]));
 if(raw.worldMap?.width===1024&&raw.worldMap?.height===1024){
  const images=Object.fromEntries(Object.entries(raw.worldMap.images||{}).filter(([s,url])=>['spring','summer','autumn','winter'].includes(s)&&assetURL(url)));
  const cities=Object.fromEntries(Object.entries(raw.worldMap.cities||{}).filter(([,p])=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&p.x>=0&&p.y>=0&&p.x<=1024&&p.y<=1024));
  pack.worldMap={images,cities,width:1024,height:1024};
 }
 pack.troops=Object.fromEntries(Object.entries(raw.troops||{}).map(([key,clips])=>[key,Object.fromEntries(Object.entries(clips).filter(([,c])=>assetURL(c?.url)&&Number.isInteger(c.columns)&&c.columns>0&&c.columns<=32&&Number.isInteger(c.rows)&&c.rows>0&&c.rows<=32&&Number.isInteger(c.frames)&&c.frames>0&&c.frames<=c.columns&&c.duration>0))]));
 return pack;
}
export function sampleCurve(keys,time,axis='y'){
 if(!keys?.length)return 0;
 const next=keys.findIndex(k=>k.time>time);if(next===0)return keys[0].value[axis];if(next<0)return keys.at(-1).value[axis];
 const a=keys[next-1],b=keys[next],dt=b.time-a.time,t=(time-a.time)/dt;
 return (2*t**3-3*t*t+1)*a.value[axis]+(t**3-2*t*t+t)*dt*a.outSlope[axis]+(-2*t**3+3*t*t)*b.value[axis]+(t**3-t*t)*dt*b.inSlope[axis];
}
export const art={pack:{...builtin},_officers:{},hasOfficerArt:false,enabled:true,images:new Map(),imageListeners:new Map(),failed:new Set(),cropFrames:new Map(),cropObserver:null,
 get officers(){return this._officers;},
 set officers(value){this._officers=value;this.hasOfficerArt=Object.values(value).some(s=>s.portrait||s.detail||OFFICER_ART_SOURCE_KEYS.some(k=>s[k]));},
 async init({onChange=()=>{}}={}){
  const generation=this.generation=(this.generation||0)+1;
  try{this.enabled=localStorage.getItem('sango-art-mode')!=='builtin';}catch{}
  this.pack={...builtin};this.officers={};this.images.clear();this.imageListeners.clear();this.failed.clear();
  applyAssetCatalog({version:1,id:'none'});
  await Promise.allSettled([
   (async()=>{const raw=await readArtJSON('./local-art/manifest.json');if(raw&&generation===this.generation){const pack=sanitizePack(raw);if(pack.id!=='builtin'){this.pack=pack;onChange('pack');}}})(),
   (async()=>{
    const catalog=await readArtJSON('./assets/manifest.json');
    if(!catalog||generation!==this.generation)return;
    applyAssetCatalog(catalog);onChange('catalog');
    if(!assetCatalog.officers)return;
    const raw=await readArtJSON(assetCatalog.officers);if(raw&&generation===this.generation){this.officers=sanitizeOfficerArt(raw);onChange('officers');}
   })()
  ]);
 },
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('sango-art-mode',this.enabled?'local':'builtin');}catch{}},
 get active(){return this.enabled&&(this.pack.id!=='builtin'||this.hasOfficerArt);},
 resolvePortrait(id,scene='roster'){
  if(!this.active)return null;
  const scenes=Object.hasOwn(this.officers,id)?this.officers[id]:{},key=scene==='roster'?'portrait':scene,source=OFFICER_ART_VIEWS[scene]?.source||scene;
  const oldFace=(scene==='roster'||scene==='portrait')&&scenes.neutral?.derivedFrom&&scenes.portrait;
  const candidates=[...(oldFace?[['portrait',oldFace]]:[]),[source,scenes[source]],['neutral',scenes.neutral],[key,scenes[key]],['portrait',scenes.portrait],['detail',scenes.detail],['legacy',{url:this.pack.portraits[id],fit:'cover',focus:'50% 24%',width:240,height:240}]];
  const found=candidates.find(([,entry])=>assetURL(entry?.url)&&!this.failed.has(entry.url));return found?{...found[1],scene:found[0],view:officerArtView(found[1],found[0],scene)}:null;
 },
 portraitURL(id,scene='roster'){return this.resolvePortrait(id,scene)?.url||null;},
 releaseImageListener(listener){for(const [url,listeners]of this.imageListeners){listeners.delete(listener);if(!listeners.size)this.imageListeners.delete(url);}},
 trimImages(protectedURL){
  for(const [url,img]of this.images){if(this.images.size<=MAX_CACHED_IMAGES)break;if(url!==protectedURL&&img.complete&&!this.imageListeners.has(url))this.images.delete(url);}
 },
 image(url,onReady){
  if(!this.active||!assetURL(url)||this.failed.has(url))return null;
  let img=this.images.get(url);
  if(!img){
   img=new Image();this.images.set(url,img);
   const finish=failed=>{if(this.images.get(url)!==img)return;if(failed)this.failed.add(url);const listeners=this.imageListeners.get(url);this.imageListeners.delete(url);this.trimImages(url);for(const listener of listeners||[])listener();};
   img.onload=()=>finish(false);img.onerror=()=>finish(true);img.src=url;
  }else {this.images.delete(url);this.images.set(url,img);}
  if(img.complete&&img.naturalWidth){this.trimImages(url);return img;}
  if(onReady){if(!this.imageListeners.has(url))this.imageListeners.set(url,new Set());this.imageListeners.get(url).add(onReady);}
  return null;
 },
 decorate(root=document){
  for(const [el] of this.cropFrames)if(!el.isConnected){this.cropObserver?.unobserve(el);this.cropFrames.delete(el);}
  const lobby=root.querySelector('.mode-selection');if(lobby&&this.active&&this.pack.backgrounds.lobby){lobby.style.setProperty('--art-background',`url("${this.pack.backgrounds.lobby}")`);lobby.classList.add('has-art-background');}
  for(const el of root.querySelectorAll('[data-art-portrait]')){
   const scene=el.dataset.artScene||'roster',entry=this.resolvePortrait(el.dataset.artPortrait,scene),url=entry?.url,old=el.querySelector('img[data-officer-art]'),renderKey=url+'|'+scene+'|'+JSON.stringify(entry?.view);
   if(old?.dataset.renderKey===renderKey)continue;
   this.cropObserver?.unobserve(el);this.cropFrames.delete(el);
   if(old){old.remove();el.classList.remove('has-art-portrait');}
   delete el.dataset.artShape;delete el.dataset.artBackground;delete el.dataset.artSource;el.style.removeProperty('--officer-art-aspect');
   if(!url)continue;
   const view=entry.view,ratio=view.width/view.height;
   el.dataset.artShape=view.frame==='full'&&view.reusable?'standee':ratio>1.15?'wide':'portrait';el.dataset.artBackground=view.background;el.dataset.artSource=entry.scene;el.style.setProperty('--officer-art-aspect',`${view.width} / ${view.height}`);
   const img=document.createElement('img');img.alt='';img.loading='lazy';img.dataset.officerArt='';img.dataset.renderKey=renderKey;img.dataset.artFrame=view.frame==='face'?'face':'scene';img.style.objectPosition=entry.focus||'50% 50%';img.style.objectFit=view.reusable?view.fit:scene==='roster'||scene==='portrait'?'cover':entry.fit||'contain';
   const cropped=view.crop.some((v,i)=>v!==[0,0,1,1][i]);
   const layout=()=>{
    if(!cropped)return;
    const width=el.clientWidth,height=el.clientHeight;if(!width||!height)return;
    const scale=(view.fit==='cover'?Math.max:Math.min)(width/view.width,height/view.height),[x,y]=view.crop;
    img.style.inset='auto';img.style.width=entry.width*scale+'px';img.style.height=entry.height*scale+'px';img.style.left=(width-view.width*scale)/2-x*entry.width*scale+'px';img.style.top=(height-view.height*scale)/2-y*entry.height*scale+'px';img.style.objectFit='fill';
   };
   img.src=url;img.onload=()=>{el.classList.add('has-art-portrait');layout();};img.onerror=()=>{this.failed.add(url);img.remove();el.classList.remove('has-art-portrait');this.cropObserver?.unobserve(el);this.cropFrames.delete(el);this.decorate(root);};el.append(img);
   if(cropped){this.cropFrames.set(el,layout);this.cropObserver??=new ResizeObserver(entries=>{for(const {target} of entries)this.cropFrames.get(target)?.();});this.cropObserver.observe(el);layout();}
  }
 }
};
