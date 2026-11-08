import {LAND_PATH,NORTHERN_PATH,HIGHLAND_PATH,PROVINCE_LABELS,waterMarkup,polygonPath} from './national-geography.mjs';
import {atlasPoint} from './data/design/ancient-atlas.mjs';
import {reliefMarkup,landscapeMarkup} from './strategic-relief.mjs';
const palettes={spring:['#b6b48f','#bdb393','#989d86'],summer:['#b5ad89','#c1b291','#969b83'],autumn:['#bba681','#c5af88','#a09b80'],winter:['#c6c6b3','#cfc5aa','#aab3a6']};
const cache=new Map();
const shape=ps=>polygonPath(ps.map(atlasPoint));
export const atlasProvinceLabels=()=>`<g class="atlas-province-labels" font-family="serif" font-size="22" letter-spacing="6" fill="#694e35" opacity=".3">${PROVINCE_LABELS.map(({name,point:[x,y]})=>`<text x="${x}" y="${y}" text-anchor="middle">${name}</text>`).join('')}</g>`;
export function ancientAtlasTerrain(season='summer'){
 if(!Object.hasOwn(palettes,season))season='summer';
 if(cache.has(season))return cache.get(season);
 const [land,north,highland]=palettes[season];
 const html=`<g class="drawn-terrain ancient-atlas-terrain" data-season="${season}" style="pointer-events:none">
 <defs>
 <linearGradient id="national-sea" x2=".4" y2="1"><stop stop-color="#a4bfc0"/><stop offset="1" stop-color="#749a9e"/></linearGradient>
 <radialGradient id="national-land" cx=".6" cy=".42" r=".8"><stop stop-color="${land}"/><stop offset="1" stop-color="#a39b7e"/></radialGradient>
 <pattern id="national-water" width="32" height="22" patternUnits="userSpaceOnUse"><path d="M2 11q7-3 14 0t14 0" fill="none" stroke="#e0eff0" stroke-opacity=".2" stroke-width=".65"/></pattern>
 <pattern id="national-paper" width="13" height="11" patternUnits="userSpaceOnUse"><path d="M1.3 2.1q.2-.3 .6-.2m4.4 3.8 .2-.5m3.9 3q.3-.2 .7 0M2.1 8l.2-.3" fill="none" stroke="#748052" stroke-width=".07" opacity=".19"/><path d="M4.2 1.1l.3-.1m5 4.7 .3-.2M3.1 7.2l.3-.1" stroke="#ebd9ad" stroke-width=".09" opacity=".25"/></pattern>
 <filter id="national-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".034" numOctaves="3" seed="24"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
 <filter id="national-region-blend" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="12"/></filter>
 <clipPath id="terrain-land-clip"><path d="${LAND_PATH}"/></clipPath>
 </defs>
 <rect width="1024" height="1024" fill="url(#national-sea)"/><rect width="1024" height="1024" fill="url(#national-water)"/>
 <path d="${LAND_PATH}" fill="none" stroke="#c6d5c6" stroke-opacity=".25" stroke-width="9"/>
 <path d="${LAND_PATH}" fill="url(#national-land)" stroke="#d2c6a3" stroke-width="1.3" stroke-linejoin="round"/>
 <g clip-path="url(#terrain-land-clip)">
 <g filter="url(#national-region-blend)"><path d="${NORTHERN_PATH}" fill="${north}"/><path d="${HIGHLAND_PATH}" fill="${highland}"/></g>
 <g filter="url(#national-region-blend)" opacity=".6">
 <path d="${shape([[338,995],[450,914],[556,939],[688,899],[787,928],[716,1001],[601,1083],[442,1110]])}" fill="#dcbb7d" opacity=".24"/>
 <path d="${shape([[833,556],[886,421],[945,357],[996,375],[1014,461],[986,511],[1044,538],[1069,614],[1029,678],[929,691],[881,611]])}" fill="#edd4a0" opacity=".2"/>
 <path d="${shape([[778,902],[913,883],[990,919],[1107,888],[1180,944],[1188,1082],[1106,1190],[963,1232],[814,1213],[739,1070]])}" fill="#c2ac70" opacity=".22"/>
 </g>
 ${landscapeMarkup(season)}${reliefMarkup(season)}${waterMarkup({labels:false})}
 <rect width="1024" height="1024" fill="url(#national-paper)"/>
 <rect width="1024" height="1024" filter="url(#national-grain)" opacity=".055"/>
 <g class="atlas-province-labels" font-family="serif" font-size="22" letter-spacing="6" fill="#694e35" opacity=".3">${PROVINCE_LABELS.map(({name,point:[x,y]})=>`<text x="${x}" y="${y}" text-anchor="middle">${name}</text>`).join('')}</g>
 <g font-family="serif" fill="#625c4d" letter-spacing="7" opacity=".35"><text x="470" y="117" font-size="34">朔漠</text><text x="134" y="434" font-size="28" writing-mode="tb">西域高原</text></g>
 </g>
 <g fill="#3c7183" font-family="serif" font-size="23" letter-spacing="9" opacity=".55"><text x="975" y="710" writing-mode="tb">东海</text><text x="774" y="975">南海</text><text x="863" y="223" font-size="13">渤海</text></g>
 <g class="atlas-compass" transform="translate(949 917)" fill="#456775"><path d="M0-28L8 0 0-6-8 0Z"/><path d="M0 21V-20M-15 0H15" fill="none" stroke="#456775" stroke-width=".8"/><text y="-37" text-anchor="middle" font-size="13">北</text></g>
 <text x="43" y="1000" fill="#65513c" font-family="serif" font-size="12" letter-spacing="3">汉末天下 · 山川舆图</text></g>`;
 cache.set(season,html);return html;
}
export function atlasOverviewMarkup(id){
 return `<defs><clipPath id="${id}"><path d="${LAND_PATH}"/></clipPath></defs><rect width="1024" height="1024" fill="#a6cad6"/><path d="${LAND_PATH}" fill="#d3a16f" stroke="#f0dbb6" stroke-width="3"/><g clip-path="url(#${id})"><path d="${NORTHERN_PATH}" fill="#dec278"/><path d="${HIGHLAND_PATH}" fill="#acb2a0"/>${waterMarkup({labels:false,mini:true})}</g>`;
}
