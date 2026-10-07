import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {COMBAT} from './combat-rules.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=value=>value>=10000?`${(value/10000).toFixed(1)}万`:Math.round(value).toLocaleString('zh-CN');
export function battleLabelMarkup(u,b){
 const troop=TROOP_DESIGNS[combatType(u)],health=Math.max(0,Math.min(100,u.hp/Math.max(1,u.maxHp)*100)),intent=Math.max(0,Math.min(100,(u.intent||0)/COMBAT.intentCap*100));
 return `<span data-art-portrait="${esc(u.id)}" class="portrait ${esc(combatFamily(u))} small"><span>${esc(u.name.slice(-1))}</span><i>${esc(troop.icon)}</i></span><span class="unit-label-copy"><b>${esc(u.name)}<small>${esc(troop.icon)}</small></b><span>${compact(u.hp)}<small>战意 ${u.intent||0}</small></span><i class="label-health"><em style="width:${health}%"></em></i><i class="label-intent"><em style="width:${intent}%"></em></i>${u.status==='reserve'&&(u.arrivalTick||0)>b.tick?'<small class="reserve-arrival">未抵达</small>':''}</span>`;
}

// Portrait cards remain in stable faction rosters; hover/focus links them to the map.
export class BattleLabels{
 constructor(board){
  this.board=board;this.root=board.closest('.battle-layout');
  this.enter=e=>{const el=e.target.closest('.unit-nameplate,[data-unit]');this.highlight(el?.dataset.inspect||el?.dataset.unit||null);};
  this.leave=e=>{if(!this.root.contains(e.relatedTarget))this.highlight(null);};
  this.root.addEventListener('pointerover',this.enter);this.root.addEventListener('focusin',this.enter);
  this.root.addEventListener('pointerleave',this.leave);this.root.addEventListener('focusout',this.leave);
 }
 highlight(id){this.highlighted=id;for(const el of this.root.querySelectorAll('.unit-nameplate,[data-unit]'))el.classList.toggle('roster-highlight',(el.dataset.inspect||el.dataset.unit)===id);}
 update(units){if(!units.some(u=>u.id===this.highlighted))this.highlighted=null;this.highlight(this.highlighted);}
 destroy(){this.root.removeEventListener('pointerover',this.enter);this.root.removeEventListener('focusin',this.enter);this.root.removeEventListener('pointerleave',this.leave);this.root.removeEventListener('focusout',this.leave);}
}
