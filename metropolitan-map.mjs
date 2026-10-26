import {metropolitanMembers,metropolitanMemberCounts,projectSiteId} from './metropolitan-areas.mjs';
import {FACTIONS} from './engine.mjs';
import {metropolitanRegions,metropolitanBoundary,regionOutlinePath} from './metropolitan-regions.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Display-only groups retain the real node coordinates and construction sites.
export function metropolitanMapGroups(s){
 return s.cities.filter(c=>c.citySize==='large').map(center=>{
  const members=metropolitanMembers(s,center),ids=new Set(members.map(n=>n.id));
  const counts=metropolitanMemberCounts(s,center);
  const projects=s.cities.filter(c=>c.project&&ids.has(projectSiteId(c))).length;
  return {center,members,counts,projects};
 });
}
export function metropolitanMapMarkup(s,ui){
 const groups=metropolitanMapGroups(s),regions=metropolitanRegions(s);
 const footprints=groups.map(({center:c,members})=>{
  const cells=regions.filter(r=>r.centerId===c.id);
  return `<g data-metropolis-region="${c.id}" class="${members.some(n=>n.id===ui.city)?'selected':''}" style="--force-color:${FACTIONS[c.owner].color}">${cells.map(r=>`<path class="metropolis-cell" d="${regionOutlinePath(r.polygon)}"/>`).join('')}<path class="metropolis-boundary" d="${metropolitanBoundary(cells)}"/></g>`;
 }).join('');
 const markers=groups.map(({center:c,members,projects})=>{
  const selected=members.some(n=>n.id===ui.city),force=FACTIONS[c.owner];
  return `<g class="map-metropolis ${selected?'selected':''}" data-metropolis-focus="${esc(c.id)}" data-x="${c.x}" data-y="${c.y}" tabindex="0" role="button" aria-label="${esc(c.name)}都市圈，展开圈内据点" style="--force-color:${force.color}" transform="translate(${c.x} ${c.y})"><script type="application/json" data-metropolis-members>${JSON.stringify(members.map(n=>({id:n.id,x:n.x,y:n.y}))).replaceAll('<','\\u003c')}</script><g data-map-glyph><rect class="metropolis-label" x="-48" y="-58" width="96" height="24" rx="3"/><circle class="metropolis-halo" cx="-36" cy="-46" r="8"/><path class="metropolis-symbol" transform="translate(-36 -46) scale(.4)" d="M-10 6V-5h4v-6h4v5h4v-5h4v6h4V6Z"/><text class="metropolis-name" x="9" y="-42">${esc(c.name)}</text>${projects?'<circle class="metropolis-construction" cx="45" cy="-58" r="4"><title>'+projects+'项建设</title></circle>':''}</g><title>${esc(c.name)}都市圈</title></g>`;
 }).join('');
 return `<g class="metropolis-footprints" clip-path="url(#territory-land)" mask="url(#territory-dry-land)" aria-hidden="true">${footprints}</g><g class="map-metropolises">${markers}</g>`;
}
