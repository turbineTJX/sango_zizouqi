import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sourceOfflineManifest} from './source-offline-manifest.mjs';
import {loadManualContent} from './player-manual-content.mjs';

export const BASELINE='docs/manual/reviewed-code.json';
export const REPORT='docs/manual/sync-status.json';
export const HTML='docs/玩家行动交互图册.html';
export const sha=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const ordered=object=>Object.fromEntries(Object.entries(object).sort(([a],[b])=>a.localeCompare(b,'en')));
const normalize=text=>text.replace(/\r\n/g,'\n');

// Use the application's import/CSS/worker graph, including new imports.
// Unclassified runtime sources conservatively affect every workflow.
export async function runtimeSources(root){
 const graph=await sourceOfflineManifest(root),sources={},files=new Set(Object.keys(graph.hashes));
 // Some design tables are compiled into the startup data pack instead of being
 // imported directly by app.js. Keep those original sources in the inventory.
 async function scan(dir){
  const entries=await readdir(resolve(root,dir),{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  for(const entry of entries){const path=dir+'/'+entry.name;if(entry.isDirectory())await scan(path);else if(/\.(mjs|json)$/.test(path))files.add(path);}
 }
 await scan('data');
 for(const path of [...files].sort()){
  if(path==='source-offline-files.js')continue;
  const bytes=await readFile(resolve(root,path));
  sources[path]=sha(/\.(mjs|js|css|html|json|svg|webmanifest)$/.test(path)?normalize(bytes.toString('utf8')):bytes);
 }
 return ordered(sources);
}

export function bindActions(chapters,links){
 assert.equal(links.version,1,'Unsupported manual code-link version');
 const actions=chapters.flatMap(c=>c.actions.map(a=>({...a,chapter:c.name}))),names=new Set(actions.map(a=>a.name));
 const chapterNames=new Set(chapters.map(c=>c.name));
 const claimed=new Set(links.shared),bindings={};
 const matches=(group,action)=>((group.actions||[]).includes(action.name)||(group.chapters||[]).includes(action.chapter))&&!(group.exclude||[]).includes(action.name);
 for(const group of links.groups){
  assert.ok(group.sources?.length,'Empty code group: '+group.name);
  for(const name of [...group.actions||[],...group.exclude||[]])assert.ok(names.has(name),'Unknown manual action in code-links: '+name);
  for(const name of group.chapters||[])assert.ok(chapterNames.has(name),'Unknown chapter in code-links: '+name);
  assert.ok(actions.some(action=>matches(group,action)),'Code group has no workflows: '+group.name);
  group.sources.forEach(path=>claimed.add(path));
 }
 for(const action of actions){
  const groups=links.groups.filter(g=>matches(g,action));
  assert.ok(groups.length,'Missing code links: '+action.name);
  bindings[action.id]={groups:groups.map(g=>g.name),sources:[...new Set([...links.shared,...groups.flatMap(g=>g.sources)])].sort()};
 }
 return {actions,bindings,claimed:[...claimed].sort(),hash:sha(JSON.stringify(links))};
}

export function assessManual({actions,bindings,claimed,hash},sources,contentHashes,baseline){
 const missing=claimed.filter(path=>!sources[path]);
 const snapshots=baseline?.snapshots||{},reviews=baseline?.actions||{},claimedSet=new Set(claimed);
 const items=actions.map(action=>{
  const review=reviews[action.id],previous=review&&snapshots[review.revision];
  const related=new Set(bindings[action.id].sources);
  // Include removed unclassified files as well as newly imported ones.
  const files=new Set([...Object.keys(sources),...Object.keys(previous||{})]);
  const changes=previous?[...files].filter(path=>(related.has(path)||!claimedSet.has(path))&&sources[path]!==previous[path]).sort():[];
  const reasons=[];
  if(!previous)reasons.push('尚未建立核对记录');
  if(review&&review.bindingHash!==hash)reasons.push('代码关联清单已修改');
  if(review&&review.contentHash!==contentHashes[action.id])reasons.push('步骤或截图已修改');
  if(changes.length)reasons.push('关联代码已修改');
  const absent=bindings[action.id].sources.filter(path=>missing.includes(path));
  if(absent.length)reasons.push('关联代码缺失：'+absent.join('、'));
  return {id:action.id,name:action.name,pending:!!reasons.length,reasons,changes,
   groups:bindings[action.id].groups,sources:bindings[action.id].sources,
   reviewedAt:review?.reviewedAt||null,note:review?.note||'',screenshots:review?.screenshots||null};
 });
 return {version:1,pending:items.filter(i=>i.pending).length,missing,items};
}

export async function readManualState(root,{sourceProvider=runtimeSources,contentLoader=loadManualContent}={}){
 const content=await contentLoader(root);
 const links=JSON.parse(await readFile(resolve(root,'docs/manual/code-links.json'),'utf8'));
 const binding=bindActions(content.chapters,links),sources=await sourceProvider(root);
 let baseline=null;
 try{baseline=JSON.parse(await readFile(resolve(root,BASELINE),'utf8'));assert.equal(baseline.version,1,'Unsupported manual review version');}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const imageHashes={};
 for(const id of content.used)imageHashes[id]=sha(await readFile(resolve(root,'docs',content.captures[id].file)));
 const contentHashes={};
 for(const action of binding.actions)contentHashes[action.id]=sha(JSON.stringify({name:action.name,chapter:action.chapter,steps:action.steps,note:action.note,
  images:action.images.map(id=>({id,hash:imageHashes[id],capture:content.captures[id]}))}));
 const status=assessManual(binding,sources,contentHashes,baseline);
 for(const item of status.items)item.captureGroups=[...new Set(binding.actions.find(a=>a.id===item.id).images.map(id=>content.captures[id].group))].sort();
 return {root,content,binding,sources,contentHashes,baseline,status};
}

// Only explicit review may change acceptance fingerprints. Rendering, checking,
// watching and capturing never call this function automatically.
export async function reviewManual(state,{ids,note,screenshots,now=new Date().toISOString()}){
 assert.ok(note?.trim().length>=8,'请用 --note 记录核对结论（至少 8 个字）。');
 assert.ok(['unchanged','recaptured'].includes(screenshots),'请指定 --screenshots unchanged 或 recaptured。');
 assert.equal(state.status.missing.length,0,'修复缺失的代码关联后才能核对：'+state.status.missing.join('、'));
 assert.ok(ids?.length,'请指定要核对的行动 ID 或 --all。');
 const available=new Set(state.binding.actions.map(a=>a.id));
 for(const id of ids)assert.ok(available.has(id),'Unknown action ID: '+id);
 const next=structuredClone(state.baseline||{version:1,snapshots:{},actions:{}}),revision=sha(JSON.stringify(state.sources));
 next.snapshots[revision]=state.sources;
 for(const id of ids)next.actions[id]={revision,bindingHash:state.binding.hash,contentHash:state.contentHashes[id],reviewedAt:now,note:note.trim(),screenshots};
 for(const id of Object.keys(next.actions))if(!available.has(id))delete next.actions[id];
 const revisions=new Set(Object.values(next.actions).map(a=>a.revision));
 for(const key of Object.keys(next.snapshots))if(!revisions.has(key))delete next.snapshots[key];
 await writeFile(resolve(state.root,BASELINE),json(next));
 return next;
}

export function formatManualStatus(status){
 if(!status.pending)return 'PASS 手册代码关联：全部行动已核对。';
 const lines=[`手册有 ${status.pending} 项操作待核对（步骤与截图）：`],batches=new Set();
 for(const item of status.items.filter(i=>i.pending)){
  lines.push(`- ${item.id} ${item.name}：${item.reasons.join('；')}`);
  const key=item.changes.join('、');
  if(key&&!batches.has(key)){batches.add(key);lines.push('  变化文件：'+key);}
 }
 const groups=[...new Set(status.items.filter(i=>i.pending).flatMap(i=>i.captureGroups||[]))].sort();
 if(groups.length)lines.push('按需重拍：'+groups.map(g=>`node scripts/capture-action-guide.mjs ${g}`).join('\n          '));
 lines.push('更新步骤／截图后，逐项核对；无界面影响也需记录理由。详见 docs/玩家行动交互流程.md 的 HTML 手册维护。');
 return lines.join('\n');
}

export async function renderManual(state,{check=false}={}){
 const {content,status}=state,{chapters,captures,used,reference,actions}=content;
 const payload={date:'2026-10-29',chapters,captures:Object.fromEntries(used.map(id=>[id,captures[id]])),maintenance:status};
 const template=await readFile(resolve(state.root,'docs/manual/template.html'),'utf8');
 assert.equal(template.split('/*__MANUAL_DATA__*/').length,2,'Expected one manual data placeholder');
 const html=template.replace('/*__MANUAL_DATA__*/',JSON.stringify(payload).replace(/</g,'\\u003c'));
 const coverage={date:payload.date,workflows:actions.length,chapters:chapters.length,screenshots:used.length,referenceHash:sha(normalize(reference)),items:actions.map(a=>({id:a.id,name:a.name,screenshots:a.images}))};
 const outputs=[[HTML,html],['docs/manual/coverage.json',json(coverage)],[REPORT,json(status)]];
 const outdated=[];
 for(const [path,expected]of outputs){
  const current=await readFile(resolve(state.root,path),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(current!==expected){outdated.push(path);if(!check)await writeFile(resolve(state.root,path),expected);}
 }
 return {outdated,valid:!status.pending&&(!check||!outdated.length)};
}
