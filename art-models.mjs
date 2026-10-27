import {combatFamily} from './troop-equipment.mjs';
import {NativeModelBatches} from './native-model-batches.mjs';
import * as T from './vendor/three/three.module.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {OBJLoader} from './vendor/three/loaders/OBJLoader.js';
import {hexCenter} from './hex-grid.mjs';
import {terrainAt} from './battlefield.mjs';
import {sampleCurve} from './art-assets.mjs';
import {unitModelKey} from './unit-appearance.mjs';
import {createSiegeModel} from './art-siege-models.mjs';
import {castPose,unitCastAction} from './battle-cast-animation.mjs';
import {actionImpacts,feedbackReaction} from './battle-feedback.mjs';
import {unitStatusMotion} from './battle-unit-motion.mjs';
import {createTroopModel,animateTroopModel,troopModelAnchors} from './art-troop-models.mjs';
const hitWhite=new T.Color(0xffffff);

export class ModelLayer {
 constructor(board,pack){
  this.board=board;this.pack=pack;this.scene=new T.Scene();this.cache=new Map();this.objects=new Map();this.wanted=new Map();this.batches=new NativeModelBatches(this.scene);this.scene.matrixWorldAutoUpdate=false;
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.renderer.domElement.className='art-models';this.renderer.domElement.setAttribute('aria-hidden','true');board.prepend(this.renderer.domElement);
  this.camera=new T.OrthographicCamera(0,1,1,0,.1,1000);this.camera.position.z=500;
  this.scene.add(new T.HemisphereLight(0xf5eedb,0x555f4b,2));const sun=new T.DirectionalLight(0xffeed4,3);sun.position.set(-100,250,300);this.scene.add(sun);
  const fill=new T.DirectionalLight(0xb9cbd1,.8);fill.position.set(200,60,-100);this.scene.add(fill);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.board.dataset.modelStatus='fallback';this.board.classList.remove('has-gate-model');this.renderer.domElement.style.display='none';for(const o of this.objects.values())o.root.visible=false;});
  this.measure=()=>{this.viewport={w:board.clientWidth,h:board.clientHeight,compact:(board.parentElement?.clientWidth||board.clientWidth)<600};this.onChange?.();};
  this.resize=new ResizeObserver(this.measure);this.resize.observe(board);if(board.parentElement)this.resize.observe(board.parentElement);this.measure();
 }
 async load(key){
  if(!this.cache.has(key))this.cache.set(key,(async()=>{
   if(key.startsWith('builtin:troop:')){const [, ,type,side]=key.split(':'),model=createTroopModel(type,Number(side));await this.batches.prepare(model,()=>this.dead);if(this.dead){dispose(model);return null;}return model;}
   if(key.startsWith('builtin:'))return createSiegeModel(key.slice(8));
   const def=this.pack.models[key];if(!def)return null;let obj;
   if(def.format==='glb'){const gltf=await new GLTFLoader().loadAsync(def.url);obj=gltf.scene;obj.animations=gltf.animations;}
   else{
    obj=await new OBJLoader().loadAsync(def.url);const map=def.texture?await new T.TextureLoader().loadAsync(def.texture):null;if(map)map.colorSpace=T.SRGBColorSpace;
    obj.traverse(n=>{if(n.isMesh){const old=Array.isArray(n.material)?n.material:[n.material];old.forEach(m=>m.dispose());n.material=new T.MeshStandardMaterial({map,color:map?0xffffff:0xb6a57c,side:T.DoubleSide,roughness:1});}});
   }
   if(this.dead){dispose(obj);return null;}return obj;
  })().catch(()=>null));return this.cache.get(key);
 }
 update(snapshot){
  if(!snapshot||this.dead||this.failed)return;this.snapshot=snapshot;
  const wanted=new Map(),add=(id,key,x,y,size=1)=>{if(key&&(key.startsWith('builtin:')||this.pack.models[key]))wanted.set(id,{key,x,y,size});};
  // The continuous environment already paints vegetation, slopes, bridges and
  // actual building markers. Do not place the former low-detail props over it.
  if(!this.board.querySelector?.('.battle-environment')){
   const gate=snapshot.gate;if(gate&&gate.hp>0)add('gate',gate.hp<gate.maxHp*.5?'gateDamaged':'gate',gate.x,gate.y,1.4);
   for(let y=0;y<8;y++)for(let x=0;x<14;x++){const ground=terrainAt(snapshot,x,y);if(ground==='bridge'&&y===3)add(`ground-${x}-${y}`,'bridge',x,y,1.1);else if(['forest','hill'].includes(ground)&&(x+y)%3===0)add(`ground-${x}-${y}`,ground,x,y,.65);}
  }
  for(const u of snapshot.units){const key=unitModelKey(this.pack,u);add('unit-'+u.id,key,u.x,u.y,key?.startsWith('builtin:troop:')?1.03:.8);const d=wanted.get('unit-'+u.id);if(d)d.unit=u;}
  this.wanted=wanted;
  for(const [id,o]of this.objects)if(!wanted.has(id)||wanted.get(id).key!==o.key){this.scene.remove(o.root);o.flashMaterials?.forEach(m=>m.material.dispose());this.objects.delete(id);}
  for(const [id,def]of wanted){if(this.objects.has(id))continue;this.load(def.key).then(source=>{
   if(!source||this.dead||!this.wanted.has(id)||this.wanted.get(id).key!==def.key||this.objects.has(id))return;
   const model=cloneAnimatedModel(source),tilt=new T.Group(),root=new T.Group();tilt.add(model);tilt.rotation.x=model.userData.nativeTroop?.62:Math.PI/3;root.add(tilt);
   const flashMaterials=[],copies=new Map(),copy=m=>{
    if(copies.has(m))return copies.get(m);const material=m.clone();copies.set(m,material);flashMaterials.push({material,color:material.color?.clone(),emissive:material.emissive?.clone(),intensity:material.emissiveIntensity,opacity:material.opacity,transparent:material.transparent});return material;
   };
   if(def.unit)model.traverse(n=>{if(n.isMesh)n.material=Array.isArray(n.material)?n.material.map(copy):copy(n.material);});
   const box=new T.Box3().setFromObject(tilt),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   if(model.userData.nativeTroop)tilt.position.set(-center.x,-box.min.y,-center.z);else tilt.position.sub(center);
   const clips=model.animations||[],mixer=clips.length?new T.AnimationMixer(model):null;
   this.scene.add(root);this.objects.set(id,{root,tilt,model,clips,mixer,key:def.key,width:size.x,height:size.y,flashMaterials});this.board.dataset.modelStatus='ready';this.board.dataset.modelCount=String(this.objects.size);this.onChange?.();
  });}
 }
 hasUnit(id){return !this.failed&&this.objects.has('unit-'+id);}
 bodyAnchors(id){const obj=this.objects.get('unit-'+id);return obj?.model?.userData.nativeTroop?troopModelAnchors(obj,this.h):null;}
 draw(clock,presentation=null){
  if(this.dead||this.failed)return;const {w,h,compact} = this.viewport||{w:this.board.clientWidth,h:this.board.clientHeight,compact:(this.board.parentElement?.clientWidth||this.board.clientWidth)<600};if(!w||!h)return;
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.right=w;this.camera.top=h;this.camera.updateProjectionMatrix();}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hits=presentation?.hits||actionImpacts(presentation?.actions||[]);
  for(const [id,obj]of this.objects){const d=this.wanted.get(id);if(!d)continue;let p=hexCenter(d.x,d.y);const u=d.unit,moving=u?.moveAt!==undefined&&clock-u.moveAt<.48;
   const death=u?.deadAt!==undefined?Math.max(0,Math.min(1,u.deathFxAt!==undefined?((presentation?.clock??0)-u.deathFxAt)/600:(clock-u.deadAt)/.6)):0;
   obj.root.visible=death<1;
   if(u&&presentation?.position)p=presentation.position(u);
   else if(moving&&u.from&&!reduced){const t=Math.max(0,Math.min(1,(clock-u.moveAt)/.48));p={x:u.from.x+(p.x-u.from.x)*t,y:u.from.y+(p.y-u.from.y)*t};}
   const scale=Math.min(w/14.5/obj.width,h/6.25/obj.height)*d.size;obj.root.scale.setScalar(scale);obj.root.position.set(p.x*w,h-p.y*h+h/6.25*.12,0);
   const nativeTroop=!!obj.model?.userData.nativeTroop;
   if(u&&d.key.startsWith('builtin:')&&!nativeTroop)obj.tilt.rotation.y=(u.target?u.target.x<p.x:u.side===1)?Math.PI:0;
   const curve=this.pack.animations?.move;obj.root.rotation.z=0;
   const status=unitStatusMotion(u?presentation?.statuses?.(u.id)||[]:[],(presentation?.clock??clock*1000)/1000,0,reduced);
   const reaction=u&&presentation?feedbackReaction(hits,u.id,presentation.clock):null;
   if(moving&&curve&&!reduced&&!nativeTroop)obj.root.position.y+=sampleCurve(curve.keys,clock%curve.duration)*h/6.25*.4;
   const casting=u&&presentation?unitCastAction(presentation.actions,u.id):null,action=casting?.action;
   if(!reduced&&action&&!status.blocked&&!nativeTroop){
    const progress=(presentation.clock-action.start)/action.duration,pose=castPose(progress,casting.event.presentationKind);
    const e=casting.event,target=hexCenter(e.x??d.x,e.y??d.y),dx=(target.x-p.x)*w,dy=(target.y-p.y)*h,len=Math.hypot(dx,dy)||1;
    obj.root.rotation.z=pose.lean*(u.side?-1:1);obj.root.position.y+=pose.lift*w/14.5-dy/len*pose.reach*w/14.5;obj.root.position.x+=dx/len*pose.reach*w/14.5;
   }
   else if(!presentation&&u?.attackAt!==undefined&&clock-u.attackAt<.65&&!reduced)obj.root.rotation.z=Math.sin((clock-u.attackAt)/.65*Math.PI)*.09;
   if(u){
    if(!nativeTroop){obj.root.rotation.z+=status.lean*(u.side?-1:1);obj.root.position.x+=status.x*w/14.5;obj.root.position.y-=(status.y+status.stance)*w/14.5;}
    animateModelParts(obj,action?(presentation.clock-action.start)/action.duration:1,moving&&!status.rooted&&!reduced?clock*status.gait:0,reduced);
    const kind=status.blocked?'stun':action?casting.event.skill&&['heal','support','control','shield'].includes(casting.event.presentationKind)?'cast':'attack':moving?'move':'idle';
    playModelClip(obj,kind,reduced?0:action?(presentation.clock-action.start)/action.duration:clock*status.gait);
    if(nativeTroop){
     const event=casting?.event,target=event?hexCenter(event.x??d.x,event.y??d.y):moving?hexCenter(d.x,d.y):u.target;
     const facing=target&&Math.hypot(target.x-p.x,target.y-p.y)>.0001?Math.atan2((target.x-p.x)*w,-(target.y-p.y)*h):obj.facing??(u.side===1?-1.05:1.05);obj.facing=facing;
     const progress=action?(presentation.clock-action.start)/action.duration:1,walking=action?event?.presentationKind==='charge'&&progress>=.24&&progress<.52:moving;
     const moveProgress=action?(progress-.24)/.28:Math.max(0,Math.min(1,(clock-(u.moveAt??clock))/.48));
     const absorbed=hits.find(hit=>hit.to===u.id&&hit.absorbed>0&&!hit.damage&&presentation.clock>=hit.start&&presentation.clock<hit.start+180),guardImpact=absorbed?Math.sin((presentation.clock-absorbed.start)/180*Math.PI):0;
     animateTroopModel(obj,{time:(presentation?.clock??clock*1000)/1000,progress,moving:walking,moveProgress,kind:event?.presentationKind||'strike',statuses:presentation?.statuses?.(u.id)||[],reduced,facing,death,compact,reaction:reaction?.recoil||0,guardImpact});
    }
   }
   if(reaction&&!reduced){
     const e=reaction.hit,source=hexCenter(e.fromX,e.fromY),dx=p.x-source.x,dy=p.y-source.y,length=Math.hypot(dx,dy)||1,recoil=reaction.recoil*w/14.5;
     obj.root.position.x+=dx/length*recoil;obj.root.position.y-=dy/length*recoil;
   }
   const statusTint=status.tint?new T.Color(status.tint):null;
   for(const f of obj.flashMaterials||[]){
    const flash=reduced?0:reaction?.flash||0;
    if(f.color){f.material.color.copy(f.color);if(statusTint)f.material.color.lerp(statusTint,status.tintAmount);f.material.color.lerp(hitWhite,flash*.85);}
    if(f.opacity!==undefined){f.material.opacity=f.opacity*status.opacity*(1-death);f.material.transparent=f.transparent||status.opacity<1||death>0;}
    if(f.emissive){f.material.emissive.copy(f.emissive).lerp(hitWhite,flash);f.material.emissiveIntensity=(f.intensity||0)+flash*.75;}
   }
  }
  this.board.classList.toggle('has-gate-model',this.objects.has('gate'));
  this.scene.updateMatrixWorld(true);this.batches?.update(this.objects);
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){this.dead=true;this.resize?.disconnect();this.batches?.destroy();for(const promise of this.cache.values())promise.then(obj=>{if(obj)dispose(obj);});for(const obj of this.objects.values())obj.flashMaterials?.forEach(f=>f.material.dispose());this.objects.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
export function cloneAnimatedModel(source){
 const clone=source.clone(true),original=[],copied=[];source.traverse(n=>original.push(n));clone.traverse(n=>copied.push(n));
 const bySource=new Map(original.map((n,i)=>[n,copied[i]]));
 for(let i=0;i<original.length;i++)if(original[i].isSkinnedMesh){
  const mesh=copied[i],skeleton=original[i].skeleton.clone();skeleton.bones=skeleton.bones.map(b=>bySource.get(b));
  mesh.bind(skeleton,original[i].bindMatrix.clone());
 }
 return clone;
}
export function animateModelParts(obj,progress,time,reduced=false){
 if(!obj.model)return;
 if(!obj.rig){obj.rig={ram:obj.model.getObjectByName('ram-striker'),arm:obj.model.getObjectByName('siege-arm'),wheels:[]};obj.model.traverse(n=>{if(n.name==='wheel')obj.rig.wheels.push(n);});}
 const p=Math.max(0,Math.min(1,progress)),windup=Math.min(1,p/.24),release=p>=.52?0:Math.sin(Math.max(0,Math.min(1,(p-.24)/.28))*Math.PI),settle=1-Math.max(0,Math.min(1,(p-.52)/.48));
 if(obj.rig.ram)obj.rig.ram.position.x=reduced?0:-windup*settle*.08+release*.25;
 if(obj.rig.arm)obj.rig.arm.rotation.z=reduced?0:-windup*settle*.18+release*.72;
 for(const wheel of obj.rig.wheels)wheel.rotation.z=reduced?0:time*4;
}
export function playModelClip(obj,kind,time){
 if(!obj.mixer||!obj.clips?.length)return;
 const patterns={stun:/stun|dizz|眩晕|混乱/i,cast:/cast|command|skill|施法|指挥/i,attack:/attack|strike|shoot|攻击|射击/i,move:/walk|run|move|行走|移动/i,idle:/idle|stand|待机/i};
 const clip=obj.clips.find(c=>patterns[kind].test(c.name))||obj.clips.find(c=>patterns.idle.test(c.name));if(!clip){obj.mixer.stopAllAction();obj.clip=null;return;}
 if(obj.clip!==clip){obj.mixer.stopAllAction();obj.mixer.clipAction(clip).reset().play();obj.clip=clip;}
 const seconds=['cast','attack'].includes(kind)?Math.min(.999,Math.max(0,time))*clip.duration:kind==='stun'?0:time;
 obj.mixer.setTime(seconds);
}
function dispose(obj){const geometries=new Set(),materials=new Set(),textures=new Set();obj.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}
