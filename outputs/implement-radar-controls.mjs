import fs from 'node:fs';
let p='art-strategic-map.mjs',s=fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');s="import {clampMapView,centeredMapView} from './strategic-map-camera.mjs';\n"+s;
s=s.slice(0,s.indexOf('export function attachStrategicMap'))+`export function attachStrategicMap(root,ui,onFailure){
 const svg=root.querySelector('.strategy-world-art');if(!svg)return;
 const national=svg.dataset.national==='true',radar=root.querySelector('[data-strategy-radar]');
 const [x,y,width,height]=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
 let view={x,y,width,height},drag=null,radarDragging=false;
 const point=(surface,e)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(surface.getScreenCTM().inverse());
 const apply=(manual=true)=>{
  if(national)view=clampMapView(view);else {view.x=clamp(view.x,0,1024-view.width);view.y=clamp(view.y,0,1024-view.height);}
  if(manual)ui.mapCameraManual=true;
  ui.strategicMapView={...view};svg.setAttribute('viewBox',\`\${view.x} \${view.y} \${view.width} \${view.height}\`);svg.classList.toggle('map-detail',view.width<=600);
  const frame=radar?.querySelector('.radar-viewport');if(frame)for(const key of ['x','y','width','height'])frame.setAttribute(key,view[key]);
 };
 const zoom=(factor,anchor={x:view.x+view.width/2,y:view.y+view.height/2})=>{
  const width=clamp(view.width*factor,150,national?600:1024),height=clamp(view.height*factor,150,national?600:1024);
  view={x:anchor.x-(anchor.x-view.x)*width/view.width,y:anchor.y-(anchor.y-view.y)*height/view.height,width,height};apply();
 };
 const focus=()=>{
  if(national)view=centeredMapView({x:+svg.dataset.focusX,y:+svg.dataset.focusY},view.width,view.height);
  else view={...THEATER_VIEW};ui.mapCameraManual=false;apply(false);
 };
 for(const b of root.querySelectorAll('[data-map-view]'))b.addEventListener('click',()=>{
  const key=b.dataset.mapView;if(key==='in'||key==='out')zoom(key==='in'?.8:1.25);
  else if(key==='selected')focus();else {view={...(key==='national'?NATIONAL_VIEW:THEATER_VIEW)};apply();}
 });
 root.querySelector('#map-season')?.addEventListener('change',e=>{e.stopPropagation();ui.mapSeason=e.target.value;svg.querySelector('.national-map-terrain').innerHTML=national?nationalTerrain(ui.mapSeason):terrainDrawing(ui.mapSeason);});
 root.querySelector('#national-city-search')?.addEventListener('change',e=>{const node=svg.querySelector(\`[data-city="\${e.target.value}"],[data-command-city="\${e.target.value}"]\`);if(!node)return;view=centeredMapView({x:+node.dataset.x,y:+node.dataset.y});apply();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.88:1.14,point(svg,e));},{passive:false});
 svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-road-from],[data-junction],[data-city],[data-command-city],[data-campaign-army],[data-transport-officer],[data-action]'))return;const m=svg.getScreenCTM();drag={x:e.clientX,y:e.clientY,view:{...view},scaleX:m.a,scaleY:m.d};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;view={...drag.view,x:drag.view.x-(e.clientX-drag.x)/drag.scaleX,y:drag.view.y-(e.clientY-drag.y)/drag.scaleY};apply();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>{drag=null;});
 const keyboard=e=>{
  if(e.target!==svg&&e.target!==radar)return;
  if(e.key==='Home'){e.preventDefault();focus();}
  else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.25:.8);}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();view.x+=e.key==='ArrowLeft'?-view.width*.1:e.key==='ArrowRight'?view.width*.1:0;view.y+=e.key==='ArrowUp'?-view.height*.1:e.key==='ArrowDown'?view.height*.1:0;apply();}
 };
 svg.addEventListener('keydown',keyboard);
 if(radar){
  const locate=e=>{const p=point(radar,e);view=centeredMapView(p,view.width,view.height);apply();};
  radar.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();radarDragging=true;radar.setPointerCapture(e.pointerId);locate(e);});
  radar.addEventListener('pointermove',e=>{if(radarDragging){e.preventDefault();locate(e);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])radar.addEventListener(event,()=>{radarDragging=false;});
  radar.addEventListener('keydown',keyboard);
 }
 apply(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)svg.querySelectorAll('animateTransform').forEach(n=>n.remove());
}
`;
fs.writeFileSync(p,s);
p='app.js';s=fs.readFileSync(p,'utf8').replace('p.mapUI.army=p.armyId;',"p.mapUI.army=p.armyId;p.mapUI.strategyTab=!p.destination&&p.task==='march'?'army':'city';");fs.writeFileSync(p,s);
p='strategic.css';s=fs.readFileSync(p,'utf8')+`
/* Local operation map with an independent national navigation radar. */
.national-map-stage{position:relative;isolation:isolate;overflow:hidden;background:#d6d8b4}
.national-map-stage>.national-world{display:block;width:100%;aspect-ratio:1;max-height:760px}
.strategy-radar,.map-command-screen aside.strategy-radar{position:absolute;right:12px;bottom:12px;z-index:3;width:164px;max-width:32%;padding:6px;background:#253b32ed;border:1px solid #c7af79;border-radius:5px;box-shadow:0 3px 12px #0005;line-height:1.2}
.radar-heading{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:5px;color:#f0dca9;font-size:11px}.radar-heading span{font-size:9px;color:#c3ccbc}
.strategy-radar svg{display:block;width:100%;aspect-ratio:1;touch-action:none;cursor:crosshair;outline-offset:2px}
.radar-viewport{fill:#fff8d323;stroke:#fff6cf;stroke-width:3;vector-effect:non-scaling-stroke;pointer-events:none;filter:drop-shadow(0 0 2px #302b18)}
@media(max-width:700px){.strategy-radar,.map-command-screen aside.strategy-radar{width:112px;right:6px;bottom:6px;padding:4px;max-width:32%}.radar-heading span{display:none}.radar-heading{font-size:10px;margin-bottom:3px}}
`;
fs.writeFileSync(p,s);
