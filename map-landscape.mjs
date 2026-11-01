import {CITY_DESIGNS} from './data/design/cities.mjs';
import {NATIONAL_ROAD_DESIGNS} from './data/design/roads.mjs';
import {RIVERS,MOUNTAINS,isLandPoint} from './national-geography.mjs';
import {buildRoadNetwork} from './road-network.mjs';
import {roadPoint} from './strategic-movement.mjs';
import {townLayout} from './town-layout.mjs';
const cache=new Map(),f=n=>n.toFixed(2);
const distance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
export function roadsideLandscape(season='summer'){
 if(cache.has(season))return cache.get(season);
 const {roads,junctions}=buildRoadNetwork(CITY_DESIGNS,NATIONAL_ROAD_DESIGNS),places=[...CITY_DESIGNS,...junctions],nodes=new Map(places.map(p=>[p.id,p]));
 const bounds=places.map(p=>({...p,k:townLayout(p).mapScale}));
 const rivers=RIVERS.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width})));
 const dry=(x,y,padding=.7)=>isLandPoint(x,y)&&!rivers.some(r=>distance(x,y,r.a,r.b)<r.width/2+padding)&&!bounds.some(p=>Math.abs(x-p.x)<260*p.k+1.5&&Math.abs(y-p.y)<183*p.k+1.5);
 let seed=29173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const winter=season==='winter',autumn=season==='autumn',parts=[],trees=[];
 // The narrow pass is framed by rocky flanks; the existing road keeps its opening.
 for(const gate of places.filter(p=>p.kind==='gate'))for(const side of [-1,1]){
  const radius=260*townLayout(gate).mapScale,x=gate.x+side*(radius+6),y=gate.y+2;
  if(!dry(x,y,.5))continue;
  const w=8+random()*4,h=4+random()*4;
  parts.push(`<g transform="translate(${f(x)} ${f(y)})"><ellipse cy="${f(h*.5)}" rx="${f(w*1.5)}" ry="${f(h*.9)}" fill="url(#countryside-grass)"/><path d="M${f(-w*1.4)} ${f(h*.7)}C${f(-w)} ${f(h*.4)} ${f(-w*.8)} ${f(-h*.5)} ${f(-w*.42)} ${f(-h*.65)}Q${f(-w*.05)} ${f(-h*1.05)} ${f(w*.2)} ${f(-h*.65)}C${f(w*.65)} ${f(-h*.55)} ${f(w*.6)} ${f(h*.2)} ${f(w*1.35)} ${f(h*.65)}Q0 ${f(h*1.3)} ${f(-w*1.4)} ${f(h*.7)}Z" fill="url(#countryside-rock)"/><path d="M${f(-w*.38)} ${f(-h*.6)}Q${f(-w*.05)} ${f(-h*.35)} ${f(w*.14)} ${f(h*.5)}L${f(w*1.1)} ${f(h*.65)}Q${f(w*.55)} ${f(-h*.2)} ${f(w*.2)} ${f(-h*.65)}Z" fill="#68745b" opacity=".22"/><g fill="none" stroke="#d2c6a0" stroke-width=".12" opacity=".5"><path d="M${f(-w*.8)} ${f(h*.25)}q${f(w*.25)} ${f(-h*.4)} ${f(w*.52)} ${f(-h*.55)}m${f(-w*.3)} ${f(h*.8)}q${f(w*.2)} ${f(-h*.2)} ${f(w*.48)} ${f(-h*.36)}M${f(w*.32)} ${f(-h*.3)}l${f(w*.16)} ${f(h*.5)} ${f(w*.35)} ${f(h*.36)}"/></g></g>`);
 }
 const leaves=winter?['#8b9580','#a0a58d','#79866e']:autumn?['#7d7947','#9b8d50','#697749']:['#66784c','#7f8955','#526b46'];
 function tree(x,y,size){
  if(!dry(x,y,1))return;
  const h=size*(1.7+random()*.5),variant=Math.floor(random()*3);
  trees.push({y,html:`<use href="#countryside-tree-${variant}" transform="translate(${f(x)} ${f(y)}) scale(${f(size)} ${f(h/2.2)})"/>`});
 }
 for(const [a,b]of roads){
  const from=nodes.get(a),to=nodes.get(b);if(from.kind==='port'&&to.kind==='port')continue;
  const length=Math.hypot(to.x-from.x,to.y-from.y),count=Math.max(2,Math.ceil(length/6));
  for(let i=1;i<count;i++){
   const t=i/count,p=roadPoint(from,to,t),before=roadPoint(from,to,Math.max(0,t-.01)),after=roadPoint(from,to,Math.min(1,t+.01));
   const dx=after.x-before.x,dy=after.y-before.y,l=Math.hypot(dx,dy)||1;
   for(const side of [-1,1]){
    const offset=(3+random()*6)*side,x=p.x-dy/l*offset,y=p.y+dx/l*offset;
    if(!dry(x,y,2))continue;
    const w=3+random()*4,h=w*(.35+random()*.3),angle=Math.atan2(dy,dx)*180/Math.PI;
    parts.push(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"><path d="M${f(-w)} 0Q${f(-w*.9)} ${f(-h)} ${f(-w*.2)} ${f(-h*.7)}Q${f(w*.6)} ${f(-h*1.2)} ${f(w)} 0Q${f(w*.8)} ${f(h*.7)} 0 ${f(h*.65)}Q${f(-w*.6)} ${f(h)} ${f(-w)} 0Z" fill="url(#countryside-grass)"/></g>`);
    const hill=MOUNTAINS.some(m=>m.points.slice(1).some((b,j)=>distance(x,y,m.points[j],b)<m.width));
    if(hill){
     parts.push(`<g transform="translate(${f(x)} ${f(y)})"><path d="M${f(-w*1.3)} ${f(h*.6)}Q${f(-w*.6)} ${f(-h*1.6)} ${f(w*.12)} ${f(-h*.8)}Q${f(w*.75)} ${f(-h*.15)} ${f(w*1.4)} ${f(h*.5)}Q0 ${f(h*1.1)} ${f(-w*1.3)} ${f(h*.6)}Z" fill="url(#countryside-slope)"/><path d="M${f(-w*.85)} ${f(h*.18)}Q${f(-w*.3)} ${f(-h*.7)} ${f(w*.5)} ${f(-h*.12)}" fill="none" stroke="#dad0a6" stroke-width=".14" opacity=".3"/></g>`);
    }else if(random()<.28){
     const rows=Array.from({length:5},(_,j)=>`M${f(-w*.7)} ${f(-h*.4+j*h*.2)}q${f(w*.7)} -.3 ${f(w*1.4)} -.1`).join('');
     parts.push(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle-12)})"><path d="M${f(-w)} ${f(-h*.5)}Q0 ${f(-h*.9)} ${f(w)} ${f(-h*.6)}L${f(w*.8)} ${f(h*.7)}Q0 ${f(h*.4)} ${f(-w*.9)} ${f(h*.75)}Z" fill="${winter?'#a6a48b':'#b1ad75'}" opacity=".27"/><path d="${rows}" fill="none" stroke="#7c8858" stroke-width=".12" opacity=".3"/></g>`);
    }
    if(random()<.68)for(let j=0;j<6+Math.floor(random()*8);j++)tree(x+(random()-.5)*w*1.6,y+(random()-.5)*h*1.8,.22+random()*.4);
   }
  }
 }
 // Reed beds and low willow stands follow both banks of the existing rivers.
 for(const r of RIVERS)for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),count=Math.ceil(length/4);
  for(let j=0;j<count;j++)for(const side of [-1,1]){
   const t=(j+.35+random()*.3)/count,offset=(r.width/2+.7+random()*.7)*side,x=a[0]+dx*t-dy/length*offset,y=a[1]+dy*t+dx/length*offset;
   if(!dry(x,y,.1))continue;
   if(random()<.42)tree(x,y,.3+random()*.45);
   else parts.push(`<path d="M${f(x-.35)} ${f(y)}l.1 -.6m.2 .5 .1 -.9m.2 .8 .2 -.6" fill="none" stroke="${winter?'#a6a58b':'#7a8758'}" stroke-width=".09" opacity=".6"/>`);
  }
 }
 const treeDefs=leaves.map((color,i)=>`<g id="countryside-tree-${i}"><ellipse cx=".4" cy=".3" rx="1.3" ry=".48" fill="#394a32" opacity=".14"/><path d="M0 .05V-1.2m0 .5-.4-.6M0-.9l.35-.5" fill="none" stroke="#756447" stroke-width=".14"/><path d="M-.83-.48Q-1.25-.6-1.13-1Q-1.42-1.42-.98-1.64Q-1.03-2.06-.58-2.06Q-.35-2.48 .09-2.2Q.47-2.42 .73-2.03Q1.15-2.04 1.09-1.6Q1.48-1.35 1.13-1.01Q1.28-.61 .83-.5Q.48-.19 .1-.45Q-.48-.16-.83-.48Z" fill="${color}"/><path d="M-.83-1.1Q-.98-1.4-.67-1.58Q-.78-1.86-.47-1.89Q-.22-2.14 .08-1.96M-.42-.64q-.25-.19-.12-.4M.26-1.64q.4-.15 .57.2" fill="none" stroke="#c1bd82" stroke-width=".09" stroke-linecap="round" opacity=".35"/><path d="M.48-1.86Q.91-1.64 .82-1.33Q1.09-1.15 .79-.82L.38-.66" fill="none" stroke="#344b36" stroke-width=".25" stroke-linecap="round" opacity=".22"/></g>`).join('');
 const html=`<defs>${treeDefs}<radialGradient id="countryside-grass"><stop stop-color="${winter?'#999f88':'#7e8d57'}" stop-opacity=".23"/><stop offset=".6" stop-color="#8a955e" stop-opacity=".12"/><stop offset="1" stop-color="#8a955e" stop-opacity="0"/></radialGradient><linearGradient id="countryside-slope" x2=".15" y2="1"><stop stop-color="#d0c099" stop-opacity=".5"/><stop offset=".48" stop-color="#a39f78" stop-opacity=".2"/><stop offset="1" stop-color="#687b53" stop-opacity=".18"/></linearGradient><linearGradient id="countryside-rock" x2=".7" y2="1"><stop stop-color="#c8bea0"/><stop offset=".35" stop-color="#afa88b"/><stop offset=".7" stop-color="#989a77"/><stop offset="1" stop-color="#929675" stop-opacity=".25"/></linearGradient></defs><g class="terrain-countryside" pointer-events="none">${parts.join('')}${trees.sort((a,b)=>a.y-b.y).map(t=>t.html).join('')}</g>`;
 cache.set(season,html);return html;
}
