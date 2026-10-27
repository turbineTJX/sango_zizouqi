import * as T from './vendor/three/three.module.js';
const unchanged=f=>(!f.color||f.material.color.equals(f.color))&&(!f.emissive||f.material.emissive.equals(f.emissive))&&f.material.emissiveIntensity===f.intensity&&f.material.opacity===f.opacity&&f.material.transparent===f.transparent;
const materialKey=m=>[m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.side,m.vertexColors,m.flatShading,m.map?.uuid,m.depthWrite,m.toneMapped].join(':');
const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
// Instance identical rigid joint meshes, retaining the original articulated
// hierarchy for poses, body anchors and hit testing. Flashing/fading actors and
// transparent parts keep their original materials and ordinary draw path.
export class NativeModelBatches {
 constructor(scene){this.scene=scene;this.enabled=true;this.nodes=new WeakMap();this.batches=new Map();this.geometryKeys=new WeakMap();this.geometries=new Map();}
 async prepare(model,stopped=()=>false){
  const geometries=new Set();model.traverse(node=>{if(node.isMesh)geometries.add(node.geometry);});
  let start=performance.now();for(const geometry of geometries){if(stopped())return;this.geometryKey(geometry);if(performance.now()-start>4){await new Promise(resolve=>setTimeout(resolve,0));start=performance.now();}}
 }
 geometryKey(geometry){
  if(this.geometryKeys.has(geometry))return this.geometryKeys.get(geometry);
  const names=Object.keys(geometry.attributes).sort(),arrays=[...names.map(n=>geometry.attributes[n].array),...(geometry.index?[geometry.index.array]:[])];
  let hash=2166136261;for(const array of arrays){const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;}
  const key=names.map(n=>n+':'+geometry.attributes[n].itemSize).join('|')+':'+arrays.map(a=>a.byteLength).join(',')+':'+hash;
  let list=this.geometries.get(key);if(!list){list=[];this.geometries.set(key,list);}
  const equal=other=>arrays.every((array,i)=>{const a=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),b=new Uint8Array(other.arrays[i].buffer,other.arrays[i].byteOffset,other.arrays[i].byteLength);for(let j=0;j<a.length;j++)if(a[j]!==b[j])return false;return true;});
  let match=list.find(equal);if(!match){match={id:geometry.uuid,arrays};list.push(match);}
  this.geometryKeys.set(geometry,match.id);return match.id;
 }
 update(objects){
  const groups=new Map();
  for(const obj of objects.values()){
   if(!obj.model?.userData.nativeTroop)continue;
   let nodes=this.nodes.get(obj);
   if(!nodes){nodes=[];obj.model.traverse(n=>{if(n.isMesh&&!n.isSkinnedMesh&&!Array.isArray(n.material))nodes.push({mesh:n,layers:n.layers.mask});});this.nodes.set(obj,nodes);}
   const eligible=this.enabled&&(obj.flashMaterials||[]).every(unchanged);
   for(const {mesh,layers}of nodes){
    mesh.layers.mask=layers;
    if(!eligible||mesh.material.transparent||!visible(mesh))continue;
    const key=this.geometryKey(mesh.geometry)+'|'+materialKey(mesh.material);
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);mesh.layers.set(1);
   }
  }
  for(const [key,batch]of this.batches)if(!groups.has(key)){batch.mesh.count=0;batch.sources=[];}
  for(const [key,sources]of groups){
   let batch=this.batches.get(key);
   if(!batch||batch.capacity<sources.length){
    if(batch){this.scene.remove(batch.mesh);batch.mesh.dispose();batch.mesh.material.dispose();}
    const capacity=2**Math.ceil(Math.log2(Math.max(1,sources.length))),mesh=new T.InstancedMesh(sources[0].geometry,sources[0].material.clone(),capacity);
    mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.scene.add(mesh);batch={mesh,capacity,sources:[]};this.batches.set(key,batch);
   }
   batch.sources=sources;batch.mesh.count=sources.length;
   sources.forEach((source,i)=>batch.mesh.setMatrixAt(i,source.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 destroy(){for(const {mesh}of this.batches.values()){this.scene.remove(mesh);mesh.dispose();mesh.material.dispose();}this.batches.clear();this.geometries.clear();}
}
