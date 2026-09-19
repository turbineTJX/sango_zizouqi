import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,extname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const config=args.length?{infinity:args[0],strategy:args[1]}:JSON.parse(await readFile(resolve(root,'art.local.json'),'utf8'));
const out=resolve(root,'.local/art');await mkdir(out,{recursive:true});
const files={},sources={},missing=[];
async function asset(path,source){
 try{
  const bytes=await readFile(path),hash=createHash('sha256').update(bytes).digest('hex'),id=hash.slice(0,24)+extname(path).toLowerCase();
  files[id]=resolve(path);sources[id]={source,sha256:hash,bytes:bytes.length,localOnly:true};return '/local-art/files/'+id;
 }catch(e){if(e.code!=='ENOENT')throw e;missing.push(path);return null;}
}
const pack={version:1,id:'local-playtest',label:'本地试玩美术',localOnly:true,portraits:{},troops:{},models:{},effects:{},backgrounds:{},animations:{}};
const inf=config.infinity&&resolve(config.infinity,'Project/Assets/Mods/Content/Assets');
const strategy=config.strategy&&resolve(config.strategy,'assets');
if(strategy){
 const faceDir=resolve(strategy,'local_only/xsyg_face_portraits/source');
 const faces=await readdir(faceDir).catch(()=>[]),byName=new Map();
 for(const file of faces.sort()) {const name=file.match(/^\d+_(.+)_1\.jpg$/)?.[1];if(name){if(!byName.has(name))byName.set(name,[]);byName.get(name).push(file);}}
 for(const u of OFFICER_CATALOG){
  // Names are used only to prepare this pack; runtime mappings use stable officer IDs.
  // Homonymous officers and custom officers retain the built-in portrait.
  if(u.sourceKind!=='common'||OFFICER_CATALOG.filter(v=>v.sourceKind==='common'&&v.name===u.name).length!==1)continue;
  const matches=[...new Set([u.name,...u.aliases].flatMap(n=>byName.get(n)||[]))];
  // Multiple numbered portraits of the same named person are variants; use the first slot.
  if(matches.length)pack.portraits[u.id]=await asset(resolve(faceDir,matches.sort()[0]),'strategy/portraits');
 }
 // Painted rivers/roads do not match the rule grid: use the illustration in the lobby only.
 pack.backgrounds.lobby=await asset(resolve(strategy,'game/generated/maps/strategic_han_relief_v1.png'),'strategy/generated');
 for(const [key,file] of Object.entries({slash:'spear_thrust',volley:'arrow_volley',charge:'cavalry_charge',shockwave:'encounter_clash',banner:'linkage_convergence',hit:'hit_impact',defeat:'unit_defeated'}))pack.effects[key]=await asset(resolve(strategy,'game/generated/battle_event_pack_v1/runtime',file+'.png'),'strategy/generated');
 for(const [key,file] of Object.entries({gate:'facilities/gatehouse/intact_lod1',gateDamaged:'facilities/gatehouse/damaged_lod1',forest:'strategic/forest_cluster/intact_lod1',hill:'strategic/mountain_cluster/intact_lod1',bridge:'facilities/timber_bridge/intact_lod1'})){
  const url=await asset(resolve(strategy,'game/models',file+'.glb'),'strategy/models');if(url)pack.models[key]={format:'glb',url};
 }
}
if(inf){
 // The supplied project contains one generic critical cut-in, not officer-specific art.
 pack.criticals={default:await asset(resolve(inf,'CriticalImage/default.png'),'infinity/critical-cut-in')};
 // National basemaps and map-space anchors only; never import scenario rules.
 const images={};for(const [season,index]of Object.entries({autumn:0,spring:1,summer:2,winter:3}))images[season]=await asset(resolve(config.infinity,`Build/Content/Assets/Map/Default/BaseTex/BaseMap${index}.png`),'infinity/national-map');
 const scenario=JSON.parse(await readFile(resolve(config.infinity,'Build/Content/Scenario/Scenario.json'),'utf8'));
 const cities={};for(const [id,name]of Object.entries({ye:'邺',jinyang:'晋阳',baima:'白马港',guandu:'官渡港',luoyang:'洛阳',chenliu:'陈留',xuchang:'许昌',runan:'汝南',wan:'宛'})){
  const c=Object.values(scenario.citySet).find(c=>c.Name===name);if(c)cities[id]={x:c.x*4+2,y:c.y*4+(c.x%2)*2+2};
 }
 pack.worldMap={images,cities,width:1024,height:1024,source:'infinity/Default/BaseTex',projection:'source odd-column grid; four texture pixels per cell'};
 const animations=JSON.parse(await readFile(resolve(config.infinity,'Build/Content/Data/Common/TroopAnimations.json'),'utf8')).TroopAnimations;
 for(const [type,first] of Object.entries({spear:10,halberd:10,cavalry:4,archer:7,crossbow:7,siege:13,ship:13,logistics:13})){
  const clips={};for(let i=first;i<first+3;i++){
   const a=animations[i],url=await asset(resolve(inf,'Model',a.frameTexture),'infinity/troop-animation');
   if(url)clips[a.aniName]={url,columns:a.celCount,rows:a.rowCount,frames:a.celCountMax,duration:a.time,loop:a.isLoop};
  }
  pack.troops[type]=clips;
 }
 // Read Unity's actual unweighted root position curve, including Hermite tangents.
 // No Animator callbacks, physics or gameplay scripts are imported.
 const path=resolve(inf,'Model/Animation/transport_move.anim'),text=await readFile(path,'utf8');
 const block=text.split('  m_PositionCurves:')[1]?.split('  m_ScaleCurves:')[0]||'';
 const vec=s=>Object.fromEntries([...s.matchAll(/([xyz]):\s*([-\d.eE+]+)/g)].map(m=>[m[1],Number(m[2])]));
 const keys=[...block.matchAll(/time: ([-\d.eE+]+)\s+value: \{([^}]+)\}\s+inSlope: \{([^}]+)\}\s+outSlope: \{([^}]+)\}/g)].map(m=>({time:Number(m[1]),value:vec(m[2]),inSlope:vec(m[3]),outSlope:vec(m[4])}));
 if(keys.length)pack.animations.move={duration:keys.at(-1).time,keys,source:'infinity/transport_move.anim'};
 // OBJ + its Unity material texture: resolve GUIDs, never assume adjacent filenames match.
 const paths=await readdir(resolve(inf,'Model'),{recursive:true});const guidPaths=new Map();
 for(const p of paths.filter(p=>p.endsWith('.meta'))){const full=resolve(inf,'Model',p);const guid=(await readFile(full,'utf8')).match(/^guid: (\w+)/m)?.[1];if(guid)guidPaths.set(guid,full.slice(0,-5));}
 for(const [key,file]of Object.entries({ship:'2221',siege:'2227',logistics:'Troops6'})){
 const prefab=await readFile(resolve(inf,'Model/Prefab',file+'.prefab'),'utf8');
 const meshGuid=prefab.match(/m_Mesh:.*guid: (\w+)/)?.[1],matGuid=prefab.match(/m_Materials:\s*\n\s*-.*guid: (\w+)/)?.[1];
 const mesh=guidPaths.get(meshGuid),mat=guidPaths.get(matGuid);
 if(mesh&&mat){const material=await readFile(mat,'utf8');const textureGuid=material.match(/_MainTex:\s*\n\s*m_Texture:.*guid: (\w+)/)?.[1];
  const url=await asset(mesh,'infinity/obj'),texture=guidPaths.get(textureGuid);if(url)pack.models[key]={format:'obj',url,texture:texture?await asset(texture,'infinity/material'):null};
 }
 }
}
await writeFile(resolve(out,'manifest.json'),JSON.stringify({public:pack,files,sources,missing},null,2));
if(args.length)await writeFile(resolve(root,'art.local.json'),JSON.stringify(config,null,2));
console.log(JSON.stringify({portraits:Object.keys(pack.portraits).length,troops:Object.keys(pack.troops).length,models:Object.keys(pack.models),effects:Object.keys(pack.effects).length,files:Object.keys(files).length,missing},null,2));
