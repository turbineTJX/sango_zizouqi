import * as T from './vendor/three/three.module.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {OBJLoader} from './vendor/three/loaders/OBJLoader.js';
import {hexCenter} from './hex-grid.mjs';
import {terrainAt} from './battlefield.mjs';
import {sampleCurve} from './art-assets.mjs';

export class ModelLayer {
 constructor(board,pack){
  this.board=board;this.pack=pack;this.scene=new T.Scene();this.cache=new Map();this.objects=new Map();this.wanted=new Map();
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.setClearColor(0,0);this.renderer.domElement.className='art-models';this.renderer.domElement.setAttribute('aria-hidden','true');board.prepend(this.renderer.domElement);
  this.camera=new T.OrthographicCamera(0,1,1,0,.1,1000);this.camera.position.z=500;
  this.scene.add(new T.HemisphereLight(0xfff4da,0x657067,2.5));const sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(-100,250,300);this.scene.add(sun);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.board.dataset.modelStatus='fallback';this.board.classList.remove('has-gate-model');this.renderer.domElement.style.display='none';for(const o of this.objects.values())o.root.visible=false;});
 }
 async load(key){
  if(!this.cache.has(key))this.cache.set(key,(async()=>{
   const def=this.pack.models[key];if(!def)return null;let obj;
   if(def.format==='glb')obj=(await new GLTFLoader().loadAsync(def.url)).scene;
   else{
    obj=await new OBJLoader().loadAsync(def.url);const map=def.texture?await new T.TextureLoader().loadAsync(def.texture):null;if(map)map.colorSpace=T.SRGBColorSpace;
    obj.traverse(n=>{if(n.isMesh){const old=Array.isArray(n.material)?n.material:[n.material];old.forEach(m=>m.dispose());n.material=new T.MeshStandardMaterial({map,color:map?0xffffff:0xb6a57c,side:T.DoubleSide,roughness:1});}});
   }
   if(this.dead){dispose(obj);return null;}return obj;
  })().catch(()=>null));return this.cache.get(key);
 }
 update(snapshot){
  if(!snapshot||this.dead||this.failed)return;this.snapshot=snapshot;
  const wanted=new Map(),add=(id,key,x,y,size=1)=>{if(this.pack.models[key])wanted.set(id,{key,x,y,size});};
  const gate=snapshot.gate;if(gate&&gate.hp>0)add('gate',gate.hp<gate.maxHp*.5?'gateDamaged':'gate',gate.x,gate.y,1.4);
  for(let y=0;y<8;y++)for(let x=0;x<14;x++){const ground=terrainAt(snapshot,x,y);if(ground==='bridge'&&y===3)add(`ground-${x}-${y}`,'bridge',x,y,1.1);else if(['forest','hill'].includes(ground)&&(x+y)%3===0)add(`ground-${x}-${y}`,ground,x,y,.65);}
  for(const u of snapshot.units)if(['ship','siege'].includes(u.type)){add('unit-'+u.id,u.type,u.x,u.y,.8);const d=wanted.get('unit-'+u.id);if(d)d.unit=u;}
  this.wanted=wanted;
  for(const [id,o]of this.objects)if(!wanted.has(id)||wanted.get(id).key!==o.key){this.scene.remove(o.root);this.objects.delete(id);}
  for(const [id,def]of wanted){if(this.objects.has(id))continue;this.load(def.key).then(source=>{
   if(!source||this.dead||!this.wanted.has(id)||this.wanted.get(id).key!==def.key||this.objects.has(id))return;
   const model=source.clone(true),tilt=new T.Group(),root=new T.Group();tilt.add(model);tilt.rotation.x=Math.PI/3;root.add(tilt);
   const box=new T.Box3().setFromObject(tilt),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());tilt.position.sub(center);
   this.scene.add(root);this.objects.set(id,{root,tilt,key:def.key,width:size.x,height:size.y});this.board.dataset.modelStatus='ready';this.board.dataset.modelCount=String(this.objects.size);
  });}
 }
 hasUnit(id){return !this.failed&&this.objects.has('unit-'+id);}
 draw(clock){
  if(this.dead||this.failed)return;const w=this.board.clientWidth,h=this.board.clientHeight;if(!w||!h)return;
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.right=w;this.camera.top=h;this.camera.updateProjectionMatrix();}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const [id,obj]of this.objects){const d=this.wanted.get(id);if(!d)continue;let p=hexCenter(d.x,d.y);const u=d.unit,moving=u?.moveAt!==undefined&&clock-u.moveAt<.24;
   if(moving&&u.from&&!reduced){const t=Math.max(0,Math.min(1,(clock-u.moveAt)/.24));p={x:u.from.x+(p.x-u.from.x)*t,y:u.from.y+(p.y-u.from.y)*t};}
   const scale=Math.min(w/14.5/obj.width,h/6.25/obj.height)*d.size;obj.root.scale.setScalar(scale);obj.root.position.set(p.x*w,h-p.y*h+h/6.25*.12,0);
   const curve=this.pack.animations?.move;obj.root.rotation.z=0;
   if(moving&&curve&&!reduced)obj.root.position.y+=sampleCurve(curve.keys,clock%curve.duration)*h/6.25*.4;
   if(u?.attackAt!==undefined&&clock-u.attackAt<.65&&!reduced)obj.root.rotation.z=Math.sin((clock-u.attackAt)/.65*Math.PI)*.09;
  }
  this.board.classList.toggle('has-gate-model',this.objects.has('gate'));
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){this.dead=true;for(const promise of this.cache.values())promise.then(obj=>{if(obj)dispose(obj);});this.objects.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
function dispose(obj){const geometries=new Set(),materials=new Set(),textures=new Set();obj.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}
