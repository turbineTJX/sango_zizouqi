import {readFile,writeFile,mkdir,copyFile,rename,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {legacyFaceReferences} from './officer-art-face-references.mjs';
import {artRole,roleSceneBrief,roleDescription} from './officer-art-roles.mjs';
import {OFFICER_ART_KEYS,OFFICER_ART_SCENES,OFFICER_ART_STYLE,OFFICER_ART_LOCK,OFFICER_ART_FORMAT_VERSION} from '../officer-art-scenes.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),base=resolve(root,'assets/officers'),output=resolve(base,'generated/v3');
const json=async path=>JSON.parse(await readFile(path,'utf8')),direction=await json(resolve(base,'art-direction.json'));
const receiptsPath=resolve(base,'receipts.json'),manifestPath=resolve(base,'manifest.json'),identityPath=resolve(base,'identities.json');
const optionalJSON=async path=>{try{return await json(path);}catch(e){if(e.code==='ENOENT')return {};throw e;}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const checkedFiles=new Map();
async function fileHash(file){const s=await stat(file),key=s.size+':'+s.mtimeMs,old=checkedFiles.get(file);if(old?.key===key)return old.sha256;const sha256=hash(await readFile(file));checkedFiles.set(file,{key,sha256});return sha256;}
const pathFor=(id,scene)=>resolve(output,id,scene+'.png'),urlFor=(id,scene)=>'./assets/officers/generated/v3/'+id+'/'+scene+'.png';
const identityFile=id=>resolve(base,'identity',id+'.png');
function transparentFraction(bytes,width,height){
 if(bytes[24]!==8||bytes[25]!==6||bytes[28]!==0)throw Error('透明立绘须使用8位非交错RGBA PNG');
 const idat=[];for(let i=8;i+12<=bytes.length;){const n=bytes.readUInt32BE(i),type=bytes.subarray(i+4,i+8).toString();if(type==='IDAT')idat.push(bytes.subarray(i+8,i+8+n));i+=n+12;}
 const data=inflateSync(Buffer.concat(idat)),stride=width*4,prior=Buffer.alloc(stride),row=Buffer.alloc(stride);let empty=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const offset=y*(stride+1),filter=data[offset];if(filter>4)throw Error('PNG滤波无效');for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=prior[x],c=x>=4?prior[x-4]:0,v=data[offset+x+1];row[x]=(v+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;if(x%4===3&&row[x]<16)empty++;}row.copy(prior);}
 return empty/(width*height);
}
export function pngInfo(bytes,scene){
 if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(12,16).toString()!=='IHDR')throw Error('需提供生成器输出的完整PNG原图');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),def=OFFICER_ART_SCENES[scene];
 if(width<512||height<512||width>8192||height>8192)throw Error(`原图尺寸不符：${width}×${height}`);
 if(def&&Math.abs(width/height/(def.width/def.height)-1)>.08)throw Error(`${def.label}画幅不符：${width}×${height}；要求约${def.width}:${def.height}`);
 const info={width,height};if(def?.transparent){info.transparentFraction=transparentFraction(bytes,width,height);if(info.transparentFraction<.05)throw Error('立绘缺少真实透明背景，不能将白底或棋盘格画成背景');}
 return info;
}
async function validIdentities(){
 const identities=await optionalJSON(identityPath),valid={};for(const [id,entry] of Object.entries(identities)){if(!OFFICER_BY_ID[id]||!entry.approved)continue;try{if(await fileHash(identityFile(id))===entry.sha256)valid[id]=entry;}catch(e){if(e.code!=='ENOENT')throw e;}}return valid;
}
export function officerArtRole(id){return artRole(direction.profiles[id]);}
export function promptFor(officer,scene,{hasIdentity=true}={}){
 const p=direction.profiles[officer.id],role=officerArtRole(officer.id);if(!role)throw Error(`${officer.name}：先依据身份和传记记录美术类型，不能用兵种或能力值推断`);
 const s=OFFICER_ART_SCENES[scene],acting=direction.acting?.[officer.id]?.[scene];
 return [scene==='portrait'&&!hasIdentity?'Use case: historical-scene':'Use case: identity-preserve','人物：'+officer.name+' / '+officer.id,OFFICER_ART_STYLE,'人物类型：'+roleDescription(role),'身份：'+p.identity+' '+p.signature,scene==='portrait'&&!hasIdentity?'新建本人物的原创视觉身份，不借用其他人物的脸型；外貌与视觉年龄是美术设定，不宣称史实外貌。':'输入图仅作该人物身份与服饰参考，不锁定原图动作或表情。',OFFICER_ART_LOCK,`画幅：${s.width}×${s.height}，${s.format}，${s.transparent?'真实透明背景':'有场景背景'}。`,'场景含义：'+roleSceneBrief(role,scene),acting?'该人物独立表演（符合人物类型，并优先于通用示例手势）：'+acting:'基准阶段补充该人物的场景动作，用坐立、视线、道具和画幅区别用途，保持人物类型、神态中性与手势自然。'].filter(Boolean).join('\n');
}
async function refreshManifest(receipts){
 const identities=await validIdentities(),officers={};
 for(const [id,scenes] of Object.entries(receipts)){
  if(!identities[id])continue;
  for(const [scene,receipt] of Object.entries(scenes)){
   if(!OFFICER_ART_KEYS.includes(scene)||!receipt.approved||receipt.formatVersion!==OFFICER_ART_FORMAT_VERSION||receipt.styleVersion!==direction.styleVersion||receipt.masterSha256!==identities[id].sha256)continue;
   let sha256;try{sha256=await fileHash(pathFor(id,scene));}catch(e){if(e.code==='ENOENT')continue;throw e;}
   if(sha256!==receipt.sha256)continue;const s=OFFICER_ART_SCENES[scene];
   (officers[id]??={})[scene]={url:urlFor(id,scene),format:s.format,fit:s.fit,focus:s.focus,transparent:s.transparent,sha256:receipt.sha256,width:receipt.width,height:receipt.height};
  }
 }
 await writeFile(manifestPath,JSON.stringify({version:1,id:'original-officers',styleVersion:direction.styleVersion,formatVersion:OFFICER_ART_FORMAT_VERSION,officers},null,2)+'\n');return officers;
}
async function jobsFor(ids,receipts){
 const officers=await refreshManifest(receipts),identities=await validIdentities(),faces=await legacyFaceReferences(ids);
 return ids.flatMap(id=>OFFICER_ART_KEYS.map(scene=>{const def=OFFICER_ART_SCENES[scene],role=officerArtRole(id);return {id:id+':'+scene,officerId:id,name:OFFICER_BY_ID[id].name,scene,label:def.label,size:[def.width,def.height],format:def.format,transparent:def.transparent,dependsOn:scene==='portrait'?[]:[id+':portrait'],status:officers[id]?.[scene]?'complete':!role?'blocked-role':scene!=='portrait'&&!officers[id]?.portrait?'blocked-master':'pending',role,roleNeedsReview:!role,identityNeedsReview:!identities[id],sourceFaceReference:scene==='portrait'?faces[id]||null:null,output:relative(root,pathFor(id,scene)).replaceAll('\\','/'),reference:identities[id]?'assets/officers/identity/'+id+'.png':null,referenceSha256:identities[id]?.sha256||null,prompt:role?promptFor(OFFICER_BY_ID[id],scene,{hasIdentity:!!identities[id]}):null};}));
}
export async function officerArtSnapshot(){return refreshManifest(await optionalJSON(receiptsPath));}
export async function officerArtJobs(ids){return jobsFor(ids,await optionalJSON(receiptsPath));}
export async function run(args=process.argv.slice(2)){
 const [command='status',...rest]=args,receipts=await optionalJSON(receiptsPath);
 if(command==='identity'){
  const [id,input]=rest;if(!OFFICER_BY_ID[id]||!input||!rest.includes('--approve'))throw Error('用法：identity <武将ID> <已审阅原创身份图> --approve [--replace]');
  if(!officerArtRole(id))throw Error('先记录该人物的美术类型与传记依据，再登记身份图');
  const bytes=await readFile(resolve(input)),info=pngInfo(bytes),identities=await optionalJSON(identityPath),sha256=hash(bytes);
  if(identities[id]&&identities[id].sha256!==sha256&&!rest.includes('--replace'))throw Error('更换身份图需显式--replace，并重做场景身份QA');
  const refFlag=rest.indexOf('--reference-record'),referenceRecord=refFlag>=0?resolve(rest[refFlag+1]):null;
  if(referenceRecord){const r=await json(referenceRecord);if(r.officerId!==id||resolve(r.file)!==resolve(input)||!r.prompt)throw Error('身份来源记录不对应此人物与实际输入图');for(const ref of r.referenceInputs||[])if(await fileHash(resolve(ref.file))!==ref.sha256)throw Error('身份生成输入在登记前已变化');}
  await mkdir(dirname(identityFile(id)),{recursive:true});
  if(identities[id]&&identities[id].sha256!==sha256){try{const archive=resolve(base,'identity/archive',id+'-'+await fileHash(identityFile(id))+'.png');await mkdir(dirname(archive),{recursive:true});await copyFile(identityFile(id),archive);}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(resolve(input)!==identityFile(id))await copyFile(resolve(input),identityFile(id));
  identities[id]={approved:true,sha256,...info,source:'approved-original-character',tool:'built-in-imagegen',...(referenceRecord?{referenceRecord:relative(root,referenceRecord).replaceAll('\\','/')}:{})};await writeFile(identityPath,JSON.stringify(identities,null,2)+'\n');console.log(OFFICER_BY_ID[id].name+' 身份参考已登记');return;
 }
 if(command==='import'){
  const [id,scene,input]=rest;if(!OFFICER_BY_ID[id]||!OFFICER_ART_KEYS.includes(scene)||!input)throw Error('用法：import <武将ID> <场景> <PNG路径> --approve --prompt-file <实际提示词> [--replace]');
  const role=officerArtRole(id);if(!role)throw Error('先记录该人物的美术类型与传记依据，再导入素材');
  if(!rest.includes('--approve'))throw Error('先检查身份、中性神态、自然姿态、取景画幅和透明边缘，再加--approve登记');
  const bytes=await readFile(resolve(input)),info=pngInfo(bytes,scene),old=receipts[id]?.[scene],sha256=hash(bytes);
  if(old?.formatVersion===OFFICER_ART_FORMAT_VERSION&&old.sha256!==sha256&&!rest.includes('--replace'))throw Error('已有不同素材；明确更换后使用--replace');
  let identities=await validIdentities();if(!identities[id]){if(scene!=='portrait')throw Error('先登记身份图或导入已审阅独立头像');await run(['identity',id,input,'--approve']);identities=await validIdentities();}
  const current=await refreshManifest(receipts);if(scene!=='portrait'&&!current[id]?.portrait)throw Error('先导入该人物本批独立头像，再生成其余场景');
  const flag=rest.indexOf('--prompt-file');if(flag<0||!rest[flag+1])throw Error('导入须记录实际使用的提示词：--prompt-file <文件>');
  const prompt=await readFile(resolve(rest[flag+1]),'utf8'),target=pathFor(id,scene);await mkdir(dirname(target),{recursive:true});
  if(resolve(input)!==target){await copyFile(resolve(input),target+'.incoming');await rename(target+'.incoming',target);}
  (receipts[id]??={})[scene]={approved:true,tool:'built-in-imagegen',styleVersion:direction.styleVersion,formatVersion:OFFICER_ART_FORMAT_VERSION,sha256,masterSha256:identities[id].sha256,...info,prompt,role,qa:direction.qa};
  await writeFile(receiptsPath,JSON.stringify(receipts,null,2)+'\n');await refreshManifest(receipts);console.log(`${OFFICER_BY_ID[id].name} · ${OFFICER_ART_SCENES[scene].label} ${info.width}×${info.height} 已接入`);return;
 }
 if(['plan','status','next','gallery'].includes(command)){
  const flag=rest.indexOf('--officers'),ids=rest.includes('--all')?OFFICER_CATALOG.map(o=>o.id):flag>=0?(rest[flag+1]||'').split(','):command==='gallery'?[...new Set([...direction.priority,...Object.keys(await officerArtSnapshot())])]:direction.priority;
  if(ids.some(id=>!OFFICER_BY_ID[id]))throw Error('未知武将ID：'+ids.filter(id=>!OFFICER_BY_ID[id]).join(','));
  const jobs=await jobsFor([...new Set(ids)],receipts),counts=jobs.reduce((a,j)=>(a[j.status]=(a[j.status]||0)+1,a),{});
  if(command==='plan'){const file=resolve(base,rest.includes('--all')?'queue-all.jsonl':'queue.jsonl');await writeFile(file,jobs.map(j=>JSON.stringify(j)).join('\n')+'\n');console.log(JSON.stringify({officers:ids.length,jobs:jobs.length,counts,queue:relative(root,file)},null,2));return;}
  if(command==='next'){console.log(JSON.stringify(jobs.find(j=>j.status==='pending')||jobs.find(j=>j.status==='blocked-role')||jobs.find(j=>j.status==='blocked-master')||{status:'complete'},null,2));return;}
  if(command==='gallery'){
   const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
   const cells=ids.map(id=>`<section data-officer-id="${id}"><h2>${esc(OFFICER_BY_ID[id].name)} <small>${id}</small></h2><div class="grid">${jobs.filter(j=>j.officerId===id).map(j=>{const def=OFFICER_ART_SCENES[j.scene],r=receipts[id]?.[j.scene];return `<figure class="${def.width>def.height?'wide':def.height/def.width>1.7?'standee':'tall'}"><figcaption><b>${j.label}</b><span>${def.format} · ${r?.formatVersion===OFFICER_ART_FORMAT_VERSION?r.width+'×'+r.height:def.width+'×'+def.height}${def.transparent?' · 透明':''}</span></figcaption>${j.status==='complete'?`<a class="art-preview ${def.transparent?'alpha':''}" style="aspect-ratio:${r.width}/${r.height}" href="generated/v3/${id}/${j.scene}.png" target="_blank"><img src="generated/v3/${id}/${j.scene}.png" alt="${esc(j.name+' · '+j.label)}" loading="lazy"></a>`:'<div class="empty">待生成</div>'}</figure>`;}).join('')}</div></section>`).join('');
   await writeFile(resolve(base,'gallery.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>武将多场景美术</title><style>body{background:#142521;color:#eee1c8;font:16px system-ui;margin:28px}h1{font:36px serif}small,p,figcaption span{color:#b7b8a5}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px 16px;align-items:start}.tall{grid-column:span 2}.standee{grid-column:span 1}.wide{grid-column:span 3}figure{margin:0}figcaption{padding:10px 0;display:flex;flex-direction:column;gap:5px}figcaption span{font-size:12px}.art-preview{display:block}.art-preview img{width:100%;height:100%;object-fit:contain;display:block}.alpha{background-color:#c4c6bc;background-image:linear-gradient(45deg,#e8e7dd 25%,transparent 25%),linear-gradient(-45deg,#e8e7dd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8e7dd 75%),linear-gradient(-45deg,transparent 75%,#e8e7dd 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.empty{min-height:180px;background:#213a32;display:grid;place-items:center}@media(max-width:900px){.grid{grid-template-columns:repeat(4,1fr)}.tall{grid-column:span 2}.standee{grid-column:span 1}.wide{grid-column:span 4}}@media(max-width:450px){body{margin:16px}.grid{grid-template-columns:repeat(2,1fr)}.tall{grid-column:span 1}.standee{grid-column:span 1}.wide{grid-column:span 2}}</style><h1>武将多场景美术</h1><p>头像、透明全身立绘、半身办事像与横幅场景分别设计。身份一致，神态中性，动作克制；场景通过坐立、道具、视线和画幅区分。点击原图查看完整画幅。</p>${cells}</html>`);console.log(resolve(base,'gallery.html'));return;
  }
  console.log(JSON.stringify({officers:ids.length,jobs:jobs.length,counts},null,2));return;
 }
 throw Error('命令：identity / plan / status / next / import / gallery');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
