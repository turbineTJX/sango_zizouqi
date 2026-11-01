import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {COMBAT} from './combat-rules.mjs';
import {observedUnitAction,placeBattleCaptions} from './battle-presentation.mjs';
import {statusIcon} from './status-display.mjs';
import {battleHealth,battleHealthText,battleHealthStyle} from './battle-health-view.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=value=>value>=10000?`${(value/10000).toFixed(1)}万`:Math.round(value).toLocaleString('zh-CN');
export function battleMapStatusMarkup(statuses){
 const ordered=[...statuses].sort((a,b)=>(a.priority??99)-(b.priority??99));
 return ordered.slice(0,2).map(s=>`<span class="map-status ${esc(s.tone)}" title="${esc(s.name+' · '+s.time)}">${statusIcon(s.key)}</span>`).join('')+(ordered.length>2?`<span class="map-status-overflow">+${ordered.length-2}</span>`:'');
}
export function battleLabelMarkup(u,b){
 const troop=TROOP_DESIGNS[combatType(u)],health=battleHealth(u),intent=Math.max(0,Math.min(100,(u.intent||0)/COMBAT.intentCap*100));
 const action=observedUnitAction(b,u);
 return `<span data-art-portrait="${esc(u.id)}" class="portrait ${esc(combatFamily(u))} small"><span>${esc(u.name.slice(-1))}</span><i>${esc(troop.icon)}</i></span><span class="unit-label-copy"><b>${esc(u.name)}<small>${esc(troop.icon)}</small></b><span><span data-roster-troops>${compact(u.hp)}</span><small>战意 ${u.intent||0}</small></span><i class="label-health" style="${battleHealthStyle(health)}" role="progressbar" aria-label="兵力" aria-valuemin="0" aria-valuemax="${health.maximum}" aria-valuenow="${health.current}" aria-valuetext="${battleHealthText(health)}" title="${battleHealthText(health)}"><em style="width:var(--troop-health)"></em></i><i class="label-intent"><em style="width:${intent}%"></em></i><small class="unit-order">${esc(action.text)}${action.targetName?' → '+esc(action.targetName):''}</small>${u.status==='reserve'&&(u.arrivalTick||0)>b.tick?'<small class="reserve-arrival">未抵达</small>':''}</span>`;
}

// Compact identity bars stay just above each troop and move with its model.
export class BattleLabels{
 constructor(board){
  this.board=board;this.root=board.closest('.battle-layout');
  this.enter=e=>{const el=e.target.closest('.unit-nameplate,[data-unit]');this.highlight(el?.dataset.inspect||el?.dataset.unit||null);};
  this.leave=e=>{if(!this.root.contains(e.relatedTarget))this.highlight(null);};
  this.root.addEventListener('pointerover',this.enter);this.root.addEventListener('focusin',this.enter);
  this.root.addEventListener('pointerleave',this.leave);this.root.addEventListener('focusout',this.leave);
  this.moved=e=>{if(!e.target.matches?.('[data-unit]')||!['left','top'].includes(e.propertyName)||this.motionFrame)return;this.motionFrame=requestAnimationFrame(()=>{this.motionFrame=0;this.layout();});};
  this.root.addEventListener('transitionend',this.moved);
  this.positions=new Map();this.resize=new ResizeObserver(()=>this.layout());this.resize.observe(board);
  this.watched=new Set();this.unitResize=new ResizeObserver(()=>this.layout());
 }
 highlight(id){this.highlighted=id;for(const el of this.root.querySelectorAll('.unit-nameplate,[data-unit]'))el.classList.toggle('roster-highlight',(el.dataset.inspect||el.dataset.unit)===id);this.onHighlight?.(id);}
 update(units){
  if(!units.some(u=>u.id===this.highlighted))this.highlighted=null;this.highlight(this.highlighted);
  const nodes=[...this.board.querySelectorAll('[data-unit]')];
  for(const el of this.watched)if(!nodes.includes(el)){this.unitResize.unobserve(el);this.watched.delete(el);}
  for(const el of nodes)if(!this.watched.has(el)){this.watched.add(el);this.unitResize.observe(el);}
  const key=JSON.stringify(nodes.map(el=>[el.dataset.unit,el.style.left,el.style.top,el.querySelector('.unit-map-caption')?.textContent,el.classList.contains('stratagem-affected')]));
  if(key!==this.layoutKey){this.layoutKey=key;this.layout();}
 }
 layout(){
  const board=this.board.getBoundingClientRect();if(!board.width||!board.height)return;
  const entries=[...this.board.querySelectorAll('[data-unit]')].map(el=>{
   const caption=el.querySelector('.unit-map-caption');if(!caption)return null;
   const rect=el.getBoundingClientRect(),y=rect.top-board.top+rect.height/2,rise=this.modelRises?.get(el.dataset.unit);return {id:el.dataset.unit,el,caption,rect,x:rect.left-board.left+rect.width/2,y,headY:rise==null?rect.top-board.top:y-rise,width:caption.offsetWidth,height:caption.offsetHeight};
  }).filter(Boolean);
  const next=placeBattleCaptions(entries,board.width,board.height,this.positions);this.positions.clear();for(const [id,p]of next)this.positions.set(id,p);
  for(const e of entries){const p=this.positions.get(e.id);e.caption.style.left=(p.x-(e.rect.left-board.left))+'px';e.caption.style.top=(p.y-(e.rect.top-board.top))+'px';e.caption.style.transform='none';}
 }
 destroy(){this.resize.disconnect();this.unitResize.disconnect();this.watched.clear();cancelAnimationFrame(this.motionFrame);this.root.removeEventListener('transitionend',this.moved);this.root.removeEventListener('pointerover',this.enter);this.root.removeEventListener('focusin',this.enter);this.root.removeEventListener('pointerleave',this.leave);this.root.removeEventListener('focusout',this.leave);}
}
