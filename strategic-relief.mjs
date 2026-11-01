import {MOUNTAINS,RIVERS,polyline} from './national-geography.mjs';
import {atlasPoint} from './data/design/ancient-atlas.mjs';
import {CITY_DESIGNS} from './data/design/cities.mjs';
import {roadsideLandscape} from './map-landscape.mjs';
const cache=new Map();
const round=n=>Math.round(n*10)/10;
// Fixed seed: scenery never changes when orders or panels rerender the map.
function randomSource(){let seed=741;return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function reliefMarkup(season='summer'){
 if(cache.has(season))return cache.get(season);
 const random=randomSource(),winter=season==='winter';
 const ridges=[];
 for(const range of MOUNTAINS)for(let i=1;i<range.points.length;i++){
  const a=range.points[i-1],b=range.points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),count=Math.ceil(len/10);
  for(let j=0;j<count;j++)for(let row=-1;row<=1;row++){
   const t=j/count,x=a[0]+dx*t-dy/len*row*range.width*.3+(random()-.5)*7,y=a[1]+dy*t+dx/len*row*range.width*.3+(random()-.5)*6,w=5+random()*6,h=4+random()*9;
   if(CITY_DESIGNS.some(c=>c.kind==='city'&&Math.hypot(x-c.x,y-c.y)<15))continue;
   ridges.push({x:round(x),y:round(y),w:round(w),h:round(h),snow:winter||range.name==='雪山'});
  }
 }
 ridges.sort((a,b)=>a.y-b.y);
 const html=`<defs>
 <linearGradient id="relief-light" x2=".8" y2="1"><stop stop-color="${winter?'#d4d6c5':'#bcb08c'}"/><stop offset=".48" stop-color="#9d987a"/><stop offset="1" stop-color="#8f9477" stop-opacity=".35"/></linearGradient>
 <linearGradient id="relief-dark" x2=".9" y2=".8"><stop stop-color="#89856b"/><stop offset="1" stop-color="#6c775e" stop-opacity=".25"/></linearGradient>
 <radialGradient id="relief-foot"><stop stop-color="#727c5a" stop-opacity=".3"/><stop offset="1" stop-color="#8a8866" stop-opacity="0"/></radialGradient>
 </defs><g class="terrain-relief" pointer-events="none">
 ${MOUNTAINS.map(m=>`<path d="${polyline(m.points)}" stroke="#8b9372" stroke-opacity=".12" stroke-width="${m.width*2.3}" stroke-linecap="round" fill="none"/>`).join('')}
 ${ridges.map(({x,y,w,h,snow})=>{
  const strokes=Array.from({length:5},(_,i)=>{const t=(i+1)/7;return `<path d="M${-w*(1-t)} ${4-t*h*.55}Q${-w*(.55-t*.4)} ${-h*(.25+t*.45)} ${-w*.08} ${-h*(.6+t*.35)}"/>`;}).join('');
  return `<g transform="translate(${x} ${y})"><ellipse cy="3" rx="${w*1.8}" ry="${w*.8}" fill="url(#relief-foot)"/>
  <path d="M${-w*1.2} 6Q${-w*.8} ${-h*.18} ${-w*.48} ${-h*.48}C${-w*.22} ${-h*.57} ${-w*.2} ${-h*.96} 0 ${-h}Q${w*.22} ${-h*.98} ${w*.36} ${-h*.55}Q${w*.72} ${-h*.25} ${w*1.15} 6Q0 10 ${-w*1.2} 6" fill="url(#relief-light)"/>
  <path d="M0 ${-h}Q${w*.22} ${-h*.98} ${w*.36} ${-h*.55}Q${w*.72} ${-h*.25} ${w*1.15} 6Q${w*.3} 6 ${w*.14} 2Q${-w*.13} ${-h*.18} 0 ${-h}" fill="url(#relief-dark)"/>
  <g fill="none" stroke="#ddd0ac" stroke-opacity=".28" stroke-width=".35">${strokes}</g>
  <path d="M${w*.12} ${-h*.63}q${w*.08} ${h*.25} ${w*.3} ${h*.38}m${-w*.05} ${-h*.08}l${w*.17} ${h*.23}" fill="none" stroke="#667057" stroke-opacity=".3" stroke-width=".4"/>
  ${snow?`<path d="M${-w*.22} ${-h*.66}Q${-w*.1} ${-h} 0 ${-h}Q${w*.15} ${-h*.9} ${w*.22} ${-h*.67}L${w*.06} ${-h*.73} ${-w*.03} ${-h*.62}Z" fill="#e2e4d5" opacity=".8"/>`:''}</g>`;
 }).join('')}</g>`;
 cache.set(season,html);return html;
}
export function landscapeMarkup(season='summer'){
 const random=randomSource(),autumn=season==='autumn',winter=season==='winter';
 const parts=[];
 // Loosely clustered woodland, with clear river channels.
 for(let i=0;i<170;i++){
  const [x,y]=atlasPoint([340+random()*980,300+random()*1090]);
  if(RIVERS.some(r=>r.points.some(p=>Math.hypot(x-p[0],y-p[1])<18)))continue;
  if(CITY_DESIGNS.some(c=>Math.hypot(x-c.x,y-c.y)<18))continue;
  const southern=y>480,spread=12+random()*18;
  parts.push(`<ellipse cx="${x}" cy="${y}" rx="${spread}" ry="${spread*.55}" fill="url(#countryside-grass)" opacity=".6"/>`);
  for(let j=0;j<(southern?10:5);j++){
   const tx=round(x+(random()-.5)*spread*2),ty=round(y+(random()-.5)*spread),size=.32+random()*.56;
   parts.push(`<g transform="translate(${tx} ${ty})"><ellipse cy="1" rx="${size*1.7}" ry="${size*.6}" fill="#384a30" opacity=".2"/><path d="M0 0v1.5" stroke="#706044" stroke-width=".4"/><path d="M${-size} 0C${-size*1.7} ${-size*.7} ${-size*1.3} ${-size*1.9} ${-size*.5} ${-size*1.8}C${-size*.2} ${-size*2.6} ${size*.9} ${-size*2.4} ${size*1.1} ${-size*1.5}C${size*2} ${-size*.8} ${size*1.1} ${size*.3} 0 0Z" fill="${winter?'#929b86':autumn?['#8b824c','#a28e50','#6c7954'][j%3]:['#596d47','#738154','#8b935f'][j%3]}"/><path d="M${-size*.7} ${-size*.5}Q${-size*.8} ${-size*1.7} 0 ${-size*2.4}" fill="none" stroke="${winter?'#e2e4d5':'#c5c28c'}" stroke-opacity=".45" stroke-width=".45"/></g>`);
  }
 }
 for(const [cx,cy] of [[1048,430],[1040,593],[938,674],[1197,584],[502,891],[895,864],[939,1022],[1240,812]].map(atlasPoint)){
  for(let i=0;i<18;i++){
   const x=round(cx+(random()-.5)*90),y=round(cy+(random()-.5)*65),w=6+random()*9,h=3+random()*5;
   if(CITY_DESIGNS.some(c=>Math.hypot(x-c.x,y-c.y)<24))continue;
   const crops=Array.from({length:Math.floor(w)},(_,j)=>`M${j+.5} .6v${h-1}`).join('');
   parts.push(`<g transform="translate(${x} ${y}) rotate(-18)"><path d="M0 .6L${w} 0 ${w-.4} ${h} .5 ${h+.2}Z" fill="${['#b9b17c','#a5aa7b','#c3b789'][i%3]}" opacity=".35"/><path d="${crops}" stroke="#78865a" stroke-width=".28" opacity=".45"/><path d="M0 .6L.5 ${h+.2} ${w-.4} ${h}" fill="none" stroke="#d2c59a" stroke-width=".25" opacity=".55"/></g>`);
  }
 }
 return `<g class="terrain-landscape" pointer-events="none">${parts.join('')}${roadsideLandscape(season)}</g>`;
}
export function cityModel(){return `<g class="map-city-model" transform="translate(0 -7) scale(1.5)" pointer-events="none"><ellipse cy="7" rx="19" ry="6" style="fill:#1b372d" opacity=".3"/><path d="M-17-2L0-9 17-2 0 6Z" style="fill:#c6bd98"/><path d="M-17-2V5L0 12V5ZM0 5V12L17 5V-2Z" style="fill:#838b77" stroke="#495c50" stroke-width=".6"/><path d="M-17-3L0 4 17-3V0L0 7-17 0Z" style="fill:#e1d5ae"/><path d="M-15-3v-3m5 5v-3m5 5v-3m10 0v3m5-5v3m5-5v3" stroke="#ded3ad" stroke-width="2"/><path d="M-3 10V6Q0 2 3 6V10" style="fill:#2a443d"/><path d="M-7-3V-12H7V-3L0 0Z" style="fill:#d5bd8b"/><path d="M-12-11L0-19 12-11 8-9 0-13-8-9Z" style="fill:#345e59" stroke="#a5b2a0" stroke-width=".6"/><path d="M-10-4L0-10 10-4 0 0Z" style="fill:#486f64"/><path d="M-3-8V-11H-1V-8M2-8V-11H4V-8" stroke="#384b40" stroke-width="1.2"/><path d="M-13 0V-4H-8V2M9 2V-4H14V0" style="fill:#cabb94"/><path d="M-16-4L-11-8-5-3M6-3L11-8 17-4" style="fill:#42665a" stroke="#a1ad8a" stroke-width=".5"/></g>`;}

export function portModel(){return `<g class="map-port-model" pointer-events="none"><ellipse cy="6" rx="13" ry="4" fill="#285c65" opacity=".5"/><path d="M-11 1L5-5 12 0-4 7Z" fill="#9e8c63" stroke="#dfcf9d" stroke-width=".6"/><path d="M-7 2L8-3M-3 4L11-1" stroke="#5c634e" stroke-width=".8"/><path d="M-7 0V-7H2V-3Z" fill="#caba91"/><path d="M-10-7L-3-12 5-7 1-5Z" fill="#3d675e" stroke="#bbba95" stroke-width=".5"/><path d="M2 7Q8 12 14 5Z" fill="#5f4935"/><path d="M8 6V-5L13 3H8" fill="#e1d5ae" stroke="#726d50" stroke-width=".6"/></g>`;}
