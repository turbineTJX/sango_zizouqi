import {clampMapView,centeredMapView} from './strategic-map-camera.mjs';
import {armyMapMarkers} from './strategic-army-markers.mjs';
import {renderRoads,renderMarchRoute,roadPoint,renderSupplyRoute} from './strategic-movement.mjs';
import {nationalArtMap,nationalTerrain} from './national-map-view.mjs';
import {art} from './art-assets.mjs';
import {MAP_CITIES,MAP_SEASONS,terrainDrawing,cityDrawing} from './strategic-map-art.mjs';
import {roadLength,supplyConnection,activeBattles,liveSoldiers} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const THEATER_VIEW={x:190,y:95,width:570,height:690};
export const NATIONAL_VIEW={x:0,y:0,width:1024,height:1024};
export function mapAsset(s,ui){const m=art.active&&art.pack.worldMap,url=m?.images?.[ui.mapSeason||'summer'];return url&&!art.failed.has(url)&&s.cities.every(c=>m.cities[c.id])?url:null;}
export function mapArmyPosition(s,a,anchors){
 if(!a.travel)return {...anchors[a.location]};
 const from=anchors[a.travel.from],to=anchors[a.travel.to],t=clamp(a.travel.progress/roadLength(s,a.travel.from,a.travel.to),0,1);
 return roadPoint({...from,id:a.travel.from},{...to,id:a.travel.to},t,a.travel.road||'main');
}
// Project encounters onto roads without changing any rule-space distance.
export function mapBattlePosition(s,r,anchors){
 if(r.kind==='siege'&&anchors[r.cityId])return anchors[r.cityId];
 const participant=r.armies?.find(a=>a.travel);if(participant)return mapArmyPosition(s,participant,anchors);
 let best=null;
 for(const [from,to]of s.roads){const a=s.cities.find(c=>c.id===from),b=s.cities.find(c=>c.id===to),dx=b.x-a.x,dy=b.y-a.y,t=clamp(((r.point.x-a.x)*dx+(r.point.y-a.y)*dy)/(dx*dx+dy*dy),0,1),distance=Math.hypot(r.point.x-a.x-t*dx,r.point.y-a.y-t*dy);
  if(!best||distance<best.distance){const p=anchors[from],q=anchors[to];best={distance,x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t};}
 }return best||anchors[r.cityId]||{x:512,y:512};
}
export function strategicArtMap(s,ui,army){
 if(s.campaign?.scenarioId)return nationalArtMap(s,ui,army);
 if(!s.cities.every(c=>MAP_CITIES[c.id]))return null;
 const anchors=MAP_CITIES,v=ui.strategicMapView||THEATER_VIEW,connection=army?supplyConnection(s,army):null;
 const line=(a,b,cls)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="${cls}"/>`;
 const supply=renderSupplyRoute(s,army,connection,anchors);
 const previous=ui.armyArtPositions||{};ui.armyArtPositions={};
 return `<div class="national-map-tools"><div><b>山河舆图 · 中原</b><small>二维绘制 · 九城可交互 · 拖动平移 / 滚轮缩放</small></div><div><button type="button" data-map-view="national">全国</button><button type="button" data-map-view="theater">中原</button><button type="button" data-map-view="in" aria-label="放大地图">＋</button><button type="button" data-map-view="out" aria-label="缩小地图">−</button><label>景色 <select id="map-season" aria-label="地图季节外观">${Object.entries(MAP_SEASONS).map(([k,n])=>`<option value="${k}" ${k===(ui.mapSeason||'summer')?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
 <svg class="strategy-world strategy-world-art strategy-world-drawn" data-art-ready="true" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" tabindex="0" role="group" aria-label="全国地图，中原九城可交互；方向键平移，加减键缩放"><title>山河舆图 · 中原战区</title>
 <g class="national-map-terrain">${terrainDrawing(ui.mapSeason)}</g>
 ${renderRoads(s,anchors)}
 ${renderMarchRoute(s,army,anchors)}${supply}
 ${s.cities.map(c=>{const p=anchors[c.id];return `<g data-city="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}，${esc(FACTIONS[c.owner].name)}" class="strategy-city ${c.owner} ${ui.city===c.id?'selected':''}" transform="translate(${p.x} ${p.y}) scale(.88)"><circle class="city-halo" r="37"/>${cityDrawing(c.id==='baima'||c.id==='guandu')}<rect class="city-nameplate" x="-37" y="32" width="74" height="28" rx="4"/><text y="53">${esc(c.name)}</text><title>${esc(c.name)} · 粮草 ${Math.round(c.grain).toLocaleString('zh-CN')}</title></g>`;}).join('')}
 ${armyMapMarkers(s,ui,a=>mapArmyPosition(s,a,anchors))}
 ${activeBattles(s).map(r=>{const p=mapBattlePosition(s,r,anchors);return `<g class="strategy-battle-marker" data-action="campaign-focus" data-battle="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}" transform="translate(${p.x} ${p.y+8}) scale(.7)"><circle r="15"/><text y="5">战</text></g>`;}).join('')}</svg>`;
}
export function attachStrategicMap(root,ui,onFailure){
 const svg=root.querySelector('.strategy-world-art');if(!svg)return;
 const national=svg.dataset.national==='true',radar=root.querySelector('[data-strategy-radar]');
 const [x,y,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
 let view={x,y,width,height},drag=null,radarDragging=false;
 const point=(surface,e)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(surface.getScreenCTM().inverse());
 const apply=(manual=true)=>{
  if(national)view=clampMapView(view);else {view.x=clamp(view.x,0,1024-view.width);view.y=clamp(view.y,0,1024-view.height);}
  if(manual)ui.mapCameraManual=true;
  ui.strategicMapView={...view};svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);svg.classList.toggle('map-detail',view.width<=600);
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
 root.querySelector('#national-city-search')?.addEventListener('change',e=>{const node=svg.querySelector(`[data-city="${e.target.value}"],[data-command-city="${e.target.value}"]`);if(!node)return;view=centeredMapView({x:+node.dataset.x,y:+node.dataset.y});apply();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
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
