import {OFFICER_BY_ID} from './officer-catalog.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function battleAppointmentsMarkup(changes,armies=[]){
 if(!changes?.length)return '';
 const name=id=>OFFICER_BY_ID[id]?.name||armies.flatMap(a=>a.units).find(u=>u.id===id)?.name||'空缺';
 return '<section class="battle-appointments"><h3>战后任命</h3>'+changes.map(c=>`<p>${esc(armies.find(a=>a.id===c.armyId)?.name||'本军团')} · ${c.role==='leader'?'军团长':'军师'}：${esc(name(c.from))} → ${esc(name(c.to))}</p>`).join('')+'</section>';
}
