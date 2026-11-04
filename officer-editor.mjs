import {BASE_OFFICER_CATALOG,officerLibraryCatalog,PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from './officer-catalog.mjs';
import {OFFICER_STATS,OFFICER_FAMILIES,emptyOfficerLibrary,officerEdit,newOfficerDocument,validateOfficerDocument,validateOfficerLibrary,mergeOfficerLibrary,customOfficerId} from './officer-library-data.mjs';
import {openOfficerLibrary} from './officer-library.mjs';
import {exportSaveFile} from './runtime-platform.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='')=>`<button type="button" class="button secondary" data-officer-edit-action="${action}" ${extra}>${label}</button>`;
const grades=['C','B','A','S'];
const baseById=new Map(BASE_OFFICER_CATALOG.map(o=>[o.id,o]));
export class OfficerEditor{
 constructor({library=emptyOfficerLibrary(),storage=null,onRender=()=>{},onBack=()=>{},onMessage=()=>{},warning=''}={}){
  Object.assign(this,{library:validateOfficerLibrary(library),storage,onRender,onBack,onMessage,warning});
  this.query='';this.filter='all';this.sort='source';this.direction=1;this.page=0;this.pending=null;this.load('cao');
 }
 get dirty(){return JSON.stringify(this.draft)!==this.original;}
 get rows(){
  const edited=new Set(this.library.officers.map(o=>o.id)),query=this.query.trim().toLocaleLowerCase();
  return officerLibraryCatalog(this.library).filter(o=>(this.filter!=='edited'||edited.has(o.id))&&(this.filter!=='custom'||o.sourceKind==='custom')&&(!query||[o.name,o.courtesy,String(o.sourceId),...o.aliases].some(s=>s.toLocaleLowerCase().includes(query)))).sort((a,b)=>{
   const av=this.sort==='source'?a.sourceId:a[this.sort],bv=this.sort==='source'?b.sourceId:b[this.sort];return this.direction*(typeof av==='number'?av-bv:String(av).localeCompare(String(bv),'zh-CN'))||a.id.localeCompare(b.id);
  });
 }
 load(id){const row=officerLibraryCatalog(this.library).find(o=>o.id===id);if(!row)return;this.draft=officerEdit(row);this.original=JSON.stringify(this.draft);this.warning='';}
 async persist(next){
  if(!this.storage)throw Error('本机存储不可用，请导出武将包保留修改');
  const valid=validateOfficerLibrary(next);await this.storage.write(valid,this.library);this.library=valid;
 }
 async save(){
  const draft=validateOfficerDocument(this.draft),submitted=JSON.stringify(this.draft),next={...this.library,officers:[...this.library.officers.filter(o=>o.id!==draft.id),draft]};
  await this.persist(next);if(submitted===JSON.stringify(this.draft))this.load(draft.id);else this.original=JSON.stringify(draft);this.onMessage('武将已保存');
 }
 navigate(action,id){
  if(this.dirty){this.pending={kind:'leave',action,id};return;}
  this.navigateNow(action,id);
 }
 navigateNow(action,id){
  this.pending=null;
  if(action==='back')return this.onBack();
  if(action==='load')this.load(id);
  if(action==='new'||action==='copy'){
   const next=action==='copy'?{...structuredClone(this.draft),name:(this.draft.name+'副本').slice(0,20)}:newOfficerDocument('');
   next.id='custom-'+crypto.randomUUID().replaceAll('-','');this.draft=next;this.original='';this.warning='';
  }
 }
 async action(action,el,root){
  if(this.busy)return;
  try{
   this.busy=true;
   if(['back','load','new','copy'].includes(action))this.navigate(action,el?.dataset.id);
   if(action==='save')await this.save();
   if(action==='cancel-confirm')this.pending=null;
   if(action==='save-leave'){const pending=this.pending;await this.save();this.navigateNow(pending.action,pending.id);}
   if(action==='discard-leave'){const pending=this.pending;this.load(this.library.officers.some(o=>o.id===this.draft.id)||baseById.has(this.draft.id)?this.draft.id:'cao');this.navigateNow(pending.action,pending.id);}
   if(action==='reset'||action==='delete')this.pending={kind:action};
   if(action==='confirm-reset'){
    const id=this.draft.id;await this.persist({...this.library,officers:this.library.officers.filter(o=>o.id!==id)});this.load(id);this.pending=null;this.onMessage('已恢复默认资料');
   }
   if(action==='confirm-delete'){
    const id=this.draft.id;if(!customOfficerId(id))throw Error('内置武将不能删除');
    await this.persist({...this.library,officers:this.library.officers.filter(o=>o.id!==id)});this.load('cao');this.pending=null;this.onMessage('自建武将已删除');
   }
   if(action==='sort'){const key=el.dataset.key;this.direction=this.sort===key?-this.direction:key==='name'?1:-1;this.sort=key;this.page=0;}
   if(action==='page')this.page=Number(el.dataset.page);
   if(action==='export'||action==='export-all'){
    const pack=action==='export'?{...emptyOfficerLibrary(),officers:[validateOfficerDocument(this.draft)]}:this.library;
    await exportSaveFile(action==='export'?`武将-${this.draft.name}.json`:'武将包.json',JSON.stringify(pack,null,2));this.onMessage('武将包已导出');
   }
   this.warning='';
  }catch(error){this.warning=error.message;}
  finally{this.busy=false;this.onRender();}
 }
 async importFile(file){
  if(!file)return;if(this.busy)return;
  this.busy=true;
  try{
   if(file.size>32*1024*1024)throw Error('武将包不能超过 32 MB');
   const imported=validateOfficerLibrary(JSON.parse(await file.text()));
   this.importPreview=imported;this.pending={kind:'import'};this.warning='';
  }catch(error){this.warning=error instanceof SyntaxError?'无法读取，请选择有效的 JSON 武将包':error.message;}
  finally{this.busy=false;this.onRender();}
 }
 async confirmImport(){
  if(this.busy)return;this.busy=true;
  try{
   const imported=this.importPreview;await this.persist(mergeOfficerLibrary(this.library,imported));
   this.pending=null;this.importPreview=null;this.load(imported.officers[0]?.id||this.draft.id);this.onMessage(`已导入 ${imported.officers.length} 名武将`);
  }catch(error){this.warning=error.message;}finally{this.busy=false;this.onRender();}
 }
 update(input){
  const field=input.dataset.officerEditField;
  if(field.startsWith('aptitude:'))this.draft.aptitudes[field.slice(9)]=Number(input.value);
  else if(['name','courtesy','biography','type'].includes(field))this.draft[field]=input.value;
  else this.draft[field]=input.value===''?(['personality','righteousness','compatibility','sex','birthYear','deathYear'].includes(field)?null:''):Number(input.value);
  input.removeAttribute('aria-invalid');
  const status=this.root?.querySelector('[data-officer-save-status]');if(status)status.textContent=this.dirty?'未保存':'已保存';
 }
 mount(root){
  this.unmount();this.root=root;this.controller=new AbortController();const options={signal:this.controller.signal};
  root.addEventListener('click',event=>{const el=event.target.closest('[data-officer-edit-action]');if(!el)return;event.preventDefault();const action=el.dataset.officerEditAction;if(action==='import'){root.querySelector('[data-officer-import]').click();return;}if(action==='confirm-import')void this.confirmImport();else void this.action(action,el,root);},options);
  root.addEventListener('input',event=>{
   const input=event.target;if(input.dataset.officerEditField)this.update(input);
   if(input.matches('[data-officer-search]')){this.query=input.value;this.page=0;root.querySelector('[data-officer-directory]').innerHTML=this.directoryMarkup();}
  },options);
  root.addEventListener('change',event=>{
   const input=event.target;if(input.matches('[data-officer-filter]')){this.filter=input.value;this.page=0;this.onRender();}
   if(input.matches('[data-officer-import]'))void this.importFile(input.files[0]);
  },options);
  this.beforeUnload=event=>{if(this.dirty){event.preventDefault();event.returnValue='';}};globalThis.addEventListener?.('beforeunload',this.beforeUnload);
 }
 unmount(){this.controller?.abort();if(this.beforeUnload)globalThis.removeEventListener?.('beforeunload',this.beforeUnload);this.root=null;}
 directoryMarkup(){
  const rows=this.rows,pages=Math.max(1,Math.ceil(rows.length/24));this.page=Math.min(Math.max(0,this.page),pages-1);
  const edited=new Set(this.library.officers.map(o=>o.id));
  return `<p class="ui-muted" role="status">${rows.length} 人 · ${this.page+1} / ${pages} 页</p><div class="officer-editor-table"><table class="personnel-table ui-table"><thead><tr>${[['name','姓名'],...OFFICER_STATS.map(([k,n])=>[k,n.slice(0,1)])].map(([k,n])=>`<th aria-sort="${this.sort===k?(this.direction===1?'ascending':'descending'):'none'}">${button('sort',n,`data-key="${k}"`)}</th>`).join('')}</tr></thead><tbody>${rows.slice(this.page*24,(this.page+1)*24).map(o=>`<tr class="${o.id===this.draft.id?'selected':''}"><td>${button('load',esc(o.name),`data-id="${esc(o.id)}" aria-pressed="${o.id===this.draft.id}"`)}<small>${o.sourceKind==='custom'?'自建':edited.has(o.id)?'已修改':''}</small></td>${OFFICER_STATS.map(([k])=>`<td>${o[k]}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="6">没有符合条件的武将</td></tr>'}</tbody></table></div><nav class="officer-editor-pages" aria-label="武将分页">${button('page','上一页',`data-page="${this.page-1}" ${this.page===0?'disabled':''}`)}${button('page','下一页',`data-page="${this.page+1}" ${this.page+1>=pages?'disabled':''}`)}</nav>`;
 }
 confirmationMarkup(){
  const p=this.pending;if(!p)return '';
  const message=p.kind==='leave'?'当前修改尚未保存。':p.kind==='reset'?'恢复默认资料？本机对此武将的修改将移除。':p.kind==='delete'?'删除此自建武将？已有游戏存档保留原人物。':`导入 ${this.importPreview.officers.length} 名武将？相同编号将覆盖本机记录，当前未保存的修改将舍弃。`;
  return `<section class="officer-editor-confirm ui-panel" role="alert"><p>${message}</p><div>${p.kind==='leave'?button('save-leave','保存并继续')+button('discard-leave','舍弃修改'):button('confirm-'+p.kind,'确认')}${button('cancel-confirm','取消')}</div></section>`;
 }
 markup(){
  const d=this.draft,custom=customOfficerId(d.id),saved=this.library.officers.some(o=>o.id===d.id);
  const input=(k,label,min,max,nullable=false)=>`<label>${label}<input data-officer-edit-field="${k}" type="number" min="${min}" max="${max}" step="1" ${nullable?'':'required'} value="${esc(d[k])}"></label>`;
  const select=(k,label,items)=>`<label>${label}<select data-officer-edit-field="${k}">${items.map(([v,n])=>`<option value="${v}" ${String(d[k]??'')===String(v)?'selected':''}>${n}</option>`).join('')}</select></label>`;
  return `<main class="campaign-lobby officer-editor"><header class="lobby-nav"><h1>武将编辑器</h1>${button('back','返回')}</header><div class="officer-editor-toolbar">${button('new','新建武将')}${button('copy','复制新建')}${button('import','导入')}${button('export-all','导出武将包')}<input type="file" accept=".json,application/json" data-officer-import hidden><span class="ui-muted">仅用于新局</span></div><div class="officer-editor-workspace"><aside class="ui-panel officer-editor-library"><div class="officer-editor-search"><label>查找<input type="search" data-officer-search value="${esc(this.query)}" placeholder="姓名、字或编号"></label><label>范围<select data-officer-filter>${[['all','全部武将'],['edited','已修改'],['custom','自建武将']].map(([id,label])=>`<option value="${id}" ${this.filter===id?'selected':''}>${label}</option>`).join('')}</select></label></div><div data-officer-directory>${this.directoryMarkup()}</div></aside><section class="ui-panel officer-editor-detail"><div class="ui-panel-header"><h2>${esc(d.name)}</h2><span data-officer-save-status role="status">${this.dirty?'未保存':saved?'已保存':'默认资料'}</span></div><div class="officer-editor-form">${this.confirmationMarkup()}${this.warning?`<p class="officer-editor-error" role="alert">${esc(this.warning)}</p>`:''}<div class="officer-editor-fields"><label>姓名<input type="text" maxlength="20" required data-officer-edit-field="name" value="${esc(d.name)}"></label><label>字<input type="text" maxlength="20" data-officer-edit-field="courtesy" value="${esc(d.courtesy)}"></label>${select('sex','性别',[['','未载'],[0,'男'],[1,'女']])}</div><div class="officer-editor-stats">${OFFICER_STATS.map(([k,n])=>input(k,n,0,100)).join('')}</div><h3>兵种适性</h3><div class="officer-editor-aptitudes">${OFFICER_FAMILIES.map(([k,n])=>`<label>${n}<select data-officer-edit-field="aptitude:${k}">${grades.map((g,v)=>`<option value="${v}" ${d.aptitudes[k]===v?'selected':''}>${g}</option>`).join('')}</select></label>`).join('')}</div><div class="officer-editor-fields">${select('type','常用兵种',OFFICER_FAMILIES)}${select('personality','性格',[['','未载'],[0,'未设置'],...Object.entries(PERSONALITY_NAMES)])}${select('righteousness','义理',[['','未载'],[0,'未设置'],...Object.entries(RIGHTEOUSNESS_NAMES)])}${input('compatibility','相性',0,149,true)}${input('birthYear','出生年',0,999,true)}${input('deathYear','死亡年',0,999,true)}</div><label>人物生平<textarea rows="6" maxlength="6000" data-officer-edit-field="biography">${esc(d.biography)}</textarea></label></div><footer class="ui-panel-footer officer-editor-footer"><button type="button" class="button primary" data-officer-edit-action="save">保存</button>${button('export','导出此将')}${custom?button('delete','删除'):button('reset','恢复默认')}</footer></section></div></main>`;
 }
}
export async function createOfficerEditor(options={}){
 let storage,library=emptyOfficerLibrary(),warning='';
 try{storage=await openOfficerLibrary();library=await storage.read();}catch(error){storage?.close();storage=null;warning=error.message;}
 const editor=new OfficerEditor({...options,storage,library});editor.warning=warning;return editor;
}
