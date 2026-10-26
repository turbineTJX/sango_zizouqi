import {metropolitanRegions} from './metropolitan-region-data.mjs';
export {metropolitanRegions} from './metropolitan-region-data.mjs';

const point=p=>p.map(v=>v.toFixed(2)).join(',');
// Adjacent display regions share the same curve in either direction. The saved
// polygons and road-based administrative membership remain unchanged.
function regionSegment(a,b,move=false){
 const key=[point(a),point(b)].sort().join('|'),seed=[...key].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
 const [first,last]=point(a)<point(b)?[a,b]:[b,a],dx=last[0]-first[0],dy=last[1]-first[1],length=Math.hypot(dx,dy)||1;
 const bend=((seed%101)/100-.5)*Math.min(7,length*.12),cx=(a[0]+b[0])/2-dy/length*bend,cy=(a[1]+b[1])/2+dx/length*bend;
 return `${move?'M'+point(a):''}Q${cx.toFixed(2)},${cy.toFixed(2)} ${point(b)}`;
}
export function regionOutlinePath(polygon){
 return polygon.map((a,i)=>regionSegment(a,polygon[(i+1)%polygon.length],i===0)).join('')+'Z';
}
// Public geography: a metropolis is the union of its city and prefecture areas.
// Roads and real garrisons remain the source of movement and control.
export function metropolitanBoundary(regions){
 const edges=new Map();
 for(const region of regions)for(let i=0;i<region.polygon.length;i++){
  const a=point(region.polygon[i]),b=point(region.polygon[(i+1)%region.polygon.length]);if(a===b)continue;
  const key=[a,b].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,regionSegment(region.polygon[i],region.polygon[(i+1)%region.polygon.length],true));
 }
 return [...edges.values()].join('');
}
export function prefectureRegionsMarkup(s,selected){
 return '<g class="prefecture-regions" clip-path="url(#territory-land)" mask="url(#territory-dry-land)" aria-hidden="true">'+metropolitanRegions(s).map(r=>
  `<path data-map-region="${r.id}" data-region-kind="${r.kind==='junction'?'prefecture':'city'}" data-region-metropolis="${r.centerId}" class="${r.kind==='junction'?'region-prefecture':'region-city'} ${selected===r.id?'selected':''}" d="${regionOutlinePath(r.polygon)}"/>`
 ).join('')+'</g>';
}
