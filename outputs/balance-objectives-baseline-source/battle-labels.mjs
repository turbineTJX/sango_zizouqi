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
