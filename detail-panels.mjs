import {patchMarkup,forgetMarkup} from './strategic-dom.mjs';
const focusSelector='button,input,select,textarea,summary,a[href],[tabindex]';
export const visibleFocusTargets=root=>[...root.querySelectorAll(focusSelector)].filter(el=>!el.matches(':disabled,[tabindex="-1"]')&&!el.closest('[inert]')&&el.checkVisibility());
export function captureInteractionFocus(root){
 const el=root.ownerDocument.activeElement;
 if(!root.contains(el)||!el.matches(focusSelector))return null;
 const identity=[...el.attributes].filter(a=>a.name==='id'||a.name==='name'||a.name==='type'||a.name.startsWith('data-')&&!a.name.startsWith('data-art-')).map(a=>[a.name,a.value]);
 if(el.matches('input[type="radio"],input[type="checkbox"]'))identity.push(['value',el.value]);
 return {el,tag:el.tagName,identity,start:el.selectionStart,end:el.selectionEnd};
}
export function restoreInteractionFocus(root,snapshot,{fallback=true}={}){
 const candidates=visibleFocusTargets(root);
 const match=snapshot&&(candidates.includes(snapshot.el)?snapshot.el:snapshot.identity.length?candidates.find(el=>el.tagName===snapshot.tag&&snapshot.identity.every(([key,value])=>el.getAttribute(key)===value)):null);
 // New panels start at an editable field or their close control, never at
 // a bulk approval or other state-changing button just because it comes first.
 const next=match||(fallback&&(candidates.find(el=>el.matches('input:not([type="file"]),select,textarea'))||candidates.find(el=>el.dataset.action==='close')||candidates[0]));
 if(!next)return;
 next.focus({preventScroll:true});
 if(match&&snapshot.start!=null&&typeof match.setSelectionRange==='function')match.setSelectionRange(snapshot.start,snapshot.end);
}
// Viewing an object leaves its source list available for the next selection.
export const isObjectDetail=view=>!!view.textDetails||['unit-stats','unit-officer','tactic-detail','gate','battle-building','catalog-detail','scenario-army-info','campaign-history','campaign-archive','campaign-replay'].includes(view.modal)||view.modal==='campaign-info'&&!!view.infoView?.id;

export function createDetailPanels(root){
 const sourceRoot=document.createElement('div'),panelRoot=document.createElement('div');
 sourceRoot.id='detail-source-root';panelRoot.id='modal-panel-root';root.append(sourceRoot,panelRoot);
 let source=null,rendered=null,returning=false;
 const aliases={modal:'detail-source-panel','modal-body':'detail-source-body','modal-header':'detail-source-header','modal-footer':'detail-source-footer','close-button':'detail-source-close'};
 return {
  panelRoot,
  get hasSource(){return !!source;},
  sourceContext(target){return target?.closest?.('#detail-source-root')?source?.context:null;},
  returnContext(){returning=!!source;return source?.context||null;},
  render(html,context){
   const detail=!!html&&isObjectDetail(context);
   if(detail&&!source&&rendered&&!isObjectDetail(rendered)&&panelRoot.firstElementChild){
    source={context:rendered,focus:captureInteractionFocus(panelRoot)};forgetMarkup(panelRoot);
    const backdrop=panelRoot.firstElementChild;
    const positions=[backdrop,...backdrop.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({el,top:el.scrollTop,left:el.scrollLeft}));
    for(const [oldClass,newClass]of Object.entries(aliases))for(const el of backdrop.querySelectorAll('.'+oldClass)){el.classList.replace(oldClass,newClass);}
    const title=backdrop.querySelector('#modal-title');if(title)title.id='detail-source-title';
    const dialog=backdrop.querySelector('[role="dialog"]');if(dialog){dialog.setAttribute('aria-labelledby','detail-source-title');dialog.setAttribute('aria-modal','false');}
    sourceRoot.append(backdrop);
    for(const p of positions){p.el.scrollTop=p.top;p.el.scrollLeft=p.left;}
   }
   let restored=false,focus=null;
   if(!detail&&returning&&source&&context.modal===source.context.modal){
    const backdrop=sourceRoot.firstElementChild;
    const positions=[backdrop,...backdrop.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({el,top:el.scrollTop,left:el.scrollLeft}));
    for(const [oldClass,newClass]of Object.entries(aliases))for(const el of backdrop.querySelectorAll('.'+newClass))el.classList.replace(newClass,oldClass);
    const title=backdrop.querySelector('#detail-source-title');if(title)title.id='modal-title';
    const dialog=backdrop.querySelector('[role="dialog"]');if(dialog){dialog.setAttribute('aria-labelledby','modal-title');dialog.setAttribute('aria-modal','true');}
    panelRoot.replaceChildren(backdrop);forgetMarkup(panelRoot);for(const p of positions){p.el.scrollTop=p.top;p.el.scrollLeft=p.left;}restored=true;focus=source.focus;
   }
   if(!detail){source=null;sourceRoot.replaceChildren();}
   if(!restored){if(rendered?.modal===context.modal)patchMarkup(panelRoot,html);else{panelRoot.innerHTML=html;forgetMarkup(panelRoot);}}
   returning=false;
   rendered=html?context:null;
   return {detail,restored,focus,blocking:!!html&&(!detail||!!source)};
  },
  clear(){source=null;rendered=null;returning=false;sourceRoot.replaceChildren();panelRoot.replaceChildren();}
 };
}
