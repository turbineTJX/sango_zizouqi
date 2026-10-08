import * as T from './vendor/three/three.module.js';

// Small original geometric models: no external art pack is required.
export function createSiegeModel(type){
 const root=new T.Group();root.name='siege-'+type;
 const wood=new T.MeshStandardMaterial({color:0x805833,roughness:.9}),edge=new T.MeshStandardMaterial({color:0xbd945b,roughness:.8}),metal=new T.MeshStandardMaterial({color:0x404a4d,roughness:.75});
 const box=(x,y,z,w,h,d,material=wood)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);root.add(m);return m;};
 const beam=(a,c,width=.1,material=edge)=>{const p=new T.Vector3(...a),q=new T.Vector3(...c),v=q.clone().sub(p),m=new T.Mesh(new T.BoxGeometry(width,v.length(),width),material);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());root.add(m);return m;};
 box(0,.35,0,1.6,.18,.92);
 for(const x of [-.6,.6])for(const z of [-.57,.57]){const wheel=new T.Mesh(new T.CylinderGeometry(.23,.23,.12,12),metal);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.23,z);root.add(wheel);}
 if(type==='ram'){
  for(const x of [-.55,.55])for(const z of [-.38,.38])beam([x,.4,z],[x,1.05,z],.1);
  for(const x of [-.7,.7]){beam([x,1.05,-.52],[x,1.4,0],.1);beam([x,1.4,0],[x,1.05,.52],.1);}
  const roof=box(0,1.15,-.23,1.75,.09,.59);roof.rotation.x=-.6;
  const other=box(0,1.15,.23,1.75,.09,.59);other.rotation.x=.6;
  const log=new T.Mesh(new T.CylinderGeometry(.12,.12,1.95,10),edge);log.rotation.z=Math.PI/2;log.position.set(.12,.75,0);root.add(log);box(1.13,.75,0,.2,.25,.25,metal);
  for(const x of [-.45,.45])beam([x,1.2,0],[x,.75,0],.035,metal);
 }else if(type==='siege'){
  for(const z of [-.28,.28]){beam([-.5,.4,z],[0,1.2,z]);beam([.5,.4,z],[0,1.2,z]);}
  beam([-.55,.72,0],[.82,1.95,0],.14);box(-.55,.72,0,.36,.36,.36,metal);box(.83,1.97,0,.5,.08,.4,edge);
  beam([0,1.2,-.43],[0,1.2,.43],.13,metal);
 }else if(type==='tower'){
  for(const x of [-.55,.55])for(const z of [-.35,.35])beam([x,.4,z],[x,2.1,z],.13);
  for(const y of [.7,1.3,1.9])box(0,y,0,1.25,.1,.85,edge);
  for(const z of [-.42,.42])box(0,2.12,z,1.35,.35,.09);
  for(const x of [-.65,.65])box(x,2.12,0,.09,.35,.85);
  beam([-.25,.4,.5],[-.25,1.9,.5],.055);beam([.25,.4,.5],[.25,1.9,.5],.055);
  for(let y=.55;y<1.9;y+=.2)beam([-.25,y,.5],[.25,y,.5],.05);
 }
 return root;
}
