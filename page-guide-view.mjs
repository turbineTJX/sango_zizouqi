import {PAGE_GUIDES,createGuidePreferences} from './page-guides.mjs';
import {resolveGuideTargets,visibleGuideRect,placeGuideCard} from './page-guide-targets.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const mapCaptions=[
 ['先点一座自己的城','内政、侦察、编制，都从城池里开始。放大地图还能查看据点与建筑。'],
 ['把本旬的事安排好','委任内政、派出斥候、准备部队；安排妥当后再推进时间。'],
 ['准备好了，就点“进行”','每旬十天，按日执行。途中可暂停，重要奏报和战前准备也会暂停。'],
 ['拖动巡视，滚轮缩放','“全国”查看版图，“操作中心”回到当前城池或军团。']
];
const coachLines={
 factions:['先点一位想执掌的君主，也可以点地图上的城池。','这里是这位君主的城池和武将。选定后，点右下方“开始”。','准备好了吗？点“开始”，进入你的天下。'],
 domestic:['先安排一位内政负责人。点框中的“委任武将”，选择你想发展的方向。','点负责人姓名，可以查看他正在办什么事。想换人，就点该方向的“委任武将”。','有提案时，先看用度和工期，再点“准奏”或“暂缓”。','负责人安排好后就能推进时间。办事进度和成果会记在这里。'],
 appoint:['先点要委任的方向。已经选好方向，就继续选人。','从名单里点一位武将，优先比较这个方向所需的能力和特性。','人选确定后，点下面的“确认”。'],
 city:['先看看这座城的钱粮和人手，再安排事情。','点“内政委任”，给这座城安排负责人。','想准备出征，先点“编制部队”。','展开“钱粮预算”，看看本城还能承担多少支出。'],
 scouting:['先点“地图点选”，选一座派出斥候的己方城市。','接下来选一位本城空闲武将，让他负责侦察。','再点地图，选择本城周边的侦察终点，确认后指派。','已派出的斥候和报告在这里，留意情报的日期。'],
 troops:['点“新增部队”挑选主将；已有部队可以直接编辑。','选兵种，再用输入框或滑条分配兵力。','核对名单和费用，确认后保存这支部队。'],
 commanders:['先点军团长的人选。','再选军师，留意可用的军略。','核对部队和任命，确认后继续。'],
 proposals:['先看这份提案的用度、地点和工期。','同意就点“准奏”；暂时不办就点“暂缓”。','熟悉后，可以在这里开启自动准奏。'],
 routes:['先在地图上点要经过的地点。','想经过这里，就点“继续行进”；到此为止就选“设为终点”。','路线选好后，核对军令，再确认下令。'],
 combat:['点部队或头像，看看它当前的兵力和状态。','需要思考时，点这里暂停；准备好后再继续。','军略就绪后，点“施放军略”，再选择要用的军略。','想交给电脑指挥或离开战场，可以从这里操作。']
};
// Built-in illustration also works when the optional portrait pack is absent.
const advisor=`<svg viewBox="0 0 100 132" aria-hidden="true"><path fill="#263d38" d="M8 132l4-40 24-14h28l24 14 5 40z"/><path fill="#e0c59d" d="M38 68h24v25H38z"/><path fill="#af8d60" d="M38 69h24v12L43 85z"/><path fill="#e8cca6" d="M29 34q21-17 42 0l-3 28q-3 17-18 20-16-4-19-20z"/><path fill="#423a31" d="M28 39l-3-17 13-8h24l14 8-5 17-7-7H36z"/><path fill="#24332f" d="M22 27l8-15h40l8 15-7 9H29zM39 12L37 3h26l-2 9z"/><path stroke="#a89565" stroke-width="2" fill="none" d="M28 28h44M42 8h16"/><path stroke="#4f3b29" stroke-width="2" fill="none" stroke-linecap="round" d="M36 46l7-2m14 0 7 2M38 51h3m18 0h3m-12 2-2 8h5"/><path fill="#4c392a" d="M42 66q8-6 16 0l5 4-11-2-2 3-2-3-11 2zM39 72q11 10 22 0l-3 19-8 10-8-10z"/><path fill="#f0e0bd" d="M35 81l15 20 15-20 6 8-21 32-21-32z"/><path fill="#35534a" d="M17 99l13-9 20 31 20-31 14 9 5 33H11z"/><path stroke="#a89565" fill="none" stroke-width="2" d="M30 91l20 31 20-31M50 122v10"/></svg>`;
export function guideMarkup(id,step=0){
 const g=PAGE_GUIDES[id];if(!g)return '';
 step=Number.isInteger(step)?Math.max(0,Math.min(step,g.steps.length-1)):0;
 const [title,description]=id==='map'?mapCaptions[step]:g.steps[step],body=coachLines[id]?.[step]||description;
 return `<div class="page-guide-tour">
  <div class="page-guide-highlights" aria-hidden="true"></div>
  <aside class="page-guide-coach" role="region" aria-labelledby="page-guide-title" aria-describedby="page-guide-description" tabindex="-1" data-guide-topic="${esc(id)}" data-guide-step="${step}">
  <div class="page-guide-advisor" data-art-portrait="jia" data-art-scene="roster">${advisor}</div><div class="page-guide-speech">
  <header class="page-guide-header"><div><span class="page-guide-eyebrow">参谋 · <span id="page-guide-title">${esc(g.title)}</span></span></div><button type="button" data-guide-action="close" class="page-guide-x" aria-label="关闭指引">×</button></header>
  <div class="page-guide-body page-guide-coach-body">
   <div class="page-guide-current" aria-live="polite" aria-atomic="true"><h3>${esc(title)}</h3><p id="page-guide-description">${esc(body)}</p></div>
   <p class="page-guide-target-note" hidden></p>
   <details class="page-guide-details"><summary>详细说明</summary><div><p class="page-guide-summary">${esc(g.summary)}</p><ol class="page-guide-steps">${g.steps.map(([label,description])=>`<li><h4>${esc(label)}</h4><p>${esc(description)}</p></li>`).join('')}</ol><section class="page-guide-tips"><h3>留意这些</h3><ul>${g.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section></div></details>
  </div>
  <footer class="page-guide-footer"><nav class="page-guide-stage-nav" aria-label="操作步骤">${g.steps.map(([label],i)=>`<button type="button" data-guide-action="step" data-guide-index="${i}" aria-label="${esc(label)}" title="${esc(label)}" ${i===step?'aria-current="step"':''}>${i+1}</button>`).join('')}</nav><div><button type="button" data-guide-action="previous" aria-label="上一步" ${step===0?'disabled':''}>←</button><button type="button" data-guide-action="next" aria-label="下一步" ${step===g.steps.length-1?'disabled':''}>→</button><button type="button" data-guide-action="close" data-guide-done>收起</button></div></footer>
 </div></aside></div>`;
}
export function guideCatalogueMarkup(preferences){
 const groups=[...new Set(Object.values(PAGE_GUIDES).map(g=>g.group))];
 return `<div class="page-guide-backdrop"><section class="page-guide-dialog page-guide-catalogue" role="dialog" aria-modal="true" aria-labelledby="page-guide-title" tabindex="-1"><header class="page-guide-header"><div><span class="page-guide-eyebrow">随时查阅 · 游戏指引</span><h2 id="page-guide-title">全部指引</h2></div><button data-guide-action="close" class="page-guide-x" aria-label="关闭指引">×</button></header><div class="page-guide-body">${groups.map(group=>`<section class="page-guide-group"><h3>${esc(group)}</h3><div>${Object.entries(PAGE_GUIDES).filter(([,g])=>g.group===group).map(([id,g])=>`<button data-guide-action="topic" data-guide-id="${esc(id)}"><b>${esc(g.title)}</b><small>${preferences.hasSeen(id)?'已看':'未看'}</small></button>`).join('')}</div></section>`).join('')}</div><footer class="page-guide-footer"><p>自动提示${preferences.enabled?'已开启':'已关闭'}，手动查阅始终可用。</p><div><button data-guide-action="close" class="button primary" data-guide-done>返回</button></div></footer></section></div>`;
}

export function createPageGuideView({root,storage,getTopic,decorate=()=>{},onOpen=()=>{},onClose=()=>{},onPreferences=()=>{},onStorageError=()=>{}}){
 const preferences=createGuidePreferences(storage),doc=root.ownerDocument,win=doc.defaultView;
 let active=null,originFocus=null,previousInert=[],queued=false,frame=0,targets=[],resolveAt=0,layoutKey='';
 const persist=result=>{if(!result)onStorageError();};
 function keepBackgroundInert(){for(const el of [doc.getElementById('app'),doc.getElementById('overlay-root')])el?.setAttribute('inert','');}
 function releaseBackground(){for(const {el,inert}of previousInert)el.toggleAttribute('inert',inert);previousInert=[];doc.body.classList.remove('page-guide-open');}
 function layout(now=0){
  if(!active?.id)return;
  if(now>=resolveAt){targets=resolveGuideTargets(doc,active.id,active.step,getTopic());resolveAt=now+250;}
  const viewport={width:win.innerWidth,height:win.innerHeight};
  const rects=targets.map(el=>visibleGuideRect(el,viewport)).filter(Boolean).map(r=>({left:Math.max(3,r.left-6),top:Math.max(3,r.top-6),width:Math.min(viewport.width-3,r.left+r.width+6)-Math.max(3,r.left-6),height:Math.min(viewport.height-3,r.top+r.height+6)-Math.max(3,r.top-6)}));
  const card=root.querySelector('.page-guide-coach'),note=root.querySelector('.page-guide-target-note');
  if(!card)return;
  note.hidden=rects.length>0;
  const message=active.id===getTopic()?'这项操作还未显示，完成前面的选择后可再查看。':`请在“${PAGE_GUIDES[active.id].title}”页面打开指引，即可框出操作位置。`;
  if(!rects.length&&note.textContent!==message)note.textContent=message;
  const key=JSON.stringify(rects.map(r=>Object.values(r).map(n=>Math.round(n*10)/10)));
  if(key!==layoutKey){
   root.querySelector('.page-guide-highlights').innerHTML=rects.map(r=>`<div class="page-guide-highlight" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"><span>${active.step+1}</span></div>`).join('');
   layoutKey=key;
  }
  card.dataset.guideTargetCount=String(rects.length);
  const position=placeGuideCard(rects,card.getBoundingClientRect(),viewport);
  card.style.left=position.left+'px';card.style.top=position.top+'px';
 }
 function track(now){layout(now);if(active?.id)frame=win.requestAnimationFrame(track);}
 function startTracking(){win.cancelAnimationFrame(frame);targets=[];resolveAt=0;layoutKey='';if(active?.id){layout();frame=win.requestAnimationFrame(track);}}
 function show(id){
  if(id!==null&&!Object.hasOwn(PAGE_GUIDES,id))return;
  if(active?.id)persist(preferences.dismiss(active.id));
  const opening=!active;
  if(opening)originFocus=doc.activeElement;
  releaseBackground();
  const context=getTopic(),first=id&&id===context?PAGE_GUIDES[id].steps.findIndex((_,step)=>resolveGuideTargets(doc,id,step,context).length):0;
  active={id,step:Math.max(0,first),context};root.innerHTML=id?guideMarkup(id,active.step):guideCatalogueMarkup(preferences);decorate(root);
  if(id===null){previousInert=[doc.getElementById('app'),doc.getElementById('overlay-root')].filter(Boolean).map(el=>({el,inert:el.hasAttribute('inert')}));doc.body.classList.add('page-guide-open');keepBackgroundInert();}
  if(opening)onOpen();
  startTracking();
  if(id===null)root.querySelector('[data-guide-done]')?.focus({preventScroll:true});
 }
 function changeStep(index,focusAction='step'){
  if(!active?.id)return;
  const count=PAGE_GUIDES[active.id].steps.length;
  if(!Number.isInteger(index)||index<0||index>=count||index===active.step)return;
  active.step=index;
  root.innerHTML=guideMarkup(active.id,index);decorate(root);
  startTracking();
  if(focusAction==='background')return;
  const control=root.querySelector(`[data-guide-action="${focusAction}"]:not([disabled])`);
  (focusAction!=='step'&&control?control:root.querySelector('[aria-current="step"]'))?.focus({preventScroll:true});
 }
 function close(){
  if(!active)return;
  if(active.id)persist(preferences.dismiss(active.id));
  const restoreFocus=root.contains(doc.activeElement);
  active=null;win.cancelAnimationFrame(frame);targets=[];root.replaceChildren();releaseBackground();onClose();
  if(restoreFocus&&originFocus?.isConnected&&!originFocus.closest('[inert]'))originFocus.focus({preventScroll:true});
  originFocus=null;
 }
 function sync(){
  queued=false;
  const id=getTopic();
  // Inject into the rendered page and current modal; source panels keep their help.
  const main=doc.getElementById('app'),modal=doc.getElementById('modal-panel-root');
  const hosts=[main?.querySelector('.world-toolbar,.arena-tools,.lobby-nav,.selection-header,.map-command-screen>header,.strategy-heading>div:last-child,.topbar,.ending-toolbar'),modal?.querySelector('.modal-header')];
  for(const host of hosts){
   let button=host?.querySelector('[data-guide-current]');
   if(!id){button?.remove();continue;}
   if(!host)continue;
   if(!button){button=doc.createElement('button');button.type='button';button.className='page-guide-trigger';button.dataset.guideAction='open';button.dataset.guideCurrent='';button.textContent='指引';host.insertBefore(button,host.querySelector('.close-button'));}
   button.dataset.guideId=id;button.setAttribute('aria-label','查看'+PAGE_GUIDES[id].title+'指引');
  }
  if(active){
   if(active.id===null)keepBackgroundInert();
   else if(id!==active.context){if(!id||PAGE_GUIDES[id].autoShow===false){close();return;}show(id);}
   resolveAt=0;return;
  }
  if(preferences.shouldShow(id))show(id);
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(sync);}
 function click(event){
  const button=event.target.closest?.('[data-guide-action]');
  if(!button){
   if(active?.id&&!root.contains(event.target)){
    const control=event.target.closest?.('button,a,input,select,summary,[role="button"],[data-action]');
    if(['pause','campaign-begin','campaign-run','next-turn','start-battle','launch-national','launch-custom'].includes(control?.dataset.action)){close();return;}
    if(control&&targets.some(target=>target===control||target.contains(control))){const current=active;queueMicrotask(()=>{if(active===current&&getTopic()===current.context)changeStep(current.step+1,'background');});}
   }
   return;
  }
  event.preventDefault();event.stopImmediatePropagation();
  const action=button.dataset.guideAction;
  if(action==='open')show(button.dataset.guideId||getTopic());
  else if(action==='topic')show(button.dataset.guideId);
  else if(action==='catalogue')show(null);
  else if(action==='close')close();
  else if(action==='step')changeStep(Number(button.dataset.guideIndex));
  else if(action==='previous')changeStep(active?.step-1,'previous');
  else if(action==='next')changeStep(active?.step+1,'next');
  else if(action==='toggle'){persist(preferences.setEnabled(!preferences.enabled));onPreferences();}
  else if(action==='reset'){persist(preferences.reset());onPreferences();}
 }
 function keydown(event){
  if(!active){if(event.key==='F1'){event.preventDefault();event.stopImmediatePropagation();show(getTopic());}return;}
  if(event.key==='F1'){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  if(active.id&&!root.contains(event.target))return;
  event.stopImmediatePropagation();
  if(active.id&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&['ArrowLeft','ArrowRight'].includes(event.key)){
   event.preventDefault();changeStep(active.step+(event.key==='ArrowRight'?1:-1));return;
  }
  if(event.key!=='Tab'||active.id)return;
  const nodes=[...root.querySelectorAll('button:not([disabled]),summary,a[href],input:not([disabled]),[tabindex="0"]')].filter(node=>node.getClientRects().length);
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
  settingsMarkup(){return `<section class="page-guide-settings"><div><b>页面指引</b></div><div><button data-guide-action="toggle" aria-pressed="${preferences.enabled}">自动提示：${preferences.enabled?'开启':'关闭'}</button><button data-guide-action="reset">重置指引</button><button data-guide-action="catalogue">全部指引</button></div></section>`;},
  destroy(){close();doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',keydown,true);}
 };
}
