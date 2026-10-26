import {watchtowerObservations} from './strategic-vision.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function regionalWatchtowersMarkup(s){
 return '<g class="region-watchtowers">'+watchtowerObservations(s).map(({data:t,day,visible})=>{
  const building=t.phase==='construction',status=building?'施工中 · '+Math.floor(t.progress)+'%':t.hp?`耐久 ${t.hp}/${t.maxHp} · 视野半径 ${t.radius}`:'已损毁';
  const title=`${t.name} · 区域瞭望塔 · ${status}${visible?'':' · 第'+day+'天情报'}`;
  return `<g class="region-watchtower ${building?'is-building':''} ${!t.hp&&!building?'is-damaged':''} ${visible?'':'is-stale'}" data-region-watchtower="${t.cityId}" data-tower-site="${t.siteId}" data-action="campaign-info-detail" data-kind="city" data-id="${t.cityId}" transform="translate(${t.x} ${t.y})" tabindex="0" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title><g transform="scale(.5)"><ellipse cy="1" rx="4" ry="1.5" fill="#263b2d" opacity=".25"/><g class="region-tower-model" pointer-events="none"><path d="M-2.8 0l.7-8h4.2l.7 8M-2.4-4h4.8M-2.8 0l5-7M2.8 0l-5-7" fill="#a18a59" stroke="#584a30" stroke-width=".7"/><path d="M-3.6-8v-2h7.2v2ZM-4.5-10L0-13l4.5 3Z" fill="${building?'#aa9970':'#555f4a'}" stroke="#464932" stroke-width=".5"/>${t.radius>=38?'<path d="M0-13v-3m0 0h3v2H0" stroke="#b3753b" stroke-width=".6"/>':''}</g>${building?'<path d="M-4 0v-11M4 0v-11M-4-6h8" fill="none" stroke="#c2a375" stroke-width=".6" stroke-dasharray="1 1"/>':''}<rect class="region-tower-hit" x="-5" y="-17" width="10" height="20" fill="transparent"/></g></g>`;
 }).join('')+'</g>';
}
