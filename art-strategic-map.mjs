import {fogMarkup,intelligenceWorld,cityIntelligence} from './strategic-vision.mjs';
import {citySoldierLabel} from './city-budget.mjs';
import {cityStaffBadge} from './domestic-feedback.mjs';
import {clampMapView,centeredMapView,MIN_MAP_SIZE,mapDetailLevel,MAP_DETAIL_NAMES,metropolitanMemberView,metropolitanOverviewView} from './strategic-map-camera.mjs';
import {cityBuildingCard,citySceneMarkup,CITY_DETAIL_THRESHOLD,CITY_INTERIOR_SIZE} from './city-scene.mjs';
import {mapDetailBlend} from './map-detail-level.mjs';
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
 s=intelligenceWorld(s);
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
 ${s.cities.map(c=>{const p=anchors[c.id];return `<g data-city="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}，${esc(FACTIONS[c.owner].name)}" class="strategy-city ${c.owner} ${ui.city===c.id?'selected':''}" transform="translate(${p.x} ${p.y}) scale(.88)">${citySoldierLabel(s,c,-40)}<circle class="city-halo" r="37"/>${cityDrawing(c.id==='baima'||c.id==='guandu')}<rect class="city-nameplate" x="-37" y="32" width="74" height="28" rx="4"/><text y="53">${esc(c.name)}</text><g transform="translate(0 18)">${cityStaffBadge(s,c)}</g><title>${esc(c.name)} · ${cityIntelligence(s,c.id).visible?'粮草 '+Math.round(c.grain).toLocaleString('zh-CN'):'无当前视野'}</title></g>`;}).join('')}
 ${armyMapMarkers(s,ui,a=>mapArmyPosition(s,a,anchors))}
 ${activeBattles(s).map(r=>{const p=mapBattlePosition(s,r,anchors);return `<g class="strategy-battle-marker" data-action="campaign-focus" data-battle="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}" transform="translate(${p.x} ${p.y+8}) scale(.7)"><circle r="15"/><text y="5">战</text></g>`;}).join('')}${fogMarkup(s,'theater-fog',o=>mapArmyPosition(s,o,anchors))}</svg>`;
}
export function attachStrategicMap(root,ui,onFailure){
 const svg=root.querySelector('.strategy-world-art');if(!svg)return;
 const national=svg.dataset.national==='true',radar=root.querySelector('[data-strategy-radar]');
 let buildingCard=null;
 const closeBuilding=()=>{buildingCard?.remove();buildingCard=null;};
 const [x,y,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
 let view={x,y,width,height},drag=null,radarDragging=false;
 const point=(surface,e)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(surface.getScreenCTM().inverse());
 const apply=(manual=true,animate=false)=>{
  const previous=svg.viewBox.animVal,from={x:previous.x,y:previous.y,width:previous.width,height:previous.height};
  for(const el of svg.querySelectorAll('[data-camera-animation]'))el.remove();
  if(national)view=clampMapView(view);else {view.x=clamp(view.x,0,1024-view.width);view.y=clamp(view.y,0,1024-view.height);}
  if(manual)ui.mapCameraManual=true;
  ui.strategicMapView={...view};svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);svg.classList.toggle('map-detail',Math.min(view.width,view.height)<=420);svg.classList.toggle('map-overview',Math.min(view.width,view.height)>=720);
  const level=mapDetailLevel(view),blend=mapDetailBlend(view),overview=Math.min(view.width,view.height)>=720,close=national&&level==='interior';
  if(national){svg.style.setProperty('--metropolis-opacity',blend.metropolis);svg.style.setProperty('--settlement-opacity',blend.settlements);svg.style.setProperty('--interior-opacity',blend.interior);svg.style.setProperty('--compact-opacity',1-blend.interior);}
  if(national){svg.dataset.mapDetail=level;for(const key of Object.keys(MAP_DETAIL_NAMES))svg.classList.toggle('map-layer-'+key,key===level);}
  const detailLabel=root.querySelector('[data-map-detail-label]');if(detailLabel)detailLabel.textContent=MAP_DETAIL_NAMES[level]+' · 滚轮逐级放大 · 小地图定位';
  for(const button of root.querySelectorAll('[data-map-view="metropolis"],[data-map-view="settlements"],[data-map-view="city"]'))button.setAttribute('aria-pressed',String(({metropolis:'metropolis',settlements:'settlements',city:'interior'})[button.dataset.mapView]===level));
  svg.classList.toggle('map-close',close);svg.classList.toggle('map-interior',close&&Math.min(view.width,view.height)<=90);
  svg.closest('.strategy-map-first')?.classList.toggle('city-view',close);
  if(!close)closeBuilding();
  const cityNodes=[...svg.querySelectorAll('.node-city,.node-metropolitan-site')],center={x:view.x+view.width/2,y:view.y+view.height/2};
  const nearby=cityNodes.filter(node=>node.querySelector('[data-city-model]')&&+node.dataset.x>=view.x-40&&+node.dataset.x<=view.x+view.width+40&&+node.dataset.y>=view.y-40&&+node.dataset.y<=view.y+view.height+40);
  const cityFocus=close?nearby.reduce((best,node)=>!best||Math.hypot(+node.dataset.x-center.x,+node.dataset.y-center.y)<Math.hypot(+best.dataset.x-center.x,+best.dataset.y-center.y)?node:best,null):null;
  if(buildingCard&&buildingCard.dataset.cityId!==(cityFocus?.dataset.city||cityFocus?.dataset.commandCity||cityFocus?.dataset.junction))closeBuilding();
  for(const node of cityNodes){
   node.classList.toggle('is-town-focused',node===cityFocus);
   const scene=node.querySelector('[data-city-scene]');
   if(blend.interior>0&&nearby.includes(node)&&scene&&!scene.childElementCount){scene.innerHTML=citySceneMarkup(JSON.parse(node.querySelector('script[data-city-model]').textContent),{season:ui.mapSeason});art.decorate(scene);}
   for(const site of scene?.querySelectorAll('[data-city-building]')||[]){const interactive=node===cityFocus&&!svg.closest('.map-command-screen');site.setAttribute('tabindex',interactive?'0':'-1');site.setAttribute('role',interactive?'button':'presentation');}
   node.setAttribute('tabindex',national&&level==='metropolis'?'-1':'0');
  }
  const pixelScale=(overview?.9:Math.min(1.45,Math.max(1.05,svg.clientHeight/720)))/(svg.getScreenCTM()?.a||1);
  for(const banner of svg.querySelectorAll('.map-city-banner'))banner.setAttribute('height',overview?'18':'38');for(const glyph of svg.querySelectorAll('[data-map-glyph]'))glyph.setAttribute('transform',`${glyph.closest('.is-town-focused')?'translate(0 20) ':''}scale(${pixelScale})`);
  for(const label of svg.querySelectorAll('.geography-labels text')){
   label.dataset.baseSize||=label.getAttribute('font-size')||label.parentElement.getAttribute('font-size')||'13';
   label.style.fontSize=(+label.dataset.baseSize*pixelScale*1.25)+'px';label.style.letterSpacing=(2*pixelScale)+'px';label.style.strokeWidth=(1.4*pixelScale)+'px';
  }
  const labels=[];
  const priority=node=>node.classList.contains('selected')*4+node.classList.contains('node-city')*2+(node.dataset.citySize==='large');
  const nodes=[...svg.querySelectorAll('.national-node')].sort((a,b)=>priority(b)-priority(a));
  for(const node of nodes){
   const x=+node.dataset.x-(node.querySelector('.map-staff-status')?39:27)*pixelScale,y=+node.dataset.y+(node.classList.contains('is-town-focused')?20:0)+12*pixelScale,w=(node.querySelector('.map-staff-status')?78:54)*pixelScale,h=(node.querySelector('.map-staff-status')?55:overview?18:38)*pixelScale;
   const hidden=!node.classList.contains('selected')&&labels.some(r=>x<r.x+r.w+2*pixelScale&&x+w+2*pixelScale>r.x&&y<r.y+r.h+2*pixelScale&&y+h+2*pixelScale>r.y);
   for(const el of node.querySelectorAll('.map-city-banner,.national-place-name,.map-city-strength,.map-city-grain,.map-staff-status'))el.style.visibility=hidden?'hidden':'';
   if(!hidden&&(!overview||node.classList.contains('node-city')||node.classList.contains('selected')))labels.push({x,y,w,h});
  }
  const metroLabels=[];
  for(const node of [...svg.querySelectorAll('[data-metropolis-focus]')].sort((a,b)=>Number(b.classList.contains('selected'))-Number(a.classList.contains('selected')))){
   const x=+node.dataset.x-48*pixelScale,y=+node.dataset.y+16*pixelScale,w=96*pixelScale,h=32*pixelScale;
   const hidden=!node.classList.contains('selected')&&metroLabels.some(r=>x<r.x+r.w+2*pixelScale&&x+w+2*pixelScale>r.x&&y<r.y+r.h+2*pixelScale&&y+h+2*pixelScale>r.y);
   node.classList.toggle('is-label-hidden',hidden);if(!hidden)metroLabels.push({x,y,w,h});
  }
  const placed=[];
  for(const marker of svg.querySelectorAll('[data-map-army-anchor]')){
   const mx=+marker.dataset.x,my=+marker.dataset.y,scale=pixelScale*.85;
   let offset=-91;
   while(placed.some(r=>Math.abs(r.x-mx)<84*scale&&Math.abs(r.y-(my+offset*scale))<70*scale))offset+=70;
   placed.push({x:mx,y:my+offset*scale});
   marker.querySelector('[data-map-army-glyph]').setAttribute('transform',`scale(${scale})`);
   marker.querySelector('[data-map-army-card]').setAttribute('transform',`translate(-39 ${offset})`);
   marker.querySelector('.army-location-line').setAttribute('y2',offset+64);
  }
  for(const node of svg.querySelectorAll('[data-metropolis-focus]'))node.setAttribute('tabindex',level==='metropolis'?'0':'-1');
  const frame=radar?.querySelector('.radar-viewport');if(frame)for(const key of ['x','y','width','height'])frame.setAttribute(key,view[key]);
  // SVG animation keeps the saved/base view and radar final values synchronous.
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const animation=document.createElementNS('http://www.w3.org/2000/svg','animate');
   for(const [key,value]of Object.entries({attributeName:'viewBox',from:Object.values(from).join(' '),to:Object.values(view).join(' '),dur:'220ms',begin:'indefinite',calcMode:'spline',keyTimes:'0;1',keySplines:'.2 .7 .3 1','data-camera-animation':''}))animation.setAttribute(key,value);
   svg.append(animation);animation.beginElement();
  }
 };
 const bounds=svg.getBoundingClientRect();
 if(national&&view.width<1024&&bounds.width>bounds.height*1.1){const center={x:view.x+view.width/2,y:view.y+view.height/2};view=centeredMapView(center,Math.min(1024,view.height*bounds.width/bounds.height),view.height);}
 const zoom=(factor,anchor={x:view.x+view.width/2,y:view.y+view.height/2})=>{
  const min=national?MIN_MAP_SIZE:150,ratio=clamp(factor,Math.max(min/view.width,min/view.height),Math.min(1024/view.width,1024/view.height)),width=view.width*ratio,height=view.height*ratio;
  view={x:anchor.x-(anchor.x-view.x)*width/view.width,y:anchor.y-(anchor.y-view.y)*height/view.height,width,height};apply(true,true);
 };
 const focus=()=>{
  if(national)view=metropolitanOverviewView({x:+svg.dataset.focusX,y:+svg.dataset.focusY},bounds.width/bounds.height);
  else view={...THEATER_VIEW};ui.mapCameraManual=false;apply(false);
 };
 const nearestPlace=()=>{
  const sites=[...svg.querySelectorAll('.node-city,.node-metropolitan-site')],cx=view.x+view.width/2,cy=view.y+view.height/2;
  return sites.sort((a,b)=>Math.hypot(+a.dataset.x-cx,+a.dataset.y-cy)-Math.hypot(+b.dataset.x-cx,+b.dataset.y-cy))[0];
 };
 const placeId=node=>node?.dataset.city||node?.dataset.commandCity||node?.dataset.junction;
 const selectedPlace=()=>{
  const site=[...svg.querySelectorAll('.node-city,.node-metropolitan-site')].find(n=>placeId(n)===ui.city);
  return site&&+site.dataset.x>=view.x&&+site.dataset.x<=view.x+view.width&&+site.dataset.y>=view.y&&+site.dataset.y<=view.y+view.height?site:nearestPlace();
 };
 const expandMetropolis=id=>{
  const node=[...svg.querySelectorAll('[data-metropolis-focus]')].find(n=>n.dataset.metropolisFocus===id);if(!node)return;
  view=metropolitanMemberView(JSON.parse(node.querySelector('[data-metropolis-members]').textContent),bounds.width/bounds.height);apply(true,true);
 };
 const metropolisForSelection=()=>{
  const site=selectedPlace();return [...svg.querySelectorAll('[data-metropolis-focus]')].find(n=>n.dataset.metropolisFocus===(site?.dataset.metropolis||placeId(site)));
 };
 const inspectCity=id=>{
  if(!national||svg.closest('.map-command-screen'))return;
  const sites=[...svg.querySelectorAll('.node-city,.node-metropolitan-site')];
  const node=sites.find(n=>placeId(n)===id)||nearestPlace();
  if(!node)return;
  const ratio=bounds.width/bounds.height;
  view=centeredMapView({x:+node.dataset.x,y:+node.dataset.y},Math.max(CITY_INTERIOR_SIZE,CITY_INTERIOR_SIZE*ratio),Math.max(CITY_INTERIOR_SIZE,CITY_INTERIOR_SIZE/ratio));apply(true,true);
 };
 for(const b of root.querySelectorAll('[data-map-view]'))b.addEventListener('click',()=>{
  const key=b.dataset.mapView;if(key==='in'||key==='out')zoom(key==='in'?.8:1.25);
  else if(key==='city')inspectCity(placeId(selectedPlace()));
  else if(key==='settlements'){const metro=metropolisForSelection();if(metro)expandMetropolis(metro.dataset.metropolisFocus);}
  else if(key==='metropolis'){const metro=metropolisForSelection();if(metro){view=metropolitanOverviewView({x:+metro.dataset.x,y:+metro.dataset.y},bounds.width/bounds.height);apply();}}
  else if(key==='territory'){svg.classList.toggle('hide-territory');ui.mapTerritoryHidden=svg.classList.contains('hide-territory');b.setAttribute('aria-pressed',String(!ui.mapTerritoryHidden));}else if(key==='selected')focus();else {view={...(key==='national'?NATIONAL_VIEW:THEATER_VIEW)};apply();}
 });
 root.querySelector('#map-season')?.addEventListener('change',e=>{e.stopPropagation();ui.mapSeason=e.target.value;if(national){onFailure?.();return;}svg.querySelector('.national-map-terrain').innerHTML=terrainDrawing(ui.mapSeason);});
 root.querySelector('#national-city-search')?.addEventListener('change',e=>{const node=svg.querySelector(`[data-city="${e.target.value}"],[data-command-city="${e.target.value}"],[data-junction="${e.target.value}"]`);if(!node)return;view=centeredMapView({x:+node.dataset.x,y:+node.dataset.y},360*bounds.width/bounds.height,360);apply();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 const inspectMetropolis=e=>{const node=e.target.closest?.('[data-metropolis-focus]');if(!node||svg.dataset.mapDetail!=='metropolis')return;e.preventDefault();e.stopPropagation();closeBuilding();expandMetropolis(node.dataset.metropolisFocus);};
 svg.addEventListener('click',inspectMetropolis);
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.88:1.14,point(svg,e));},{passive:false});
 svg.addEventListener('dblclick',e=>{const city=e.target.closest('.node-city,.node-metropolitan-site');if(!city||e.target.closest('[data-city-building]'))return;e.preventDefault();inspectCity(city.dataset.city||city.dataset.junction);});
 const inspectBuilding=e=>{
  const site=e.target.closest?.('.is-town-focused .map-city-scene [data-city-building]');if(!site||!svg.classList.contains('map-close')||svg.closest('.map-command-screen'))return;
  e.preventDefault();e.stopPropagation();closeBuilding();
  const node=site.closest('.node-city,.node-metropolitan-site'),model=JSON.parse(node.querySelector('script[data-city-model]').textContent);
  buildingCard=document.createElement('section');buildingCard.className='city-building-card';buildingCard.setAttribute('role','region');buildingCard.setAttribute('aria-label',model.name+'建筑详情');buildingCard.innerHTML=cityBuildingCard(model,site.dataset.cityBuilding);
  buildingCard.dataset.cityId=model.id;
  root.querySelector('.national-map-stage').append(buildingCard);art.decorate(buildingCard);
  buildingCard.querySelector('[data-city-card-close]').addEventListener('click',()=>{closeBuilding();site.focus();});
 };
 svg.addEventListener('click',inspectBuilding);
 svg.addEventListener('keydown',e=>{if(e.key==='Escape'){closeBuilding();return;}if(['Enter',' '].includes(e.key)){inspectMetropolis(e);inspectBuilding(e);}});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')closeBuilding();});
 svg.addEventListener('contextmenu',e=>e.preventDefault());
 svg.addEventListener('pointerdown',e=>{if(![0,2].includes(e.button)||(e.button===0&&e.target.closest('[data-road-from],[data-junction],[data-city],[data-command-city],[data-campaign-army],[data-transport-officer],[data-action],[data-metropolis-focus]')))return;closeBuilding();ui.mapObject=null;root.querySelector('.map-object-menu')?.remove();const m=svg.getScreenCTM();drag={x:e.clientX,y:e.clientY,view:{...view},scaleX:m.a,scaleY:m.d};svg.setPointerCapture(e.pointerId);});
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
