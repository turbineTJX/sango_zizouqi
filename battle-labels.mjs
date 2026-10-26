import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {COMBAT} from './combat-rules.mjs';
import {observedUnitAction,placeBattleCaptions} from './battle-presentation.mjs';
import {statusIcon} from './status-display.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=value=>value>=10000?`${(value/10000).toFixed(1)}万`:Math.round(value).toLocaleString('zh-CN');
export function battleMapStatusMarkup(statuses){
 const ordered=[...statuses].sort((a,b)=>(a.priority??99)-(b.priority??99));
 return ordered.slice(0,2).map(s=>`<span class="map-status ${esc(s.tone)}" title="${esc(s.name+' · '+s.time)}">${statusIcon(s.key)}</span>`).join('')+(ordered.length>2?`<span class="map-status-overflow">+${ordered.length-2}</span>`:'');
}
export function battleLabelMarkup(u,b){
 const troop=TROOP_DESIGNS[combatType(u)],health=Math.max(0,Math.min(100,u.hp/Math.max(1,u.maxHp)*100)),intent=Math.max(0,Math.min(100,(u.intent||0)/COMBAT.intentCap*100));
 const action=observedUnitAction(b,u);
 return `<span data-art-portrait="${esc(u.id)}" class="portrait ${esc(combatFamily(u))} small"><span>${esc(u.name.slice(-1))}</span><i>${esc(troop.icon)}</i></span><span class="unit-label-copy"><b>${esc(u.name)}<small>${esc(troop.icon)}</small></b><span><span data-roster-troops>${compact(u.hp)}</span><small>战意 ${u.intent||0}</small></span><i class="label-health"><em style="width:${health}%"></em></i><i class="label-intent"><em style="width:${intent}%"></em></i><small class="unit-order">${esc(action.text)}${action.targetName?' → '+esc(action.targetName):''}</small>${u.status==='reserve'&&(u.arrivalTick||0)>b.tick?'<small class="reserve-arrival">未抵达</small>':''}</span>`;
}

// Portrait cards remain in stable faction rosters; hover/focus links them to the map.
export class BattleLabels{
 constructor(board){
  this.board=board;this.root=board.closest('.battle-layout');
  this.enter=e=>{const el=e.target.closest('.unit-nameplate,[data-unit]');this.highlight(el?.dataset.inspect||el?.dataset.unit||null);};
  this.leave=e=>{if(!this.root.contains(e.relatedTarget))this.highlight(null);};
  this.root.addEventListener('pointerover',this.enter);this.root.addEventListener('focusin',this.enter);
  this.root.addEventListener('pointerleave',this.leave);this.root.addEventListener('focusout',this.leave);
  this.positions=new Map();this.resize=new ResizeObserver(()=>this.layout());this.resize.observe(board);
 }
 highlight(id){this.highlighted=id;for(const el of this.root.querySelectorAll('.unit-nameplate,[data-unit]'))el.classList.toggle('roster-highlight',(el.dataset.inspect||el.dataset.unit)===id);this.onHighlight?.(id);}
 update(units){if(!units.some(u=>u.id===this.highlighted))this.highlighted=null;this.highlight(this.highlighted);this.layout();}
 layout(){
  const board=this.board.getBoundingClientRect();if(!board.width||!board.height)return;
  const entries=[...this.board.querySelectorAll('[data-unit]')].map(el=>{
   const caption=el.querySelector('.unit-map-caption');if(!caption)return null;
   const rect=el.getBoundingClientRect();return {id:el.dataset.unit,el,caption,rect,x:rect.left-board.left+rect.width/2,y:rect.bottom-board.top+3,width:caption.offsetWidth,height:caption.offsetHeight};
  }).filter(Boolean);
  this.positions=placeBattleCaptions(entries,board.width,board.height,this.positions);
  for(const e of entries){const p=this.positions.get(e.id);e.caption.style.left=(p.x-(e.rect.left-board.left))+'px';e.caption.style.top=(p.y-(e.rect.top-board.top))+'px';e.caption.style.transform='none';}
 }
 destroy(){this.resize.disconnect();this.root.removeEventListener('pointerover',this.enter);this.root.removeEventListener('focusin',this.enter);this.root.removeEventListener('pointerleave',this.leave);this.root.removeEventListener('focusout',this.leave);}
}
