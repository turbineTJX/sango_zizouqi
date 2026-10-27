import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.module.js';
import {NativeModelBatches} from '../native-model-batches.mjs';
function actor(scene,id){
 const root=new T.Group(),model=new T.Group();model.userData.nativeTroop=true;root.position.set(id*2,3,4);root.add(model);scene.add(root);
 const material=new T.MeshStandardMaterial({color:0x567890}),flashMaterials=[{material,color:material.color.clone(),emissive:material.emissive.clone(),intensity:material.emissiveIntensity,opacity:material.opacity,transparent:material.transparent}];
 for(let i=0;i<3;i++){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);mesh.position.x=i;model.add(mesh);}
 return {root,model,flashMaterials};
}
test('identical independent geometry batches preserve all articulated world transforms',()=>{
 const scene=new T.Scene(),objects=new Map([[1,actor(scene,1)],[2,actor(scene,2)]]),batches=new NativeModelBatches(scene);scene.updateMatrixWorld(true);batches.update(objects);
 assert.equal(batches.batches.size,1);const batch=[...batches.batches.values()][0];assert.equal(batch.mesh.count,6);
 const actual=new T.Matrix4();batch.sources.forEach((source,i)=>{batch.mesh.getMatrixAt(i,actual);assert.deepEqual(actual.elements,source.matrixWorld.elements);assert.equal(source.layers.mask,2);});
 objects.get(1).model.children[0].rotation.x=.5;scene.updateMatrixWorld(true);batches.update(objects);batch.mesh.getMatrixAt(0,actual);
 actual.elements.forEach((v,i)=>assert.ok(Math.abs(v-batch.sources[0].matrixWorld.elements[i])<1e-6));batches.destroy();
});
test('flash and opacity changes retain ordinary materials, while hide/remove/disable update real instances',()=>{
 const scene=new T.Scene(),a=actor(scene,1),b=actor(scene,2),objects=new Map([[1,a],[2,b]]),batches=new NativeModelBatches(scene);scene.updateMatrixWorld(true);batches.update(objects);
 a.flashMaterials[0].material.color.setHex(0xffffff);batches.update(objects);assert.equal(a.model.children[0].layers.mask,1);assert.equal([...batches.batches.values()][0].mesh.count,3);
 a.flashMaterials[0].material.color.copy(a.flashMaterials[0].color);b.model.children[0].visible=false;batches.update(objects);assert.equal([...batches.batches.values()][0].mesh.count,5);
 objects.delete(2);scene.remove(b.root);batches.update(objects);assert.equal([...batches.batches.values()][0].mesh.count,3);
 batches.enabled=false;batches.update(objects);assert.equal([...batches.batches.values()][0].mesh.count,0);assert.equal(a.model.children[0].layers.mask,1);batches.destroy();
});
