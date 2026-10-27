import {prepareMapCameraPreview} from './map-camera-preview.mjs';
import {fogMarkup,intelligenceWorld,cityIntelligence} from './strategic-vision.mjs';
import {citySoldierLabel} from './city-budget.mjs';
import {cityStaffBadge} from './domestic-feedback.mjs';
import {clampMapView,centeredMapView,MIN_MAP_SIZE,mapDetailLevel,MAP_DETAIL_NAMES,metropolitanMemberView,metropolitanOverviewView} from './strategic-map-camera.mjs';
import {cityBuildingCard,citySceneMarkup,cityCompactMarkup,CITY_DETAIL_THRESHOLD,CITY_INTERIOR_SIZE} from './city-scene.mjs';
import {TOWN_FRAME} from './town-art.mjs';
import {mapDetailBlend} from './map-detail-level.mjs';
import {armyMapMarkers,battleMapMarkers,ARMY_CARD} from './strategic-army-markers.mjs';
import {renderRoads,renderMarchRoute,roadPoint,renderSupplyRoute} from './strategic-movement.mjs';
import {nationalArtMap,nationalTerrain} from './national-map-view.mjs';
import {art} from './art-assets.mjs';
import {MAP_CITIES,terrainDrawing,cityDrawing} from './strategic-map-art.mjs';
import {roadLength,supplyConnection} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const THEATER_VIEW={x:190,y:95,width:570,height:690};
export const NATIONAL_VIEW={x:0,y:0,width:1024,height:1024};
const terrainLayers=new Map();
const geographySources=new WeakMap();
let previewSeason=null,previewGeneration=0;
function prepareTerrain(svg){
 const terrain=svg.querySelector('.ancient-atlas-terrain');if(!terrain)return;
 const season=terrain.dataset.season;
 if(!terrainLayers.has(season)){
  const serialize=node=>new XMLSerializer().serializeToString(node),copy=terrain.cloneNode(true);
  const defs=[...copy.querySelectorAll('defs')].map(serialize).join('');
  const clipped=copy.querySelector('g[clip-path="url(#terrain-land-clip)"]'),foreground=copy.cloneNode(true);
  const baseCount=[...clipped.children].indexOf(copy.querySelector('.terrain-landscape'));
  const foregroundLand=foreground.querySelector('g[clip-path="url(#terrain-land-clip)"]');
  const provinces=copy.querySelector('.atlas-province-labels');provinces.remove();
  foreground.querySelector('.atlas-province-labels').remove();
  // Water and paper remain above the relief, exactly as in the source atlas.
  while(foregroundLand.firstElementChild){const child=foregroundLand.firstElementChild;child.remove();if(child.classList.contains('terrain-relief'))break;}
  for(const child of [...foreground.children]){if(child===foregroundLand)break;if(child.tagName!=='defs')child.remove();}
  const layers=['terrain-landscape','terrain-relief'].map(cls=>{
   const node=copy.querySelector('.'+cls);node.remove();
   return {cls,markup:defs+'<g clip-path="url(#terrain-land-clip)">'+serialize(node)+'</g>'};
  });
  for(const node of [...clipped.children].slice(baseCount))node.remove();
  while(clipped.nextElementSibling)clipped.nextElementSibling.remove();
  layers.unshift({cls:'terrain-base',markup:serialize(copy)});
  layers.push({cls:'terrain-foreground',markup:serialize(foreground)});
  terrainLayers.set(season,{layers:layers.map(({cls,markup})=>({cls,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'+markup+'</svg>')})),provinces:serialize(provinces)});
 }
 const cached=terrainLayers.get(season);
 // Retain vector detail in isolated SVG images. The browser can reuse their
 // rendering without relaying out thousands of decorative paths on zoom.
 if(terrain.dataset.isolated!=='true'){
  terrain.innerHTML=cached.layers.map(({cls,url})=>`<g class="${cls}"><image href="${url}" width="1024" height="1024" pointer-events="none"/></g>`).join('')+cached.provinces;
  terrain.dataset.isolated='true';
 }
 const images=[...terrain.querySelectorAll('image')];
 // Keep one season of movement previews in memory. Full vector detail returns
 // when the gesture stops; panning and zooming reuse already decoded textures.
 if(previewSeason!==season){
  previewSeason=season;previewGeneration++;
  for(const entry of terrainLayers.values())for(const layer of entry.layers){if(layer.preview)URL.revokeObjectURL(layer.preview);delete layer.preview;delete layer.previewTask;delete layer.preload;}
 }
 const generation=previewGeneration;
 for(const layer of cached.layers)layer.previewTask??=(async()=>{
  const img=new Image();img.src=layer.url;await img.decode();
  await new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(resolve):setTimeout(resolve,0));
  if(generation!==previewGeneration)return;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  canvas.getContext('2d').drawImage(img,0,0,2048,2048);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));canvas.width=canvas.height=0;
  if(blob&&generation===previewGeneration){layer.preview=URL.createObjectURL(blob);layer.preload=new Image();layer.preload.src=layer.preview;await layer.preload.decode();}
 })().catch(()=>{});
 let moving=false;
 const preview=active=>{moving=active;images.forEach((image,i)=>{const layer=cached.layers[i],url=active&&layer.preview||layer.url;if(image.getAttribute('href')!==url)image.setAttribute('href',url);});};
 Promise.all(cached.layers.map(layer=>layer.previewTask)).then(()=>{if(generation===previewGeneration&&svg.isConnected){terrain.dataset.previewReady=String(cached.layers.every(layer=>layer.preview));if(moving)preview(true);}});
 return preview;
}
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
export function strategicArtMap(s,ui,army,options){
 s=intelligenceWorld(s);
 if(s.campaign?.scenarioId)return nationalArtMap(s,ui,army,options);
 if(!s.cities.every(c=>MAP_CITIES[c.id]))return null;
 const anchors=MAP_CITIES,v=ui.strategicMapView||THEATER_VIEW,connection=army?supplyConnection(s,army):null;
 const line=(a,b,cls)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="${cls}"/>`;
 const supply=renderSupplyRoute(s,army,connection,anchors);
 const previous=ui.armyArtPositions||{};ui.armyArtPositions={};
 return `<div class="national-map-tools"><div><b>山河舆图 · 中原</b></div><div><button type="button" data-map-view="national">全国</button><button type="button" data-map-view="theater">中原</button></div></div>
 <svg class="strategy-world strategy-world-art strategy-world-drawn" data-art-ready="true" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" tabindex="0" role="group" aria-label="全国地图，中原九城可交互；方向键平移，加减键缩放"><title>山河舆图 · 中原战区</title>
 <g class="national-map-terrain">${terrainDrawing(ui.mapSeason)}</g>
 ${renderRoads(s,anchors)}
 ${renderMarchRoute(s,army,anchors)}${supply}
 ${s.cities.map(c=>{const p=anchors[c.id];return `<g data-city="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}，${esc(FACTIONS[c.owner].name)}" class="strategy-city ${c.owner} ${ui.city===c.id?'selected':''}" transform="translate(${p.x} ${p.y}) scale(.88)">${citySoldierLabel(s,c,-40)}<circle class="city-halo" r="37"/>${cityDrawing(c.id==='baima'||c.id==='guandu')}<rect class="city-nameplate" x="-37" y="32" width="74" height="28" rx="4"/><text y="53">${esc(c.name)}</text><g transform="translate(0 18)">${cityStaffBadge(s,c)}</g><title>${esc(c.name)} · ${cityIntelligence(s,c.id).visible?'粮草 '+Math.round(c.grain).toLocaleString('zh-CN'):'无当前视野'}</title></g>`;}).join('')}
 ${armyMapMarkers(s,ui,a=>mapArmyPosition(s,a,anchors))}
 ${battleMapMarkers(s,r=>mapBattlePosition(s,r,anchors))}${fogMarkup(s,'theater-fog',o=>mapArmyPosition(s,o,anchors))}</svg>`;
}
const mapControllers=new WeakMap();
export function detachStrategicMap(root){mapControllers.get(root)?.();mapControllers.delete(root);}
export function attachStrategicMap(root,ui,onFailure){
 detachStrategicMap(root);
 const bindings=new AbortController();
 const listen=(node,event,handler,options={})=>node?.addEventListener(event,handler,{...options,signal:bindings.signal});
 const svg=root.querySelector('.strategy-world-art');if(!svg)return;
 const national=svg.dataset.national==='true';
 const terrainPreview=national?prepareTerrain(svg):null;
 let buildingCard=null;
 const closeBuilding=()=>{buildingCard?.remove();buildingCard=null;};
 const [x,y,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
 let view={x,y,width,height},drag=null,frame=0,animation=null,previewTimer=0,cameraPreview=null,previewClick=null;
 const commandMap=!!svg.closest('.map-command-screen'),workspace=svg.closest('.strategy-map-first');
 const detailLabel=root.querySelector('[data-map-detail-label]');
 const detailButtons=[...root.querySelectorAll('[data-map-view="metropolis"],[data-map-view="settlements"],[data-map-view="city"]')];
 // The map is replaced when game state changes; camera movement reuses its nodes.
 const places=[...svg.querySelectorAll('.node-city,.node-metropolitan-site')].map(node=>({node,x:+node.dataset.x,y:+node.dataset.y,source:node.querySelector('[data-city-model]'),scene:node.querySelector('[data-city-scene]'),compact:node.querySelector('.map-city-model'),mapSites:[...node.querySelectorAll('[data-map-building]')],sites:[],interactive:false,mapInteractive:null}));
 for(const place of places)place.modelScale=place.source?JSON.parse(place.source.textContent).layout.mapScale:+(place.compact?.dataset.modelScale||0);
 const priority=node=>node.classList.contains('selected')*4+node.classList.contains('node-city')*2+(node.dataset.citySize==='large');
 const nodes=[...svg.querySelectorAll('.national-node')].sort((a,b)=>priority(b)-priority(a)).map(node=>({node,x:+node.dataset.x,y:+node.dataset.y,selected:node.classList.contains('selected'),city:node.classList.contains('node-city'),staff:!!node.querySelector('.map-staff-status'),labels:[...node.querySelectorAll('.map-city-banner,.national-place-name,.map-city-strength,.map-city-grain,.map-staff-status')]}));
 const glyphs=[...svg.querySelectorAll('[data-map-glyph]')].filter(node=>!node.closest('[data-metropolis-focus]')).map(node=>({node,place:node.closest('.node-city,.node-metropolitan-site')}));
 const banners=[...svg.querySelectorAll('.map-city-banner')];
 const geography=[...svg.querySelectorAll('.geography-labels text')].map(node=>{
  const size=+(node.getAttribute('font-size')||node.parentElement.getAttribute('font-size')||13);
  node.style.fontSize=(size*1.25)+'px';node.style.letterSpacing='2px';node.style.strokeWidth='1.4px';
  if(!geographySources.has(node))geographySources.set(node,node.getAttribute('transform')||'');
  return {node,x:+node.getAttribute('x'),y:+node.getAttribute('y'),transform:geographySources.get(node)};
 });
 const metropolises=[...svg.querySelectorAll('[data-metropolis-focus]')].sort((a,b)=>Number(b.classList.contains('selected'))-Number(a.classList.contains('selected'))).map(node=>({node,glyph:node.querySelector('[data-map-glyph]'),x:+node.dataset.x,y:+node.dataset.y,hidden:false}));
 const markers=[...svg.querySelectorAll('[data-map-army-anchor]')].sort((a,b)=>Number(b.classList.contains('selected'))-Number(a.classList.contains('selected'))).map(node=>({x:+node.dataset.x,y:+node.dataset.y,glyph:node.querySelector('[data-map-army-glyph]'),card:node.querySelector('[data-map-army-card]'),line:node.querySelector('.army-location-line')}));
 const encounters=[...svg.querySelectorAll('[data-map-battle-anchor]')].map(node=>({x:+node.dataset.x,y:+node.dataset.y,glyph:node.querySelector('[data-map-battle-glyph]')}));
 const bandits=[...svg.querySelectorAll('.bandit-map-marker')].map(node=>({x:+node.dataset.x,y:+node.dataset.y,glyph:node.querySelector('[data-map-glyph]'),line:node.querySelector('[data-bandit-location]')}));
 // Opacity is not inherited. Set it on each visual layer instead of changing
 // root custom properties, which restyle every mountain, building and road.
 const opacityLayers=national?[
  ['.map-metropolises,.metropolis-footprints',b=>b.metropolis],
  ['.national-node>[data-map-glyph],.strategy-junction>[data-map-glyph]',b=>b.settlements],
  ['.atlas-province-labels',b=>.3*(1-b.interior)],
  ['.terrain-relief,.terrain-landscape',b=>1-b.interior*.85],
  ['.strategy-road',b=>.15+b.settlements*.43]
 ].map(([selector,value])=>({nodes:[...svg.querySelectorAll(selector)],value,last:null})):[];
 const attr=(node,key,value)=>{value=String(value);if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
 const visible=(p,margin)=>p.x>=view.x-margin&&p.x<=view.x+view.width+margin&&p.y>=view.y-margin&&p.y<=view.y+view.height+margin;
 const point=(surface,e)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(surface.getScreenCTM().inverse());
 const apply=(manual=true,animate=false,continuous=false)=>{
  if(frame){cancelAnimationFrame(frame);frame=0;}
  // Read layout before changing styles, classes, viewBox or city geometry.
  const screenWidth=svg.clientWidth,screenHeight=svg.clientHeight;
  const screenBox=svg.getBoundingClientRect(),occluders=workspace?[...workspace.querySelectorAll('.sovereign-hud,.world-toolbar,.faction-navigation,.world-turn,.world-commands,.map-information,.map-search[open] .national-search,.national-legend[open]>div,.strategy-notice,.national-map-tools,.encounter-callout,.map-workspace-actions,.map-quick-directory')].map(node=>node.getBoundingClientRect()).filter(r=>r.width&&r.height):[];
  const previous=animate?svg.viewBox.animVal:null,from=previous?{x:previous.x,y:previous.y,width:previous.width,height:previous.height}:null;
  if(!continuous)clearTimeout(previewTimer);
  svg.classList.toggle('map-camera-moving',continuous);
  terrainPreview?.(continuous);
  animation?.remove();animation=null;
  if(national)view=clampMapView(view);else {view.x=clamp(view.x,0,1024-view.width);view.y=clamp(view.y,0,1024-view.height);}
  if(manual)ui.mapCameraManual=true;
  ui.strategicMapView={...view};
  if(continuous&&Math.min(view.width,view.height)>90&&cameraPreview?.ready()){cameraPreview(view);return;}
  cameraPreview?.(false);
  svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);svg.classList.toggle('map-detail',Math.min(view.width,view.height)<=420);svg.classList.toggle('map-overview',Math.min(view.width,view.height)>=720);
  const level=mapDetailLevel(view),blend=mapDetailBlend(view),overview=Math.min(view.width,view.height)>=720,close=national&&level==='interior';
  for(const layer of opacityLayers){const value=layer.value(blend);if(value!==layer.last){for(const node of layer.nodes){node.style.setProperty('opacity',value,'important');node.style.display=value?'':'none';}layer.last=value;}}
  if(national){if(svg.dataset.mapDetail!==level)svg.dataset.mapDetail=level;for(const key of Object.keys(MAP_DETAIL_NAMES))svg.classList.toggle('map-layer-'+key,key===level);}
  const detailText=MAP_DETAIL_NAMES[level];if(detailLabel&&detailLabel.textContent!==detailText)detailLabel.textContent=detailText;
  for(const button of detailButtons)attr(button,'aria-pressed',({metropolis:'metropolis',settlements:'settlements',city:'interior'})[button.dataset.mapView]===level);
  svg.classList.toggle('map-close',close);svg.classList.toggle('map-interior',close&&Math.min(view.width,view.height)<=90);
  workspace?.classList.toggle('city-view',close);
  if(!close&&buildingCard?.dataset.compact!=='true')closeBuilding();
  const center={x:view.x+view.width/2,y:view.y+view.height/2},nearby=places.filter(p=>p.source&&visible(p,40));
  const sceneFocus=blend.interior>0?nearby.reduce((best,p)=>!best||Math.hypot(p.x-center.x,p.y-center.y)<Math.hypot(best.x-center.x,best.y-center.y)?p:best,null)?.node:null;
  const cityFocus=close?sceneFocus:null;
  if(buildingCard&&buildingCard.dataset.compact!=='true'&&buildingCard.dataset.cityId!==(cityFocus?.dataset.city||cityFocus?.dataset.commandCity||cityFocus?.dataset.junction))closeBuilding();
  if(buildingCard?.dataset.compact==='true'&&!nearby.some(p=>(p.node.dataset.city||p.node.dataset.commandCity||p.node.dataset.junction)===buildingCard.dataset.cityId))closeBuilding();
  for(const place of places){
   const {node,scene,source,compact}=place;
   node.classList.toggle('is-town-focused',node===cityFocus);
   // Neighbours retain their complete compact building models. Only the
   // nearest settlement needs the panorama, staff and interactive districts.
   const show=blend.interior>0&&source&&node===sceneFocus;
   // Physical buildings and worksites persist at every map scale. Zoom only
   // crossfades the focused site's detailed panorama over the same geometry.
   if(compact){const opacity=String(show?1-blend.interior:1);if(compact.style.opacity!==opacity)compact.style.opacity=opacity;}
   const mapInteractive=!commandMap&&!show&&visible(place,40);
   if(mapInteractive!==place.mapInteractive){for(const site of place.mapSites){attr(site,'tabindex',mapInteractive?'0':'-1');attr(site,'role',commandMap?'presentation':'button');}place.mapInteractive=mapInteractive;}
   if(scene){
    const display=show?'':'none';if(scene.style.display!==display)scene.style.display=display;
    const opacity=String(blend.interior);if(scene.style.opacity!==opacity)scene.style.opacity=opacity;
    let created=false;
    if(show&&!scene.childElementCount){scene.innerHTML=citySceneMarkup(JSON.parse(source.textContent),{season:ui.mapSeason});art.decorate(scene);place.sites=[...scene.querySelectorAll('[data-city-building]')];created=true;}
    const interactive=node===cityFocus&&!commandMap;
    if(created||interactive!==place.interactive){for(const site of place.sites){attr(site,'tabindex',interactive?'0':'-1');attr(site,'role',interactive?'button':'presentation');}place.interactive=interactive;}
   }
   attr(node,'tabindex',national&&level==='metropolis'?'-1':'0');
  }
  const pixelScale=(overview?.9:Math.min(1.45,Math.max(1.05,screenHeight/720)))/(Math.min(screenWidth/view.width,screenHeight/view.height)||1);
  for(const banner of banners)attr(banner,'height',overview?'18':'38');for(const glyph of glyphs)attr(glyph.node,'transform',`${glyph.place&&glyph.place===cityFocus?'translate(0 20) ':''}scale(${pixelScale})`);
  const placedBandits=[];
  for(const marker of bandits){
   const choices=[[20,-24],[-28,-24],[20,35],[-28,35],[55,-45],[-65,-45],[55,65],[-65,65]],clear=([dx,dy])=>!placedBandits.some(p=>Math.abs(marker.x/pixelScale+dx-p.x)<72&&Math.abs(marker.y/pixelScale+dy-p.y)<48),[dx,dy]=choices.find(clear)||choices.at(-1);
   placedBandits.push({x:marker.x/pixelScale+dx,y:marker.y/pixelScale+dy});attr(marker.glyph,'transform',`translate(${dx*pixelScale} ${dy*pixelScale}) scale(${pixelScale})`);attr(marker.line,'x2',dx*pixelScale);attr(marker.line,'y2',dy*pixelScale);
  }
  // Scale shaped text instead of changing its font and laying it out per frame.
  for(const {node,x,y,transform} of geography)attr(node,'transform',`${transform} translate(${x} ${y}) scale(${pixelScale}) translate(${-x} ${-y})`);
  const labels=[];
  for(const item of nodes){
   const {node,staff,selected,city}=item,show=visible(item,Math.max(40,100*pixelScale));
   const display=show?'':'none';if(node.style.display!==display)node.style.display=display;
   if(!show||!blend.settlements)continue;
   const x=item.x-(staff?39:27)*pixelScale,y=item.y+(node===cityFocus?20:0)+12*pixelScale,w=(staff?78:54)*pixelScale,h=(staff?55:overview?18:38)*pixelScale;
   const hidden=!selected&&labels.some(r=>x<r.x+r.w+2*pixelScale&&x+w+2*pixelScale>r.x&&y<r.y+r.h+2*pixelScale&&y+h+2*pixelScale>r.y);
   if(item.hidden!==hidden){for(const el of item.labels)el.style.visibility=hidden?'hidden':'';item.hidden=hidden;}
   if(!hidden&&(!overview||city||selected))labels.push({x,y,w,h});
  }
  // Labels must leave actual city and prefecture footprints unobscured, even
  // when their fixed screen size covers several nearby places on small screens.
  const footprints=places.filter(p=>p.compact).map(p=>({x:p.x+TOWN_FRAME.x*p.modelScale,y:p.y+TOWN_FRAME.y*p.modelScale,w:TOWN_FRAME.width*p.modelScale,h:TOWN_FRAME.height*p.modelScale}));
  const overlaps=(a,b)=>a.x<b.x+b.w+3*pixelScale&&a.x+a.w+3*pixelScale>b.x&&a.y<b.y+b.h+3*pixelScale&&a.y+a.h+3*pixelScale>b.y;
  const metroLabels=[],offsets=[[0,0],[0,-38],[-104,0],[104,0],[0,92],[-104,54],[104,54],[0,-76],[0,130]];
  for(const item of metropolises){
   const {node,glyph,x:mx,y:my}=item;
   const available=rect=>!footprints.some(r=>overlaps(rect,r))&&!metroLabels.some(r=>overlaps(rect,r));
   const labelPosition=offsets.map(([dx,dy])=>({dx,dy,x:mx+(-54+dx)*pixelScale,y:my+(-62+dy)*pixelScale,w:120*pixelScale,h:36*pixelScale})).find(available);
   const position=labelPosition||offsets.map(([dx,dy])=>({dx,dy,x:mx+(-44+dx)*pixelScale,y:my+(-50+dy)*pixelScale,w:16*pixelScale,h:16*pixelScale})).find(available);
   const {dx,dy}=position||{dx:0,dy:0};
   attr(glyph,'transform',`translate(${dx*pixelScale} ${dy*pixelScale}) scale(${pixelScale})`);
   item.hidden=!position;node.classList.toggle('is-label-hidden',!labelPosition);node.classList.toggle('is-marker-hidden',item.hidden);attr(node,'aria-hidden',item.hidden);
   if(position)metroLabels.push(position);
  }
  const unit=Math.min(screenWidth/view.width,screenHeight/view.height)||1,left=screenBox.x+(screenWidth-view.width*unit)/2,top=screenBox.y+(screenHeight-view.height*unit)/2;
  const uiBlocks=occluders.map(r=>({x:view.x+(r.x-left)/unit,y:view.y+(r.y-top)/unit,w:r.width/unit,h:r.height/unit}));
  const placed=encounters.map(p=>({x:p.x-56*pixelScale,y:p.y-27*pixelScale,w:112*pixelScale,h:68*pixelScale}));
  for(const encounter of encounters)attr(encounter.glyph,'transform',`scale(${pixelScale})`);
  for(const marker of markers){
   const mx=marker.x,my=marker.y,scale=pixelScale*.95;
   const choices=[ARMY_CARD.top,ARMY_CARD.top-90,28,118,ARMY_CARD.top-180].flatMap(dy=>[0,-88,88,-112,112,-176,176].map(dx=>({dx,dy,x:mx+(dx-39)*scale,y:my+dy*scale,w:ARMY_CARD.width*scale,h:ARMY_CARD.height*scale}))).sort((a,b)=>Math.hypot(a.dx,a.dy-ARMY_CARD.top)-Math.hypot(b.dx,b.dy-ARMY_CARD.top));
   const onScreen=r=>r.x>=view.x+4*pixelScale&&r.x+r.w<=view.x+view.width-4*pixelScale&&r.y>=view.y+4*pixelScale&&r.y+r.h<=view.y+view.height-4*pixelScale;
   const clear=r=>onScreen(r)&&![...placed,...uiBlocks].some(p=>overlaps(r,p));
   const choice=choices.find(r=>clear(r)&&![...metroLabels,...labels].some(p=>overlaps(r,p)))||choices.find(clear)||choices.find(onScreen)||choices[0];
   placed.push(choice);
   attr(marker.glyph,'transform',`scale(${scale})`);
   attr(marker.card,'transform',`translate(${choice.dx-39} ${choice.dy})`);
   attr(marker.line,'x2',choice.dx);attr(marker.line,'y2',choice.dy+ARMY_CARD.height);
  }
  for(const {node,hidden} of metropolises)attr(node,'tabindex',level==='metropolis'&&!hidden?'0':'-1');
  // SVG animation keeps the saved/base view synchronized with the final camera.
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   animation=document.createElementNS('http://www.w3.org/2000/svg','animate');
   for(const [key,value]of Object.entries({attributeName:'viewBox',from:Object.values(from).join(' '),to:Object.values(view).join(' '),dur:'220ms',begin:'indefinite',calcMode:'spline',keyTimes:'0;1',keySplines:'.2 .7 .3 1','data-camera-animation':''}))animation.setAttribute(key,value);
   svg.append(animation);animation.beginElement();
  }
 };
 const scheduleApply=()=>{
  if(national)view=clampMapView(view);
  ui.mapCameraManual=true;ui.strategicMapView={...view};
  const restore=()=>{if(!svg.isConnected)return;if(drag||frame){previewTimer=setTimeout(restore,180);return;}apply(true,false,false);};
  clearTimeout(previewTimer);previewTimer=setTimeout(restore,180);
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(svg.isConnected)apply(true,false,true);});
 };
 let bounds=svg.getBoundingClientRect();
 const fitTheater=()=>{const aspect=bounds.width/bounds.height,height=Math.min(1024,view.height,1024/aspect);view=centeredMapView({x:view.x+view.width/2,y:view.y+view.height/2},height*aspect,height);};
 if(!national)fitTheater();
 if(national&&view.width<1024&&bounds.width>bounds.height*1.1){const center={x:view.x+view.width/2,y:view.y+view.height/2};view=centeredMapView(center,Math.min(1024,view.height*bounds.width/bounds.height),view.height);}
 const zoom=(factor,anchor={x:view.x+view.width/2,y:view.y+view.height/2},continuous=false)=>{
  const min=national?MIN_MAP_SIZE:150,ratio=clamp(factor,Math.max(min/view.width,min/view.height),Math.min(1024/view.width,1024/view.height)),width=view.width*ratio,height=view.height*ratio;
  view={x:anchor.x-(anchor.x-view.x)*width/view.width,y:anchor.y-(anchor.y-view.y)*height/view.height,width,height};if(continuous)scheduleApply();else apply(true,true);
 };
 const focus=()=>{
  if(national)view=metropolitanOverviewView({x:+svg.dataset.focusX,y:+svg.dataset.focusY},bounds.width/bounds.height);
  else {view={...THEATER_VIEW};fitTheater();}ui.mapCameraManual=false;apply(false);
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
 listen(svg,'map-inspect-city',event=>inspectCity(event.detail?.id));
 for(const b of root.querySelectorAll('[data-map-view]'))listen(b,'click',()=>{
  const key=b.dataset.mapView;if(key==='in'||key==='out')zoom(key==='in'?.8:1.25);
  else if(key==='city')inspectCity(placeId(selectedPlace()));
  else if(key==='settlements'){const metro=metropolisForSelection();if(metro)expandMetropolis(metro.dataset.metropolisFocus);}
  else if(key==='metropolis'){const metro=metropolisForSelection();if(metro){view=metropolitanOverviewView({x:+metro.dataset.x,y:+metro.dataset.y},bounds.width/bounds.height);apply();}}
  else if(key==='territory'){
   if(svg.dataset.cameraViewBox)apply(true,false,false);
   svg.classList.toggle('hide-territory');ui.mapTerritoryHidden=svg.classList.contains('hide-territory');b.setAttribute('aria-pressed',String(!ui.mapTerritoryHidden));
   cameraPreview?.destroy();cameraPreview=prepareMapCameraPreview(svg);
  }else if(key==='selected')focus();else {view={...(key==='national'?NATIONAL_VIEW:THEATER_VIEW)};apply();}
 });
 for(const [selector,key] of [['.map-search','mapSearchOpen'],['.national-legend','mapLegendOpen']])listen(root.querySelector(selector),'toggle',e=>{ui[key]=e.target.open;scheduleApply();});
 listen(root.querySelector('#national-city-search'),'change',e=>{const node=svg.querySelector(`[data-city="${e.target.value}"],[data-command-city="${e.target.value}"],[data-junction="${e.target.value}"]`);if(!node)return;ui.mapSearchOpen=false;const search=root.querySelector('.map-search');if(search)search.open=false;view=centeredMapView({x:+node.dataset.x,y:+node.dataset.y},360*bounds.width/bounds.height,360);apply();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 const inspectMetropolis=e=>{const node=e.target.closest?.('[data-metropolis-focus]');if(!node||svg.dataset.mapDetail!=='metropolis')return;e.preventDefault();e.stopPropagation();closeBuilding();expandMetropolis(node.dataset.metropolisFocus);};
 listen(svg,'click',inspectMetropolis);
 listen(svg,'wheel',e=>{
  e.preventDefault();if(!e.deltaY)return;
  const p=point(svg,e),displayed=svg.viewBox.animVal;
  // Several inputs can arrive before painting. Map the cursor onto the
  // pending camera as well, so a moving zoom anchor does not drift.
  const anchor={x:view.x+(p.x-displayed.x)/displayed.width*view.width,y:view.y+(p.y-displayed.y)/displayed.height*view.height};
  zoom(e.deltaY<0?.88:1.14,anchor,true);
 },{passive:false});
 listen(svg,'dblclick',e=>{const city=e.target.closest('.node-city,.node-metropolitan-site');if(!city||e.target.closest('[data-city-building],[data-map-building]'))return;e.preventDefault();inspectCity(city.dataset.city||city.dataset.junction);});
 const inspectBuilding=e=>{
  const site=e.target.closest?.('[data-map-building],.is-town-focused .map-city-scene [data-city-building]');if(!site||(!site.dataset.mapBuilding&&!svg.classList.contains('map-close'))||svg.closest('.map-command-screen'))return;
  e.preventDefault();e.stopPropagation();closeBuilding();
  const node=site.closest('.node-city,.node-metropolitan-site'),model=JSON.parse(node.querySelector('script[data-city-model]').textContent);
  buildingCard=document.createElement('section');buildingCard.className='city-building-card';buildingCard.setAttribute('role','region');buildingCard.setAttribute('aria-label',model.name+'建筑详情');buildingCard.innerHTML=cityBuildingCard(model,site.dataset.mapBuilding||site.dataset.cityBuilding);
  buildingCard.dataset.cityId=model.id;
  buildingCard.dataset.compact=String(!!site.dataset.mapBuilding);
  (workspace||root.querySelector('.national-map-stage')).append(buildingCard);art.decorate(buildingCard);
  listen(buildingCard.querySelector('[data-city-card-close]'),'click',()=>{closeBuilding();site.focus();});
 };
 listen(svg,'click',inspectBuilding);
 listen(svg,'keydown',e=>{if(e.key==='Escape'){closeBuilding();return;}if(['Enter',' '].includes(e.key)){inspectMetropolis(e);inspectBuilding(e);}});
 listen(root,'keydown',e=>{if(e.key==='Escape')closeBuilding();});
 listen(svg,'contextmenu',e=>e.preventDefault());
 listen(svg,'pointerdown',e=>{
  previewClick=null;if(!svg.dataset.cameraViewBox)return;apply(true,false,false);
  if(e.button===0)previewClick={x:e.clientX,y:e.clientY,target:document.elementFromPoint(e.clientX,e.clientY)};
 },{capture:true});
 listen(svg,'click',e=>{
  const hit=previewClick;previewClick=null;
  if(hit&&e.target===svg&&hit.target!==svg&&hit.target?.isConnected&&Math.hypot(e.clientX-hit.x,e.clientY-hit.y)<4){e.stopImmediatePropagation();hit.target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:e.clientX,clientY:e.clientY}));}
 },{capture:true});
 listen(svg,'pointerdown',e=>{if(![0,2].includes(e.button)||(e.button===0&&(previewClick?.target||e.target).closest('[data-road-from],[data-junction],[data-city],[data-command-city],[data-campaign-army],[data-transport-officer],[data-action],[data-metropolis-focus]')))return;closeBuilding();ui.mapObject=null;root.querySelector('.map-object-menu')?.remove();const m=svg.getScreenCTM();drag={x:e.clientX,y:e.clientY,view:{...view},scaleX:m.a,scaleY:m.d};svg.setPointerCapture(e.pointerId);});
 listen(svg,'pointermove',e=>{if(!drag)return;view={...drag.view,x:drag.view.x-(e.clientX-drag.x)/drag.scaleX,y:drag.view.y-(e.clientY-drag.y)/drag.scaleY};scheduleApply();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(svg,event,()=>{drag=null;});
 const keyboard=e=>{
  if(e.target!==svg)return;
  if(e.key==='Home'){e.preventDefault();focus();}
  else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.25:.8,undefined,e.repeat);}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();view.x+=e.key==='ArrowLeft'?-view.width*.1:e.key==='ArrowRight'?view.width*.1:0;view.y+=e.key==='ArrowUp'?-view.height*.1:e.key==='ArrowDown'?view.height*.1:0;apply();}
 };
 listen(svg,'keydown',keyboard);
 listen(document,'sango-art-ready',event=>{
  if(event.detail==='officers'){art.decorate(root);return;}
  cameraPreview?.(false);cameraPreview?.destroy();cameraPreview=null;
  for(const place of places){
   if(!place.source||!place.compact)continue;
   place.compact.outerHTML=cityCompactMarkup(JSON.parse(place.source.textContent),{season:ui.mapSeason});
   place.compact=place.node.querySelector('.map-city-model');place.scene?.replaceChildren();
   place.sites=[];place.interactive=null;place.mapInteractive=null;place.mapSites=[...place.node.querySelectorAll('[data-map-building]')];
  }
  apply(false);if(national)cameraPreview=prepareMapCameraPreview(svg);
 });
 apply(false);
 if(national)cameraPreview=prepareMapCameraPreview(svg);
 const sizeObserver=new ResizeObserver(()=>{if(!svg.isConnected)sizeObserver.disconnect();else {bounds=svg.getBoundingClientRect();if(!national)fitTheater();apply(false);}});
 sizeObserver.observe(svg);
 mapControllers.set(root,()=>{bindings.abort();sizeObserver.disconnect();cancelAnimationFrame(frame);clearTimeout(previewTimer);animation?.remove();cameraPreview?.destroy();closeBuilding();});
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)svg.querySelectorAll('animateTransform').forEach(n=>n.remove());
}
