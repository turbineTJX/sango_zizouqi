import {readFile,writeFile,mkdir,copyFile,rename} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {OFFICER_ART_KEYS,OFFICER_ART_SCENES,OFFICER_ART_FORMAT_VERSION} from '../officer-art-scenes.mjs';
import {run,officerArtSnapshot,officerArtJobs,officerArtRole,pngInfo} from './officer-art.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),base=resolve(root,'assets/officers'),dir=resolve(base,'batches');
const readJSON=async p=>JSON.parse(await readFile(p,'utf8'));
const optional=async(p,fallback)=>{try{return await readJSON(p);}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const writeJSON=async(p,value)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p+'.incoming',JSON.stringify(value,null,2)+'\n');await rename(p+'.incoming',p);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const rel=p=>relative(root,p).replaceAll('\\','/');
const batchPath=id=>{if(!/^batch-\d{4,}$/.test(id))throw Error('无效批次ID');return resolve(dir,id+'.json');};
export function selectOfficers(manifest,priority,catalog,limit){
 if(!Number.isInteger(limit)||limit<1||limit>12)throw Error('每批人数须为1至12');
 const ids=[...new Set([...priority,...catalog.map(o=>o.id)])];
 return ids.filter(id=>catalog.some(o=>o.id===id)&&!OFFICER_ART_KEYS.every(s=>manifest[id]?.[s])).slice(0,limit);
}
function counts(batch){return batch.jobs.reduce((a,j)=>(a[j.status]=(a[j.status]||0)+1,a),{});}
function reportBatch(b){console.log(JSON.stringify({id:b.id,status:b.status,officerIds:b.officerIds,jobs:b.jobs.length,counts:counts(b),file:rel(batchPath(b.id))},null,2));return b;}
async function loadBatch(id){const b=await readJSON(batchPath(id));if(b.formatVersion!==OFFICER_ART_FORMAT_VERSION)throw Error('批次规范已变化，先复核旧候选素材');return b;}
export function batchJobStatus(j,manifest){
 if(manifest[j.officerId]?.[j.scene])return 'complete';
 if(j.roleNeedsReview)return 'blocked-role';
 if(j.candidate)return j.scene!=='portrait'&&j.candidate.referenceSha256!==j.referenceSha256?'stale-identity':'candidate';
 return j.scene==='portrait'||manifest[j.officerId]?.portrait?'pending':'blocked-master';
}
async function refreshBatch(b,manifest){
 const fresh=new Map((await officerArtJobs(b.officerIds)).map(j=>[j.id,j]));
 for(const j of b.jobs){Object.assign(j,fresh.get(j.id));j.status=batchJobStatus(j,manifest);}
 b.status=b.jobs.every(j=>j.status==='complete')?'complete':'active';await writeJSON(batchPath(b.id),b);return b;
}
async function identities(){return optional(resolve(base,'identities.json'),{});}
async function currentIndex(){return optional(resolve(dir,'index.json'),{version:1,active:null,batches:[]});}
export async function runBatch(args=process.argv.slice(2)){
 const [command='status',...rest]=args;
 if(command==='plan'){
  const index=await currentIndex(),manifest=await officerArtSnapshot();
  if(index.active){const active=await refreshBatch(await loadBatch(index.active),manifest);if(active.status!=='complete')return reportBatch(active);index.active=null;}
  const flag=rest.indexOf('--limit'),limit=flag<0?3:Number(rest[flag+1]),direction=await readJSON(resolve(base,'art-direction.json'));
  const officerIds=selectOfficers(manifest,direction.priority,OFFICER_CATALOG,limit);
  if(!officerIds.length){console.log(JSON.stringify({status:'complete',officers:OFFICER_CATALOG.length,jobs:OFFICER_CATALOG.length*OFFICER_ART_KEYS.length}));return null;}
  const id='batch-'+String(index.batches.length+1).padStart(4,'0'),jobs=await officerArtJobs(officerIds);
  const b={version:1,id,status:'active',formatVersion:OFFICER_ART_FORMAT_VERSION,styleVersion:direction.styleVersion,officerIds,jobs:jobs.map(j=>({...j,candidate:null,attempts:[]}))};
  await writeJSON(batchPath(id),b);index.active=id;index.batches.push(id);await writeJSON(resolve(dir,'index.json'),index);return reportBatch(b);
 }
 if(command==='record'){
  const [id,resultFile]=rest,b=await loadBatch(id),r=await readJSON(resolve(resultFile));
  const j=b.jobs.find(j=>j.officerId===r.officerId&&j.scene===r.scene);if(!j)throw Error('生成结果不属于此批次');
  if(!officerArtRole(j.officerId))throw Error('先依据身份与传记记录该人物美术类型，再生成和登记候选');
  if(j.status==='complete')throw Error('已完成素材不重复生成或覆盖');
  if(typeof r.prompt!=='string'||!r.prompt.trim()||typeof r.file!=='string'||r.file.startsWith('data:'))throw Error('须记录实际提示词和生成器保存的PNG路径；不能把data URL当成路径');
  const bytes=await readFile(resolve(r.file)),info=pngInfo(bytes,j.scene),sha256=hash(bytes),masters=await identities(),master=masters[j.officerId];
  if(j.scene!=='portrait'&&!master?.approved)throw Error('先审阅并接入独立头像');
  if(j.scene!=='portrait'&&r.referenceSha256!==master.sha256)throw Error('生成时的身份哈希与当前身份不一致');
  if(j.candidate?.sha256===sha256)return b;
  if(j.candidate&&!rest.includes('--replace'))throw Error('更换候选素材须使用--replace并记录新实际提示词');
  const target=resolve(base,'candidates',id,j.officerId,j.scene+'-'+String(j.attempts.length+1).padStart(2,'0')+'.png');await mkdir(dirname(target),{recursive:true});await copyFile(resolve(r.file),target);
  j.candidate={file:rel(target),sha256,...info,prompt:r.prompt,referenceSha256:master?.sha256||null,tool:'built-in-imagegen'};j.attempts.push({sha256,file:rel(target)});j.status='candidate';await writeJSON(batchPath(id),b);console.log(`${j.name} · ${j.label} 已记录候选原图`);return b;
 }
 if(command==='accept'){
  const [id]=rest,b=await loadBatch(id);if(!rest.includes('--reviewed'))throw Error('目视检查身份、中性神态、自然姿态、画幅和透明边缘后，加--reviewed登记');
  const scope=flag=>{const i=rest.indexOf(flag);return i<0?null:(rest[i+1]||'').split(',');},officers=scope('--officers'),scenes=scope('--scenes');
  const selected=b.jobs.filter(j=>j.status==='candidate'&&(!officers||officers.includes(j.officerId))&&(!scenes||scenes.includes(j.scene))).sort((a,b)=>(a.scene!=='portrait')-(b.scene!=='portrait'));
  for(const j of selected){
   const c=j.candidate,bytes=await readFile(resolve(root,c.file));if(hash(bytes)!==c.sha256)throw Error('候选图在审阅后被改变');pngInfo(bytes,j.scene);
   const masters=await identities();if(j.scene!=='portrait'&&masters[j.officerId]?.sha256!==c.referenceSha256)throw Error('身份参考已改变，先重新审阅候选图');
   const promptFile=resolve(dir,id+'-'+j.officerId+'-'+j.scene+'-prompt.txt');await writeFile(promptFile,c.prompt+'\n');await run(['import',j.officerId,j.scene,resolve(root,c.file),'--approve','--prompt-file',promptFile]);
   j.status='complete';await writeJSON(batchPath(id),b);
  }
  await refreshBatch(b,await officerArtSnapshot());console.log(JSON.stringify({id:b.id,status:b.status,counts:counts(b)}));return b;
 }
 if(command==='finish'){
  const [id]=rest,b=await refreshBatch(await loadBatch(id),await officerArtSnapshot());if(b.status!=='complete')throw Error('此批次还有未完成任务：'+JSON.stringify(counts(b)));
  const index=await currentIndex();if(index.active===id)index.active=null;await writeJSON(resolve(dir,'index.json'),index);await run(['plan','--all']);await run(['gallery']);console.log(JSON.stringify({id,status:'complete',images:b.jobs.length}));return b;
 }
 if(command==='review'){
  const [id]=rest,b=await loadBatch(id),manifest=await officerArtSnapshot(),portraits=rest.includes('--portraits'),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const cards=b.officerIds.map(officerId=>`<section><h2>${esc(OFFICER_BY_ID[officerId].name)}</h2><div class="grid">${b.jobs.filter(j=>j.officerId===officerId&&(!portraits||j.scene==='portrait')).map(j=>{const e=j.status==='complete'?manifest[officerId]?.[j.scene]:j.candidate,src=e?.url?e.url.replace('./assets/','../../'):e?.file?'../../'+e.file.replace('assets/',''):null,s=OFFICER_ART_SCENES[j.scene];return `<figure class="${s.width>s.height?'wide':s.height/s.width>1.7?'standee':'tall'}"><figcaption>${esc(j.label)} · ${esc(j.status)}${e?' · '+e.width+'×'+e.height:''}</figcaption>${src?`<a class="image ${s.transparent?'alpha':''}" style="aspect-ratio:${e.width}/${e.height}" href="${src}" target="_blank"><img src="${src}" alt="${esc(j.name+' '+j.label)}"></a>`:'<div class="empty">待生成</div>'}</figure>`;}).join('')}</div></section>`).join('');
  const file=resolve(dir,id+'-review.html');await writeFile(file,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>人物素材审阅</title><style>body{background:#142521;color:#eee1c8;font:15px system-ui;margin:24px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px 16px;align-items:start}.tall{grid-column:span 2}.standee{grid-column:span 1}.wide{grid-column:span 3}figure{margin:0}figcaption{padding:10px 0}.image{display:block}.image img{width:100%;height:100%;object-fit:contain;display:block}.alpha{background:repeating-conic-gradient(#ddd 0% 25%,#aaa 0% 50%) 0/20px 20px}.empty{height:80px;background:#213a32;display:grid;place-items:center}${portraits?'.officers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.officers .grid{display:block}':''}@media(max-width:700px){.grid,.officers{grid-template-columns:repeat(2,1fr)}.wide{grid-column:span 2}.tall{grid-column:span 1}}</style><h1>${id} 人物素材审阅</h1><p>检查身份、自然中性神态、手部与装备、场景构图和完整画幅。候选图不会因生成完成自动进入游戏。</p><main class="officers">${cards}</main></html>`);console.log(rel(file));return file;
 }
 if(command==='status'){
  const manifest=await officerArtSnapshot(),index=await currentIndex(),complete=Object.values(manifest).reduce((n,s)=>n+Object.keys(s).length,0),active=index.active?await refreshBatch(await loadBatch(index.active),manifest):null;
  const result={officers:OFFICER_CATALOG.length,jobs:OFFICER_CATALOG.length*OFFICER_ART_KEYS.length,complete,remaining:OFFICER_CATALOG.length*OFFICER_ART_KEYS.length-complete,completedOfficers:OFFICER_CATALOG.filter(o=>OFFICER_ART_KEYS.every(s=>manifest[o.id]?.[s])).length,active:active?{id:active.id,officerIds:active.officerIds,counts:counts(active)}:null};console.log(JSON.stringify(result,null,2));return result;
 }
 throw Error('命令：plan [--limit 3] / record <批次> <结果JSON> / review <批次> / accept <批次> --reviewed [--scenes portrait] / finish <批次> / status');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runBatch();
