import {battleMap} from './data/design/battle-maps.mjs';
import {hexCenter,HEX_GRID} from './hex-grid.mjs';

const h=200/Math.sqrt(3),width=HEX_GRID.width*100,height=HEX_GRID.height*h;
const colors={land:'#48503a',forest:'#253f2c',hill:'#6a6349',marsh:'#445d50',water:'#254d5d',bridge:'#74614a',rock:'#41443e'};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const point=(x,y)=>{const p=hexCenter(x,y);return [p.x*width,p.y*height];};
const polygon=(x,y)=>{const [cx,cy]=point(x,y);return [[0,-.5],[.5,-.25],[.5,.25],[0,.5],[-.5,.25],[-.5,-.25]].map(([dx,dy])=>`${(cx+dx*100).toFixed(2)},${(cy+dy*h).toFixed(2)}`).join(' ');};
const cached=new Map();

function terrainDetail(ground,x,y,tiles){
 const variant=(x*7+y*11)%3;
 if(ground==='forest')return [[-24,12],[17,23],[-3,-19],[30,-15]].map(([dx,dy],i)=>`<g transform="translate(${dx} ${dy}) scale(${.8+(i+variant)%3*.1})"><ellipse cy="19" rx="17" ry="7" fill="#182e235e"/><path d="M0 8v15" stroke="#ad916550" stroke-width="3"/><path d="M0 -22L-17 8H-11L-21 16H21L11 8H17Z" fill="${i%2?'#47724b':'#345d3d'}" stroke="#76966d40" stroke-width="1.5"/></g>`).join('');
 if(ground==='hill')return `<path d="M-44 27Q-13 -38 27 -6Q41 10 43 22M-37 31Q-10 -19 24 4Q34 12 36 24M-26 32Q-9 0 18 13" fill="none" stroke="#b5a47755" stroke-width="3"/><path d="M-33 13Q-10 -17 16 -8" fill="none" stroke="#d2c29740" stroke-width="2"/>`;
 if(ground==='rock')return `<ellipse cy="29" rx="44" ry="14" fill="#1c252b88"/><path d="M-45 29L-20 -32L-5 -10L11 -41L43 29Z" fill="#7d7b66" stroke="#a9a48660" stroke-width="2"/><path d="M-20 -32L-14 7L-5 -10L11 -41L18 5L43 29L-45 29Z" fill="#53594f"/><path d="M-20 -32L-30 -4L-19 -12L-13 -2L-5 -10M11 -41L1 -14L12 -22L18 -9" fill="#bab29b80"/>`;
 if(ground==='marsh')return `<ellipse cx="-12" cy="13" rx="26" ry="13" fill="#63817d44"/><path d="M-31 20q20 -7 41 0m-27 -12q12 -5 25 0" stroke="#9aac9866" stroke-width="2" fill="none"/>${[[-25,-13],[27,10],[7,-21]].map(([dx,dy])=>`<path d="M${dx} ${dy+12}v-22m0 19l-9 -15m9 15l8 -12" stroke="#a0aa737a" stroke-width="2" fill="none"/>`).join('')}`;
 if(ground==='water')return `<path d="M-37 -19q15 -7 29 0t29 0M-22 5q15 -7 29 0t29 0M-38 27q15 -7 29 0t29 0" stroke="#8cc4c14a" stroke-width="2" fill="none"/>`;
 if(ground==='bridge')return `<g transform="rotate(${tiles[y-1]?.[x]==='water'||tiles[y+1]?.[x]==='water'?90:0})"><path d="M-29 -43h58v86h-58Z" fill="#a08860" stroke="#433c2e" stroke-width="4"/><path d="M-25 -31h50m-50 11h50m-50 11h50m-50 11h50m-50 11h50m-50 11h50m-50 11h50" stroke="#554835" stroke-width="2"/><path d="M-32 -44v88m64 -88v88" stroke="#d4b580" stroke-width="4"/></g>`;
 return `<path d="M-30 ${20+variant*6}l5 -8m-5 8l-6 -5M25 ${-21+variant*4}l4 -7m-4 7l-5 -5" stroke="#a5b18038" stroke-width="2" fill="none"/>`;
}

// This layer depicts actual terrain cells. It has no simulation or RNG state.
export function battleMapArtwork(b,{prefix='battlefield'}={}){
 const m=battleMap(b),key=(b.mapId||b.terrain||'land')+':'+prefix;
 if(cached.has(key))return cached.get(key);
 const cells=m.tiles.flatMap((row,y)=>row.map((ground,x)=>({ground,x,y,points:polygon(x,y)})));
 const clip=prefix+'-land',dry=cells.filter(c=>!['water','rock'].includes(c.ground)).map(c=>`<polygon points="${c.points}"/>`).join('');
 const base=cells.map(c=>`<polygon points="${c.points}" style="fill:${colors[c.ground]};stroke:${colors[c.ground]};stroke-width:1.5"/>`).join('');
 const roads=m.roads.map(path=>`<path d="${path.map(([x,y],i)=>`${i?'L':'M'}${point(x,y).join(' ')}`).join(' ')}"/>`).join('');
 const details=cells.map(({ground,x,y})=>`<g transform="translate(${point(x,y).join(' ')})" data-map-terrain="${ground}">${terrainDetail(ground,x,y,m.tiles)}</g>`).join('');
 const result=`<g class="battle-map-art" pointer-events="none"><defs><clipPath id="${clip}">${dry}</clipPath></defs>${base}<g clip-path="url(#${clip})" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#292f2690" stroke-width="21">${roads}</g><g stroke="#b3a17b80" stroke-width="13">${roads}</g><g stroke="#dbc7a238" stroke-width="2" stroke-dasharray="7 16">${roads}</g></g>${details}</g>`;
 cached.set(key,result);return result;
}

export function battleMapPreview(b){
 const m=battleMap(b),prefix='preview-'+(b.mapId||b.terrain||'land');
 return `<section class="battle-map-preview" aria-label="战场地图预览"><div><b>${escape(m.name)}</b><span>地图预览</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(m.name+'：'+m.description)}">${battleMapArtwork(b,{prefix})}</svg><p>${escape(m.description)}</p></section>`;
}
