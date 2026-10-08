import {PAGE_GUIDES,createGuidePreferences} from './page-guides.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function guideMarkup(id){
 const g=PAGE_GUIDES[id];if(!g)return '';
 return `<div class="page-guide-backdrop"><section class="page-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="page-guide-title" tabindex="-1">
  <header class="page-guide-header"><div><span class="page-guide-eyebrow">${esc(g.group)} · 页面指引</span><h2 id="page-guide-title">${esc(g.title)}</h2></div><button data-guide-action="close" class="page-guide-x" aria-label="关闭指引">×</button></header>
  <div class="page-guide-body"><p class="page-guide-summary">${esc(g.summary)}</p><h3>如何操作</h3><ol class="page-guide-steps">${g.steps.map(([title,body],i)=>`<li><span aria-hidden="true">${i+1}</span><div><h4>${esc(title)}</h4><p>${esc(body)}</p></div></li>`).join('')}</ol><section class="page-guide-tips"><h3>注意事项</h3><ul>${g.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section></div>
  <footer class="page-guide-footer"><p>关闭后不再自动提示，可在页面中重看。</p><div><button data-guide-action="catalogue" class="button secondary">全部指引</button><button data-guide-action="close" class="button primary" data-guide-done>知道了</button></div></footer>
 </section></div>`;
}
export function guideCatalogueMarkup(preferences){
 const groups=[...new Set(Object.values(PAGE_GUIDES).map(g=>g.group))];
 return `<div class="page-guide-backdrop"><section class="page-guide-dialog page-guide-catalogue" role="dialog" aria-modal="true" aria-labelledby="page-guide-title" tabindex="-1"><header class="page-guide-header"><div><span class="page-guide-eyebrow">随时查阅 · 游戏指引</span><h2 id="page-guide-title">全部指引</h2></div><button data-guide-action="close" class="page-guide-x" aria-label="关闭指引">×</button></header><div class="page-guide-body"><p class="page-guide-summary">按当前需要选择页面，查看操作步骤与规则说明。</p>${groups.map(group=>`<section class="page-guide-group"><h3>${esc(group)}</h3><div>${Object.entries(PAGE_GUIDES).filter(([,g])=>g.group===group).map(([id,g])=>`<button data-guide-action="topic" data-guide-id="${esc(id)}"><b>${esc(g.title)}</b><small>${preferences.hasSeen(id)?'已看':'未看'}</small></button>`).join('')}</div></section>`).join('')}</div><footer class="page-guide-footer"><p>自动提示${preferences.enabled?'已开启':'已关闭'}，手动查阅始终可用。</p><div><button data-guide-action="close" class="button primary" data-guide-done>返回</button></div></footer></section></div>`;
}

export function createPageGuideView({root,storage,getTopic,onOpen=()=>{},onClose=()=>{},onPreferences=()=>{},onStorageError=()=>{}}){
 const preferences=createGuidePreferences(storage),doc=root.ownerDocument;
 let active=null,originFocus=null,previousInert=[],queued=false;
 const persist=result=>{if(!result)onStorageError();};
 function keepBackgroundInert(){for(const el of [doc.getElementById('app'),doc.getElementById('overlay-root')])el?.setAttribute('inert','');}
 function show(id){
  if(id!==null&&!Object.hasOwn(PAGE_GUIDES,id))return;
  if(active?.id)persist(preferences.dismiss(active.id));
  const opening=!active;
  if(opening){originFocus=doc.activeElement;previousInert=[doc.getElementById('app'),doc.getElementById('overlay-root')].filter(Boolean).map(el=>({el,inert:el.hasAttribute('inert')}));}
  active={id};root.innerHTML=id?guideMarkup(id):guideCatalogueMarkup(preferences);
  doc.body.classList.add('page-guide-open');keepBackgroundInert();
  if(opening)onOpen();
  root.querySelector('[data-guide-done]')?.focus({preventScroll:true});
 }
 function close(){
  if(!active)return;
  if(active.id)persist(preferences.dismiss(active.id));
  active=null;root.replaceChildren();doc.body.classList.remove('page-guide-open');
  for(const {el,inert}of previousInert)el.toggleAttribute('inert',inert);
  previousInert=[];onClose();
  if(originFocus?.isConnected&&!originFocus.closest('[inert]'))originFocus.focus({preventScroll:true});
  originFocus=null;
 }
 function sync(){
  queued=false;
  const id=getTopic();
  // Inject into the rendered page and current modal; source panels keep their help.
  const main=doc.getElementById('app'),modal=doc.getElementById('modal-panel-root');
  const hosts=[main?.querySelector('.world-toolbar,.arena-tools,.lobby-nav,.selection-header,.map-command-screen>header,.strategy-heading>div:last-child,.topbar'),modal?.querySelector('.modal-header')];
  for(const host of hosts){
   let button=host?.querySelector('[data-guide-current]');
   if(!id){button?.remove();continue;}
   if(!host)continue;
   if(!button){button=doc.createElement('button');button.type='button';button.className='page-guide-trigger';button.dataset.guideAction='open';button.dataset.guideCurrent='';button.textContent='指引';host.insertBefore(button,host.querySelector('.close-button'));}
   button.dataset.guideId=id;button.setAttribute('aria-label','查看'+PAGE_GUIDES[id].title+'指引');
  }
  if(active){keepBackgroundInert();return;}
  if(preferences.shouldShow(id))show(id);
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(sync);}
 function click(event){
  const button=event.target.closest?.('[data-guide-action]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const action=button.dataset.guideAction;
  if(action==='open')show(button.dataset.guideId||getTopic());
  else if(action==='topic')show(button.dataset.guideId);
  else if(action==='catalogue')show(null);
  else if(action==='close')close();
  else if(action==='toggle'){persist(preferences.setEnabled(!preferences.enabled));onPreferences();}
  else if(action==='reset'){persist(preferences.reset());onPreferences();}
 }
 function keydown(event){
  if(!active){if(event.key==='F1'){event.preventDefault();event.stopImmediatePropagation();show(getTopic());}return;}
  event.stopImmediatePropagation();
  if(event.key==='F1'){event.preventDefault();return;}
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const nodes=[...root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')];
  const first=nodes[0],last=nodes.at(-1);
  if(!first){event.preventDefault();return;}
  if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
  else if(!root.contains(doc.activeElement)){event.preventDefault();first.focus();}
 }
 doc.addEventListener('click',click,true);
 doc.addEventListener('keydown',keydown,true);
 return {
  get isOpen(){return !!active;},preferences,schedule,open:show,close,
  settingsMarkup(){return `<section class="page-guide-settings"><div><b>页面指引</b><p>首次进入页面时显示操作说明；关闭后记住已读，所有新局共用。</p></div><div><button data-guide-action="toggle" aria-pressed="${preferences.enabled}">自动提示：${preferences.enabled?'开启':'关闭'}</button><button data-guide-action="reset">重置指引</button><button data-guide-action="catalogue">全部指引</button></div></section>`;},
  destroy(){close();doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',keydown,true);}
 };
}
