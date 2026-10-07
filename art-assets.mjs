// Presentation only. This module must never be imported by the simulation.
import {OFFICER_ART_KEYS} from './officer-art-scenes.mjs';
const builtin={version:1,id:'builtin',label:'默认图形',portraits:{},criticals:{},troops:{},models:{},effects:{},backgrounds:{}};
export function assetURL(value){return typeof value==='string'&&(/^(?:\.\/|\/)?assets\/officers\/generated\/v[123]\/[a-z0-9-]+\/(?:portrait|detail|domestic|inspection|training|diplomacy|command|travel|report|report-concern|battle)\.png$/.test(value)||/^\/local-art\/files\/[a-f0-9]{24}\.(png|jpe?g|webp|glb|obj)$/.test(value))?value:null;}
export function sanitizeOfficerArt(raw){
 if(raw?.version!==1||raw.id!=='original-officers')return {};
 return Object.fromEntries(Object.entries(raw.officers||{}).filter(([id])=>/^[a-z0-9-]+$/.test(id)).map(([id,scenes])=>[id,Object.fromEntries(OFFICER_ART_KEYS.flatMap(scene=>{
  const entry=scenes?.[scene],url=assetURL(entry?.url),expected=[1,2,3].map(v=>`./assets/officers/generated/v${v}/${id}/${scene}.png`);
  return expected.includes(url)?[[scene,{url,width:Number.isInteger(entry.width)?entry.width:1024,height:Number.isInteger(entry.height)?entry.height:1536,format:String(entry.format||''),fit:entry.fit==='contain'?'contain':'cover',transparent:entry.transparent===true,focus:/^\d{1,3}% \d{1,3}%$/.test(entry.focus)?entry.focus:'50% 24%'}]]:[];
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
export const art={pack:{...builtin},officers:{},enabled:true,images:new Map(),failed:new Set(),
 async init(){
  try{this.enabled=localStorage.getItem('sango-art-mode')!=='builtin';}catch{}
  await Promise.allSettled([
   (async()=>{const r=await fetch('./local-art/manifest.json',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(r.ok)this.pack=sanitizePack(await r.json());})(),
   (async()=>{const r=await fetch('./assets/officers/manifest.json',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(r.ok)this.officers=sanitizeOfficerArt(await r.json());})()
  ]);
 },
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('sango-art-mode',this.enabled?'local':'builtin');}catch{}},
 get active(){return this.enabled&&(this.pack.id!=='builtin'||Object.values(this.officers).some(s=>s.portrait||s.detail));},
 resolvePortrait(id,scene='roster'){
  if(!this.active)return null;
  const scenes=Object.hasOwn(this.officers,id)?this.officers[id]:{},key=scene==='roster'?'portrait':scene;
  const candidates=[[key,scenes[key]],['portrait',scenes.portrait],['detail',scenes.detail],['legacy',{url:this.pack.portraits[id],fit:'cover',focus:'50% 24%',width:240,height:240}]];
  const found=candidates.find(([,entry])=>assetURL(entry?.url)&&!this.failed.has(entry.url));return found?{...found[1],scene:found[0]}:null;
 },
 portraitURL(id,scene='roster'){return this.resolvePortrait(id,scene)?.url||null;},
 image(url){
  if(!this.active||!assetURL(url)||this.failed.has(url))return null;
  if(!this.images.has(url)){const img=new Image();img.onload=()=>{};img.onerror=()=>{this.failed.add(url);};img.src=url;this.images.set(url,img);}
  const img=this.images.get(url);return img.complete&&img.naturalWidth?img:null;
 },
 decorate(root=document){
  const lobby=root.querySelector('.mode-selection');if(lobby&&this.active&&this.pack.backgrounds.lobby){lobby.style.setProperty('--art-background',`url("${this.pack.backgrounds.lobby}")`);lobby.classList.add('has-art-background');}
  for(const el of root.querySelectorAll('[data-art-portrait]')){
   const scene=el.dataset.artScene||'roster',entry=this.resolvePortrait(el.dataset.artPortrait,scene),url=entry?.url,old=el.querySelector('img[data-officer-art]');
   if(old&&old.getAttribute('src')===url)continue;
   if(old){old.remove();el.classList.remove('has-art-portrait');delete el.dataset.artShape;el.style.removeProperty('--officer-art-aspect');}
   if(!url){delete el.dataset.artShape;el.style.removeProperty('--officer-art-aspect');continue;}
   el.dataset.artShape=entry.width/entry.height>1.15?'wide':entry.width/entry.height<.5?'standee':'portrait';el.style.setProperty('--officer-art-aspect',`${entry.width} / ${entry.height}`);
   const img=document.createElement('img');img.alt='';img.loading='lazy';img.dataset.officerArt='';img.dataset.artFrame=scene==='roster'||scene==='portrait'?'face':'scene';img.style.objectPosition=entry.focus||'50% 50%';img.style.objectFit=scene==='roster'||scene==='portrait'?'cover':entry.fit||'contain';img.src=url;img.onload=()=>el.classList.add('has-art-portrait');img.onerror=()=>{this.failed.add(url);img.remove();el.classList.remove('has-art-portrait');this.decorate(root);};el.append(img);
  }
 }
};
