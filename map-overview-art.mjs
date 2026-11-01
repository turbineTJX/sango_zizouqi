// Small architectural illustrations share the map's slate roofs and earthen
// walls. Broad planes remain readable at national scale without raster noise.
const largeCity=`<ellipse class="overview-shadow" cy="8" rx="16" ry="4"/>
 <path class="overview-base" d="M-15 1L0-5 15 1 0 10Z"/>
 <path class="overview-wall" d="M-14-1L0 5 14-1V5L0 11-14 5Z"/>
 <path class="overview-wall-shade" d="M0 5L14-1V5L0 11Z"/>
 <path class="overview-timber" d="M-9-2V-7L-4-9 0-6V0M3-2V-7L8-9 12-6V0"/>
 <path class="overview-roof" d="M-12-7L-5-12 3-7-4-4ZM0-7L7-12 15-7 8-4Z"/>
 <path class="overview-wall-light" d="M-14-3L0 3 14-3V0L0 6-14 0Z"/>
 <path class="overview-timber" d="M-4 3V-7H4V3Z"/>
 <path class="overview-roof" d="M-8-7L0-13 8-7 5-5 0-8-5-5Z"/>
 <path class="overview-wall" d="M-15-3V-7H-10V0M10 0V-7H15V-3"/>
 <path class="overview-roof" d="M-17-7L-13-10-8-7ZM8-7L13-10 17-7Z"/>
 <path class="overview-opening" d="M-2 10V6Q0 2 2 6V10Z"/>
 <path class="overview-detail" d="M-11 1V3M-7 3V5M7 3V5M11 1V3"/>
 <path class="overview-flagpole" d="M12-10V-17"/><path class="overview-faction" d="M12-17H18L16-14H12Z"/>`;
const settlement=`<ellipse class="overview-shadow" cy="6" rx="12" ry="3"/>
 <path class="overview-base" d="M-12 2L0-3 12 2 0 8Z"/>
 <path class="overview-wall" d="M-10 2V-4H-3V5M-2 3V-6H6V5M5 5V-1H11V6"/>
 <path class="overview-wall-shade" d="M1-5H6V5L1 7ZM8 0H11V6L8 8Z"/>
 <path class="overview-roof" d="M-13-4L-7-9-1-4-3-2-7-5-10-2ZM-5-6L2-12 9-6 6-4 2-8-2-4ZM3-1L8-6 14-1 11 1 8-2 5 1Z"/>
 <path class="overview-opening" d="M-8 3V0H-5V4ZM0 5V0H3V6Z"/>
 <path class="overview-detail" d="M-11 5L-2 9 11 5"/>`;
const pass=`<ellipse class="overview-shadow" cy="6" rx="15" ry="3"/>
 <path class="overview-base" d="M-15 2L0-2 15 3 0 9Z"/>
 <path class="overview-wall" d="M-14-3L-4 0V-5H4V0L14-3V5L4 8H-4L-14 5Z"/>
 <path class="overview-wall-shade" d="M4 0L14-3V5L4 8Z"/>
 <path class="overview-wall-light" d="M-14-5L-4-2V-5H4V-2L14-5V-2L4 1H-4L-14-2Z"/>
 <path class="overview-timber" d="M-5-4V-10H5V-4Z"/>
 <path class="overview-roof" d="M-9-10L0-16 9-10 6-8 0-11-6-8Z"/>
 <path class="overview-wall" d="M-15-3V-7H-10V-2M10-2V-7H15V-3"/>
 <path class="overview-roof" d="M-17-7L-13-10-8-7ZM8-7L13-10 17-7Z"/>
 <path class="overview-opening" d="M-3 8V3Q0-2 3 3V8Z"/>
 <path class="overview-detail" d="M-12 0V2M-8 1V4M8 1V4M12 0V2"/>`;
const harbor=`<path class="overview-water" d="M-14 8q5-2 10 0t10 0m-16 4q5-2 10 0t10 0"/>
 <path class="overview-base" d="M-13-1L-2-7 9-1-2 5Z"/>
 <path class="overview-wall" d="M-11 0V-6L-4-9 2-6V1L-4 4Z"/>
 <path class="overview-wall-shade" d="M-4-3L2-6V1L-4 4Z"/>
 <path class="overview-roof" d="M-14-6L-5-13 5-6 2-3-5-7-11-3Z"/>
 <path class="overview-pier" d="M-5 3L0 0 12 6 7 9ZM-3 3V8M7 8V12M11 6V10"/>
 <path class="overview-boat" d="M-12 5L-7 7 0 5-2 10H-8Z"/>
 <path class="overview-sail" d="M-5 5V-4L-11 4ZM-3 4V-2L1 4Z"/>
 <path class="overview-opening" d="M-9 1V-2L-6-3V2Z"/>`;
const prefecture=`<ellipse class="overview-shadow" cy="5" rx="9" ry="2.5"/>
 <path class="overview-base" d="M-9 2L0-2 9 3 0 7Z"/>
 <path class="overview-wall" d="M-7 3V-3H0V5M0 4V-1H7V5Z"/>
 <path class="overview-wall-shade" d="M4 0H7V5L4 7Z"/>
 <path class="overview-roof" d="M-10-3L-4-9 3-3 0-1-4-4-7-1ZM-2-1L4-6 10-1 7 1 4-2 1 1Z"/>
 <path class="overview-opening" d="M-5 4V0H-2V5Z"/>`;

const bounds={large:{x:-18,y:-18,w:37,h:31},small:{x:-14,y:-12,w:29,h:22},gate:{x:-17,y:-16,w:35,h:27},port:{x:-14,y:-13,w:29,h:27},prefecture:{x:-10,y:-9,w:21,h:18}};
const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function overviewSiteMarkup(place){
 const kind=place.kind==='city'?(place.citySize==='large'?'large':'small'):place.kind==='junction'?'prefecture':place.kind;
 const shape={large:largeCity,small:settlement,gate:pass,port:harbor,prefecture}[kind]||prefecture,b=bounds[kind]||bounds.prefecture;
 const labelWidth=Math.max(b.w,[...String(place.name||'')].length*12+4),left=Math.min(b.x,-labelWidth/2),right=Math.max(b.x+b.w,labelWidth/2);
 return `<g class="map-overview-site overview-${place.kind}" data-map-overview-glyph="${place.kind}" data-overview-shape="${kind}" data-overview-art-bounds="${b.x} ${b.y} ${b.w} ${b.h}" data-overview-bounds="${left} ${b.y} ${right-left} ${b.h+17}" aria-hidden="true"><rect class="overview-site-hit" x="${b.x-2}" y="${b.y-2}" width="${b.w+4}" height="${b.h+4}"/><g class="overview-architecture">${shape}</g><text class="overview-place-name" x="0" y="${b.y+b.h+12}">${esc(place.name)}</text></g>`;
}
