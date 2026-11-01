import {NATIONAL_SCENARIOS,registerCustomScenario} from './national-scenarios.mjs';
import {createScenarioDocument,validateScenarioDocument,scenarioDocumentErrors,newScenarioId} from './scenario-document.mjs';
import {emptyScenarioLibrary,openScenarioLibrary,validateScenarioLibrary,importScenarioDocument} from './scenario-library.mjs';
import {exportSaveFile} from './runtime-platform.mjs';
import {currentOfficerLibrary} from './officer-catalog.mjs';
import {scenarioEditorPanel,changeScenarioField,scenarioAdvancedAction} from './scenario-editor-panels.mjs';
import {preflightScenario} from './scenario-preflight.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='',classes='button secondary')=>`<button class="${classes}" data-se-action="${action}" ${extra}>${label}</button>`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);


export class ScenarioEditor{
 constructor({library=emptyScenarioLibrary(),storage=null,onRender=()=>{},onMessage=()=>{},onBack=()=>{},onPlay=()=>{},getOfficerLibrary=()=>currentOfficerLibrary(),warning=''}={}){
  Object.assign(this,{library,storage,onRender,onMessage,onBack,onPlay,getOfficerLibrary,warning});this.draft=structuredClone(library.draft||createScenarioDocument());this.tab='overview';this.query='';this.page=0;this.cityId=this.draft.cities[0].id;this.officerId=null;this.writeQueue=Promise.resolve();this.pending=null;this.busy=false;this.history=[];this.future=[];this.sort='name';this.direction='asc';
 }
 get dirty(){return !same(this.draft,this.library.scenarios.find(d=>d.id===this.draft.id));}
 async mutate(operation){
  const task=this.writeQueue.catch(()=>{}).then(async()=>{if(!this.storage)throw Error('本机剧本存储不可用，请导出保留作品');const next=validateScenarioLibrary(operation(this.library));await this.storage.write(next);this.library=next;});this.writeQueue=task;return task;
 }
 async persistDraft(){clearTimeout(this.timer);const draft=validateScenarioDocument(this.draft,{playable:false});await this.mutate(l=>({...l,draft}));}
 changed(){this.notice='';clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.persistDraft().catch(e=>{this.warning=e.message;this.onRender();});},350);}
 remember(before){if(same(before,this.draft))return;this.history.push(before);if(this.history.length>60)this.history.shift();this.future=[];}
 async save(){
  clearTimeout(this.timer);const document=validateScenarioDocument(this.draft);
  preflightScenario(document);
  await this.mutate(l=>({...l,draft:document,scenarios:[...l.scenarios.filter(d=>d.id!==document.id),document]}));this.draft=document;this.warning='';this.notice='已保存';this.onMessage('剧本已保存');return document;
 }
 load(id){
  this.draft=structuredClone(this.library.scenarios.find(d=>d.id===id)||createScenarioDocument(id));this.cityId=this.draft.cities[0].id;this.officerId=null;this.query='';this.page=0;this.pending=null;this.warning='';this.history=[];this.future=[];this.changed();
 }
 change(field,value){
  if(['query','cityId','officerId'].includes(field)){this[field]=value;if(field==='query')this.page=0;return;}
  const before=structuredClone(this.draft);changeScenarioField(this,field,value);this.remember(before);if(this.storage)this.warning='';this.changed();
 }
 async action(action,el,root){
  if(this.busy)return;
  try{
   this.busy=true;if(root)root.inert=true;
   if(scenarioAdvancedAction(this,action,el,root))return;
   if(action==='back'){await this.persistDraft();this.onBack();return;}
   if(action==='leave'){this.onBack();return;}
   if(action==='save')await this.save();
   if(action==='play'){const document=await this.save();this.onPlay(registerCustomScenario(document));return;}
   if(action==='copy'){this.draft={...structuredClone(this.draft),id:newScenarioId(),name:this.draft.name.slice(0,44)+' 副本'};this.history=[];this.future=[];this.changed();}
   if(action==='undo'&&this.history.length){this.future.push(structuredClone(this.draft));this.draft=this.history.pop();this.changed();}
   if(action==='redo'&&this.future.length){this.history.push(structuredClone(this.draft));this.draft=this.future.pop();this.changed();}
   if(action==='sort'){this.direction=this.sort===el.dataset.key&&this.direction==='asc'?'desc':'asc';this.sort=el.dataset.key;this.page=0;}
   if(action==='load'){if(this.dirty)this.pending={type:'load',id:el.dataset.id};else this.load(el.dataset.id);}
   if(action==='confirm-load')this.load(this.pending.id);
   if(action==='confirm-import')await this.acceptImport(this.pending.document);
   if(action==='tab'){this.tab=el.dataset.tab;this.query='';this.page=0;}
   if(action==='city')this.cityId=el.dataset.id;
   if(action==='officer')this.officerId=el.dataset.id;
   if(action==='page')this.page=Math.max(0,this.page+Number(el.dataset.delta));
   if(action==='delete')this.pending={type:'delete',id:el.dataset.id};
   if(action==='confirm-delete'){const id=this.pending.id;await this.mutate(l=>({...l,scenarios:l.scenarios.filter(d=>d.id!==id)}));this.pending=null;this.notice='已删除，当前草稿仍可保存';}
   if(action==='cancel')this.pending=null;
   if(action==='import'){root.querySelector('[data-se-import]').click();return;}
   if(action==='export'){const d=validateScenarioDocument(this.draft);await exportSaveFile('剧本-'+d.name.replace(/[\\/:*?"<>|]/g,'_')+'.json',JSON.stringify(d,null,2));this.notice='已导出';}
  }catch(e){this.warning=e.message;this.onMessage(e.message);}
  finally{if(root)root.inert=false;this.busy=false;this.onRender();}
 }
 async acceptImport(document){
  await this.mutate(l=>importScenarioDocument(l,document));this.draft=structuredClone(this.library.draft);this.cityId=this.draft.cities[0].id;this.history=[];this.future=[];this.pending=null;this.warning='';this.changed();this.onMessage('剧本已导入');
 }
 async importFile(file){
  if(!file||this.busy)return;try{this.busy=true;if(file.size>2*1024*1024)throw Error('剧本文件不能超过2 MiB');const document=validateScenarioDocument(JSON.parse(await file.text()));if(this.dirty)this.pending={type:'import',document};else await this.acceptImport(document);}catch(e){this.warning=e.message;this.onMessage(e.message);}finally{this.busy=false;this.onRender();}
 }
 unmount(){this.cleanup?.();this.cleanup=null;}
 mount(container){
  this.unmount();const root=container.querySelector('.scenario-editor');if(!root)return;
  this.detailStates??={};const details=[...root.querySelectorAll('details')];details.forEach((d,i)=>{const key=this.tab+':'+i;if(key in this.detailStates)d.open=this.detailStates[key];});
  const toggle=e=>{const i=details.indexOf(e.target);if(i>=0)this.detailStates[this.tab+':'+i]=e.target.open;};root.addEventListener('toggle',toggle,true);
  const refresh=()=>{let errors;try{validateScenarioDocument(this.draft,{playable:false});errors=scenarioDocumentErrors(this.draft);}catch(e){errors=[e.message];}for(const action of ['save','play','export']){const button=root.querySelector(`[data-se-action="${action}"]`);if(button)button.disabled=errors.length>0;}root.querySelector('[data-se-status]').textContent='草稿';const status=root.querySelector('.scenario-editor-errors');status.innerHTML=`<summary>${errors.length?'待修正 '+errors.length+' 项':'开局检查通过'}</summary>${errors.slice(0,12).map(e=>`<p role="alert">${esc(e)}</p>`).join('')}`;status.open=errors.length>0;if(['officers','factions'].includes(this.tab)){const template=document.createElement('template');template.innerHTML=scenarioEditorPanel(this);const table=root.querySelector('.scenario-editor-table'),nextTable=template.content.querySelector('.scenario-editor-table');if(table&&nextTable){const x=table.scrollLeft,y=table.scrollTop;table.innerHTML=nextTable.innerHTML;table.scrollLeft=x;table.scrollTop=y;}}};
  const click=e=>{const el=e.target.closest('[data-se-action]');if(!el)return;e.preventDefault();e.stopPropagation();void this.action(el.dataset.seAction,el,root);};
  const change=e=>{if(e.target.matches('[data-se-import]')){void this.importFile(e.target.files[0]);return;}const field=e.target.dataset.seField;if(field){this.change(field,e.target.type==='checkbox'?e.target.checked:e.target.value);if(e.target.tagName==='SELECT'||e.target.type==='checkbox')this.onRender();else refresh();}};
  const input=e=>{const field=e.target.dataset.seField;if(['name','description'].includes(field)){this.change(field,e.target.value);root.querySelector('[data-se-status]').textContent='草稿';}if(field==='query'){const at=e.target.selectionStart;this.change(field,e.target.value);this.onRender();const q=container.querySelector('[data-se-field="query"]');q?.focus();q?.setSelectionRange(at,at);}};
  const key=e=>{const el=e.target.closest('g[data-se-action]');if(el&&['Enter',' '].includes(e.key)){e.preventDefault();void this.action(el.dataset.seAction,el,root);}};
  root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('keydown',key);this.cleanup=()=>{root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('keydown',key);root.removeEventListener('toggle',toggle,true);};
 }
 markup(){
  const d=this.draft;
  let errors;try{validateScenarioDocument(d,{playable:false});errors=scenarioDocumentErrors(d);}catch(e){errors=[e.message];}
  const body=scenarioEditorPanel(this);
  const pending=this.pending?`<div class="scenario-editor-confirm" role="alert"><p>${['load','import'].includes(this.pending.type)?'切换会替换当前草稿，请先保存需要保留的修改。':this.pending.type==='delete'?'删除此剧本？已有游戏进度仍可继续。':'移除该势力及其开局安排？'}</p>${button('cancel','取消')}${button('confirm-'+(this.pending.type==='faction'?'faction':this.pending.type),'确认')}</div>`:'';
  return `<main class="campaign-lobby scenario-editor"><header class="lobby-nav"><h1>剧本编辑器</h1><span data-se-status>${this.dirty?'草稿':'已保存'}</span>${button('back','返回')}<button class="button primary" data-se-action="play" ${errors.length?'disabled':''}>选择势力</button></header><div class="scenario-editor-workspace"><aside class="scenario-editor-library ui-panel"><div class="ui-panel-body"><h2>剧本目录</h2><details open><summary>内置模板</summary>${NATIONAL_SCENARIOS.map(s=>button('load',esc(s.name),`data-id="${s.id}"`)).join('')}</details><details open><summary>我的剧本（${this.library.scenarios.length}）</summary>${this.library.scenarios.map(s=>`<div class="scenario-editor-library-row">${button('load',esc(s.name),`data-id="${s.id}" aria-pressed="${s.id===d.id}"`)}${button('delete','删除',`data-id="${s.id}"`)}</div>`).join('')||'<p class="ui-muted">尚无保存的剧本</p>'}</details>${button('import','导入剧本')}<input type="file" accept=".json,application/json" data-se-import hidden></div></aside><section class="ui-panel scenario-editor-content"><header class="ui-panel-header"><h2>${esc(d.name)}</h2></header><div class="ui-panel-body"><div class="scenario-editor-toolbar">${button('save','保存',errors.length?'disabled':'')}${button('copy','另存副本')}${button('undo','撤销',this.history.length?'':'disabled')}${button('redo','重做',this.future.length?'':'disabled')}${button('export','导出剧本',errors.length?'disabled':'')}<span role="status">${esc(this.notice||'')}</span></div>${this.warning?`<div class="scenario-editor-warning" role="alert">${esc(this.warning)}${button('leave','返回菜单')}</div>`:''}${pending}<nav class="ui-tabs" aria-label="剧本内容">${[['overview','概要'],['cities','城池'],['factions','势力'],['officers','武将'],['diplomacy','外交']].map(([tab,name])=>button('tab',name,`data-tab="${tab}" aria-pressed="${tab===this.tab}"`)).join('')}</nav>${body}<details class="scenario-editor-errors" ${errors.length?'open':''}><summary>${errors.length?'待修正 '+errors.length+' 项':'开局检查通过'}</summary>${errors.slice(0,12).map(e=>`<p role="alert">${esc(e)}</p>`).join('')}${errors.length>12?'<p>其余问题请继续在武将页核对。</p>':''}</details></div></section></div></main>`;
 }
 search(placeholder){return `<label class="scenario-editor-search">查找<input data-se-field="query" value="${esc(this.query)}" placeholder="${placeholder}"></label>`;}
}
export async function createScenarioEditor(options={}){
 let storage,library=emptyScenarioLibrary(),warning='';try{storage=await openScenarioLibrary();library=await storage.read();}catch(e){storage?.close();storage=null;warning=e.message;}
 return new ScenarioEditor({...options,storage,library,warning});
}
