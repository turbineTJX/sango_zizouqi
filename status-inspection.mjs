// Read-only disclosure: a status name opens its own effects by hover, focus or click.
export function installStatusInspection({document:doc=globalThis.document}={}){
 let active=null,mode=null;
 const disclosure=target=>{
  const summary=target?.closest?.('summary[data-status-trigger]');
  return summary?.parentElement?.matches('.effect-tile[data-status]')?summary.parentElement:null;
 };
 function hide(){if(active)active.open=false;active=null;mode=null;}
 function show(details,nextMode){if(active!==details)hide();active=details;mode=nextMode;details.open=true;}
 function over(event){
  if(event.pointerType==='touch')return;
  const details=disclosure(event.target);
  if(details&&!(details===active&&mode==='pinned'))show(details,'pointer');
 }
 function out(event){if(mode==='pointer'&&active&&!active.contains(event.relatedTarget))hide();}
 function focus(event){const details=disclosure(event.target);if(details&&!(details===active&&mode==='pinned'))show(details,'focus');}
 function blur(event){if(mode==='focus'&&active&&!active.contains(event.relatedTarget))hide();}
 function click(event){
  const details=disclosure(event.target);
  if(details){event.preventDefault();if(active===details&&mode==='pinned')hide();else show(details,'pinned');}
  else if(active&&!active.contains(event.target))hide();
 }
 function key(event){if(event.key==='Escape'&&active){hide();event.preventDefault();event.stopPropagation();}}
 doc.addEventListener('pointerover',over);doc.addEventListener('pointerout',out);
 doc.addEventListener('focusin',focus);doc.addEventListener('focusout',blur);
 doc.addEventListener('click',click,true);doc.addEventListener('keydown',key,true);
 return {hide,destroy(){hide();doc.removeEventListener('pointerover',over);doc.removeEventListener('pointerout',out);doc.removeEventListener('focusin',focus);doc.removeEventListener('focusout',blur);doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',key,true);}};
}
