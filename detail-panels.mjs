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
    source={context:rendered};
    const backdrop=panelRoot.firstElementChild;
    const positions=[backdrop,...backdrop.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({el,top:el.scrollTop,left:el.scrollLeft}));
    for(const [oldClass,newClass]of Object.entries(aliases))for(const el of backdrop.querySelectorAll('.'+oldClass)){el.classList.replace(oldClass,newClass);}
    const title=backdrop.querySelector('#modal-title');if(title)title.id='detail-source-title';
    const dialog=backdrop.querySelector('[role="dialog"]');if(dialog){dialog.setAttribute('aria-labelledby','detail-source-title');dialog.setAttribute('aria-modal','false');}
    sourceRoot.append(backdrop);
    for(const p of positions){p.el.scrollTop=p.top;p.el.scrollLeft=p.left;}
   }
   let restored=false;
   if(!detail&&returning&&source&&context.modal===source.context.modal){
    const backdrop=sourceRoot.firstElementChild;
    const positions=[backdrop,...backdrop.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>({el,top:el.scrollTop,left:el.scrollLeft}));
    for(const [oldClass,newClass]of Object.entries(aliases))for(const el of backdrop.querySelectorAll('.'+newClass))el.classList.replace(newClass,oldClass);
    const title=backdrop.querySelector('#detail-source-title');if(title)title.id='modal-title';
    const dialog=backdrop.querySelector('[role="dialog"]');if(dialog){dialog.setAttribute('aria-labelledby','modal-title');dialog.setAttribute('aria-modal','true');}
    panelRoot.replaceChildren(backdrop);for(const p of positions){p.el.scrollTop=p.top;p.el.scrollLeft=p.left;}restored=true;
   }
   if(!detail){source=null;sourceRoot.replaceChildren();}
   if(!restored)panelRoot.innerHTML=html;
   returning=false;
   rendered=html?context:null;
   return {detail,restored,blocking:!!html&&(!detail||!!source)};
  },
  clear(){source=null;rendered=null;returning=false;sourceRoot.replaceChildren();panelRoot.replaceChildren();}
 };
}
