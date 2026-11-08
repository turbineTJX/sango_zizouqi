import * as T from './vendor/three/three.module.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {unitStatusMotion} from './battle-unit-motion.mjs';
import {sampleTroopPose,sampleFacing} from './troop-animation.mjs';
import {treasureAppearance} from './treasure-appearance.mjs';

const TAU=Math.PI*2;
const baseMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:.05});
const steel='#59605d',edge='#969586',dark='#323936',leather='#584534',wood='#766044',skin='#ad876b';
const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scaleVector=new T.Vector3();
let contactShadowMaterial;
function contactShadow(){
 if(!contactShadowMaterial){
  const size=32,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const r=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2));pixels[(y*size+x)*4+3]=Math.round(Math.max(0,1-r)**1.4*145);
  }
  const map=new T.DataTexture(pixels,size,size);map.magFilter=T.LinearFilter;map.minFilter=T.LinearFilter;map.needsUpdate=true;
  contactShadowMaterial=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
 }
 return contactShadowMaterial;
}

// Detailed rigid parts are merged into one colored mesh per joint. Armor plates,
// straps and rivets share draw calls rather than becoming individual objects.
function part(name,build){
 const geometries=[];
 const add=(geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
  let g=geometry.index?geometry.toNonIndexed():geometry;rotation.setFromEuler(new T.Euler(rx,ry,rz));
  matrix.compose(new T.Vector3(x,y,z),rotation,scaleVector.set(sx,sy,sz));g.applyMatrix4(matrix);
  g.deleteAttribute('uv');g.deleteAttribute('uv1');const colors=new Float32Array(g.attributes.position.count*3),c=new T.Color(color);
  // Weathered surfaces vary coherently across each plate or cloth fold.
  // Equal positions keep equal shades so triangles never look like confetti.
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),grain=Math.sin(x*79+y*113+z*61)*Math.sin(x*43-y*57+z*101);
   const shade=.9+grain*.065+Math.sin(y*23+x*7)*.035;
   colors[i*3]=c.r*shade;colors[i*3+1]=c.g*shade;colors[i*3+2]=c.b*shade;
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));geometries.push(g);if(g!==geometry)geometry.dispose();
 };
 const sphere=(color,x,y,z,sx,sy=sx,sz=sx)=>add(new T.SphereGeometry(1,12,8),color,x,y,z,sx,sy,sz);
 const box=(color,x,y,z,w,h,d,rz=0)=>add(new T.BoxGeometry(w,h,d),color,x,y,z,1,1,1,0,0,rz);
 const capsule=(color,x,y,z,r,length,rz=0,rx=0)=>add(new T.CapsuleGeometry(r,length,3,10),color,x,y,z,1,1,1,rx,0,rz);
 const beam=(color,a,b,r=.025)=>{
  const from=new T.Vector3(...a),to=new T.Vector3(...b),direction=to.clone().sub(from),g=new T.CylinderGeometry(r,r,direction.length(),9);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());g.applyQuaternion(q);g.translate(...from.add(to).multiplyScalar(.5).toArray());add(g,color);
 };
 const curve=(color,points,r=.025)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),14,r,6,false),color);
 build({add,sphere,box,capsule,beam,curve});
 const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
 const mesh=new T.Mesh(geometry,baseMaterial);mesh.name=name;mesh.castShadow=true;return mesh;
}
const joint=(root,name,x,y,z,mesh)=>{const group=new T.Group();group.name=name;group.position.set(x,y,z);if(mesh)group.add(mesh);root.add(group);return group;};
function bladeGeometry(length=.4,width=.075){
 const shape=new T.Shape();shape.moveTo(0,length);shape.lineTo(width,length*.3);shape.lineTo(width*.55,0);shape.lineTo(-width*.55,0);shape.lineTo(-width,length*.3);shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,steps:1});g.translate(0,0,-.0125);return g;
}

function torso(cloth,heavy=false){
 return part('torso-mesh',({add,sphere,box,beam})=>{
  const outline=[[.16,0],[.23,.08],[.25,.25],[.31,.5],[.28,.67],[.19,.71]].map(([r,y])=>new T.Vector2(r,y));
  add(new T.LatheGeometry(outline,16),cloth,0,0,0,1,1,.7);
  const cuirass=[[.22,.07],[.255,.17],[.27,.41],[.25,.6],[.18,.69]].map(([r,y])=>new T.Vector2(r,y));
  add(new T.LatheGeometry(cuirass,16),dark,0,0,.015,1,1,.73);
  // Individual overlapping lamellae catch the light without a painted pixel grid.
  for(let row=0;row<5;row++)for(let col=0;col<7;col++){
   const a=(col-3)*.22,x=Math.sin(a)*.275,z=.025+Math.cos(a)*.225;
   for(const sign of [-1,1])add(new T.BoxGeometry(.074,.09,.028),row%2?steel:'#49534e',x,.15+row*.09,sign*z,1,1,1,0,sign*a,0);
   if(row%2===0)for(const dx of [-.018,.018])box('#8f8670',x+dx,.18+row*.09,z+.02,.012,.014,.009);
  }
  box(leather,0,.05,.025,.51,.07,.36);box('#ab9060',0,.05,.22,.075,.065,.028);
  for(const sign of [-1,1])beam(leather,[sign*.18,.62,.14],[sign*.12,.05,.19],.022);
  // Armored skirt is pleated, not a rectangular block.
  for(let i=0;i<9;i++){
   const a=i*TAU/9;add(new T.BoxGeometry(.15,.27,.045),i%2?cloth:steel,Math.sin(a)*.23,-.14,Math.cos(a)*.16,1,1,1,.1*Math.cos(a),a,0);
  }
  if(heavy)for(const sign of [-1,1])sphere(steel,sign*.28,.57,0,.14,.12,.17);
 });
}
function head(cloth,index){
 return part('head-mesh',({add,sphere,box,curve})=>{
  sphere(skin,0,0,.015,.12,.165,.115);sphere(skin,0,-.015,.123,.026,.04,.035);
  sphere('#2a2925',-.047,.035,.11,.014,.01,.008);sphere('#2a2925',.047,.035,.11,.014,.01,.008);
  curve('#3e342b',[[-.072,.065,.108],[-.044,.072,.121],[-.02,.064,.116]],.008);
  curve('#3e342b',[[.02,.064,.116],[.044,.072,.121],[.072,.065,.108]],.008);
  if(index%2===0)sphere('#33302a',0,-.085,.09,.077,.047,.052);
  const helmet=[[.135,0],[.143,.05],[.128,.13],[.09,.2],[.01,.235]].map(([r,y])=>new T.Vector2(r,y));
  add(new T.LatheGeometry(helmet,20),steel,0,.075,0,1,1,.95);
  curve(edge,[[-.135,.08,.02],[-.09,.085,.13],[0,.085,.145],[.09,.085,.13],[.135,.08,.02]],.013);
  box(dark,-.117,-.03,.015,.033,.2,.12);box(dark,.117,-.03,.015,.033,.2,.12);
  box(steel,0,.073,.144,.019,.085,.014);
  box(leather,0,-.095,-.1,.19,.16,.035);
  sphere(cloth,0,.32,-.015,.045,.105,.04);
 });
}
function upperArm(cloth,sign){
 return part('upper-arm-mesh',({capsule,box,sphere})=>{
  capsule(cloth,0,-.12,0,.078,.19);sphere(steel,0,-.025,0,.1,.11,.115);
  for(let i=0;i<3;i++)box(i%2?steel:dark,sign*.018,-.03-i*.052,.055,.17-i*.015,.055,.1);
 });
}
function forearm(){
 return part('forearm-mesh',({capsule,box,sphere})=>{
  capsule(leather,0,-.1,0,.065,.16);box(steel,0,-.09,.047,.105,.17,.045);sphere(skin,0,-.25,.025,.065,.075,.06);
 });
}
function leg(cloth){
 const root=new T.Group();root.add(part('thigh-mesh',({capsule})=>capsule(cloth,0,-.16,0,.085,.22)));
 const knee=joint(root,'knee',0,-.35,0,part('shin-mesh',({capsule,sphere})=>{sphere(steel,0,0,.05,.085,.09,.06);capsule(leather,0,-.15,.01,.071,.19);}));
 joint(knee,'ankle',0,-.31,0,part('boot-mesh',({box})=>box(dark,0,0,.075,.15,.13,.26)));return root;
}
function bowWeapon(type){
 const root=new T.Group();root.name='bow-weapon';const length=type==='longbow'?.73:.6;root.userData.bowLength=length;
 root.add(part('bow-limbs',({curve})=>curve(wood,[[0,-length,0],[0,-length*.45,.17],[0,0,.2],[0,length*.45,.17],[0,length,0]],.027)));
 for(const name of ['bow-string-upper','bow-string-lower']){const string=part(name,({add})=>add(new T.CylinderGeometry(.008,.008,1,6),'#b6a686'));root.add(string);}
 root.add(part('nocked-arrow',({add,beam})=>{beam(wood,[0,0,0],[0,0,.56],.012);add(bladeGeometry(.12,.025),edge,0,0,.58,1,1,1,Math.PI/2,0,0);}));return root;
}
function weapon(type,cloth){
 if(type==='archer'||type==='longbow')return bowWeapon(type);
 return part('weapon-mesh',({add,beam,curve,box,sphere})=>{
  if(type==='crossbow'){
   box(wood,0,0,.15,.09,.1,.6);curve(steel,[[-.4,0,.35],[-.2,0,.45],[0,0,.47],[.2,0,.45],[.4,0,.35]],.028);
   beam('#b6a686',[-.4,0,.35],[0,0,.05],.008);beam('#b6a686',[0,0,.05],[.4,0,.35],.008);box(dark,0,.06,.05,.07,.04,.2);
  }else{
   beam(wood,[0,-.65,0],[0,1.15,0],.024);add(bladeGeometry(type==='halberd'?.37:.43,.075),edge,0,1.12,0);
   sphere('#a18b56',0,1.08,0,.038,.05,.038);
   if(type==='halberd'){
    const s=new T.Shape();s.moveTo(.025,1.12);s.quadraticCurveTo(.34,1.12,.26,1.43);s.quadraticCurveTo(.18,1.29,.025,1.28);s.closePath();
    add(new T.ExtrudeGeometry(s,{depth:.026,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1}),steel);
   }
   curve(cloth,[[0,1.06,0],[-.08,.91,-.02],[-.13,.81,-.05]],.018);
  }
 });
}
function shield(cloth,rattan){
 return part('shield-mesh',({add,box,sphere})=>{
  const s=new T.Shape();s.moveTo(-.2,.37);s.quadraticCurveTo(0,.44,.2,.37);s.lineTo(.2,-.22);s.quadraticCurveTo(0,-.43,-.2,-.22);s.closePath();
  add(new T.ExtrudeGeometry(s,{depth:.05,bevelEnabled:true,bevelSize:.026,bevelThickness:.02,bevelSegments:2}),rattan?'#8f7852':dark);
  box(rattan?'#b19966':cloth,0,.01,.075,.31,.55,.018);box('#b29e76',0,0,.095,.025,.6,.02);
  sphere('#9b8c6a',0,.035,.12,.07,.075,.035);
  for(const x of [-.14,.14])for(const y of [-.2,0,.2])sphere('#b8a477',x,y,.092,.015);
 });
}
function quiver(){
 return part('quiver-mesh',({capsule,beam,sphere})=>{
  capsule(leather,0,0,0,.08,.35,.15);
  for(let i=0;i<4;i++){const x=(i-1.5)*.036;beam(wood,[x,.1,0],[x,.48+(i%2)*.04,0],.009);sphere('#d1c3a0',x,.43+(i%2)*.04,0,.02,.06,.012);}
 });
}
function treasureWeapon(a){
 if(a.shape==='fan')return part('treasure-weapon',({sphere,beam,curve})=>{beam(a.trim,[0,-.4,0],[0,.2,0],.035);for(let i=-3;i<=3;i++){const x=i*.11;sphere(a.metal,x,.35-Math.abs(i)*.026,0,.1,.36,.025);curve('#b1a47d',[[0,.02,.025],[x,.58-Math.abs(i)*.026,.025]],.009);}});
 if(a.shape==='hammer')return part('treasure-weapon',({sphere,curve,add})=>{curve(a.trim,[[0,-.35,0],[.12,.1,0],[.3,.28,0]],.025);sphere(a.metal,.34,.36,0,.17,.17,.17);for(let i=0;i<6;i++){const angle=i*Math.PI/3;add(new T.ConeGeometry(.035,.13,6),a.metal,.34+Math.cos(angle)*.16,.36+Math.sin(angle)*.16,0,1,1,1,0,0,angle-Math.PI/2);}});
 if(a.shape==='hook')return part('treasure-weapon',({beam,curve,box})=>{beam(a.trim,[0,-.45,0],[0,0,0],.04);curve(a.metal,[[0,0,0],[.1,.5,0],[.32,.88,0],[.46,.8,0],[.39,.64,0]],.045);box('#b4a069',0,-.01,0,.3,.05,.07);});
 if(a.shape==='bow'){const root=bowWeapon('longbow');root.add(part('treasure-bow-trim',({curve})=>curve(a.metal,[[0,-.73,0],[0,-.3,.18],[0,.3,.18],[0,.73,0]],.045)));return root;}
 return part('treasure-weapon',({add,beam,curve,box,sphere})=>{
  const long=['halberd','guandao','serpent','trident','lance','doubleHalberd'].includes(a.shape);
  beam(a.trim,[0,long?-.85:-.45,0],[0,long?1.3:-.04,0],long?.035:.045);
  if(long){
   if(a.shape==='serpent'){const shape=new T.Shape();shape.moveTo(-.045,1.25);for(let i=0;i<=12;i++)shape.lineTo(Math.sin(i*.85)*.075-.035,1.25+i*.04);shape.lineTo(0,1.85);for(let i=12;i>=0;i--)shape.lineTo(Math.sin(i*.85)*.075+.035,1.25+i*.04);shape.closePath();add(new T.ExtrudeGeometry(shape,{depth:.03,bevelEnabled:false}),a.metal);}
   else{add(bladeGeometry(.47,.11),a.metal,0,1.28,0);if(a.shape==='trident')for(const sign of [-1,1]){beam(a.trim,[0,1.2,0],[sign*.2,1.42,0],.025);add(bladeGeometry(.32,.08),a.metal,sign*.2,1.41,0);}for(const sign of a.shape==='halberd'?[-1,1]:['lance','trident'].includes(a.shape)?[]:[1]){const shape=new T.Shape();shape.moveTo(sign*.04,1.27);shape.quadraticCurveTo(sign*.56,1.16,sign*.36,1.82);shape.quadraticCurveTo(sign*.19,1.53,sign*.04,1.51);shape.closePath();add(new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:1}),a.metal);}}
   sphere(a.trim,0,1.25,0,.085,.14,.085);curve('#ab3b30',[[0,1.23,0],[-.13,1.02,-.03],[-.23,.89,-.08]],.035);
  }else{
   add(bladeGeometry(a.shape==='dao'?1.08:1.18,a.shape==='dao'?.19:.11),a.metal,0,-.02,0);box('#c6a864',0,-.06,0,.38,.065,.09);sphere(a.trim,0,-.5,0,.08,.07,.06);if(a.stars)for(let i=0;i<a.stars;i++)sphere('#cbb56e',.02,.08+i*.12,.025,.018);if(a.serrated)for(let i=0;i<6;i++)add(bladeGeometry(.09,.05),a.metal,-.07,.13+i*.13,0,1,1,1,0,0,Math.PI/2);
  }
 });
}
function soldier(type,cloth,index,{mounted=false,heavy=false,rattan=false,treasure=null,armor=null}={}){
 const root=new T.Group();root.name='soldier-'+index;root.scale.set(.86,1,.87);
 const body=joint(root,'body',0,mounted?1.45:.76,0,torso(cloth,heavy));
 if(armor?.shape==='robe')body.add(part('treasure-robe',({box,curve})=>{box(armor.trim,0,.2,-.23,.65,.75,.06);for(const x of [-.25,-.12,0,.12,.25])curve(armor.metal,[[x,.54,-.27],[x*.7,.2,-.28],[x*1.1,-.14,-.29]],.014);}));
 else if(armor)body.add(part('treasure-mirror-armor',({sphere,box})=>{if(!armor.armorStyle||armor.armorStyle==='mirror'){for(const x of armor.armorStyle? [0]:[-.15,.15])sphere(armor.metal,x,.46,.24,armor.armorStyle ? .21 : .15,.17,.055);}else{for(let row=0;row<4;row++)for(let col=0;col<5;col++){const x=(col-2)*.105,y=.19+row*.12;if(armor.armorStyle==='chain')sphere(armor.metal,x,y,.24,.065,.07,.025);else box(armor.metal,x,y,.245,.095,.105,.035);} }box(armor.trim,0,.12,.24,.56,.08,.06);}));
 joint(body,'head',0,.85,0,head(cloth,index));
 for(const sign of [-1,1]){
  const arm=joint(body,sign<0?'arm-l':'arm-r',sign*.34,.58,0,upperArm(cloth,sign));
  const fore=joint(arm,sign<0?'fore-l':'fore-r',0,-.29,0,forearm());fore.rotation.x=-.28;
  if(sign===(['archer','longbow'].includes(type)?-1:1)){const held=joint(fore,'weapon',0,-.23,.04,treasure&&!['armor','horse','wagon','robe'].includes(treasure.shape)?treasureWeapon(treasure):weapon(type,cloth));held.rotation.z=-.12;}
  else if(['twins','doubleHalberd'].includes(treasure?.shape))joint(fore,'second-sword',0,-.23,.04,treasureWeapon(treasure));
  else if(!['archer','longbow','crossbow'].includes(type)){const held=joint(fore,'shield',-.03,-.19,.12,shield(cloth,rattan));held.rotation.y=-.2;}
  const hip=joint(root,sign<0?'leg-l':'leg-r',sign*.13,mounted?1.5:.73,0,leg(cloth));if(mounted){hip.rotation.z=sign*.28;hip.rotation.x=-.15;}
 }
 if(['archer','longbow','crossbow'].includes(type))joint(body,'quiver',-.18,.43,-.19,quiver());
 return root;
}
function horse(cloth,index,white=false,treasure=null){
 const root=new T.Group();root.name='horse-'+index;const coat=treasure?.coat||(white?'#b6b1a0':index%2?'#6b5545':'#886747');
 root.add(part('horse-body',({sphere,box,curve})=>{
  sphere(coat,0,.84,-.05,.3,.34,.63);
  box(cloth,0,1.09,-.13,.68,.08,.72);box(leather,0,1.16,-.16,.42,.12,.46);
  for(const sign of [-1,1]){
   box(cloth,sign*.3,.84,-.1,.035,.43,.67);curve(leather,[[sign*.14,1.45,.91],[sign*.2,1.22,.5],[sign*.18,1.5,-.02]],.014);
  }
 }));
 const neck=part('horse-head-mesh',({sphere,add,curve})=>{
  sphere(coat,0,1.13,.4,.23,.42,.28);
  sphere(coat,0,1.48,.65,.18,.27,.17);sphere(coat,0,1.39,.84,.13,.12,.24);
  for(const sign of [-1,1]){
   add(new T.ConeGeometry(.07,.22,10),coat,sign*.105,1.75,.61,1,1,.6,0,0,-sign*.17);
   sphere('#242723',sign*.16,1.53,.74,.015);
  }
  curve('#292a24',[[0,1.62,.51],[0,1.36,.36],[0,1.1,.25]],.04);
 });neck.position.set(0,-1.02,-.3);joint(root,'horse-neck',0,1.02,.3,neck);
 joint(root,'horse-tail',0,.99,-.6,part('horse-tail-mesh',({curve})=>curve('#37312a',[[0,0,0],[0,-.29,-.26],[.04,-.59,-.32]],.06)));
 for(const x of [-.2,.2])for(const z of [-.44,.4]){
  const hip=joint(root,'horse-leg',x,.82,z,part('horse-thigh',({capsule})=>capsule(coat,0,-.17,0,.065,.23)));
  joint(hip,'horse-knee',0,-.36,0,part('horse-shin',({capsule,box})=>{capsule(coat,0,-.19,0,.052,.28);box('#292b28',0,-.39,.035,.135,.13,.19);}));
 }
 return root;
}
function treasureWagon(a){
 const cart=new T.Group();cart.name='treasure-wagon';cart.add(part('treasure-wagon-body',({box,beam})=>{box(wood,0,.44,0,.68,.12,.88);box(a.trim,0,.8,-.32,.68,.6,.06);box(a.trim,0,.7,0,.68,.1,.55);for(const x of [-.31,.31])for(const z of [-.35,.35])beam(wood,[x,.48,z],[x,1.55,z],.022);box(a.trim,0,1.56,0,.8,.09,1.02);}));
 for(const x of [-.4,.4])for(const z of [-.3,.3]){const wheel=new T.Group();wheel.name='wagon-wheel';wheel.position.set(x,.26,z);wheel.add(part('wagon-wheel-mesh',({add,beam})=>{add(new T.TorusGeometry(.23,.035,6,12),a.metal,0,0,0,1,1,1,0,Math.PI/2,0);for(let i=0;i<6;i++){const angle=i*Math.PI/3;beam(wood,[0,0,0],[0,Math.sin(angle)*.23,Math.cos(angle)*.23],.014);}}));cart.add(wheel);}return cart;
}
function pennant(cloth){
 const root=new T.Group();root.add(part('standard-pole',({beam})=>beam(wood,[0,0,0],[0,2.45,0],.018)));
 joint(root,'standard-cloth',0,2.4,0,part('standard-mesh',({add})=>{const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(.43,-.07);shape.lineTo(.35,-.47);shape.lineTo(0,-.41);shape.closePath();add(new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),cloth);}));return root;
}
export function createTroopModel(type,side=0,treasureId=null){
 const family=TROOP_DESIGNS[type]?.family;if(!['spear','halberd','cavalry','archer'].includes(family))return null;
 const root=new T.Group();root.name='troop-'+type;root.userData.nativeTroop=true;root.userData.type=type;root.userData.side=side;
 const ids=(Array.isArray(treasureId)?treasureId:String(treasureId||'').split('+')).filter(treasureAppearance),looks=ids.map(treasureAppearance),treasure=looks.find(a=>!['armor','horse','wagon','robe'].includes(a.shape)),armor=looks.find(a=>['armor','robe'].includes(a.shape)),wagon=looks.find(a=>a.shape==='wagon'),mount=looks.find(a=>a.shape==='horse');root.userData.treasureIds=ids;
 const cloth=side?'#874c40':'#455e72',mounted=family==='cavalry',heavy=['greatHalberd','tigerCavalry'].includes(type);
 const weaponType=type==='crossbow'?'crossbow':type==='longbow'?'longbow':family==='archer'?'archer':family==='halberd'?'halberd':'spear';
 // A unit is a small formation. Central files come first so compact views can
 // keep a balanced detachment without changing the unit's ground anchor.
 const layout=mounted?[[-.5,-.72],[.5,.72],[.5,-.72],[-.5,.72]]:
  [[0,0],[-.72,-.8],[.72,.8],[.72,-.8],[-.72,.8],[0,-.8],[0,.8],[-.72,0],[.72,0]];
 let follower;
 layout.forEach(([x,z],i)=>{
  const member=new T.Group();member.name='member-'+i;member.position.set(x,0,z);member.userData.rest=[x,0,z];member.userData.index=i;
  member.scale.setScalar([1,.96,1.025,.98,1.015][i%5]);
  if(i>1){
   for(const child of follower.children){const copy=child.clone(true);if(copy.name.startsWith('horse-'))copy.name='horse-'+i;member.add(copy);}
  }else{
   if(mounted)member.add(horse(cloth,i,type==='whiteHorse',i===0?mount:null));
   member.add(soldier(weaponType,cloth,i,{mounted,heavy,rattan:type==='rattan',treasure:i===0?treasure:null,armor:i===0?armor:null}));
   if(i===1)follower=member;
  }
  root.add(member);
 });
 const standard=pennant(cloth);standard.position.set(-.9,0,-.8);root.add(standard);
 if(wagon){const cart=treasureWagon(wagon);cart.position.set(.85,0,-.35);root.add(cart);}
 if(!mounted&&mount){const companion=horse(cloth,'treasure',false,mount);companion.position.set(.96,0,-.2);companion.scale.setScalar(.84);root.add(companion);}
 // Soft contact patches are flat ground shadows, not selection or status rings.
 const shadowMaterial=contactShadow();
 for(const member of root.children.filter(n=>n.name.startsWith('member-'))){const shadow=new T.Mesh(new T.PlaneGeometry(mounted?.7:.44,mounted?1.25:.45),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.008,0);member.add(shadow);}
 return root;
}

function rigs(model){
 return model.children.filter(n=>n.name.startsWith('member-')).map(member=>{
  const legs=[member.getObjectByName('leg-l'),member.getObjectByName('leg-r')],horse=member.getObjectByName('horse-'+member.userData.index),horseLegs=horse?.children.filter(n=>n.name==='horse-leg')||[],bow=member.getObjectByName('bow-weapon');
  return {member,body:member.getObjectByName('body'),head:member.getObjectByName('head'),
  arms:[member.getObjectByName('arm-l'),member.getObjectByName('arm-r')],forearms:[member.getObjectByName('fore-l'),member.getObjectByName('fore-r')],
  legs,knees:legs.map(l=>l.getObjectByName('knee')),ankles:legs.map(l=>l.getObjectByName('ankle')),horse,horseLegs,horseKnees:horseLegs.map(l=>l.getObjectByName('horse-knee')),
  neck:member.getObjectByName('horse-neck'),tail:member.getObjectByName('horse-tail'),bow,strings:bow?['bow-string-upper','bow-string-lower'].map(name=>bow.getObjectByName(name)):[],arrow:bow?.getObjectByName('nocked-arrow'),weapon:member.getObjectByName('weapon')};
 });
}
export function animateTroopModel(obj,{time=0,progress=1,moving=false,moveProgress,kind='strike',statuses=[],reduced=false,facing=1,death=0,compact=false,maxMembers=compact?2:Infinity,reaction=0,guardImpact=0}={}){
 if(!obj.model?.userData.nativeTroop)return;
 obj.troopRig ||= rigs(obj.model);
 const type=obj.model.userData.type,family=TROOP_DESIGNS[type]?.family,mounted=family==='cavalry';
 for(const [i,rig]of obj.troopRig.entries()){
  rig.member.visible=i<maxMembers;
  if(!rig.member.visible)continue;
  const state=unitStatusMotion(statuses,time,i,reduced),rest=rig.member.userData.rest;
  const pose=sampleTroopPose({type,family,progress,time,index:i,moving,moveProgress,state,kind,reaction,guardImpact,reduced,death});
  rig.turn=sampleFacing(rig.turn,facing+(reduced?0:state.turn*Math.PI/2),time,reduced);
  rig.member.position.set(rest[0]*state.spread+state.x*.3,rest[1]-death*.08,rest[2]*state.spread+state.y*.3);
  rig.member.rotation.set(0,rig.turn.value,pose.fall);
  rig.body.rotation.set(pose.bodyX,pose.bodyY,pose.bodyZ);rig.body.position.y=(mounted?1.45:.76)+pose.bodyDrop;rig.body.position.z=pose.bodyForward;
  rig.head.rotation.set(pose.headX,pose.headY,pose.headZ);
  for(let j=0;j<2;j++){
   rig.arms[j].rotation.set(pose.arms[j].x,pose.arms[j].y,pose.arms[j].z);rig.forearms[j].rotation.x=pose.forearms[j];
   const leg=rig.legs[j],angles=pose.legs[j];leg.position.x=(j?1:-1)*(.13+pose.legSpread);leg.position.y=mounted?1.5+pose.horseBob:.73+pose.bodyDrop;leg.rotation.x=angles.hip;
   rig.knees[j].rotation.x=angles.knee;rig.ankles[j].rotation.x=angles.ankle;
  }
  if(rig.weapon){const hand=rig.bow?0:1;rig.weapon.rotation.x=pose.weaponTilt-pose.arms[hand].x-pose.forearms[hand]-pose.bodyX;}
  if(rig.horse){rig.horse.position.y=pose.horseBob;rig.neck.rotation.x=pose.neck;rig.tail.rotation.z=pose.tail;}
  for(const [j,leg]of rig.horseLegs.entries()){leg.rotation.x=pose.horseLegs[j].hip;rig.horseKnees[j].rotation.x=pose.horseLegs[j].knee;}
  if(rig.bow){
   const length=rig.bow.userData.bowLength,pull=pose.bowDraw*.2,stretch=Math.hypot(length,pull),angle=Math.atan2(pull,length);
   for(const [j,string]of rig.strings.entries()){
    string.position.set(0,(j?-1:1)*length/2,-pull/2);string.scale.y=stretch;string.rotation.x=j?-angle:angle;
   }
   rig.arrow.visible=pose.arrowVisible;rig.arrow.position.z=-pull;
  }
  if(i===0){obj.flagPose=pose.flag;obj.flagDrop=pose.fall;}
 }
 const cart=obj.model.getObjectByName('treasure-wagon');if(cart){cart.rotation.y=obj.troopRig[0]?.member.rotation.y||0;if(moving)for(const wheel of cart.children.filter(n=>n.name==='wagon-wheel'))wheel.rotation.x=time*.006;}
 const companion=obj.model.getObjectByName('horse-treasure');if(companion){
  const pose=sampleTroopPose({type:'cavalry',family:'cavalry',progress,time,index:0,moving,moveProgress,kind,reaction,guardImpact,reduced,death});
  companion.position.y=pose.horseBob;companion.rotation.y=obj.troopRig[0]?.member.rotation.y||0;companion.rotation.z=pose.fall;
  companion.getObjectByName('horse-neck').rotation.x=pose.neck;companion.getObjectByName('horse-tail').rotation.z=pose.tail;
  companion.children.filter(n=>n.name==='horse-leg').forEach((leg,j)=>{leg.rotation.x=pose.horseLegs[j].hip;leg.getObjectByName('horse-knee').rotation.x=pose.horseLegs[j].knee;});
 }
 const flag=obj.troopFlag||=obj.model.getObjectByName('standard-cloth');if(flag){flag.rotation.y=obj.flagPose*2;flag.rotation.z=obj.flagPose*.3;flag.parent.rotation.z=-obj.flagDrop;}
}
export function troopModelAnchors(obj,height){
 if(!obj.troopRig?.length)return [];
 obj.root.updateMatrixWorld(true);
 const point=new T.Vector3(),up=new T.Vector3();
 return obj.troopRig.filter(rig=>rig.member.visible).map(rig=>{
  rig.member.getWorldPosition(point);up.copy(point);rig.body.localToWorld(up.set(0,.95,0));
  return {x:point.x,y:height-point.y,size:Math.max(15,Math.abs(up.y-point.y)),facing:Math.sin(rig.member.rotation.y)>=0?1:-1};
 });
}
