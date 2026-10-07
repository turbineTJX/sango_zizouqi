// Presentation only: the contributors are the same snapshot that rendered the bond points.
const selector='[data-bond-contributors]',tooltipId='bond-contributors-tooltip';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const buttonFor=target=>target?.closest?.(selector)||null;
export function bondContributorsMarkup(name,contributors){
 return `<strong class="bond-hover-heading">${esc(name)} · 贡献部队</strong>${contributors.length?`<div class="bond-contributors" role="list">${contributors.map(u=>`<figure class="bond-contributor" role="listitem" aria-label="${esc(u.name)}，贡献${u.points}点"><span class="bond-contributor-portrait" ${u.id?`data-art-portrait="${esc(u.id)}"`:''}><span aria-hidden="true">${esc(u.id?u.name.slice(-1):'？')}</span></span><figcaption>${esc(u.name)}<small>+${u.points}</small></figcaption></figure>`).join('')}</div>`:'<span class="bond-hover-empty">暂无在场贡献部队</span>'}`;
}
export function installBondHover({document:doc=globalThis.document,decorate=()=>{}}={}){
 const win=doc.defaultView,tooltip=doc.createElement('div');tooltip.id=tooltipId;tooltip.className='bond-hover';tooltip.role='tooltip';tooltip.hidden=true;doc.body.append(tooltip);
 let anchor=null,mode=null,content='';
 function hide(){anchor?.removeAttribute('aria-describedby');anchor=null;mode=null;content='';tooltip.hidden=true;}
 function position(){
  if(!anchor)return;
  const rect=anchor.getBoundingClientRect(),width=win.innerWidth,height=win.innerHeight;
  if(!rect.width||!rect.height||rect.bottom<=0||rect.top>=height){hide();return;}
  const list=anchor.closest('.bond-list')?.getBoundingClientRect();
  if(list&&(rect.bottom<=list.top||rect.top>=list.bottom)){hide();return;}
  const size=tooltip.getBoundingClientRect(),gap=8,margin=8;
  // Open toward the battlefield centre; clamp every edge to the viewport.
  let left=rect.left+rect.width/2<width/2?rect.right+gap:rect.left-size.width-gap,top=rect.top;
  if(left<margin||left+size.width>width-margin){
   const opposite=left<margin?rect.right+gap:rect.left-size.width-gap;
   if(opposite>=margin&&opposite+size.width<=width-margin)left=opposite;
   else {left=Math.max(margin,Math.min(width-size.width-margin,rect.left));top=rect.bottom+gap+size.height<=height-margin?rect.bottom+gap:rect.top-size.height-gap;}
  }
  top=Math.max(margin,Math.min(height-size.height-margin,top));
  tooltip.style.left=left+'px';tooltip.style.top=top+'px';
 }
 function show(button,nextMode){
  if(anchor!==button)anchor?.removeAttribute('aria-describedby');
  anchor=button;mode=nextMode;
  const next=button.dataset.bondName+':'+button.dataset.bondContributors;
  if(next!==content){
   const contributors=JSON.parse(button.dataset.bondContributors);
   tooltip.innerHTML=bondContributorsMarkup(button.dataset.bondName,contributors);
   tooltip.style.width=Math.min(360,Math.max(150,Math.min(6,contributors.length)*56+20),win.innerWidth-16)+'px';content=next;
  }
  tooltip.hidden=false;button.setAttribute('aria-describedby',tooltipId);decorate(tooltip);position();
 }
 function refresh(){
  if(!anchor)return;
  if(!anchor.isConnected){
   const key=anchor.dataset.bondHoverKey,next=[...doc.querySelectorAll(selector)].find(el=>el.dataset.bondHoverKey===key);
   if(!next){hide();return;}
   const focused=mode==='focus';anchor=next;if(focused&&doc.activeElement===doc.body)next.focus({preventScroll:true});
  }
  show(anchor,mode);
 }
 function over(event){
  if(event.pointerType==='touch')return;
  const button=buttonFor(event.target);if(button)show(button,'pointer');
 }
 function out(event){
  if(mode!=='pointer'||!anchor)return;
  if(anchor.contains(event.relatedTarget)||tooltip.contains(event.relatedTarget))return;
  if(buttonFor(event.target)===anchor||tooltip.contains(event.target))hide();
 }
 function focus(event){const button=buttonFor(event.target);if(button)show(button,'focus');else if(mode==='focus')hide();}
 function blur(event){if(mode==='focus'&&buttonFor(event.target)===anchor&&!anchor.contains(event.relatedTarget))hide();}
 function key(event){if(event.key==='Escape'&&anchor){hide();event.preventDefault();event.stopPropagation();}}
 function scroll(){if(anchor)position();}
 doc.addEventListener('pointerover',over);doc.addEventListener('pointerout',out);
 doc.addEventListener('focusin',focus);doc.addEventListener('focusout',blur);doc.addEventListener('click',hide,true);doc.addEventListener('keydown',key,true);doc.addEventListener('scroll',scroll,true);win.addEventListener('resize',refresh);
 return {refresh,hide,destroy(){hide();tooltip.remove();doc.removeEventListener('pointerover',over);doc.removeEventListener('pointerout',out);doc.removeEventListener('focusin',focus);doc.removeEventListener('focusout',blur);doc.removeEventListener('click',hide,true);doc.removeEventListener('keydown',key,true);doc.removeEventListener('scroll',scroll,true);win.removeEventListener('resize',refresh);}};
}
