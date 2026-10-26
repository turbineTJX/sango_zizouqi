import {hexCenter,HEX_GRID} from './hex-grid.mjs';

export const ENVIRONMENT_WIDTH=HEX_GRID.width*100,ENVIRONMENT_HEIGHT=HEX_GRID.height*200/Math.sqrt(3);
const tileHeight=200/Math.sqrt(3),f=n=>Number(n.toFixed(2));
const point=(x,y)=>{const p=hexCenter(x,y);return [p.x*ENVIRONMENT_WIDTH,p.y*ENVIRONMENT_HEIGHT];};
const corners=(x,y)=>{const [cx,cy]=point(x,y);return [[0,-.5],[.5,-.25],[.5,.25],[0,.5],[-.5,.25],[-.5,-.25]].map(([dx,dy])=>[f(cx+dx*100),f(cy+dy*tileHeight)]);};
const key=p=>p.map(n=>Math.round(n*100)).join(',');
const between=(a,b,t)=>a.map((n,i)=>f(n+(b[i]-n)*t));
const pair=p=>p.join(' ');
function hash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
const sample=(seed,index)=>{let n=Math.imul(seed^(index+1),2246822519);n=Math.imul(n^(n>>>13),3266489917);return ((n^(n>>>16))>>>0)/4294967296;};

// Dissolve shared hex edges before rounding the surviving boundary. Adjacent
// terrain becomes one physical area, while its exact authored cells stay intact.
export function terrainAreaPath(tiles,types){
 const edges=new Map();
 for(const [y,row]of tiles.entries())for(const [x,type]of row.entries())if(types.includes(type)){
  const vertices=corners(x,y);
  for(let i=0;i<6;i++){
   const a=vertices[i],b=vertices[(i+1)%6],forward=key(a)+'|'+key(b),reverse=key(b)+'|'+key(a);
   if(edges.has(reverse))edges.delete(reverse);else edges.set(forward,{a,b});
  }
 }
 const outgoing=new Map();for(const [id,edge]of edges){const k=key(edge.a);if(!outgoing.has(k))outgoing.set(k,[]);outgoing.get(k).push(id);}
 const loops=[];
 while(edges.size){
  const [id,first]=edges.entries().next().value,vertices=[first.a];let edge=first;edges.delete(id);
  while(key(edge.b)!==key(vertices[0])){
   vertices.push(edge.b);const next=outgoing.get(key(edge.b))?.find(k=>edges.has(k));if(!next)break;
   edge=edges.get(next);edges.delete(next);
  }
  if(vertices.length>=3)loops.push(vertices);
 }
 return loops.map(boundary=>{
  // Two corner-cutting passes soften the repeating hex silhouette. The curve
  // stays close to the authored boundary and preserves every terrain cell center.
  let vertices=boundary;
  for(let pass=0;pass<2;pass++)vertices=vertices.flatMap((a,i)=>[between(a,vertices[(i+1)%vertices.length],.25),between(a,vertices[(i+1)%vertices.length],.75)]);
  const n=vertices.length,entry=i=>between(vertices[i],vertices[(i+n-1)%n],.3),exit=i=>between(vertices[i],vertices[(i+1)%n],.3);
  return 'M'+pair(entry(0))+vertices.map((v,i)=>`Q${pair(v)} ${pair(exit(i))}L${pair(entry((i+1)%n))}`).join('')+'Z';
 }).join('');
}

function definitions(id){
 const gradient=(name,stops,radial=false)=>`<${radial?'radialGradient':'linearGradient'} id="${id}-${name}" ${radial?'cx="35%" cy="25%" r="75%"':'x1="0" y1="0" x2=".85" y2="1"'}>${stops.map(([offset,color,opacity=1])=>`<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}</${radial?'radialGradient':'linearGradient'}>`;
 const trees=Array.from({length:4},(_,v)=>{
  const seed=hash('tree-'+v),leaves=Array.from({length:19},(_,i)=>{
   const a=i*2.4,r=Math.sqrt(i/19)*23,cx=f(Math.cos(a)*r),cy=f(-31+Math.sin(a)*r*.68),rx=f(8+sample(seed,i)*6);
   return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx*.73)}" fill="url(#${id}-leaf-${(i+v)%3})"/>`;
  }).join('');
  return `<g id="${id}-tree-${v}"><ellipse cx="11" cy="10" rx="30" ry="13" fill="#14271f" opacity=".3" transform="rotate(22)"/><path d="M-3 6L0 -29L5 5Z" fill="#67513b"/><path d="M1 -11L-13 -28M2 -18L15 -37" fill="none" stroke="#786044" stroke-width="3"/>${leaves}<path d="M-19 -37q7 -8 17 -8m-6 14q8 -8 17 -6" stroke="#bdc085" stroke-width="1" opacity=".19" fill="none"/></g>`;
 }).join('');
 const grasses=Array.from({length:4},(_,v)=>`<g id="${id}-grass-${v}" fill="none" stroke-linecap="round"><path d="M0 0q-1 -6 -4 -10M0 0q2 -9 5 -12M0 0q5 -5 9 -6M-1 1q-5 -3 -7 -3" stroke="${['#8d9a61','#a8a370','#667d4f','#b1ad7a'][v]}" stroke-width="1.15" opacity=".54"/><path d="M0 0l1 -8" stroke="#46583b" stroke-width="1.5"/></g>`).join('');
 const rocks=Array.from({length:3},(_,v)=>`<g id="${id}-stone-${v}"><ellipse cx="7" cy="7" rx="30" ry="13" fill="#202b24" opacity=".32"/><path d="M-28 6Q-33 -5 -20 -18L-7 -30Q6 -33 18 -19L29 -4Q32 10 13 16L-14 15Z" fill="url(#${id}-stone)"/><path d="M-20 -18L-3 -10L-7 -30M-3 -10L13 16M-3 -10L18 -19L29 -4" stroke="#454b40" stroke-width="1.7" opacity=".7" fill="none"/><path d="M-24 -7L-18 -16L-8 -24M2 -23L15 -16" stroke="#c3b99a" opacity=".5" fill="none" stroke-width="1.7"/><path d="M-19 10q10 -4 18 3" stroke="#60704d" stroke-width="4" opacity=".7"/></g>`).join('');
 return gradient('ground',[['0%','#727b4b'],['38%','#626f43'],['100%','#4d613e']])+gradient('soil',[['0%','#aea17b'],['100%','#847d59']])+gradient('hill',[['0%','#b5b17c',.7],['42%','#8b9560',.45],['100%','#314e35',.35]],true)+gradient('water',[['0%','#71958d'],['38%','#467774'],['100%','#2b555a']])+gradient('stone',[['0%','#a29e82'],['42%','#797e65'],['100%','#454f42']])+gradient('leaf-0',[['0%','#8d9c60'],['45%','#586f40'],['100%','#2d4b32']],true)+gradient('leaf-1',[['0%','#a0a36a'],['45%','#6a7e48'],['100%','#355538']],true)+gradient('leaf-2',[['0%','#71864e'],['45%','#47673c'],['100%','#284934']],true)+gradient('edge',[['0%','#121e1b',0],['68%','#17271e',0],['100%','#14241c',.42]],true)+
 `<filter id="${id}-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".085" numOctaves="3" seed="17" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".2"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>`+
 `<filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>`+trees+grasses+rocks;
}

function bridgeDetail(tiles,x,y){
 const horizontal=tiles[y-1]?.[x]==='water'||tiles[y+1]?.[x]==='water',angle=horizontal?0:90;
 return `<g transform="rotate(${angle})"><ellipse cx="7" cy="12" rx="58" ry="23" fill="#213b32" opacity=".35"/><path d="M-57 -17L57 -17V18L-57 18Z" fill="#584e39"/><path d="M-57 -20L57 -20V12L-57 12Z" fill="#aa9870"/>${Array.from({length:18},(_,i)=>`<path d="M${-54+i*6} -19v30m1 -25v16" stroke="${i%3?'#685f47':'#d0ba8c'}" stroke-width="1.2"/>`).join('')}<path d="M-58 13H58M-58 -19H58" stroke="#493e2c" stroke-width="3"/>${[-54,-32,-10,12,34,56].flatMap(px=>[-23,17].map(py=>`<path d="M${px} ${py+4}v-16" stroke="#534835" stroke-width="3"/><path d="M${px-1} ${py-11}h3" stroke="#c3ac7d" stroke-width="2"/>`)).join('')}<path d="M-57 -34H57M-57 6H57" stroke="#b2a078" stroke-width="3"/></g>`;
}

function terrainDetails(ground,x,y,tiles,id,seed){
 const r=i=>sample(seed,i),use=(name,dx,dy,s=1,angle=0)=>`<use href="#${id}-${name}" transform="translate(${f(dx)} ${f(dy)}) rotate(${f(angle)}) scale(${f(s)})"/>`;
 let result='';
 if(!['water','bridge','rock'].includes(ground))for(let i=0;i<(ground==='forest'?5:11);i++)result+=use('grass-'+i%4,(r(i*4)-.5)*86,(r(i*4+1)-.5)*76,.5+r(i*4+2)*.55);
 if(ground==='forest'){
  const trees=Array.from({length:5},(_,i)=>({x:(r(70+i*3)-.5)*68,y:(r(71+i*3)-.5)*56,s:.72+r(72+i*3)*.36})).sort((a,b)=>a.y-b.y);
  result+=trees.map((t,i)=>use('tree-'+(x+y+i)%4,t.x,t.y,t.s)).join('');
 }else if(ground==='hill'){
  result+=`<path d="M-38 17Q-6 -13 34 -4" stroke="#c2bd83" stroke-width="2" opacity=".16" fill="none"/>`;
  for(let i=0;i<3;i++)result+=use('stone-'+i%3,(r(110+i*2)-.5)*68,(r(111+i*2)-.5)*50,.12+r(120+i)*.11);
 }else if(ground==='rock'){
  for(let i=0;i<4;i++)result+=use('stone-'+(i+x)%3,(r(130+i*3)-.5)*62,(r(131+i*3)-.5)*43,.7+r(132+i*3)*.5);
 }else if(ground==='marsh'){
  result+=`<ellipse cx="8" cy="8" rx="36" ry="20" fill="#466f62" opacity=".55"/><path d="M-22 13q18 -5 38 -1m-27 -9q9 -3 22 0" stroke="#b5c7a2" opacity=".2" stroke-width="1.3" fill="none"/>`;
  for(let i=0;i<8;i++){
   const px=f((r(150+i*2)-.5)*73),py=f((r(151+i*2)-.5)*58),length=f(12+r(180+i)*12);
   result+=`<g transform="translate(${px} ${py})"><path d="M0 4v-${length}m0 ${length-3}q-8 -9 -8 -15M0 0q8 -8 9 -16" stroke="#859361" stroke-width="1.4" fill="none"/><path d="M0 -${length}v-5" stroke="#a79162" stroke-width="2.8" stroke-linecap="round"/></g>`;
  }
 }else if(ground==='water')result+=`<path d="M-30 7q14 -3 35 0m-13 -22q10 -3 27 -1" stroke="#bdd5ba" opacity=".23" stroke-width="1.4" fill="none"/>`;
 else if(ground==='bridge')result+=bridgeDetail(tiles,x,y);
 else for(let i=0;i<3;i++)result+=`<ellipse cx="${f((r(210+i*2)-.5)*86)}" cy="${f((r(211+i*2)-.5)*70)}" rx="${f(1+r(220+i)*2)}" ry="1" fill="#d2c39b" opacity=".28"/>`;
 return result;
}

function roadPath(path){
 const pts=path.map(([x,y])=>point(x,y));if(pts.length<2)return '';
 let result='M'+pair(pts[0]);
 for(let i=0;i<pts.length-1;i++){
  const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(pts.length-1,i+2)];
  result+=`C${pair(b.map((n,j)=>f(n+(c[j]-a[j])/7)))} ${pair(c.map((n,j)=>f(n-(d[j]-b[j])/7)))} ${pair(c)}`;
 }
 return result;
}

export function battleEnvironmentArtwork(map,{prefix='battlefield'}={}){
 const id=prefix+'-env',seed=hash(JSON.stringify(map.tiles)),area=types=>terrainAreaPath(map.tiles,types);
 const water=area(['water','bridge']),dry=area(['land','forest','hill','marsh','bridge']),forest=area(['forest']),hills=area(['hill']),rock=area(['rock']),marsh=area(['marsh']);
 const cells=map.tiles.flatMap((row,y)=>row.map((ground,x)=>({ground,x,y}))),roads=map.roads.map(roadPath).filter(Boolean).map(d=>`<path d="${d}"/>`).join('');
 const patches=Array.from({length:95},(_,i)=>`<ellipse cx="${f(sample(seed,i*4)*ENVIRONMENT_WIDTH)}" cy="${f(sample(seed,i*4+1)*ENVIRONMENT_HEIGHT)}" rx="${f(15+sample(seed,i*4+2)*85)}" ry="${f(7+sample(seed,i*4+3)*24)}" fill="${i%3?'#bcc18a':'#324f33'}" opacity="${i%3?'.07':'.11'}"/>`).join('');
 const slopes=cells.filter(c=>c.ground==='hill').map(c=>`<ellipse cx="${f(point(c.x,c.y)[0]-12)}" cy="${f(point(c.x,c.y)[1]-9)}" rx="78" ry="56" fill="url(#${id}-hill)"/>`).join('');
 const details=cells.map(({ground,x,y})=>`<g data-map-terrain="${ground}" data-map-x="${x}" data-map-y="${y}" transform="translate(${pair(point(x,y))})">${terrainDetails(ground,x,y,map.tiles,id,seed^hash(x+':'+y))}</g>`).join('');
 const ripples=water?`<g class="environment-ripples" clip-path="url(#${id}-water)" opacity=".12" stroke="#b3d3c1" stroke-width="1" fill="none">${Array.from({length:45},(_,i)=>`<path d="M0 ${i*17}q180 -12 360 0t360 0t360 0t400 0"/>`).join('')}</g>`:'';
 return `<g class="battle-map-art battle-environment" pointer-events="none"><defs>${definitions(id)}<clipPath id="${id}-frame"><rect width="${ENVIRONMENT_WIDTH}" height="${ENVIRONMENT_HEIGHT}"/></clipPath><clipPath id="${id}-dry"><path d="${dry}"/></clipPath><clipPath id="${id}-water"><path d="${water}"/></clipPath></defs><g clip-path="url(#${id}-frame)"><rect class="environment-ground" width="${ENVIRONMENT_WIDTH}" height="${ENVIRONMENT_HEIGHT}" fill="url(#${id}-ground)" filter="url(#${id}-grain)"/>${patches}<path d="${forest}" fill="#294e32" opacity=".5" filter="url(#${id}-soft)"/><path d="${hills}" fill="#79885a" opacity=".6" filter="url(#${id}-soft)"/><g filter="url(#${id}-soft)">${slopes}</g><path d="${marsh}" fill="#6b8261" opacity=".65" filter="url(#${id}-soft)"/><path d="${rock}" fill="#5d6953" stroke="#344b36" stroke-width="15" stroke-opacity=".3"/><path d="${water}" fill="url(#${id}-water)" stroke="#7d8b68" stroke-width="10"/><path d="${water}" fill="none" stroke="#aeb696" stroke-width="1.5" opacity=".25"/>${ripples}<g clip-path="url(#${id}-dry)" stroke-linecap="round" fill="none" stroke-linejoin="round"><g stroke="#3e5034" stroke-width="33" opacity=".22">${roads}</g><g stroke="#918d64" stroke-width="24" opacity=".7">${roads}</g><g stroke="url(#${id}-soil)" stroke-width="18">${roads}</g><g stroke="#6c6a4e" stroke-width="1.4" stroke-dasharray="23 9 8 19" opacity=".34" transform="translate(0 5)">${roads}</g><g stroke="#d2c39b" stroke-width="1" opacity=".28" transform="translate(0 -5)">${roads}</g></g>${details}<rect width="${ENVIRONMENT_WIDTH}" height="${ENVIRONMENT_HEIGHT}" fill="url(#${id}-edge)"/></g></g>`;
}

export function battleBuildingArtwork(g){
 const destroyed=g.hp<=0,damaged=g.hp<g.maxHp*.5,color=g.side?'#8c4c38':'#4a7060';
 const beam=(x,y,h=45)=>`<path d="M${x} ${y}v-${h}" stroke="#574a34" stroke-width="5"/><path d="M${x-1} ${y}v-${h}" stroke="#a58c5f" stroke-width="1.2"/>`;
 const roof=(y,w=50)=>`<path d="M${-w-7} ${y+11}Q${-w+3} ${y+9} ${-w+9} ${y-7}L0 ${y-19}L${w-9} ${y-7}Q${w-3} ${y+9} ${w+7} ${y+11}L0 ${y+2}Z" fill="#464e43" stroke="#aca98a" stroke-width="1.2"/>${Array.from({length:15},(_,i)=>{const x=(i-7)*w/8;return `<path d="M${f(x)} ${y-12+Math.abs(x)*.21}l${f(x*.14)} 19" stroke="#7a8065" stroke-width=".9"/>`;}).join('')}<path d="M${-w-7} ${y+11}L0 ${y+3}L${w+7} ${y+11}" fill="none" stroke="#c4b183" stroke-width="2"/>`;
 const masonry=(y,h)=>`<path d="M-48 ${y}h96v${h}h-96Z" fill="#8b8971"/><path d="M-48 ${y}h12v${h}h-12Z" fill="#acaa8b"/>${Array.from({length:Math.floor(h/8)},(_,i)=>`<path d="M-48 ${y+i*8}h96${Array.from({length:4},(_,j)=>`M${-36+j*24+(i%2?12:0)} ${y+i*8}v8`).join('')}" stroke="#5d6654" stroke-width="1" fill="none"/>`).join('')}`;
 let art=`<ellipse cx="7" cy="14" rx="58" ry="17" fill="#152820" opacity=".35"/>`;
 if(destroyed)art+=Array.from({length:16},(_,i)=>`<path d="M${(i*19%95)-48} ${i*7%25-9}l10 -9l11 8l-7 9Z" fill="${i%2?'#797c66':'#a39a7c'}" stroke="#4a5845" stroke-width="1"/>`).join('');
 else if(g.level===0&&g.type!=='gate')art+=`${beam(-37,9,66)}${beam(37,9,66)}<path d="M-37 -40H37M-37 -12H37M-35 7L35 -54M35 7L-35 -54" stroke="#8b7351" stroke-width="3"/><path d="M-30 11L0 -8L33 11Z" fill="#a69b79"/>`;
 else if(g.type==='gate')art+=`${masonry(-32,50)}<path d="M-17 18v-30a17 17 0 0 1 34 0v30" fill="#2f3a2d" stroke="#c2b38e" stroke-width="4"/><path d="M-13 17v-27a13 13 0 0 1 26 0v27Z" fill="#5c4933"/><path d="M0 -21v38M-10 -9h20m-20 12h20" stroke="#ac9363" stroke-width="2"/>${beam(-35,-29,38)}${beam(35,-29,38)}<path d="M-36 -65H36V-40H-36Z" fill="#857b59"/><path d="M-23 -56h13v14h-13m33 -14h13v14H10" fill="#2e3c30"/>${roof(-68,48)}<path d="M-51 -30H51" stroke="#c4b58c" stroke-width="4"/>`;
 else if(g.kind==='arrowTower')art+=`${masonry(5,13)}${beam(-29,4,70)}${beam(29,4,70)}<path d="M-28 1L28 -48M28 1L-28 -48" stroke="#776042" stroke-width="3"/><path d="M-39 -53H39v10h-78Z" fill="#8f7e57"/><path d="M-36 -54v-20m18 20v-20m36 20v-20m18 20v-20M-37 -64H37" stroke="#aa956b" stroke-width="3"/>${roof(-77,41)}<path d="M-4 -44v51m-8 -45h16m-16 10h16m-16 10h16m-16 10h16" stroke="#c4b082" stroke-width="2"/>`;
 else if(g.kind==='aidCamp')art+=`<path d="M-49 9L-18 -49L40 -38L54 15Z" fill="#c2b48b" stroke="#786f50" stroke-width="1.5"/><path d="M-18 -49L0 11L-49 9Z" fill="#dfd0a4"/><path d="M-10 10L-20 -24L-34 10Z" fill="#394b36"/><path d="M-18 -49L0 11M-18 -49L40 -38M-47 9L-55 20M52 14L59 24" stroke="#65583e" stroke-width="2"/><path d="M22 -31v27m-12 -14h24" stroke="#7f4b3d" stroke-width="4"/>`;
 else if(g.kind==='farm')art+=`<path d="M-48 -16L35 -25L53 16L-32 26Z" fill="#71694a"/>${Array.from({length:9},(_,i)=>`<path d="M${-42+i*9} -15l16 37" stroke="#b5a269" stroke-width="3"/>`).join('')}<path d="M-48 -16L35 -25L53 16L-32 26Z" fill="none" stroke="#8f9b62" stroke-width="3"/>`;
 else{
  const music=g.kind==='musicStage';art+=`${masonry(0,16)}${beam(-34,-1,45)}${beam(34,-1,45)}${music?'':`<path d="M-34 -40H34V0H-34Z" fill="#a79a74"/><path d="M-10 0v-26h20V0" fill="#4b513c"/><path d="M-27 -26h10v11h-10m34 -11h10v11H17" fill="#5c6349"/>`}${roof(-46,45)}`;
  if(music)art+=`<path d="M-20 -1L-16 -21M20 -1L16 -21" stroke="#8e7150" stroke-width="3"/><ellipse cy="-20" rx="23" ry="14" fill="#985b3c"/><ellipse cy="-25" rx="23" ry="9" fill="#cfbd8c" stroke="#755b3c" stroke-width="2"/>`;
  if(g.kind==='granary')art+=`<path d="M-28 1v-31m10 31v-31m36 31v-31m10 31v-31" stroke="#675d43" stroke-width="2"/>`;
 }
 if(!destroyed){art+=`<path d="M44 -5v-69" stroke="#b3a276" stroke-width="2"/><path d="M45 -74L66 -69L61 -50L45 -54Z" fill="${color}"/>`;if(damaged)art+=`<path d="M-30 -15l9 7l-5 7l9 7M25 -26l-8 12l6 8l-4 12" stroke="#3b4235" stroke-width="2" fill="none"/>`;}
 return `<svg class="battle-building-art" viewBox="-70 -104 145 138" aria-hidden="true">${art}</svg>`;
}
