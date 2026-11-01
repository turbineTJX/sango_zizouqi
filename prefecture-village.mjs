// Residential scenery belongs to the public location, separate from the twelve
// real, saved facilities. The same houses remain anchored at every zoom level.
const homes=[[-170,-104,1],[-104,-122,.8],[7,-133,.85],[139,-107,1],[-193,-18,.9],[178,9,.85],[-183,91,.8],[178,103,.95],[-100,130,.75],[52,137,.8]];
const house=(x,y,k)=>`<g class="village-house" transform="translate(${x} ${y}) scale(${k})"><ellipse cy="9" rx="29" ry="12" fill="#3e4937" opacity=".18"/><path d="M-23-13L3-24 24-13V9L0 19-23 8Z" fill="#c4af84" stroke="#776e53" stroke-width="1.5"/><path d="M0-2L24-13V9L0 19Z" fill="#9d926f"/><path d="M-31-15L-4-33 31-17 23-11-4-23-24-9Z" fill="#596557" stroke="#414e43" stroke-width="2"/><path d="M-4-33V-23L23-11 31-17Z" fill="#455448"/><path d="M-14 12V-3L-5 1V16ZM8 1V8L16 5V-3Z" fill="#4b5040"/><path d="M-21-12L-2-4M-23 6L-2 16M4-26L23-18" fill="none" stroke="#e0d0a4" stroke-width="1.5" opacity=".65"/></g>`;
export function prefectureVillageMarkup(layout){
 return `<g class="prefecture-village" data-town-space="prefecture" aria-hidden="true" pointer-events="none" transform="${layout.flip?'scale(-1 1)':''}">
 <path d="M-237 31Q-124-20-45 12T238 29M-17-165Q-40-60-12 12T18 163" fill="none" stroke="#baab80" stroke-width="15" opacity=".55"/>
 <path d="M-237 31Q-124-20-45 12T238 29M-17-165Q-40-60-12 12T18 163" fill="none" stroke="#e1cda0" stroke-width="7" opacity=".6"/>
 <g fill="#a4a276" stroke="#858b61" stroke-width="2"><path d="M-233 116l39 15-19 26-37-14Z"/><path d="M195-124l34 14-15 25-33-15Z"/></g>
 <path d="M-234 126l29 11m-34-2 29 11m-35-2 30 11M194-113l26 11m-31-1 26 11" fill="none" stroke="#747f53" stroke-width="2"/>
 <g fill="none" stroke="#8b805e" stroke-width="2.5"><path d="M-207-98l-13 25 48 20 13-25M113-106l-12 23 49 21 12-23M-208 92l-11 22 40 17"/><path d="M-220-73v-10m24 20v-11m24 31v-10M101-83v-10m25 21v-10m24 31v-10"/></g>
 ${homes.map(h=>house(...h)).join('')}
 <g stroke="#646e4c" stroke-width="3"><path d="M-238-42v-23M223 77V52M76-137v-22"/></g><g fill="#77865b"><ellipse cx="-238" cy="-70" rx="14" ry="19"/><ellipse cx="223" cy="47" rx="16" ry="20"/><ellipse cx="76" cy="-163" rx="13" ry="16"/></g>
 </g>`;
}
