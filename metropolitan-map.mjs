import {metropolitanMembers,projectSiteId} from './metropolitan-areas.mjs';
import {FACTIONS} from './engine.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Display-only groups retain the real node coordinates and construction sites.
export function metropolitanMapGroups(s){
 return s.cities.filter(c=>c.citySize==='large').map(center=>{
  const members=metropolitanMembers(s,center),ids=new Set(members.map(n=>n.id));
  const counts={small:members.filter(n=>n.citySize==='small').length,gate:members.filter(n=>n.kind==='gate').length,port:members.filter(n=>n.kind==='port').length};
  const projects=s.cities.filter(c=>c.project&&ids.has(projectSiteId(c))).length;
  return {center,members,counts,projects};
 });
}
export function metropolitanMapMarkup(s,ui){
 const groups=metropolitanMapGroups(s);
 const footprints=groups.map(({center:c,members})=>{
  const xs=members.map(n=>n.x),ys=members.map(n=>n.y),x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
  return `<ellipse cx="${x}" cy="${y}" rx="${Math.max(13,(Math.max(...xs)-Math.min(...xs))/2+10)}" ry="${Math.max(13,(Math.max(...ys)-Math.min(...ys))/2+10)}" style="--force-color:${FACTIONS[c.owner].color}"/>`;
 }).join('');
 const markers=groups.map(({center:c,members,counts,projects})=>{
  const summary=Object.entries(counts).filter(([,n])=>n).map(([key,n])=>n+({small:'小城',gate:'关卡',port:'港口'})[key]).join(' · ')||'主城';
  const selected=members.some(n=>n.id===ui.city),force=FACTIONS[c.owner];
  return `<g class="map-metropolis ${selected?'selected':''}" data-metropolis-focus="${esc(c.id)}" data-x="${c.x}" data-y="${c.y}" tabindex="0" role="button" aria-label="${esc(c.name)}都市圈，${esc(summary)}，展开圈内据点" style="--force-color:${force.color}" transform="translate(${c.x} ${c.y})"><script type="application/json" data-metropolis-members>${JSON.stringify(members.map(n=>({id:n.id,x:n.x,y:n.y}))).replaceAll('<','\\u003c')}</script><g data-map-glyph><circle class="metropolis-halo" r="14"/><path class="metropolis-symbol" d="M-10 6V-5h4v-6h4v5h4v-5h4v6h4V6Z"/><rect class="metropolis-label" x="-48" y="16" width="96" height="32" rx="3"/><text class="metropolis-name" y="28">${esc(c.name)}都市圈</text><text class="metropolis-summary" y="41">${esc(summary)}</text>${projects?'<circle class="metropolis-construction" cx="16" cy="-10" r="4"><title>'+projects+'项建设</title></circle>':''}</g><title>${esc(c.name)}都市圈 · ${esc(summary)}${projects?' · '+projects+'项建设':''}</title></g>`;
 }).join('');
 return `<g class="metropolis-footprints" aria-hidden="true">${footprints}</g><g class="map-metropolises">${markers}</g>`;
}
